import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { riskPredictionService } from '../services/riskPredictionService';
import { alertService } from '../services/alertService';
import { sendSuccess } from '../utils/response';

export async function getPredictions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    
    // In a real scenario, this endpoint might fetch past predictions from the DB.
    // For the stub, we just return a new mock prediction.
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
