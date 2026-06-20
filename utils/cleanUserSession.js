import redisClient from "../config/redis.js";
export const cleanUserSessions = async (userId) => {
  const sessionIds = await redisClient.sMembers(`user_session:${userId}`);
  if (!sessionIds.length) {
    return;
  }
  for (const sessionId of sessionIds) {
    await redisClient.del(`session:${sessionId}`);
  }
  await redisClient.del(`user_session:${userId}`);
};
