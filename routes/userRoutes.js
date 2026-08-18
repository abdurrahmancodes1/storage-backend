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

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.get("/", checkAuth, getCurrentUser);
router.post("/verify-otp", verifyOTP);
router.post("/logout", logout);
router.post("/logout-all", logoutAll);
router.post("/google", loginWithGoogle);
router.get("/users", checkAuth, getAllUsers);

router.post("/share", checkAuth, sharedWith);
router.get("/share/me", checkAuth, sharedWithMe);
router.post("/share/public", checkAuth, sharePublic);
router.get("/share/public/:fileId", checkAuth, getPubliccShare);
router.patch("/share/public/revoke", checkAuth, revokePublicShare);

export default router;
