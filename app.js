import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoute.js";
import checkAuth from "./middlewares/authMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";
import { connectDB } from "./config/mongoose.js";
import webhooksRoutes from "./routes/webhookRoutes.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import { success } from "zod";
await connectDB();

const app = express();
app.set("trust proxy", 1);

app.use(cookieParser(process.env.COOKIE_SIGNER));
app.use("/webhooks", express.raw({ type: "application/json" }), webhooksRoutes);

app.use(express.json());
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL_1,
  process.env.CLIENT_URL_2,
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests without origin (Postman, mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
// app.get("/rate-test", checkAuth, rateLimiter, (req, res) => {
//   res.json({ message: "Request allowed" });
// });

app.use(
  "/directory",
  checkAuth,
  rateLimiter({ limit: 30, window: 60 }),
  directoryRoutes,
);
app.use(
  "/file",
  checkAuth,
  rateLimiter({ limit: 100, window: 60 }),
  fileRoutes,
);
app.use("/user", userRoutes);
app.use("/admin", rateLimiter({ limit: 60, window: 60 }), adminRoutes);
app.use("/share", rateLimiter({ limit: 30, window: 60 }), shareRoutes);
app.use(
  "/subscription",
  checkAuth,
  rateLimiter({ limit: 20, window: 60 }),
  subscriptionRoutes,
);
app.use((err, req, res, next) => {
  console.log(err);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Something went wrong" : err.message,
  });
});

console.log("Testing watchtower again 2");
app.get("/", (req, res) => {
  res.json({
    message: "Hello from storage app chekcing ci cd working or not ",
  });
});
app.listen(4000, () => {
  console.log(`Server Started`);
});
