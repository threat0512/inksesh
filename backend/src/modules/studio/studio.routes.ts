import { Router } from "express";
import { StudioController } from "./studio.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All studio routes require authentication
router.get("/", authenticate, StudioController.getStudio);
router.put("/", authenticate, StudioController.updateStudio);

export default router;
