import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import {
  deleteFile,
  getFile,
  getPublicFile,
  renameFile,
  uploadComplete,
  uploadInitiate,
} from "../controllers/fileController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();
router.post("/upload/initiate", asyncHandler(uploadInitiate));
router.post("/upload/complete", asyncHandler(uploadComplete));
router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.get("/:id", asyncHandler(getFile));

router.patch("/:id", asyncHandler(renameFile));
router.delete("/:id", asyncHandler(deleteFile));

export default router;
