import mongoose from "mongoose";
import redisClient from "../config/redis.js";

export default async function checkAuth(req, res, next) {
  const { uid } = req.signedCookies;

  if (!uid) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await redisClient.json.get(`session:${uid}`);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Session expired" });
  }

  req.user = {
    _id: new mongoose.Types.ObjectId(session.user._id),
    rootDirId: new mongoose.Types.ObjectId(session.user.rootDirId),
    email: session.user.email,
    role: session.user.role,
    name: session.user.name,
  };

  next();
}
