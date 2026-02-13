import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  deleteUser,
  getAllUsers,
  getCurrentUser,
  login,
  loginWithGoogle,
  logout,
  logoutAll,
  logoutAllUsers,
  register,
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
router.get(
  "/users",
  checkAuth,
  (req, res, next) => {
    if (req.user.role !== "User") {
      console.log(req.user.role);
      return next();
    }
    res.status(403).json({
      success: false,
      message: "You can not access this page",
    });
  },
  getAllUsers,
);

router.post(
  "/users/:id/logout",
  checkAuth,
  (req, res, next) => {
    if (req.user.role !== "User") {
      console.log(req.user.role);
      return next();
    }
    res.status(403).json({
      success: false,
      message: "You can not access this page",
    });
  },
  logoutAllUsers,
);

router.delete(
  "/users/:id/delete",
  checkAuth,
  (req, res, next) => {
    if (req.user.role === "Admin") {
      return next();
    }
    res.status(403).json({
      success: false,
      message: "You can not access this page",
    });
  },
  deleteUser,
);

export default router;
