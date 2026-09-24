import { v4 as uuidv4 } from 'uuid';
import { eq, and, between, or, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import { risks } from '../db/schema';
import { env } from '../config/env';

export type Risk = typeof risks.$inferSelect;

/** Severity mapping (config-style thresholds, READEME #26 — not validated constants). */
export function severityForProbability(probability: number): Risk['severity'] {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.7) return 'high';
  if (probability >= 0.4) return 'medium';
  return 'low';
}

export class RiskService {
  /**
   * Persist a risk record (READEME §32 step 1). Idempotent per well+type+depth
   * window: if an active risk of the same type already exists within
   * depthToleranceFt, update it instead of inserting a duplicate row on every
   * drilling update (implementation.md §12: avoid expensive duplicates).
   */
  public async createRisk(input: {
    wellId: string;
    riskType: string;
    probability: number;
    severity?: string;
    depthFt?: number | null;
    formationName?: string | null;
    message: string;
    description?: string | null;
    source?: Risk['source'];
    relatedWellIds?: string[];
    confidence?: number | null;
    reasoning?: string | null;
    evidence?: unknown;
    recommendation?: string | null;
    depthToleranceFt?: number;
  }): Promise<{ risk: Risk; created: boolean }> {
    const {
      wellId, riskType, probability, severity, depthFt, formationName,
      message, description, source, relatedWellIds,
      depthToleranceFt = env.DEPTH_TOLERANCE_FT,
    } = input;

    const finalSeverity = (severity ?? severityForProbability(probability)) as Risk['severity'];
    const low  = String((depthFt ?? 0) - depthToleranceFt);
    const high = String((depthFt ?? 0) + depthToleranceFt);

    // Dedup: look for an active risk of the same type near the same depth.
    const [existing] = await db.select().from(risks).where(
      and(
        eq(risks.well_id, wellId),
        eq(risks.risk_type, riskType as Risk['risk_type']),
        eq(risks.status, 'active'),
        sql`${risks.depth_ft} IS NOT NULL`,
        between(risks.depth_ft, low, high)
      )
    ).orderBy(desc(risks.created_at)).limit(1);

    if (existing) {
      await db.update(risks).set({
        probability: String(probability),
        severity:    finalSeverity,
        message,
        description:    input.reasoning ?? description ?? null,
        reasoning:      input.reasoning ?? null,
        evidence:       input.evidence ?? null,
        recommendation: input.recommendation ?? null,
        created_at:  new Date(),
      }).where(eq(risks.id, existing.id));
      const [updated] = await db.select().from(risks).where(eq(risks.id, existing.id)).limit(1);
      return { risk: updated, created: false };
    }

    const id = uuidv4();
    await db.insert(risks).values({
      id,
      well_id:          wellId,
      risk_type:        riskType as Risk['risk_type'],
      depth_ft:         depthFt != null ? String(depthFt) : null,
      formation_name:   formationName   ?? null,
      severity:         finalSeverity,
      probability:      String(probability),
      confidence:       input.confidence != null ? String(input.confidence) : null,
      message,
      description:      description     ?? null,
      source:           source          ?? 'rag_llm',
      reasoning:        input.reasoning ?? null,
      evidence:         input.evidence ?? null,
      recommendation:   input.recommendation ?? null,
      related_well_ids: relatedWellIds?.length ? relatedWellIds : null,
    });
    const [risk] = await db.select().from(risks).where(eq(risks.id, id)).limit(1);
    return { risk, created: true };
  }

  public async listRisks(filters: {
    well_id?: string;
    risk_type?: string;
    status?: string;
    severity?: string;
    page: number;
    limit: number;
  }): Promise<{ risks: Risk[]; total: number }> {
    const conditions: any[] = [];
    if (filters.well_id)   conditions.push(eq(risks.well_id,   filters.well_id));
    if (filters.risk_type) conditions.push(eq(risks.risk_type, filters.risk_type as Risk['risk_type']));
    if (filters.status)    conditions.push(eq(risks.status,    filters.status   as Risk['status']));
    if (filters.severity)  conditions.push(eq(risks.severity,  filters.severity as Risk['severity']));

    const where  = conditions.length ? and(...conditions) : undefined;
    const offset = (filters.page - 1) * filters.limit;

    const rows = await db.select().from(risks)
      .where(where)
      .orderBy(desc(risks.created_at))
      .limit(filters.limit)
      .offset(offset);

    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(risks).where(where);

    return { risks: rows, total: Number(countRow.total) };
  }

  public async getRiskById(id: string): Promise<Risk | null> {
    const [risk] = await db.select().from(risks).where(eq(risks.id, id)).limit(1);
    return risk ?? null;
  }

  /** Mark a risk resolved/dismissed (engineer decision, READEME §40). */
  public async updateStatus(id: string, status: 'resolved' | 'dismissed'): Promise<void> {
    await db.update(risks).set({
      status,
      resolved_at: status === 'resolved' ? new Date() : null,
    }).where(eq(risks.id, id));
  }
}

export const riskService = new RiskService();
