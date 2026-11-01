import redisClient from "../config/redis.js";
import { deleteS3FilesByAdmin } from "../config/s3.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";
import { cleanUserSessions } from "../utils/cleanUserSession.js";

export const getAllUsersAdmin = async (req, res) => {
  const users = await User.find({
    role: { $ne: "Admin" },
  })
    .select("_id email name picture role maxStorageLimit storageUsed deleted")
    .lean();
  const userWithStatus = await Promise.all(
    users.map(async (user) => {
      const sessionCount = await redisClient.sCard(`user_session:${user._id}`);
      return { ...user, isLoggedIn: sessionCount > 0 };
    }),
  );

  res.json({ users: userWithStatus });
};

export const forceUserLogout = async (req, res) => {
  const { userId } = req.params;

  await cleanUserSessions(userId);
  return res.json({
    success: true,
    message: "User logged out from all devices",
  });
};
export const deleteUser = async (req, res) => {
  const id = req.params.id;

  await deleteS3FilesByAdmin(id);
  await cleanUserSessions(id);
  await User.findByIdAndDelete(id);
  await File.deleteMany({ userId: id });
  await Directory.deleteMany({ userId: id });

  res.status(200).json({
    success: true,
    message: "Delted the user",
  });
};

export const deactivateUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndUpdate(id, {
    deleted: true,
    deletedAt: new Date(),
  });
  await cleanUserSessions(id);
  const sessions = await redisClient.sMembers(`user_session:${id}`);

  return res.json({
    message: "Account deactivated",
  });
};
export const reactivateUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    {
      deleted: false,
      deletedAt: null,
    },
    {
      new: true,
    },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return res.json({
    success: true,
    message: "User reactivated successfully",
  });
};
export const changeRole = async (req, res) => {
  const id = req.params.id;
  const role = req.body.role;
  if (!["User", "Manager"].includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.role === "Admin") {
    throw new AppError("Admin account cannot be modified", 403);
  }
  user.role = role;
  await user.save();
  const keys = await redisClient.keys("session:*");

  for (const key of keys) {
    const session = await redisClient.json.get(key);

    if (session?.user?._id === id) {
      await redisClient.del(key);
    }
  }
  res.status(200).json({
    message: "Role updated successfully",
  });
};
