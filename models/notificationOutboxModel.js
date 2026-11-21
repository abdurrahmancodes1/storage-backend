import mongoose from "mongoose";

const notificationOutboxSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileAccessEvent",
      required: true,
    },
    type: { type: String, enum: ["file_download"], required: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientEmail: { type: String, required: true },
    fileName: { type: String, required: true },
    status: { type: String, enum: ["pending", "processing", "sent", "failed"], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

notificationOutboxSchema.index(
  { eventId: 1, type: 1, recipientUserId: 1 },
  { unique: true },
);
notificationOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.model("NotificationOutbox", notificationOutboxSchema);
