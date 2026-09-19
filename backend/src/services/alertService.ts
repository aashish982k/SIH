import { query } from '../config/db';

export class AlertService {
  /**
   * Saves an alert to the database
   */
  public async createAlert(
    wellId: string,
    alertType: string,
    message: string,
    severity: string
  ): Promise<any> {
    const sql = `
      INSERT INTO alerts (well_id, alert_type, message, severity, status)
      VALUES (?, ?, ?, ?, 'active')
    `;
    const result: any = await query(sql, [wellId, alertType, message, severity]);
    
    return {
      id: result.insertId,
      well_id: wellId,
      alert_type: alertType,
      message,
      severity,
      status: 'active',
      created_at: new Date()
    };
  }

  /**
   * Retrieves active alerts for a well
   */
  public async getActiveAlerts(wellId: string): Promise<any[]> {
    const sql = `SELECT * FROM alerts WHERE well_id = ? AND status = 'active' ORDER BY created_at DESC`;
    return (await query(sql, [wellId])) as any[];
  }
}

export const alertService = new AlertService();
