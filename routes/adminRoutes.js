import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

import {
  changeRole,
  deactivateUser,
  deleteUser,
  forceUserLogout,
  getAllUsersAdmin,
} from "../controllers/adminController.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.get(
  "/users",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  asyncHandler(getAllUsersAdmin),
);

router.post(
  "/users/:userId/logout",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  asyncHandler(forceUserLogout),
);

router.delete(
  "/users/:id/delete",
  checkAuth,
  authorizeRoles("Admin"),
  asyncHandler(deleteUser),
);

router.patch(
  "/users/:id/deactivate",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  asyncHandler(deactivateUser),
);

router.patch(
  "/users/:id/change-role",
  checkAuth,
  authorizeRoles("Admin"),
  asyncHandler(changeRole),
);

export default router;
