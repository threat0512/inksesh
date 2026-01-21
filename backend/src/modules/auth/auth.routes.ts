import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// Public routes
router.post("/login", AuthController.loginAuth);
router.post("/verify", AuthController.verifyAuth);

// Protected routes
router.get("/me", authenticate, AuthController.getCurrentUser);

export default router;
