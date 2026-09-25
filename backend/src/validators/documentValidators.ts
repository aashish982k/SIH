import { z } from 'zod';

export const resolveWellSchema = z.object({
  name: z.string().trim().min(1).max(120),
  well_number: z.string().trim().min(1).max(60),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});
