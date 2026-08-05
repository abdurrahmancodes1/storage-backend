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

router.get(
  "/users",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  getAllUsersAdmin,
);

router.post(
  "/users/:userId/logout",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  forceUserLogout,
);

router.delete(
  "/users/:id/delete",
  checkAuth,
  authorizeRoles("Admin"),
  deleteUser,
);

router.patch(
  "/users/:id/deactivate",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  deactivateUser,
);

router.patch(
  "/users/:id/change-role",
  checkAuth,
  authorizeRoles("Admin", "Manager"),
  changeRole,
);

export default router;
