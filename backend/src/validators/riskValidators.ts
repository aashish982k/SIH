import { z } from 'zod';

/**
 * POST /api/risks/predict — current drilling snapshot. All numeric fields are
 * optional so the ML service can impute missing values from training medians.
 */
export const predictRiskSchema = z.object({
  wellId: z.string().min(1).optional(),
  well_id: z.string().min(1).optional(),
  depth: z.number().nonnegative().optional(),
  formation: z.string().max(120).optional(),
  rop: z.number().nonnegative().optional(),
  wob: z.number().nonnegative().optional(),
  rpm: z.number().nonnegative().optional(),
  torque: z.number().nonnegative().optional(),
  standpipe_pressure: z.number().nonnegative().optional(),
  pump_pressure: z.number().nonnegative().optional(),
  mud_weight: z.number().positive().optional(),
  flow_rate: z.number().nonnegative().optional(),
  temperature: z.number().optional(),
  historical_hazards_in_radius: z.number().int().nonnegative().optional(),
});

export const listRisksQuerySchema = z.object({
  well_id: z.string().min(1).optional(),
  risk_type: z.string().optional(),
  status: z.enum(['active', 'resolved', 'dismissed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const resolveRiskSchema = z.object({
  status: z.enum(['resolved', 'dismissed']).default('resolved'),
});
