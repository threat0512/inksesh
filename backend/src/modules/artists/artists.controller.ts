import type { Request, Response } from "express";
import { ArtistsService } from "./artists.service";
import { createArtistSchema, artistIdSchema } from "./artists.schemas";
import { asyncHandler } from "../../utils/asyncHandler";

export class ArtistsController {
  /**
   * GET /api/artists
   * Get all artists
   */
  static getArtists = asyncHandler(async (req: Request, res: Response) => {
  
    try {
      const artists = await ArtistsService.getArtists();
      res.status(200).json({ artists });
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /api/artists
   * Create a new artist
   */
  static createArtist = asyncHandler(async (req: Request, res: Response) => {
    const result = createArtistSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const artist = await ArtistsService.createArtist(result.data);
    res.status(201).json({ artist });
  });

  /**
   * GET /api/artists/:id
   * Get artist by ID
   */
  static getArtistById = asyncHandler(async (req: Request, res: Response) => {
    const paramResult = artistIdSchema.safeParse(req.params);

    if (!paramResult.success) {
      res.status(400).json({
        message: "Invalid artist ID",
        errors: paramResult.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const artist = await ArtistsService.getArtistById(paramResult.data.id);
      res.status(200).json({ artist });
    } catch (error) {
      if (error instanceof Error && error.message === "Artist not found") {
        res.status(404).json({ message: error.message });
        return;
      }
      throw error;
    }
  });
}
