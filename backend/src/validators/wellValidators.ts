import { z } from 'zod';

export const createWellSchema = z.object({
  name: z.string().min(2).max(120),
  well_number: z.string().max(60).optional(),
  field_name: z.string().min(1).max(120),
  block: z.string().max(80).optional(),
  operator: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation_m: z.number().optional(),
  total_depth_ft: z.number().positive().optional(),
  status: z.enum(['active', 'suspended', 'completed', 'abandoned']).optional(),
  spud_date: z.string().optional(),
  completion_date: z.string().optional(),
  primary_formation: z.string().max(120).optional(),
});

export const updateWellSchema = createWellSchema.partial();

export const fillEmptyFieldsSchema = z.object({
  field_name: z.string().min(1).max(120).optional(),
  block: z.string().min(1).max(80).optional(),
  operator: z.string().min(1).max(120).optional(),
  elevation_m: z.number().finite().optional(),
  total_depth_ft: z.number().positive().finite().optional(),
  status: z.enum(['active', 'suspended', 'completed', 'abandoned']).optional(),
  spud_date: z.string().min(1).optional(),
  completion_date: z.string().min(1).optional(),
  primary_formation: z.string().min(1).max(120).optional(),
}).passthrough();

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(500).default(25),
});

export const listWellsQuerySchema = z.object({
  status: z.enum(['active', 'suspended', 'completed', 'abandoned']).optional(),
  field: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
