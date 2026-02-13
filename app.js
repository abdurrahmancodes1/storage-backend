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
import { connectDB } from "./config/mongoose.js";
import webhooksRoutes from "./routes/webhookRoutes.js";
await connectDB();

const app = express();
app.use(cookieParser(process.env.COOKIE_SIGNER));
app.use(express.json());
app.use(
  cors({
    origin: process.env.VITE_FRONTEND,
    credentials: true,
  }),
);

app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/user", userRoutes);
app.use("/webhooks", webhooksRoutes);

app.use("/api/drive", checkAuth, driveRoutes);
app.use("/subscription", checkAuth, subscriptionRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: "Something went wrong!" });
});

app.listen(4000, () => {
  console.log(`Server Started`);
});
