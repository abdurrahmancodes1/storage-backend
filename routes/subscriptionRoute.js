import express from "express";
import { createSubscription } from "../controllers/subsciptionContoller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/", asyncHandler(createSubscription));

export default router;
