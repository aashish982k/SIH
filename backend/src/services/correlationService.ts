import { query } from '../config/db';

export class CorrelationService {
  /**
   * Finds nearby wells based on Haversine distance.
   * Returns wells within the specified radius in km.
   */
  public async findNearbyWells(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    limit: number = 5,
    excludeWellId?: string
  ): Promise<any[]> {
    // Haversine formula in SQL
    // 6371 is the radius of the Earth in km
    const sql = `
      SELECT id, name, type, status, latitude, longitude,
      (
        6371 * acos(
          cos(radians(?)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(latitude))
        )
      ) AS distance_km
      FROM wells
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ${excludeWellId ? 'AND id != ?' : ''}
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ?
    `;

    const params: any[] = [latitude, longitude, latitude];
    if (excludeWellId) {
      params.push(excludeWellId);
    }
    params.push(radiusKm, limit);

    const wells = await query(sql, params);
    return wells as any[];
  }
}

export const correlationService = new CorrelationService();
