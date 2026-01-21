import { z } from "zod";

export const updateStudioSchema = z.object({
  name: z.string().min(2).max(80),
  area: z.string().max(120).optional().nullable(),
  specialties: z
    .array(z.string().min(2).max(32))
    .max(20)
    .optional()
    .default([]),
});

export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
