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

  if (!fileData) return res.status(404).json({ error: "File not found" });

  if (req.query.action === "download") {
    const fileUrl = createCloudFrontGetSignedUrl({
      key: `${id}${fileData.extension}`,
      download: true,
      filename: fileData.name,
    });
    return res.redirect(fileUrl);
  }
  console.log("I am called bro");
  const fileUrl = createCloudFrontGetSignedUrl({
    key: `${id}${fileData.extension}`,
    filename: fileData.name,
  });
  return res.redirect(fileUrl);
};

export const renameFile = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newFilename } = req.body;

  const fileData = await File.findOne({
    _id: id,
    userId: user._id,
  });

  if (!fileData) return res.status(404).json({ error: "File not found" });

  try {
    fileData.name = newFilename;
    await fileData.save();
    return res.status(200).json({ message: "File renamed" });
  } catch (err) {
    next(err);
  }
};
export const deleteFile = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;

  const fileData = await File.findOne({
    _id: id,
    userId: user._id,
  })
    .select("parentDirId size extension userId")
    .lean();

  if (!fileData) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const resp = await deleteS3File(`${fileData._id}${fileData.extension}`);

    console.log(resp);
    await User.updateOne(
      { _id: fileData.userId },
      { $inc: { storageUsed: -fileData.size } },
    );

    await incrementDirectorySize(fileData.parentDirId, -fileData.size);
    await File.deleteOne({ _id: id });
    return res.status(200).json({ message: "File deleted" });
  } catch (err) {
    console.log(error.message);
  }
};

export const uploadInitiate = async (req, res) => {
  console.log(req.body);
  try {
    const sessionUser = req.user;

    const parentDirId = new mongoose.Types.ObjectId(
      req.body.parentDirId || sessionUser.rootDirId,
    );

    const parentDir = await Directory.findOne({
      _id: parentDirId,
      userId: sessionUser._id,
    });

    if (!parentDir) {
      return res.status(404).json({ error: "Parent directory not found" });
    }

    const filename = req.body.name || "untitled";
    const size = Number(req.body.size) || 0;
    const dbuser = await User.findById(sessionUser._id).select(
      "storageUsed maxStorageLimit",
    );
    if (!dbuser) {
      return res.status(200).json({
        success: false,
        message: "User not dound",
      });
    }

    if (size > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large" });
    }
    if (dbuser.storageUsed + size > dbuser.maxStorageLimit) {
      return res.status(413).json({
        success: false,
        message: "Storage Lmimt exceeded",
      });
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
      key: `${fileDoc._id}${extension}`,
      contentType: req.body.contentType,
    });
    console.log("Generated S3 key:", `${fileDoc._id}${extension}`);

    console.log(uploadSignedUrl);
    res.json({
      uploadUrl: "test URl",
      uploadSignedUrl,
      fileId: fileDoc._id,
    });
  } catch (error) {
    console.log(error);
  }
};

export const uploadComplete = async (req, res, next) => {
  const file = await File.findById(req.body.fileId);
  if (!file) {
    return res.status(404).json({
      success: false,
      message: "files not found in our record",
    });
  }
  const fileData = await getS3FileMetaData(`${file._id}${file.extension}`);
  console.log(fileData);
  try {
    if (fileData.ContentLength !== file.size) {
      await file.deleteOne();
      return res.status(400).json({
        success: false,
        message: "file size doesnot match",
      });
    }
    file.isUploading = false;
    await file.save();
    console.log(file.size, "this is the size of file");
    await User.updateOne(
      { _id: file.userId },
      { $inc: { storageUsed: file.size } },
    );
    await incrementDirectorySize(file.parentDirId, file.size);
    res.json({ message: "upload completed" });
  } catch (error) {
    await file.deleteOne();

    return res.status(404).json({
      success: false,
      message: "files not uploaded in our record",
    });
  }
  console.log(req.body);
};
