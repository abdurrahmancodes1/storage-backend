// models/Otp.js
import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    razorpaySubscriptionId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",

      required: true,
    },
    status: {
      type: String,
      enum: [
        "created",
        "active",
        "pending",
        "past_due",
        "canceled",
        "in_grace",
      ],
      default: "created",
    },
  },
  { timestamps: true },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
