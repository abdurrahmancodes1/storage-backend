import express from "express";

import checkAuth from "../middlewares/authMiddleware.js";

import { importFromDrive } from "../controllers/driveControllers.js";

const router = express.Router();

router.post("/import", checkAuth, importFromDrive);

export default router;
