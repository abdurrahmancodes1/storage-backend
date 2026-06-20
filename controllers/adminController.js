import redisClient from "../config/redis.js";
import { deleteS3FilesByAdmin } from "../config/s3.js";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { cleanUserSessions } from "../utils/cleanUserSession.js";

export const getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: "Admin" },
    })
      .select("_id email name picture role maxStorageLimit storageUsed deleted")
      .lean();
    const userWithStatus = await Promise.all(
      users.map(async (user) => {
        const sessionCount = await redisClient.sCard(`user_sesion:${user._id}`);
        return { ...user, isLoggedIn: sessionCount > 0 };
      }),
    );

    res.json({ users: userWithStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const forceUserLogout = async (req, res) => {
  try {
    const { userId } = req.params;
    await cleanUserSessions(userId);
    return res.json({
      success: true,
      message: "User logged out from all devices",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const deleteUser = async (req, res) => {
  const id = req.params.id;

  try {
    await deleteS3FilesByAdmin(id);
    await cleanUserSessions(id);
    await User.findByIdAndDelete(id);
    await File.deleteMany({ userId: id });
    await Directory.deleteMany({ userId: id });

    res.status(200).json({
      success: true,
      message: "Delted the user",
    });
  } catch (error) {
    console.log(error);
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, {
      deleted: true,
      deletedAt: new Date(),
    });
    await cleanUserSessions(id);
    const sessions = await redisClient.sMembers(`user_session:${id}`);
    return res.json({
      message: "Account deactivated",
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Error in disbaling account",
    });
  }
};
export const reactivateUser = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User reactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const changeRole = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.body.role;
    if (!["User", "Manager", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
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
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
