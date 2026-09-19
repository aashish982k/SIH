export interface ExtractedEntity {
  type: 'depth' | 'formation' | 'event_type' | 'severity' | 'mitigation' | 'outcome';
  value: string;
  context?: string;
}

export class NLPService {
  private readonly EVENT_TYPES = ['mud loss', 'kick', 'stuck pipe', 'overpressure', 'torque spike', 'cementing issue'];
  private readonly SEVERITY_LEVELS = ['low', 'medium', 'high', 'severe', 'critical'];

  /**
   * Extracts structured drilling entities from a raw text chunk.
   * Uses basic rule-based NLP for Part 2.
   */
  public extractDrillingEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerText = text.toLowerCase();

    // 1. Extract Depth (e.g., "at 3250 m", "depth of 3250m", "3250 ft")
    const depthRegex = /(?:at|depth of)?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*(m|ft|meters|feet)/gi;
    let depthMatch;
    while ((depthMatch = depthRegex.exec(text)) !== null) {
      entities.push({
        type: 'depth',
        value: `${depthMatch[1]} ${depthMatch[2]}`,
        context: text.substring(Math.max(0, depthMatch.index - 30), depthMatch.index + 50)
      });
    }

    // 2. Extract Event Types
    for (const event of this.EVENT_TYPES) {
      if (lowerText.includes(event)) {
        entities.push({
          type: 'event_type',
          value: event,
        });
      }
    }

    // 3. Extract Severity
    for (const severity of this.SEVERITY_LEVELS) {
      if (lowerText.includes(`${severity} mud loss`) || lowerText.includes(`${severity} kick`) || 
          lowerText.includes(`${severity} issue`) || lowerText.includes(`${severity} overpressure`)) {
        entities.push({
          type: 'severity',
          value: severity,
        });
      }
    }

    // 4. Extract Formation (basic regex looking for capitalized word followed by Formation/Sandstone/Shale)
    const formationRegex = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(Formation|Sandstone|Shale|Limestone)/g;
    let formationMatch;
    while ((formationMatch = formationRegex.exec(text)) !== null) {
      entities.push({
        type: 'formation',
        value: `${formationMatch[1]} ${formationMatch[2]}`
      });
    }

    // 5. Extract Mitigation (basic keyword search)
    if (lowerText.includes('mitigated by') || lowerText.includes('controlled using') || lowerText.includes('pumped')) {
      // Very naive extraction, just grabs the sentence containing the keyword
      const sentences = text.split(/[.!?]+/);
      const mitigationSentence = sentences.find(s => s.toLowerCase().includes('mitigated by') || s.toLowerCase().includes('controlled using') || s.toLowerCase().includes('pumped'));
      if (mitigationSentence) {
         entities.push({
            type: 'mitigation',
            value: mitigationSentence.trim()
         });
      }
    }

    return entities;
  }
}

export const nlpService = new NLPService();
