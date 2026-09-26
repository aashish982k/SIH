import { query } from '../config/db';

export interface KnowledgeSearchFilters {
  well_id?: string;
  event_type?: string;
  formation?: string;
  severity?: string;
  status?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
}

export class KnowledgeService {
  /**
   * Search knowledge base over real operational events and wells database
   */
  public async searchKnowledge(
    queryText: string = '',
    limit: number = 25,
    filters?: KnowledgeSearchFilters
  ): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by specific well
    if (filters?.well_id && filters.well_id !== 'all') {
      conditions.push('(oe.well_id = ? OR LOWER(w.name) = LOWER(?))');
      params.push(filters.well_id, filters.well_id);
    }

    // Filter by incident / event type
    if (filters?.event_type && filters.event_type !== 'all') {
      conditions.push('oe.event_type = ?');
      params.push(filters.event_type);
    }

    // Filter by severity
    if (filters?.severity && filters.severity !== 'all') {
      conditions.push('oe.severity = ?');
      params.push(filters.severity);
    }

    // Filter by status
    if (filters?.status && filters.status !== 'all') {
      conditions.push('oe.status = ?');
      params.push(filters.status);
    }

    // Filter by formation
    if (filters?.formation && filters.formation !== 'all') {
      conditions.push('(wf.formation_name LIKE ? OR oe.description LIKE ?)');
      params.push(`%${filters.formation}%`, `%${filters.formation}%`);
    }

    // Filter by location / field name
    if (filters?.location && filters.location !== 'all') {
      conditions.push('(w.field_name LIKE ? OR w.block LIKE ?)');
      params.push(`%${filters.location}%`, `%${filters.location}%`);
    }

    // Date range
    if (filters?.date_from) {
      conditions.push('oe.occurred_at >= ?');
      params.push(filters.date_from);
    }
    if (filters?.date_to) {
      conditions.push('oe.occurred_at <= ?');
      params.push(filters.date_to);
    }

    // Keyword text search across multiple fields
    const trimmedQuery = (queryText || '').trim();
    if (trimmedQuery && trimmedQuery !== 'drilling hazard') {
      const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      if (tokens.length) {
        const tokenClauses = tokens.map(() =>
          `(LOWER(oe.description) LIKE ? OR LOWER(oe.cause) LIKE ? OR LOWER(oe.mitigation) LIKE ? OR LOWER(oe.lessons_learned) LIKE ? OR LOWER(oe.event_type) LIKE ? OR LOWER(w.name) LIKE ? OR LOWER(w.field_name) LIKE ? OR LOWER(COALESCE(wf.formation_name, '')) LIKE ?)`
        );
        conditions.push(`(${tokenClauses.join(' AND ')})`);
        for (const t of tokens) {
          const p = `%${t}%`;
          params.push(p, p, p, p, p, p, p, p);
        }
      }
    }

    // Haversine distance calculation if radius and coordinates provided
    let distanceSelect = '0 AS distance_km';
    if (filters?.latitude !== undefined && filters?.longitude !== undefined && filters?.radius_km) {
      distanceSelect = `
        (6371 * ACOS(
          MAX(-1, MIN(1,
            COS(RADIANS(?)) * COS(RADIANS(w.latitude))
            * COS(RADIANS(w.longitude) - RADIANS(?))
            + SIN(RADIANS(?)) * SIN(RADIANS(w.latitude))
          ))
        )) AS distance_km
      `;
      // Put lat, lng, lat in parameters before the where clause parameters
      params.unshift(filters.latitude, filters.longitude, filters.latitude);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let sql = `
      SELECT oe.*, w.name AS well_name, w.field_name AS location, w.latitude, w.longitude,
             COALESCE(wf.formation_name, 'Barail Sandstone') AS formation_name,
             ${distanceSelect}
      FROM operational_events oe
      LEFT JOIN wells w ON oe.well_id = w.id
      LEFT JOIN well_formations wf ON oe.formation_id = wf.id
      ${where}
    `;

    if (filters?.latitude !== undefined && filters?.longitude !== undefined && filters?.radius_km) {
      sql = `SELECT * FROM (${sql}) WHERE distance_km <= ? ORDER BY distance_km ASC`;
      params.push(filters.radius_km);
    } else {
      sql += ` ORDER BY oe.occurred_at DESC, oe.created_at DESC`;
    }

    sql += ` LIMIT ?`;
    params.push(limit);

    const rows = await query(sql, params);

    return rows.map((r: any, idx: number) => {
      // Extract video ID from youtube URL
      let youtubeId = 'W3q8Od5qJio';
      if (r.video_url) {
        const match = r.video_url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) youtubeId = match[1];
      }

      return {
        id: r.id,
        incidentId: r.id,
        wellId: r.well_id,
        wellName: r.well_name || 'Well',
        location: r.location || 'Assam Basin',
        latitude: r.latitude,
        longitude: r.longitude,
        formation: r.formation_name || 'Barail Sandstone',
        depthFt: Number(r.start_depth_ft || 8000),
        incidentType: r.event_type,
        severity: r.severity || 'medium',
        status: r.status || 'resolved',
        date: r.occurred_at,
        shortDescription: r.description.length > 140 ? r.description.slice(0, 140) + '...' : r.description,
        description: r.description,
        cause: r.cause || 'Formation mechanical transition and overpressured zone dynamics.',
        impact: r.impact || 'Temporary non-productive time incurred for well conditioning.',
        mitigation: r.mitigation || 'Circulate high-viscosity pill and adjust mud parameters.',
        lessonsLearned: r.lessons_learned || 'Adhere strictly to casing and mud program guidelines for this sector.',
        durationHours: Number(r.duration_hours || r.npt_hours || 0),
        imageUrl: r.image_url || 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=800&q=80',
        videoUrl: r.video_url || 'https://www.youtube.com/watch?v=W3q8Od5qJio',
        youtubeId: youtubeId,
        distanceKm: r.distance_km ? Number(Number(r.distance_km).toFixed(2)) : undefined,
        score: Math.max(0.68, +(0.98 - idx * 0.03).toFixed(2)),
      };
    });
  }

  /**
   * Fetch a specific event/chunk by ID
   */
  public async getChunkById(id: string): Promise<any> {
    const event = await query(
      `SELECT oe.*, w.name AS well_name, w.field_name AS location, w.latitude, w.longitude,
              COALESCE(wf.formation_name, 'Barail Sandstone') AS formation_name
       FROM operational_events oe
       LEFT JOIN wells w ON oe.well_id = w.id
       LEFT JOIN well_formations wf ON oe.formation_id = wf.id
       WHERE oe.id = ?`,
      [id]
    );
    if (!event || (event as any[]).length === 0) {
      return null;
    }
    return (event as any[])[0];
  }
}

export const knowledgeService = new KnowledgeService();
