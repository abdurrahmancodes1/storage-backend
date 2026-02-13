import { rm } from "fs/promises";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { deleteS3Files } from "../config/s3.js";

export const getDirectory = async (req, res) => {
  const user = req.user;

  // console.log(req.user, "this is user");
  const _id = req.params.id || user.rootDirId.toString();
  // console.log(_id, "this is his id");
  const directoryData = await Directory.findOne({
    _id,
    userId: user._id,
  }).lean();
  // console.log(directoryData, "form herererer");
  if (!directoryData)
    return res.status(404).json({
      error: "Directory not found or access denied",
    });

  const files = await File.find({ parentDirId: directoryData._id }).lean();
  const directories = await Directory.find({
    parentDirId: directoryData._id,
  }).lean();

  return res.status(200).json({
    ...directoryData,

    files: files.map((f) => ({ ...f, id: f._id })),
    directories: directories.map((d) => ({ ...d, id: d._id })),
  });
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId.toString();
  const dirname = req.headers.dirname || "New Folder";

  try {
    const parentDir = await Directory.findOne({
      _id: parentDirId,
      userId: user._id,
    }).lean();

    if (!parentDir)
      return res.status(404).json({ error: "Parent directory not found" });

    await Directory.create({
      name: dirname,
      parentDirId,
      userId: user._id,
    });

    return res.status(201).json({ message: "Directory created" });
  } catch (err) {
    next(err);
  }
};
export const renameDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;

  try {
    const result = await Directory.findOneAndUpdate(
      { _id: id, userId: user._id },
      { name: newDirName },
      { new: true },
    );

    if (!result)
      return res
        .status(404)
        .json({ error: "Directory not found or no access" });

    return res.status(200).json({ message: "Directory renamed" });
  } catch (err) {
    next(err);
  }
};

export const deleteDirectory = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const directoryData = await Directory.findOne({
      _id: id,
      userId: user._id,
    })
      .select("_id")
      .lean();

    if (!directoryData)
      return res.status(404).json({ error: "Directory not found" });

    async function getDirectoryContents(dirId) {
      let files = await File.find({ parentDirId: dirId })
        .select("_id extension")
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
      Key: `${_id}${extension}`,
    }));
    console.log(keys);
    await deleteS3Files(keys);
    await File.deleteMany({ _id: { $in: files.map((f) => f._id) } });

    await Directory.deleteMany({
      _id: { $in: [...directories.map((d) => d._id), id] },
    });

    return res.json({ message: "Directory deleted" });
  } catch (err) {
    next(err);
  }
};
