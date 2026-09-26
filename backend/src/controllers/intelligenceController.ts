import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { intelligenceService } from '../services/intelligenceService';
import { query } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';

export async function getNearbyIntelligence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const { radiusKm } = req.query;

    const wells = await query('SELECT latitude, longitude FROM wells WHERE id = ?', [wellId]);
    if (!wells || (wells as any[]).length === 0) {
      sendError(res, 'Well not found', 404);
      return;
    }

    const well = (wells as any[])[0];
    if (well.latitude === null || well.longitude === null) {
      sendError(res, 'Well does not have coordinates configured', 400);
      return;
    }

    const radius = radiusKm ? parseFloat(radiusKm as string) : 50;
    const intelligence = await intelligenceService.getNearbyIntelligence(
      wellId,
      well.latitude,
      well.longitude,
      radius
    );
    
    sendSuccess(res, intelligence);
  } catch (err) {
    next(err);
  }
}

export async function getOverviewStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wells = await query('SELECT id, name, field_name, status, total_depth_ft, primary_formation FROM wells');
    const totalWells = wells.length;
    const activeWells = wells.filter((w: any) => w.status === 'active').length;
    const completedWells = wells.filter((w: any) => w.status === 'completed').length;
    const suspendedWells = wells.filter((w: any) => w.status === 'suspended').length;

    const recentEvents = await query(`
      SELECT oe.*, w.name AS well_name, w.field_name
      FROM operational_events oe
      LEFT JOIN wells w ON oe.well_id = w.id
      ORDER BY oe.occurred_at DESC
      LIMIT 8
    `);

    const alerts = await query(`
      SELECT r.*, w.name AS well_name, w.field_name
      FROM risks r
      LEFT JOIN wells w ON r.well_id = w.id
      WHERE r.status = 'active'
      ORDER BY 
        CASE r.severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        r.created_at DESC
      LIMIT 10
    `);

    // Field breakdown
    const fieldsCount: Record<string, number> = {};
    for (const w of wells) {
      fieldsCount[w.field_name] = (fieldsCount[w.field_name] || 0) + 1;
    }

    sendSuccess(res, {
      summary: {
        totalWells,
        activeWells,
        completedWells,
        suspendedWells,
        totalFields: Object.keys(fieldsCount).length,
      },
      fields: fieldsCount,
      recentEvents,
      activeAlerts: alerts,
    });
  } catch (err) {
    next(err);
  }
}
