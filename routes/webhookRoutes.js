import express from "express";
import { handleRazorpaywebhook } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/razorpay", handleRazorpaywebhook);

export default router;
