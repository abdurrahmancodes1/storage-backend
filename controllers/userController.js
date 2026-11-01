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
import AppError from "../utils/AppError.js";
import { cleanUserSessions } from "../utils/cleanUserSession.js";
export const register = async (req, res) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) {
    throw new AppError("Invalid input", 400);
  }
  const { name, email, password } = data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("This email already exists", 409);
  }

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
};

export const verifyOTP = async (req, res) => {
  const { success, data, error } = otpSchema.safeParse(req.body);
  if (!success) {
    throw new AppError("Invalid input", 400);
  }
  const { email, otp } = data;

  if (!email || !otp) {
    throw new AppError("Email and OTP are required", 400);
  }

  const redisKey = `otp:signup:${email}`;

  const cached = await redisClient.get(redisKey);

  if (!cached) {
    throw new AppError("OTP expired or invalid", 400);
  }

  const parsed = JSON.parse(cached);

  if (parsed.otp !== otp) {
    throw new AppError("Invalid input", 400);
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

    if (err.code === 11000) {
      throw new AppError("Email already registered", 409);
    }

    throw err;
  } finally {
    await mongooseSession.endSession();
  }
};

export const login = async (req, res) => {
  const { success, data, error } = loginSchema.safeParse(req.body);

  if (!success) {
    throw new AppError("Invalid input", 400);
  }

  const { email, password } = data;

  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }
  if (user.deleted) {
    throw new AppError("Account is deleted", 403);
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
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
  await redisClient.expire(redisKey, 7 * 24 * 60 * 60);
  await redisClient.sAdd(`user_session:${user._id}`, sessionId);
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
    throw new AppError("User not found", 404);
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
  const userId = req.user._id;

  await cleanUserSessions(userId);
  res.clearCookie("uid");
  res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
};

export const loginWithGoogle = async (req, res) => {
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
  await redisClient.expire(redisKey, 7 * 60 * 24 * 1000);
  await redisClient.sAdd(`user_session:${user._id}`, sessionId);

  res.cookie("uid", sessionId, {
    httpOnly: true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
  });
};

export const getAllUsers = async (req, res) => {
  const { search } = req.query;

  const users = await User.find({
    role: { $ne: "Admin" },
    email: { $regex: search, $options: "i" },
  })
    .select("_id email name picture")
    .lean();

  return res.status(200).json(users);
};

export const sharedWith = async (req, res) => {
  // const { fileId, targetUser, permission } = req.body;
  const { fileId, targetUserId, permission } = req.body;

  const file = await File.findById(fileId);
  if (!file) {
    throw new AppError("File not found", 404);
  }
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError("Not authorized to share this file", 403);
  }
  for (let i = 0; i < targetUserId.length; i++) {
    file.sharedWith.push({
      userId: targetUserId[i],
      permission: permission || "view",
    });
  }
  await file.save();

  return res.status(200).json({
    message: "File shared Successfully",
  });
};

export const sharedWithMe = async (req, res) => {
  const user = req.user;

  const files = await File.find({ "sharedWith.userId": req.user._id })
    .select("name size createdAt userId ")
    .populate("userId", "name email")
    .lean();
};
export const sharePublic = async (req, res) => {
  const user = req.user;
  const { fileId } = req.body;

  const file = await File.findById(fileId);
  if (!file) {
    throw new AppError("File not found", 404);
  }
  if (file.userId.toString() !== user._id.toString()) {
    throw new AppError("Not authorized", 403);
  }
  const token = crypto.randomBytes(32).toString("hex");
  file.publicShare = {
    enabled: true,
    token,
    permission: "view",
    expiresAt: null,
  };
  await file.save();
  const shareUrl = `${process.env.CLIENT_URL_1 || "http://localhost:5173"}/share/${token}`;
  return res.status(200).json({
    message: "Public sharing enabled",
    shareUrl,
  });
};

export const getPubliccShare = async (req, res) => {
  const { fileId } = req.params;

  const file = await File.findOne({
    _id: fileId,
    userId: req.user._id,
  }).lean();
  if (!file) {
    throw new AppError("File not found", 404);
  }
  if (!file.publicShare?.enabled || !file.publicShare?.token) {
    return res.json({
      enabled: false,
      shareUrl: null,
    });
  }

  const shareUrl = `${process.env.CLIENT_URL_1 || "http://localhost:5173"}/share/${file.publicShare.token}`;
  return res.json({
    enabled: true,
    shareUrl,
    permission: file.publicShare.permission || "view",
    expiresAt: file.publicShare.expiresAt,
  });
};
export const revokePublicShare = async (req, res) => {
  const { fileId } = req.body;

  const file = await File.findOne({
    _id: fileId,
    userId: req.user._id,
  });

  if (!file) {
    throw new AppError("File not found", 404);
  }

  file.publicShare.enabled = false;

  await file.save();

  return res.status(200).json({
    message: "Public link revoked",
  });
};
