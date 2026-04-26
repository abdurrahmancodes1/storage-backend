import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  getAllUsers,
  getCurrentUser,
  login,
  loginWithGoogle,
  logout,
  logoutAll,
  register,
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
router.get("/share/public", checkAuth, sharePublic);
export default router;
