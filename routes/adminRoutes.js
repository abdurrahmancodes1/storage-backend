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

const router = express.Router();

// Admin + Manager
router.get(
  "/users",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  getAllUsersAdmin,
);

// Admin + Manager
router.post(
  "/users/:userId/logout",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  forceUserLogout,
);

// only Admin hard delete
router.delete(
  "/users/:id/delete",
  checkAuth,
  authorizeRoles("Admin"),
  deleteUser,
);

// Admin + Manager soft delete
router.patch(
  "/users/:id/deactivate",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  deactivateUser,
);

// Admin + Manager
router.patch(
  "/users/:id/change-role",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  changeRole,
);

export default router;
