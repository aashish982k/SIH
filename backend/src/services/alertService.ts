import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { alerts } from '../db/schema';

export interface CreateAlertData {
  wellId: string;
  riskId?: string | null;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  payload: object;
}

export class AlertService {
  public async createAlert(data: CreateAlertData): Promise<string> {
    const id = uuidv4();
    await db.insert(alerts).values({
      id,
      well_id: data.wellId,
      risk_id: data.riskId || null,
      alert_type: data.alertType,
      severity: data.severity,
      payload: data.payload,
    });
    return id;
  }

  public async listAlerts(wellId: string, unreadOnly: boolean = false): Promise<any[]> {
    const conditions = [eq(alerts.well_id, wellId)];
    if (unreadOnly) {
      conditions.push(isNull(alerts.seen_at));
    }

    return await db.select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.created_at));
  }

  public async markAlertSeen(alertId: string): Promise<void> {
    await db.update(alerts)
      .set({ seen_at: new Date() })
      .where(eq(alerts.id, alertId));
  }

  public async markAllAlertsSeenForWell(wellId: string): Promise<void> {
    await db.update(alerts)
      .set({ seen_at: new Date() })
      .where(and(eq(alerts.well_id, wellId), isNull(alerts.seen_at)));
  }
}

export const alertService = new AlertService();
