import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.js";
import path from "path";
import axios from "axios";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import { incrementDirectorySize } from "../controllers/fileController.js";
const MAX_BATCH_SIZE = 100 * 1024 * 1024;
export async function importDriveItems({ user, token, items }) {
  if (!Array.isArray(items)) {
    throw new Error("Items must be an array");
  }
  const files = items.filter(
    (item) =>
      item.mimeType !== "application/vnd.google-apps.folder " && item.sizeBytes,
  );
  const totalSize = files.reduce(
    (sum, file) => sum + Number(file.sizeBytes),
    0,
  );

  if (totalSize > MAX_BATCH_SIZE) {
    throw new Error("Total selected files exceed 100MB limit");
  }
  if (user.usedStorage + totalSize > user.maxStorageLimit) {
    throw new Error("Storage quota exceeded");
  }
  let driveDir = await Directory.findOne({
    name: "Google Drive",
    userId: user._id,
    parentDirId: user.rootDirId,
  });

  if (!driveDir) {
    driveDir = await Directory.create({
      name: "Google Drive",
      userId: user._id,
      parentDirId: user.rootDirId,
    });
  }
  for (const item of files) {
    const extension = path.extname(item.name);
    const fileDoc = await File.create({
      name: item.name,
      extension,
      userId: user._id,
      parentDirId: driveDir._id,
      size: Number(item.sizeBytes),
    });
    const key = `${fileDoc._id}${extension}`;
    console.log(item.id, "both", token);
    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
      },
    );
    const contentLength = response.headers["content-length"];
    const response2 = await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: key,
        Body: Buffer.from(response.data),
        ContentType: item.mimeType,
        ContentLength: Number(contentLength),
      }),
    );
    console.log(response2);
    await User.updateOne(
      { _id: user._id },
      { $inc: { storageUsed: totalSize } },
    );
  }
  await incrementDirectorySize(driveDir._id, totalSize);
}
