import { z } from "zod";

export const updateProfileSchema = z.object({
  birthDate: z.string().datetime().optional().nullable(),
  image: z.string().url().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  telegramChatId: z.string().max(100).optional().nullable(),
}).strict();
