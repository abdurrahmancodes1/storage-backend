import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";

export const PLANS = {
  // Monthly Starter - 500 MB
  plan_T4wmQjED9Pmc5M: {
    storageQuotaBytes: 500 * 1024 * 1024,
  },

  // Monthly Pro - 2 GB
  plan_T4wnHOVroQPyZA: {
    storageQuotaBytes: 2 * 1024 * 1024 * 1024,
  },

  // Yearly Starter - 500 MB
  plan_T4wtL2ZZ61pN10: {
    storageQuotaBytes: 500 * 1024 * 1024,
  },

  // Yearly Pro - 2 GB
  plan_T4ws4Ajz45xKH6: {
    storageQuotaBytes: 2 * 1024 * 1024 * 1024,
  },
};

export const handleRazorpaywebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  const isSignatureValid = Razorpay.validateWebhookSignature(
    req.body.toString(),
    signature,
    process.env.RAZORPAY_WEBHOOK_KEY,
  );

  if (!isSignatureValid) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const body = JSON.parse(req.body.toString());

  if (body.event === "subscription.activated") {
    const rzpSubscription = body.payload.subscription.entity;

    const subscription = await Subscription.findOne({
      razorpaySubscriptionId: rzpSubscription.id,
    });
    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }
    subscription.status = rzpSubscription.status;
    await subscription.save();

    const plan = PLANS[rzpSubscription.plan_id];

    if (!plan) {
      throw new AppError("Unknown subscription plan", 400);
    }
    await User.findByIdAndUpdate(subscription.userId, {
      maxStorageLimit: plan.storageQuotaBytes,
    });
    await User.findByIdAndUpdate(subscription.userId, {
      maxStorageLimit: storageQuotaBytes,
    });
  }

  return res.sendStatus(200);
};
