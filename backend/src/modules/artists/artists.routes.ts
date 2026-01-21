import { Router } from "express";
import { ArtistsController } from "./artists.controller";
import { authenticate } from "../../middleware/auth";

const router = Router();

// All artist routes require authentication
router.get("/", authenticate, ArtistsController.getArtists);
router.post("/", authenticate, ArtistsController.createArtist);
router.get("/:id", authenticate, ArtistsController.getArtistById);

export default router;
