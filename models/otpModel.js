// models/Otp.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  payload: {
    name: String,
    password: String,
  },
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
