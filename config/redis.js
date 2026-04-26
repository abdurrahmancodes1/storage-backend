import { createClient } from "redis";

const redisClient = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URL,
    port: 15651,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

await redisClient.connect();

await redisClient.set("foo", "bar");
const result = await redisClient.get("foo");
console.log(result); // >>> bar

export default redisClient;
