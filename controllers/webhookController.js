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

// export const handleRazorpaywebhook = async (req, res) => {
//   try {
//     const signature = req.headers["x-razorpay-signature"];

//     const isSignatureValid = Razorpay.validateWebhookSignature(
//       JSON.stringify(req.body),
//       signature,
//       process.env.RAZORPAY_WEBHOOK_KEY,
//     );

//     if (!isSignatureValid) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid webhook signature",
//       });
//     }

//     if (req.body.event === "subscription.activated") {
//       const rzpSubscription = req.body.payload.subscription.entity;

//       const subscription = await Subscription.findOne({
//         razorpaySubscriptionId: rzpSubscription.id,
//       });

//       if (!subscription) {
//         return res.status(404).json({
//           success: false,
//           message: "Subscription not found",
//         });
//       }

//       subscription.status = rzpSubscription.status;
//       await subscription.save();

//       const storageQuotaBytes =
//         PLANS[rzpSubscription.plan_id].storageQuotaBytes;

//       await User.findByIdAndUpdate(subscription.userId, {
//         maxStorageLimit: storageQuotaBytes,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Webhook processed successfully",
//     });
//   } catch (error) {
//     console.error("Webhook Error:", error.message);

//     return res.status(500).json({
//       success: false,
//       message: "Webhook processing failed",
//     });
//   }
// };
// export const handleRazorpaywebhook = async (req, res) => {
//   console.log("Razorpay webhook hit");
//   console.log("EVENT:", req.body.event);

//   const signature = req.headers["x-razorpay-signature"];

//   const isSignatureValid = Razorpay.validateWebhookSignature(
//     req.body.toString(),
//     signature,
//     process.env.RAZORPAY_WEBHOOK_KEY,
//   );

//   console.log("SIGNATURE:", isSignatureValid);

//   if (req.body.payload?.subscription) {
//     console.log("SUB:", req.body.payload.subscription.entity.id);

//     console.log("STATUS:", req.body.payload.subscription.entity.status);
//   }

//   res.sendStatus(200);
// };
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
