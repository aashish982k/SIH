import { z } from 'zod';

export const searchKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.number().int().positive().max(50).optional().default(10),
  well_id: z.string().optional(),
  event_type: z.string().optional(),
  formation: z.string().optional(),
  severity: z.string().optional(),
  depth_min: z.number().nonnegative().optional(),
  depth_max: z.number().nonnegative().optional(),
  reranker: z.boolean().optional(),
  hyde: z.boolean().optional(),
  // Nearby-well filtering (§6.2): restrict results to wells within radius_km
  // of lat/lng. Requires lat & lng when radius_km is provided.
  radius_km: z.number().positive().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (v) => v.radius_km === undefined || (v.latitude !== undefined && v.longitude !== undefined),
  { message: 'latitude and longitude are required when radius_km is provided' }
);
