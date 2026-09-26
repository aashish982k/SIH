import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { riskPredictionService } from '../services/riskPredictionService';
import { alertService } from '../services/alertService';
import { query } from '../config/db';
import { sendSuccess } from '../utils/response';

export async function getPredictions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const prediction = await riskPredictionService.predictRisk({ pump_pressure: 0, historical_hazards_in_radius: 0 });
    sendSuccess(res, { prediction });
  } catch (err) {
    next(err);
  }
}

export async function getAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const alerts = await alertService.getActiveAlerts(wellId);
    sendSuccess(res, { alerts });
  } catch (err) {
    next(err);
  }
}

export async function listAllRisks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const sql = `
      SELECT r.*, w.name AS well_name, w.field_name, w.status AS well_status,
             w.latitude, w.longitude
      FROM risks r
      LEFT JOIN wells w ON r.well_id = w.id
      ORDER BY 
        CASE r.severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        r.created_at DESC
    `;
    const risks = await query(sql);
    sendSuccess(res, { risks, total: risks.length });
  } catch (err) {
    next(err);
  }
}

export async function getRiskOverview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const risks = await query(`SELECT severity, risk_type, status FROM risks`);
    const total = risks.length;
    const critical = risks.filter((r: any) => r.severity === 'critical').length;
    const high = risks.filter((r: any) => r.severity === 'high').length;
    const medium = risks.filter((r: any) => r.severity === 'medium').length;
    const low = risks.filter((r: any) => r.severity === 'low').length;

    // Distribution by risk type
    const byType: Record<string, number> = {};
    for (const r of risks) {
      byType[r.risk_type] = (byType[r.risk_type] || 0) + 1;
    }

    sendSuccess(res, {
      total,
      critical,
      high,
      medium,
      low,
      distribution: byType,
    });
  } catch (err) {
    next(err);
  }
}
