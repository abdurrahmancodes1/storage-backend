import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";

export const PLANS = {
  plan_SF6yH3NknwSNU2: {
    storageQuotaBytes: 1 * 1024 * 1024 * 1024,
  },
};

export const handleRazorpaywebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const isSignatureValid = Razorpay.validateWebhookSignature(
    JSON.stringify(req.body),
    signature,
    "Ar786iit",
  );
  if (isSignatureValid) {
    console.log(isSignatureValid, ",valid");
    console.log(req.body);
    console.log(req.body.payload.subscription);

    if (req.body.event === "subscription.activated") {
      const rzpSubscription = req.body.payload.subscription.entity;
      const planId = rzpSubscription.plan_id;
      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: rzpSubscription.id,
      });
      subscription.status = rzpSubscription.status;
      await subscription.save();
      const storageQuotaBytes = PLANS[planId].storageQuotaBytes;
      const user = await User.findById(subscription.userId);
      user.maxStorageLimit = storageQuotaBytes;
      user.save();
      console.log("subscription activated");
    }
  } else {
    console.log("NOt verified");
  }
  console.log(req.body);
  res.end("OOK");
};
