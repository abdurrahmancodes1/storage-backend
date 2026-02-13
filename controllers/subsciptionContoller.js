import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";

const rzpInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEYID,
  key_secret: process.env.RAZORPAY_KEYSECRET,
});

export const createSubscription = async (req, res) => {
  console.log(req.body);
  try {
    const newSubscription = await rzpInstance.subscriptions.create({
      plan_id: req.body.planId,
      total_count: 120,
      notes: {
        userId: req.user._id,
      },
    });
    const subscription = new Subscription({
      razorpaySubscriptionId: newSubscription.id,
      userId: req.user._id,
    });
    await subscription.save();
    return res.json({ subscriptionId: newSubscription.id });
  } catch (error) {
    console.log(error);
  }
};
// RAZORPAY_KEY_SECRET=
