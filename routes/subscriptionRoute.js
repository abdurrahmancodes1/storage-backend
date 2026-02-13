import express from "express";
import { createSubscription } from "../controllers/subsciptionContoller.js";

const router = express.Router();

router.post("/", createSubscription);

export default router;
