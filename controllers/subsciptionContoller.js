import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";

const rzpInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEYID,
  key_secret: process.env.RAZORPAY_KEYSECRET,
});

export const createSubscription = async (req, res) => {
  console.log(req.body, "yes");

  try {
    const existingSubscription = await Subscription.findOne({
      userId: req.user._id,
      planId: req.body.planId,
      status: "active",
    });

    if (existingSubscription) {
      res.status(400).json({
        success: false,
        message: "You already have this plan active",
      });
    }
    const newSubscription = await rzpInstance.subscriptions.create({
      plan_id: req.body.planId,
      total_count: 12,
      notes: {
        userId: req.user._id,
      },
    });
    const subscription = new Subscription({
      razorpaySubscriptionId: newSubscription.id,
      userId: req.user._id,
      planId: req.body.planId,
    });
    await subscription.save();
    return res.json({ subscriptionId: newSubscription.id });
  } catch (error) {
    console.log(error);
  }
};
