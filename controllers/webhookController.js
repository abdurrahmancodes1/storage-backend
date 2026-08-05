import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";

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
  try {
    console.log("Razorpay webhook hit");

    const signature = req.headers["x-razorpay-signature"];

    const isSignatureValid = Razorpay.validateWebhookSignature(
      req.body.toString(),
      signature,
      process.env.RAZORPAY_WEBHOOK_KEY,
    );

    console.log("SIGNATURE:", isSignatureValid);

    if (!isSignatureValid) {
      return res.sendStatus(400);
    }

    const body = JSON.parse(req.body.toString());

    console.log("EVENT:", body.event);

    if (body.event === "subscription.activated") {
      const rzpSubscription = body.payload.subscription.entity;

      console.log("SUB:", rzpSubscription.id);
      console.log("STATUS:", rzpSubscription.status);

      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: rzpSubscription.id,
      });

      subscription.status = rzpSubscription.status;
      await subscription.save();

      const storageQuotaBytes =
        PLANS[rzpSubscription.plan_id].storageQuotaBytes;

      await User.findByIdAndUpdate(subscription.userId, {
        maxStorageLimit: storageQuotaBytes,
      });

      console.log("Subscription updated");
    }

    return res.sendStatus(200);
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
};
