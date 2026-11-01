import path from "path";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import mongoose from "mongoose";
import User from "../models/userModel.js";
import {
  createGetSignedUrl,
  createUploadSignedUrl,
  deleteS3File,
  getS3FileMetaData,
} from "../config/s3.js";
import { error } from "console";
import { createCloudFrontGetSignedUrl } from "../services/cloudfront.js";
import AppError from "../utils/AppError.js";

export async function incrementDirectorySize(dirId, sizeDelta) {
  let currentDirId = dirId;

  while (currentDirId) {
    const dir = await Directory.findByIdAndUpdate(
      currentDirId,
      { $inc: { size: sizeDelta } },
      { new: true },
    ).select("parentDirId");

    currentDirId = dir.parentDirId;
  }
}

export const getFile = async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const fileData = await File.findOne({
    _id: id,
    userId: user._id,
  }).lean();

  if (!fileData) throw new AppError("File not found", 404);

  const fileUrl = createCloudFrontGetSignedUrl({
    key: `${user._id}/${id}${fileData.extension}`,
    download: req.query.action === "download",
    filename: fileData.name,
  });
  if (req.query.action === "download") {
    return res.redirect(fileUrl);
  }
  if (req.query.action === "preview") {
    return res.json({
      url: fileUrl,
      name: fileData.name,
      extension: fileData.extension,
    });
  }
};

export const renameFile = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newFilename } = req.body;

  const fileData = await File.findOne({
    _id: id,
    userId: user._id,
  });

  if (!fileData) throw new AppError("File not found", 404);

  fileData.name = newFilename;
  await fileData.save();
  return res.status(200).json({ message: "File renamed" });
};
export const deleteFile = async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const fileData = await File.findOne({
    _id: id,
    userId: user._id,
  })
    .select("parentDirId size extension userId isUploading")
    .lean();

  if (!fileData) {
    throw new AppError("File not found", 404);
  }

  await deleteS3File(`${user._id}/${fileData._id}${fileData.extension}`);

  if (!fileData.isUploading) {
    await User.updateOne(
      { _id: fileData.userId },
      { $inc: { storageUsed: -fileData.size } },
    );

    await incrementDirectorySize(fileData.parentDirId, -fileData.size);
  }
  await File.deleteOne({ _id: id });

  return res.status(200).json({ message: "File deleted" });
};

export const uploadInitiate = async (req, res) => {
  const sessionUser = req.user;

  const parentDirId = new mongoose.Types.ObjectId(
    req.body.parentDirId || sessionUser.rootDirId,
  );

  const parentDir = await Directory.findOne({
    _id: parentDirId,
    userId: sessionUser._id,
  });

  if (!parentDir) {
    throw new AppError("Parent directory not found", 404);
  }

  const filename = req.body.name || "untitled";
  const size = Number(req.body.size) || 0;
  const dbuser = await User.findById(sessionUser._id).select(
    "storageUsed maxStorageLimit",
  );
  if (!dbuser) {
    throw new AppError("User not found ", 404);
  }

  if (size > 50 * 1024 * 1024) {
    throw new AppError("File too large", 413);
  }
  if (dbuser.storageUsed + size > dbuser.maxStorageLimit) {
    throw new AppError("Storage Limit exceeded", 413);
  }
  const extension = path.extname(filename);

  const fileDoc = await File.create({
    name: filename,
    extension,
    parentDirId,
    userId: sessionUser._id,
    size,
    isUploading: true,
  });
  const uploadSignedUrl = await createUploadSignedUrl({
    key: `${sessionUser._id}/${fileDoc._id}${extension}`,
    contentType: req.body.contentType,
  });

  res.json({
    uploadUrl: "test URl",
    uploadSignedUrl,
    fileId: fileDoc._id,
  });
};

export const uploadComplete = async (req, res) => {
  const file = await File.findOne({
    _id: req.body.fileId,
    userId: req.user._id,
  });
  if (!file) {
    throw new AppError("files not found in our record", 404);
  }
  const fileData = await getS3FileMetaData(
    `${req.user._id}/${file._id}${file.extension}`,
  );

  if (fileData.ContentLength !== file.size) {
    await file.deleteOne();
    throw new AppError("File size does not match", 400);
  }
  file.isUploading = false;
  await file.save();
  await User.updateOne(
    { _id: file.userId },
    { $inc: { storageUsed: file.size } },
  );
  await incrementDirectorySize(file.parentDirId, file.size);
  res.json({ message: "upload completed" });
};

export const getPublicFile = async (req, res) => {
  const { token } = req.params;

  const file = await File.findOne({
    "publicShare.token": token,
    "publicShare.enabled": true,
  }).lean();
  if (!file) {
    throw new AppError("Shared file not found or link has been revoked", 404);
  }
  if (
    file?.publicShare?.expiresAt &&
    new Date(file?.publicShare?.expiresAt) < new Date()
  ) {
    throw new AppError("This share link has expired", 410);
  }
  const isDownload = req.query.action === "download";
  const fileUrl = createCloudFrontGetSignedUrl({
    key: `${file.userId}/${file._id}${file.extension}`,
    download: isDownload,
    filename: isDownload ? file.name : undefined,
  });
  if (isDownload) {
    return res.redirect(fileUrl);
  }
  return res.status(200).json({
    success: true,
    url: fileUrl,
    name: file.name,
    extension: file.extension,
    size: file.size,
    permission: file.parentShare?.permission || "view",
  });
};
