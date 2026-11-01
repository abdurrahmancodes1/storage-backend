import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

import {
  createDirectory,
  deleteDirectory,
  getDirectory,
  renameDirectory,
} from "../controllers/directoryController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.get("/:id?", asyncHandler(getDirectory));

router.post("/:parentDirId?", asyncHandler(createDirectory));

router.patch("/:id", asyncHandler(renameDirectory));

router.delete("/:id", asyncHandler(deleteDirectory));

export default router;
