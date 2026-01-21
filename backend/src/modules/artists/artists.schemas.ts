import { z } from "zod";

export const createArtistSchema = z.object({
  name: z.string().min(2).max(80),
  bio: z.string().max(500).optional(),
  styles: z
    .array(z.string().min(2).max(32))
    .max(20)
    .optional()
    .default([]),
});

export const artistIdSchema = z.object({
  id: z.string().uuid("Invalid artist ID"),
});

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type ArtistIdInput = z.infer<typeof artistIdSchema>;
