import "dotenv/config";
import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import driveRoutes from "./routes/driveRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoute.js";
import checkAuth from "./middlewares/authMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import { connectDB } from "./config/mongoose.js";
import webhooksRoutes from "./routes/webhookRoutes.js";
await connectDB();

const app = express();
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
app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/subscription", checkAuth, subscriptionRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: "Something went wrong!" });
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
