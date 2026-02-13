// import { createClient } from "redis";

// const redisClient = createClient({
//   url: process.env.REDIS_URL,
//   username: "default",
//   password:,
// });

// redisClient.on("error", (err) => {
//   console.log("redis client error", err);
//   process.exit(1);
// });

// await redisClient.connect();

// export default redisClient;

import { createClient } from "redis";

const redisClient = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_URL,
    port: 18361,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

await redisClient.connect();

await redisClient.set("foo", "bar");
const result = await redisClient.get("foo");
console.log(result); // >>> bar

export default redisClient;
