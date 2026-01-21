import { prisma } from "../../db/prisma";
import type { CreateArtistInput } from "./artists.schemas";

export class ArtistsService {
  /**
   * Get all artists
   */
  static async getArtists() {
    const artists = await prisma.artist.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        styles: true,
        createdAt: true,
      },
    });

    return artists;
  }

  /**
   * Create a new artist
   */
  static async createArtist(data: CreateArtistInput) {
    // Ensure studio exists
    let studio = await prisma.studio.findFirst();

    if (!studio) {
      studio = await prisma.studio.create({
        data: {
          name: "My Studio",
          area: null,
          specialties: [],
        },
      });
    }

    // Create artist
    const artist = await prisma.artist.create({
      data: {
        studioId: studio.id,
        name: data.name,
        styles: data.styles ?? [],
      },
    });

    return artist;
  }

  /**
   * Get artist by ID
   */
  static async getArtistById(id: string) {
    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new Error("Artist not found");
    }

    return artist;
  }
}
