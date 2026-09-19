import { z } from 'zod';

const eventTypeEnum = z.enum([
  'mud_loss','kick','stuck_pipe','fishing','npt',
  'torque_spike','pressure_anomaly','cementing_issue',
  'casing_issue','well_control','blowout','other',
]);

const severityEnum = z.enum(['low','medium','high','critical']);

export const createEventSchema = z.object({
  well_id: z.string().uuid(),
  formation_id: z.string().uuid().optional(),
  event_type: eventTypeEnum,
  severity: severityEnum.default('medium'),
  start_depth_ft: z.number().nonnegative(),
  end_depth_ft: z.number().nonnegative().optional(),
  description: z.string().min(10),
  cause: z.string().optional(),
  impact: z.string().optional(),
  mitigation: z.string().optional(),
  lessons_learned: z.string().optional(),
  outcome: z.string().optional(),
  duration_hours: z.number().nonnegative().optional(),
  npt_hours: z.number().nonnegative().optional(),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
});

export const listEventsQuerySchema = z.object({
  well_id: z.string().uuid().optional(),
  event_type: eventTypeEnum.optional(),
  formation_id: z.string().uuid().optional(),
  severity: severityEnum.optional(),
  depth_min: z.coerce.number().nonnegative().optional(),
  depth_max: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
