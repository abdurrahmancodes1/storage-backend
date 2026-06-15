import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
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
  (req, res, next) => {
    if (req.user.role === "User") {
      console.log("User is not authorized for this page");

      return res.status(403).json({
        message: "Access denied. Admin and Manger only",
      });
    }

    next();
  },
  getAllUsersAdmin,
);
router.post("/users/:userId/logout", checkAuth, forceUserLogout);
router.delete("/users/:id/delete", checkAuth, deleteUser);
router.patch("/users/:id/deactivate", checkAuth, deactivateUser);
router.patch("/users/:id/change-role", checkAuth, changeRole);

// router.post(
//   "/users/:id/logout",
//   checkAuth,
//   (req, res, next) => {
//     if (req.user.role !== "User") {
//       console.log(req.user.role);
//       return next();
//     }
//     res.status(403).json({
//       success: false,
//       message: "You can not access this page",
//     });
//   },
//   logoutAllUsers,
// );

// router.delete(
//   "/users/:id/delete",
//   checkAuth,
//   (req, res, next) => {
//     if (req.user.role === "Admin") {
//       return next();
//     }
//     res.status(403).json({
//       success: false,
//       message: "You can not access this page",
//     });
//   },
//   deleteUser,
// );

export default router;
