import mongoose from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import sendOtpMail from "../utils/sendOtpMail.js";
import { verifyToken } from "../utils/googleAuthService.js";
import redisClient from "../config/redis.js";
import {
  loginSchema,
  otpSchema,
  registerSchema,
} from "../validators/authSchema.js";
import File from "../models/fileModel.js";
export const register = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
    });
  }
  const { name, email, password } = data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      error: "This email already exists",
    });
  }

  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await bcrypt.hash(password, 12);
    const redisKey = `otp:signup:${email}`;
    await redisClient.set(
      redisKey,
      JSON.stringify({
        otp,
        name,
        password: hashedPassword,
      }),
      { EX: 600 },
    );

    await sendOtpMail(email, otp);
    return res.status(200).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    console.log(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { success, data, error } = otpSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }
    const { email, otp } = data;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP required",
      });
    }

    const redisKey = `otp:signup:${email}`;

    const cached = await redisClient.get(redisKey);

    if (!cached) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    const parsed = JSON.parse(cached);

    if (parsed.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const mongooseSession = await mongoose.startSession();
    mongooseSession.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId();
      const rootDirId = new mongoose.Types.ObjectId();

      await Directory.create(
        [
          {
            _id: rootDirId,
            name: `root-${email}`,
            parentDirId: null,
            userId,
          },
        ],
        { session: mongooseSession },
      );

      await User.create(
        [
          {
            _id: userId,
            name: parsed.name,
            email,
            password: parsed.password,
            rootDirId,
          },
        ],
        { session: mongooseSession },
      );

      await redisClient.del(redisKey);

      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      return res.status(201).json({
        success: true,
        message: "Verified & registered",
      });
    } catch (err) {
      await mongooseSession.abortTransaction();
      mongooseSession.endSession();

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      throw err;
    }
  } catch (err) {
    console.log(err);
  }
};

export const login = async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({
      success: false,
      message: "Invalid inputs",
    });
  }

  const { email, password } = data;

  const user = await User.findOne({ email }).lean();
  if (!user) {
    return res.status(404).json({ error: "Invalid credentials" });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(404).json({ error: "Invalid credentials" });
  }

  const sessionId = crypto.randomUUID();
  const redisKey = `session:${sessionId}`;
  await redisClient.json.set(redisKey, "$", {
    user: {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      rootDirId: user.rootDirId.toString(),
      name: user.name,
    },
  });
  await redisClient.expire(redisKey, 60 * 1000);
  await redisClient.sAdd(`user_sesion:${user._id}`, sessionId);
  res.cookie("uid", sessionId, {
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.json({ message: "Logged in" });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "name email role storageUsed maxStorageLimit  ",
  );

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json(user);
};

export const logout = async (req, res) => {
  const { uid } = req.signedCookies;
  await redisClient.del(`session:${uid}`);
  res.clearCookie("uid");
  res.status(204).end();
};

export const logoutAll = async (req, res) => {
  const { uid } = req.signedCookies;
  const session = await Session.findById(uid).lean();

  await Session.deleteMany({ userId: session.userId });
  res.clearCookie("uid");
  res.status(204).end();
};

export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    const userData = await verifyToken(idToken);
    const { name, email, picture } = userData;

    let user = await User.findOne({ email });

    if (!user) {
      const mongooseSession = await mongoose.startSession();
      mongooseSession.startTransaction();

      const userId = new mongoose.Types.ObjectId();
      const rootDirId = new mongoose.Types.ObjectId();

      await Directory.create(
        [
          {
            _id: rootDirId,
            name: `root-${email}`,
            parentDirId: null,
            userId,
          },
        ],
        { session: mongooseSession },
      );

      const [newUser] = await User.create(
        [
          {
            _id: userId,
            name,
            email,
            picture,
            rootDirId,
          },
        ],
        { session: mongooseSession },
      );

      await mongooseSession.commitTransaction();
      mongooseSession.endSession();

      user = newUser;
    }

    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;

    await redisClient.json.set(redisKey, "$", {
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        rootDirId: user.rootDirId.toString(),
        name: user.name,
      },
    });
    await redisClient.expire(redisKey, 60 * 1000);
    await redisClient.sAdd(`user_sesion:${user._id}`, sessionId);

    res.cookie("uid", sessionId, {
      httpOnly: true,
      signed: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  const { search } = req.query;
  try {
    const users = await User.find({
      role: { $ne: "Admin" },
      email: { $regex: search, $options: "i" },
    })
      .select("_id email name picture")
      .lean();

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const sharedWith = async (req, res) => {
  // const { fileId, targetUser, permission } = req.body;
  const { fileId, targetUserId, permission } = req.body;
  console.log(req.body);

  try {
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        error: "File not found",
      });
    }
    if (file.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorizzed",
      });
    }
    for (let i = 0; i < targetUserId.length; i++) {
      file.sharedWith.push({
        userId: targetUserId[i],
        permission: permission || "view",
      });
    }
    await file.save();
    console.log("After save:", file.sharedWith);
    return res.status(200).json({
      message: "File shared Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to share files",
    });
  }
};

export const sharedWithMe = async (req, res) => {
  const user = req.user;
  try {
    const files = await File.find({ "sharedWith.userId": req.user._id })
      .select("name size createdAt userId ")
      .populate("userId", "name email")
      .lean();
    return res.status(200).json(files);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get shared files ",
    });
  }
};

export const sharePublic = async (req, res) => {
  const user = req.user;
  console.log("Generate Public Share");
};
