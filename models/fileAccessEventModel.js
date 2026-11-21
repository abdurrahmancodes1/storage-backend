import mongoose from "mongoose";

const fileAccessEventSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventType: { type: String, enum: ["preview", "download"], required: true },
    actorType: { type: String, enum: ["owner", "user", "public"], required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    shareLinkId: { type: mongoose.Schema.Types.ObjectId, default: null },
    requestId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

fileAccessEventSchema.index({ ownerId: 1, createdAt: -1 });
fileAccessEventSchema.index({ fileId: 1, createdAt: -1 });

export default mongoose.model("FileAccessEvent", fileAccessEventSchema);
