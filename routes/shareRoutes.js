import express from "express";
import { getPublicFile } from "../controllers/fileController.js";

const router = express.Router();

router.get("/:token", getPublicFile);

export default router;
