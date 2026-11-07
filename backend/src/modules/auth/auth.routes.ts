
import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resetPasswordHandler,
  updateProfile,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordHandler);

router.get("/me", authenticate, getCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;
