import { searchSimilar } from './qdrantService';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { knowledge_chunks, wells } from '../db/schema';

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
    const [chunk] = await db.select({
      ...getTableColumns(knowledge_chunks),
      well_name: wells.name,
    })
      .from(knowledge_chunks)
      .leftJoin(wells, eq(knowledge_chunks.well_id, wells.id))
      .where(eq(knowledge_chunks.id, chunkId))
      .limit(1);

    return chunk ?? null;
  }
}

export const knowledgeService = new KnowledgeService();
