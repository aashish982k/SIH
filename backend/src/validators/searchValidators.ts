import { z } from 'zod';

export const searchKnowledgeSchema = z.object({
  query: z.string().optional().default(''),
  limit: z.number().int().positive().optional().default(25),
  well_id: z.string().optional(),
  event_type: z.string().optional(),
  formation: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  field: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius_km: z.number().optional(),
});
