import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  getAllUsers,
  getCurrentUser,
  getPubliccShare,
  login,
  loginWithGoogle,
  logout,
  logoutAll,
  register,
  revokePublicShare,
  sharedWith,
  sharedWithMe,
  sharePublic,
  verifyOTP,
} from "../controllers/userController.js";
import rateLimiter from "../middlewares/rateLimiter.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.post(
  "/register",
  rateLimiter({ limit: 5, window: 60 }),
  asyncHandler(register),
);

router.post(
  "/login",
  rateLimiter({ limit: 5, window: 60 }),
  asyncHandler(login),
);

router.get("/", checkAuth, asyncHandler(getCurrentUser));
router.post(
  "/verify-otp",
  rateLimiter({ limit: 5, window: 60 }),
  asyncHandler(verifyOTP),
);
router.post(
  "/logout",
  rateLimiter({ limit: 5, window: 60 }),
  asyncHandler(logout),
);
router.post(
  "/logout-all",
  checkAuth,

  asyncHandler(logoutAll),
);
router.post("/google", rateLimiter({ limit: 30, window: 60 }), loginWithGoogle);
router.get(
  "/users",
  checkAuth,
  rateLimiter({ limit: 5, window: 60 }),
  asyncHandler(getAllUsers),
);

router.post(
  "/share",
  checkAuth,
  rateLimiter({ limit: 30, window: 60 }),
  asyncHandler(sharedWith),
);
router.get(
  "/share/me",
  checkAuth,
  rateLimiter({ limit: 60, window: 60 }),
  asyncHandler(sharedWithMe),
);
router.post(
  "/share/public",
  checkAuth,
  rateLimiter({ limit: 20, window: 60 }),
  asyncHandler(sharePublic),
);
router.get(
  "/share/public/:fileId",
  checkAuth,
  rateLimiter({ limit: 60, window: 60 }),
  asyncHandler(getPubliccShare),
);
router.patch(
  "/share/public/revoke",
  checkAuth,
  rateLimiter({ limit: 30, window: 60 }),
  asyncHandler(revokePublicShare),
);

export default router;
