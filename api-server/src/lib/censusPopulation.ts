// The Census Data API requires a key. The published population estimates file
// remains an authoritative source when ACS is unavailable; keep its provenance.
export const POPULATION_ESTIMATES_YEAR = 2024;
type Population = { population: number; name: string };
type Estimates = { counties: Map<string, Population>; states: Map<string, Population> };
let cached: { expires: number; data: Estimates } | null = null;
let pending: Promise<Estimates> | null = null;

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let value = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { fields.push(value); value = ''; }
    else value += char;
  }
  fields.push(value);
  return fields;
}

export function parsePopulationEstimates(csv: string): Estimates {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = csvFields(header.replace(/^\uFEFF/, ''));
  const index = (name: string) => columns.indexOf(name);
  const required = ['SUMLEV', 'STATE', 'COUNTY', 'CTYNAME', `POPESTIMATE${POPULATION_ESTIMATES_YEAR}`];
  if (required.some(name => index(name) < 0)) throw new Error('Census population estimates columns unavailable');
  const counties = new Map<string, Population>(), states = new Map<string, Population>();
  for (const line of lines) {
    const row = csvFields(line);
    const population = Number(row[index(`POPESTIMATE${POPULATION_ESTIMATES_YEAR}`)]);
    if (!Number.isFinite(population) || population <= 0) continue;
    const state = row[index('STATE')].padStart(2, '0');
    const item = { population, name: row[index('CTYNAME')] };
    if (row[index('SUMLEV')] === '050') counties.set(state + row[index('COUNTY')].padStart(3, '0'), item);
    if (row[index('SUMLEV')] === '040') states.set(state, item);
  }
  if (!counties.size || !states.size) throw new Error('Census population estimates are empty');
  return { counties, states };
}

export async function populationEstimates(): Promise<Estimates> {
  if (cached && cached.expires > Date.now()) return cached.data;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch('https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv', { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Census population file returned HTTP ${response.status}`);
    const data = parsePopulationEstimates(await response.text());
    cached = { data, expires: Date.now() + 6 * 60 * 60 * 1000 };
    return data;
  })();
  try { return await pending; } finally { pending = null; }
}
