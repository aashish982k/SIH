/**
 * Upper Assam shelf stratigraphy used across NWIS (shallowest first).
 * Thicknesses are typical values for the synthetic development dataset;
 * real tops always come from well data.
 */
export interface FormationDef {
  name: string;
  seq: number;
  lithology: string;
  color: string;            // for correlation / depth-track rendering
  typicalThicknessFt: number;
  aliases: string[];        // spellings seen in reports
}

export const FORMATIONS: FormationDef[] = [
  { name: 'Alluvium',            seq: 1, lithology: 'Unconsolidated sand & clay', color: '#C9B99A', typicalThicknessFt: 1500, aliases: ['alluvium', 'recent'] },
  { name: 'Dhekiajuli',          seq: 2, lithology: 'Sand with clay bands',       color: '#D8C48A', typicalThicknessFt: 2000, aliases: ['dhekiajuli', 'dhekiajuli fm'] },
  { name: 'Girujan Clay',        seq: 3, lithology: 'Mottled reactive clay',      color: '#A77B5C', typicalThicknessFt: 2700, aliases: ['girujan', 'girujan clay', 'girujan clays'] },
  { name: 'Tipam Sandstone',     seq: 4, lithology: 'Coarse permeable sandstone', color: '#E3B64E', typicalThicknessFt: 2000, aliases: ['tipam', 'tipam sandstone', 'tipam sand', 'tipam ss'] },
  { name: 'Barail Coal-Shale',   seq: 5, lithology: 'Coal, carbonaceous shale',   color: '#4B4A4F', typicalThicknessFt: 1100, aliases: ['barail coal shale', 'barail coal-shale', 'bcs', 'barail coal', 'coal shale unit'] },
  { name: 'Barail Arenaceous',   seq: 6, lithology: 'Sandstone with shale',       color: '#B99A62', typicalThicknessFt: 1100, aliases: ['barail arenaceous', 'barail sand', 'barail sandstone', 'barail main sand'] },
  { name: 'Kopili',              seq: 7, lithology: 'Dark shale',                 color: '#5E6B73', typicalThicknessFt: 800,  aliases: ['kopili', 'kopili shale', 'kopili fm'] },
  { name: 'Sylhet Limestone',    seq: 8, lithology: 'Fractured limestone',        color: '#8FB3C9', typicalThicknessFt: 800,  aliases: ['sylhet', 'sylhet limestone', 'prang', 'lakadong', 'narpuh'] },
];

export const FORMATION_BY_NAME = new Map(FORMATIONS.map(f => [f.name, f]));

/** Map free text such as "BCS" or "Tipam sands" to a canonical formation name. */
export function matchFormation(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  // Longest alias first so "barail coal shale" wins over "barail"
  const candidates = FORMATIONS.flatMap(f => f.aliases.map(a => ({ a, name: f.name })))
    .sort((x, y) => y.a.length - x.a.length);
  for (const c of candidates) {
    if (t.includes(c.a)) return c.name;
  }
  if (t.includes('barail')) return 'Barail Arenaceous';
  return null;
}
