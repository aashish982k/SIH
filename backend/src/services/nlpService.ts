export interface ExtractedEntity {
  type: 'depth' | 'formation' | 'event_type' | 'severity' | 'mitigation' | 'outcome' | 'cause' | 'impact' | 'lessons_learned';
  value: string;
  context?: string;
}

export interface ExtractedWellIdentity {
  wellName: string | null;
  fieldName: string | null;
  block: string | null;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
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
      const sentences = text.split(/[.!?]+/);
      const mitigationSentence = sentences.find(s => s.toLowerCase().includes('mitigated by') || s.toLowerCase().includes('controlled using') || s.toLowerCase().includes('pumped'));
      if (mitigationSentence) {
         entities.push({ type: 'mitigation', value: mitigationSentence.trim() });
      }
    }

    // 6. Extract Cause, Impact, Outcome, Lessons Learned (basic keyword sentences)
    const sentences = text.split(/[.!?]+/);
    
    const causeSentences = sentences.filter(s => s.toLowerCase().includes('caused by') || s.toLowerCase().includes('due to'));
    if (causeSentences.length) {
       entities.push({ type: 'cause', value: causeSentences.join('. ').trim() });
    }

    const impactSentences = sentences.filter(s => s.toLowerCase().includes('resulted in') || s.toLowerCase().includes('led to'));
    if (impactSentences.length) {
       entities.push({ type: 'impact', value: impactSentences.join('. ').trim() });
    }

    const outcomeSentences = sentences.filter(s => s.toLowerCase().includes('outcome was') || s.toLowerCase().includes('finally'));
    if (outcomeSentences.length) {
       entities.push({ type: 'outcome', value: outcomeSentences.join('. ').trim() });
    }

    const lessonSentences = sentences.filter(s => s.toLowerCase().includes('lesson') || s.toLowerCase().includes('recommend'));
    if (lessonSentences.length) {
       entities.push({ type: 'lessons_learned', value: lessonSentences.join('. ').trim() });
    }

    return entities;
  }

  public extractWellIdentity(text: string): ExtractedWellIdentity {
    const normalizedText = text
      .replace(/[º˚]/g, '°')
      .replace(/[“”″]/g, '"')
      .replace(/[‘’′]/g, "'");
    const labeledValue = (label: string): string | null => {
      const match = normalizedText.match(new RegExp(`^\\s*${label}\\s*(?::|=|-)?\\s*([^\\r\\n]+)`, 'im'));
      return match?.[1]?.trim() || null;
    };
    const parseCoordinate = (label: 'Latitude' | 'Longitude'): number | null => {
      const labelPattern = new RegExp(
        `${label}\\s*(?::|=|-)?\\s*` +
        `([+-]?\\d{1,3}(?:\\.\\d+)?)\\s*(?:°|deg)?\\s*` +
        `(?:(\\d{1,2})\\s*(?:'|m)?\\s*)?` +
        `(?:(\\d{1,2}(?:\\.\\d+)?)\\s*(?:"|s)?\\s*)?` +
        `(["']?)([NSEW])\\b`,
        'i',
      );
      const dmsMatch = normalizedText.match(labelPattern);
      if (dmsMatch) {
        const degrees = Number(dmsMatch[1]);
        const minutes = Number(dmsMatch[2] ?? 0);
        const seconds = Number(dmsMatch[3] ?? 0);
        const hemisphere = dmsMatch[5].toUpperCase();
        const absolute = Math.abs(degrees) + minutes / 60 + seconds / 3600;
        const signed = ['S', 'W'].includes(hemisphere) ? -absolute : absolute;
        return Number.isFinite(signed) ? signed : null;
      }

      const valueMatch = normalizedText.match(new RegExp(
        `${label}\\s*(?::|=|-)?\\s*([+-]?\\d{1,3}(?:\\.\\d+)?)`, 'i',
      ));
      const number = valueMatch ? Number(valueMatch[1]) : null;
      return number != null && Number.isFinite(number) ? number : null;
    };

    const wellName = labeledValue('Well\\s*(?:Name|No\\.?|Number)?')?.replace(/\s{2,}/g, ' ') || null;
    const fieldName = labeledValue('Field(?:\\s*Name)?') || null;
    const block = labeledValue('Block') || null;
    const locationText = labeledValue('(?:Location|Basin|Field(?:\\s*Name)?|Block)') || null;
    const latitude = parseCoordinate('Latitude');
    const longitude = parseCoordinate('Longitude');

    return {
      wellName,
      fieldName,
      block,
      locationText,
      latitude: latitude != null && latitude >= -90 && latitude <= 90 ? latitude : null,
      longitude: longitude != null && longitude >= -180 && longitude <= 180 ? longitude : null,
    };
  }
}

export const nlpService = new NLPService();
