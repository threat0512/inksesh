import { prisma } from "../../db/prisma";
import type { UpdateStudioInput } from "./studio.schemas";

export class StudioService {
  /**
   * Get or create the studio (only one studio)
   */
  static async getOrCreateStudio() {
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

    return studio;
  }

  /**
   * Update studio (create if missing)
   */
  static async updateStudio(data: UpdateStudioInput) {
    let studio = await prisma.studio.findFirst();

    if (!studio) {
      // Create with provided data
      studio = await prisma.studio.create({
        data: {
          name: data.name,
          area: data.area ?? null,
          specialties: data.specialties ?? [],
        },
      });
    } else {
      // Update existing
      studio = await prisma.studio.update({
        where: { id: studio.id },
        data: {
          name: data.name,
          area: data.area ?? null,
          specialties: data.specialties ?? [],
        },
      });
    }

    return studio;
  }
}
