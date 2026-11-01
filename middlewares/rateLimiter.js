import redisClient from "../config/redis.js";
import { readFile } from "node:fs/promises";

const rateLimitScript = await readFile("./script/rateLimiter.lua", "utf-8");

export default function rateLimiter({ limit, window }) {
  return async function (req, res, next) {
    const user = req.user;
    const timestamp = Math.floor(Date.now() / 1000);
    const identifier = req.user?._id ?? req.ip;
    const windowId = Math.floor(timestamp / window);
    const previousWindowId = windowId - 1;
    const key = `rate:${identifier}:${windowId}`;
    const previousKey = `rate:${identifier}:${previousWindowId}`;
    const windowStart = windowId * window;
    const elapsed = timestamp - windowStart;
    const result = await redisClient.eval(rateLimitScript, {
      keys: [key, previousKey],
      arguments: [String(limit), String(window), String(elapsed)],
    });
    if (result === -1) {
      return res.status(429).json({
        message: "Too many Requests",
      });
    }
    next();
  };
}
