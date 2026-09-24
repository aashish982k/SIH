export interface ChunkMetadata {
  documentId?: string;
  wellId?: string;
  documentType?: string;
  formation?: string;
  depth?: number;
  eventType?: string;
  severity?: string;
}

export interface DocumentChunk {
  text: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
}

export class ChunkingService {
  /**
   * Splits a raw document text into meaningful chunks.
   * A real implementation would use a recursive character text splitter.
   * For Part 2, we use a basic paragraph/length-based splitter.
   */
  public chunkDocument(text: string, baseMetadata: ChunkMetadata, maxTokens: number = 500): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Split by paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const cleanPara = paragraph.trim();
      if (!cleanPara) continue;

      // Rough approximation: 1 token ~= 4 characters
      const estimatedTokens = cleanPara.length / 4;

      if ((currentChunk.length / 4) + estimatedTokens > maxTokens) {
        if (currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            chunkIndex: chunks.length,
            metadata: { ...baseMetadata }
          });
        }
        currentChunk = cleanPara;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + cleanPara;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex: chunks.length,
        metadata: { ...baseMetadata }
      });
    }

    return chunks;
  }
}

export const chunkingService = new ChunkingService();
