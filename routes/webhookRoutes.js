import express from "express";
import { handleRazorpaywebhook } from "../controllers/webhookController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/razorpay", asyncHandler(handleRazorpaywebhook));

export default router;
