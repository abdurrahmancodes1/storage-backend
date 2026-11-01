import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { deleteS3Files } from "../config/s3.js";
import User from "../models/userModel.js";
import AppError from "../utils/AppError.js";

export const getDirectory = async (req, res) => {
  const user = req.user;

  const _id = req.params.id || user.rootDirId.toString();

  const directoryData = await Directory.findOne({
    _id,
    userId: user._id,
  }).lean();
  if (!directoryData)
    throw new AppError("Directory not found or access denied", 404);

  const files = await File.find({ parentDirId: directoryData._id }).lean();
  const directories = await Directory.find({
    parentDirId: directoryData._id,
  }).lean();
  return res.status(200).json({
    ...directoryData,

    files: files.map((f) => ({
      id: f._id,
      name: f.name,
      extension: f.extension,
      size: f.size,
      isUploading: f.isUploading,
      sharedWith: f.sharedWith,
      publicShare: f.publicShare
        ? {
            enabled: f.publicShare.enabled,
            permission: f.publicShare.permission,
            expiresAt: f.publicShare.expiresAt,
          }
        : null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),

    directories: directories.map((d) => ({
      id: d._id,
      name: d.name,
      parentDirId: d.parentDirId,
      size: d.size,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  });
};

export const createDirectory = async (req, res) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId.toString();
  const dirname = req.headers.dirname || "New Folder";
  console.log(user, parentDirId, dirname);

  const parentDir = await Directory.findOne({
    _id: parentDirId,
    userId: user._id,
  }).lean();

  if (!parentDir) throw new AppError("Parent directory not found", 404);

  await Directory.create({
    name: dirname,
    parentDirId,
    userId: user._id,
  });

  return res.status(201).json({ message: "Directory created" });
};

export const renameDirectory = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;

  const result = await Directory.findOneAndUpdate(
    { _id: id, userId: user._id },
    { name: newDirName },
    { new: true },
  );
  if (!result) throw new AppError("Directory not found or no access", 404);

  return res.status(200).json({ message: "Directory renamed" });
};

export const deleteDirectory = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const directoryData = await Directory.findOne({
    _id: id,
    userId: user._id,
  })
    .select("_id")
    .lean();

  if (!directoryData) throw new AppError("Directory not found", 404);

  async function getDirectoryContents(dirId) {
    let files = await File.find({ parentDirId: dirId })
      .select("_id extension size")
      .lean();

    let directories = await Directory.find({ parentDirId: dirId })
      .select("_id")
      .lean();

    for (const { _id } of directories) {
      const nested = await getDirectoryContents(_id);
      files = [...files, ...nested.files];
      directories = [...directories, ...nested.directories];
    }

    return { files, directories };
  }

  const { files, directories } = await getDirectoryContents(id);

  const keys = files.map(({ _id, extension }) => ({
    Key: `${user._id}/${_id}${extension}`,
  }));
  const totalDeletedSize = files.reduce((acc, file) => acc + file.size, 0);
  if (keys.length > 0) {
    await deleteS3Files(keys);
  }
  await File.deleteMany({ _id: { $in: files.map((f) => f._id) } });

  await Directory.deleteMany({
    _id: { $in: [...directories.map((d) => d._id), id] },
  });
  await User.updateOne(
    { _id: user._id },
    {
      $inc: {
        storageUsed: -totalDeletedSize,
      },
    },
  );
  return res.json({ message: "Directory deleted" });
};
