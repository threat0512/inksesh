import { Router } from "express";
import { AssetsController } from "./assets.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All asset routes require authentication
router.post("/init-upload", authenticate, AssetsController.initUpload);
router.post("/complete-upload", authenticate, AssetsController.completeUpload);
router.get("/", authenticate, AssetsController.listAssets);
router.delete("/:id", authenticate, AssetsController.deleteAsset);

export default router;
