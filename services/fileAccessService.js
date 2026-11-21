import FileAccessEvent from "../models/fileAccessEventModel.js";
import NotificationOutbox from "../models/notificationOutboxModel.js";
import User from "../models/userModel.js";

export async function recordFileAccess({
  file,
  eventType,
  actorType,
  actorUserId = null,
  requestId = null,
}) {
  const event = await FileAccessEvent.create({
    fileId: file._id,
    ownerId: file.userId,
    eventType,
    actorType,
    actorUserId,
    requestId,
  });

  if (eventType !== "download" || actorType === "owner") return event;

  const owner = await User.findById(file.userId).select("email").lean();
  if (!owner?.email) return event;

  await NotificationOutbox.create({
    eventId: event._id,
    type: "file_download",
    recipientUserId: file.userId,
    recipientEmail: owner.email,
    fileName: file.name,
  });

  return event;
}

export async function recordFileAccessSafely(options) {
  try {
    return await recordFileAccess(options);
  } catch (error) {
    console.error("File access event recording failed:", error.message);
    return null;
  }
}
