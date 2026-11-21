import NotificationOutbox from "../models/notificationOutboxModel.js";
import { resend } from "../utils/mailer.js";

const MAX_ATTEMPTS = 5;

async function processOneNotification() {
  const item = await NotificationOutbox.findOneAndUpdate(
    {
      status: "pending",
      nextAttemptAt: { $lte: new Date() },
    },
    {
      $set: { status: "processing" },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { createdAt: 1 } },
  );

  if (!item) return false;

  try {
    await resend.emails.send({
      from: "StorVault <noreply@storvault.xyz>",
      to: item.recipientEmail,
      subject: `Your StorVault file was downloaded: ${item.fileName}`,
      html: `<p>Your file <strong>${item.fileName}</strong> was downloaded from StorVault.</p><p>This notification means StorVault authorized a download request.</p>`,
    });

    await NotificationOutbox.updateOne(
      { _id: item._id },
      { $set: { status: "sent", sentAt: new Date(), lastError: null } },
    );
  } catch (error) {
    const permanentlyFailed = item.attempts >= MAX_ATTEMPTS;
    await NotificationOutbox.updateOne(
      { _id: item._id },
      {
        $set: {
          status: permanentlyFailed ? "failed" : "pending",
          nextAttemptAt: new Date(Date.now() + item.attempts * 60_000),
          lastError: error.message,
        },
      },
    );
  }

  return true;
}

export function startNotificationWorker() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Notification worker disabled: RESEND_API_KEY is missing");
    return;
  }

  const poll = async () => {
    try {
      while (await processOneNotification()) {}
    } catch (error) {
      console.error("Notification worker error:", error.message);
    }
  };

  void poll();
  setInterval(poll, 15_000);
}
