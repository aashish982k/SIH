import { z } from 'zod';

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().positive().optional().default(10),
  well_id: z.string().optional(),
  event_type: z.string().optional(),
  formation: z.string().optional(),
  severity: z.string().optional(),
});
