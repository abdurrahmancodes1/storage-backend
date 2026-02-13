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
    next(err);
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
  await redisClient.expire(redisKey, 60 * 1000 * 60 * 24 * 7);
  res.cookie("uid", sessionId, {
    httpOnly: true,
    signed: true,
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

    const userSessionsKey = `user:sessions:${user._id}`;
    const data = await redisClient.json.get(userSessionsKey);
    const sessions = data?.sessions || [];
    if (sessions.length >= 2) {
      const oldSessionId = sessions.shift();
      await redisClient.del(`session:${oldSessionId}`);
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
    await redisClient.expire(redisKey, 60 * 1000 * 60 * 24 * 7);
    sessions.push(sessionId);
    await redisClient.json.set(userSessionsKey, "$", { sessions });
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
  try {
    const users = await User.find({ role: { $ne: "Admin" } })
      .select("_id email name picture")
      .lean();

    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const session = await Session.findOne({ userId: user._id });

        return {
          ...user,
          isLoggedIn: session ? true : false,
        };
      }),
    );

    res.status(200).json({
      success: true,
      users: usersWithStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const logoutAllUsers = async (req, res) => {
  try {
    // console.log(req.params);
    const id = req.params.id;

    const sessions = await Session.deleteMany({ userId: id });
    // console.log(sessions);
    res.status(200).json({
      success: true,
      message: "",

      id,
    });
  } catch (error) {
    console.log(error);
  }
};

export const deleteUser = async (req, res) => {
  const id = req.params.id;
  // console.log(req.param);
  // console.log(id, "this user to be deleted");
  try {
    // await User.findByIdAndDelete(id);
    // await File.deleteMany({ userId: id });
    // await Directory.deleteMany({ userId: id });

    await Session.deleteMany({ userId: id });
    await User.findByIdAndUpdate(id, { deleted: true });
    res.status(200).json({
      success: true,
      message: "Delted the user",
    });
  } catch (error) {
    console.log(error);
  }
};
