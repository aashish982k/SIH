import { searchSimilar } from './qdrantService';
import { query } from '../config/db';

export class KnowledgeService {
  /**
   * Search knowledge base
   */
  public async searchKnowledge(
    queryText: string,
    limit: number = 10,
    filters?: {
      well_id?: string;
      event_type?: string;
      formation?: string;
      severity?: string;
    }
  ): Promise<any[]> {
    return await searchSimilar(queryText, limit, filters);
  }

  /**
   * Fetch a specific chunk
   */
  public async getChunkById(chunkId: string): Promise<any> {
    const chunks = await query(
      `SELECT kc.*, w.name AS well_name FROM knowledge_chunks kc
       LEFT JOIN wells w ON kc.well_id = w.id
       WHERE kc.id = ?`,
      [chunkId]
    );
    if (!chunks || (chunks as any[]).length === 0) {
      return null;
    }
    return (chunks as any[])[0];
  }
}

export const knowledgeService = new KnowledgeService();
