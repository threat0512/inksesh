import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "../modules/auth/auth.routes";
import studioRoutes from "../modules/studio/studio.routes";
import artistsRoutes from "../modules/artists/artists.routes";

const router = Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/studio", studioRoutes);
router.use("/artists", artistsRoutes);

export default router;
