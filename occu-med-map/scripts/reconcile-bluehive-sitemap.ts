import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const DEFAULT_SITEMAP = 'https://bluehive.com/sitemap-providers.xml';
const DEFAULT_EXISTING = 'bluehive_providers.jsonl';
const DEFAULT_RUN_ID = new Date().toISOString().slice(0, 10);
const PROVIDER_HEADERS = [
  'clinic_name', 'address_1', 'address_2', 'city', 'state', 'zip', 'phone',
  'fax', 'website', 'hours', 'services', 'service_categories',
  'accepts_new_patients', 'telehealth', 'source_url', 'source_city_url',
  'source_state_url',
] as const;

interface ProviderData {
  clinic_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  website: string;
  hours: string;
  services: string;
  service_categories: string;
  accepts_new_patients: string;
  telehealth: string;
  source_url: string;
  source_city_url: string;
  source_state_url: string;
}

type ResultStatus = 'recovered' | 'no-data' | 'failed';

interface CheckpointEntry {
  status: ResultStatus;
  attempts: number;
  checked_at: string;
  error?: string;
}

interface Checkpoint {
  version: 1;
  sitemap_sha256: string;
  entries: Record<string, CheckpointEntry>;
}

interface Options {
  sitemapUrl: string;
  existingFile: string;
  runDir: string;
  concurrency: number;
  delayMs: number;
  retries: number;
  limit?: number;
  retryFailures: boolean;
  refreshSitemap: boolean;
}

function parseArgs(argv: string[]): Options {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const numberValue = (flag: string, fallback: number) => {
    const raw = value(flag);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${flag} must be a positive integer`);
    return parsed;
  };
  const limitRaw = value('--limit');
  return {
    sitemapUrl: value('--sitemap') ?? DEFAULT_SITEMAP,
    existingFile: path.resolve(value('--existing') ?? DEFAULT_EXISTING),
    runDir: path.resolve(value('--run-dir') ?? `data/bluehive-audit/${DEFAULT_RUN_ID}`),
    concurrency: numberValue('--concurrency', 4),
    delayMs: numberValue('--delay-ms', 500),
    retries: numberValue('--retries', 3),
    limit: limitRaw === undefined ? undefined : numberValue('--limit', 1),
    retryFailures: argv.includes('--retry-failures'),
    refreshSitemap: argv.includes('--refresh-sitemap'),
  };
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseSitemap(xml: string): string[] {
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
  return [...new Set(urls)].sort();
}

async function readJsonl<T>(file: string): Promise<T[]> {
  const raw = await fs.readFile(file, 'utf8');
  return raw.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as T);
}

async function readJsonlIfPresent<T>(file: string): Promise<T[]> {
  try {
    return await readJsonl<T>(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function fetchText(url: string, retries: number): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OccuMed-BlueHive-Provenance-Audit/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError ?? new Error('Request failed');
}

function extractProviderData(html: string, sourceUrl: string): ProviderData | null {
  const $ = load(html);
  let medicalBusiness: Record<string, any> | null = null;
  let faqPage: Record<string, any> | null = null;
  let breadcrumbList: Record<string, any> | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const parsed = JSON.parse($(element).text().trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item?.['@type'] === 'MedicalBusiness') medicalBusiness = item;
        if (item?.['@type'] === 'FAQPage') faqPage = item;
        if (item?.['@type'] === 'BreadcrumbList') breadcrumbList = item;
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue inspecting the page.
    }
  });
  if (!medicalBusiness) return null;

  const business = medicalBusiness as Record<string, any>;
  const faq = faqPage as Record<string, any> | null;
  const breadcrumbs = breadcrumbList as Record<string, any> | null;
  const address = business.address ?? {};
  const streetParts = String(address.streetAddress ?? '').split(',').map((part) => part.trim());
  const services = new Set<string>();
  for (const item of business.hasOfferCatalog?.itemListElement ?? []) {
    const name = item?.itemOffered?.name;
    if (name) services.add(String(name));
  }
  if (services.size === 0) {
    $('[data-service-name]').each((_, element) => {
      const name = $(element).attr('data-service-name');
      if (name) services.add(name);
    });
  }
  const categories = new Set<string>();
  $('[data-service-category]').each((_, element) => {
    const category = $(element).attr('data-service-category');
    if (category) categories.add(category);
  });

  let hours = '';
  for (const item of faq?.mainEntity ?? []) {
    const question = String(item?.name ?? '').toLowerCase();
    if (question.includes('hours') || question.includes('office hours')) {
      hours = String(item?.acceptedAnswer?.text ?? '').replace(/\r\n?/g, '\n').trim();
      if (hours) break;
    }
  }

  let website = '';
  const socialHosts = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];
  for (const candidate of business.sameAs ?? []) {
    if (!socialHosts.some((host) => String(candidate).includes(host))) {
      website = String(candidate);
      break;
    }
  }
  if (!website) website = String(business.url ?? '');

  let sourceCityUrl = '';
  let sourceStateUrl = '';
  for (const item of breadcrumbs?.itemListElement ?? []) {
    if (item?.position === 3) sourceStateUrl = String(item.item ?? '');
    if (item?.position === 4) sourceCityUrl = String(item.item ?? '');
  }
  const body = $('body').text().toLowerCase();
  return {
    clinic_name: String(business.name ?? ''),
    address_1: streetParts[0] ?? '',
    address_2: streetParts.slice(1).join(', '),
    city: String(address.addressLocality ?? ''),
    state: String(address.addressRegion ?? ''),
    zip: String(address.postalCode ?? ''),
    phone: String(business.telephone ?? ''),
    fax: String(business.faxNumber ?? ''),
    website,
    hours,
    services: [...services].join('; '),
    service_categories: [...categories].join('; '),
    accepts_new_patients: body.includes('accepts new patients') ? 'Yes' : '',
    telehealth: body.includes('telehealth') ? 'Yes' : '',
    source_url: sourceUrl,
    source_city_url: sourceCityUrl,
    source_state_url: sourceStateUrl,
  };
}

async function loadCheckpoint(file: string, sitemapHash: string): Promise<Checkpoint> {
  try {
    const checkpoint = JSON.parse(await fs.readFile(file, 'utf8')) as Checkpoint;
    if (checkpoint.sitemap_sha256 !== sitemapHash) {
      throw new Error('Checkpoint sitemap hash does not match the frozen sitemap snapshot');
    }
    return checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 1, sitemap_sha256: sitemapHash, entries: {} };
    }
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(options.runDir, { recursive: true });
  const snapshotFile = path.join(options.runDir, 'sitemap-providers.xml');
  const inventoryFile = path.join(options.runDir, 'sitemap-provider-urls.json');
  const recoveryFile = path.join(options.runDir, 'bluehive-sitemap-recovery.jsonl');
  const auditFile = path.join(options.runDir, 'bluehive-sitemap-recovery-audit.csv');
  const checkpointFile = path.join(options.runDir, 'bluehive-sitemap-recovery-checkpoint.json');
  const summaryFile = path.join(options.runDir, 'bluehive-sitemap-recovery-summary.json');

  let sitemapXml: string;
  try {
    sitemapXml = options.refreshSitemap ? await fetchText(options.sitemapUrl, options.retries) : await fs.readFile(snapshotFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    sitemapXml = await fetchText(options.sitemapUrl, options.retries);
  }
  if (options.refreshSitemap || !(await fs.stat(snapshotFile).catch(() => null))) {
    await fs.writeFile(snapshotFile, sitemapXml);
  }
  const sitemapHash = sha256(sitemapXml);
  const sitemapUrls = parseSitemap(sitemapXml);
  if (sitemapUrls.length === 0) throw new Error('Provider sitemap contained no URLs');
  await fs.writeFile(inventoryFile, JSON.stringify({
    source: options.sitemapUrl,
    captured_at: new Date().toISOString(),
    sha256: sitemapHash,
    count: sitemapUrls.length,
    urls: sitemapUrls,
  }, null, 2));

  const existingRows = await readJsonl<ProviderData>(options.existingFile);
  const existingUrls = new Set(existingRows.map((row) => row.source_url).filter(Boolean));
  const recoveredRows = await readJsonlIfPresent<ProviderData>(recoveryFile);
  const recoveredUrls = new Set(recoveredRows.map((row) => row.source_url).filter(Boolean));
  const checkpoint = await loadCheckpoint(checkpointFile, sitemapHash);
  const missingAtStart = sitemapUrls.filter((url) => !existingUrls.has(url));
  let pending = missingAtStart.filter((url) => {
    if (recoveredUrls.has(url)) return false;
    const entry = checkpoint.entries[url];
    if (!entry) return true;
    return options.retryFailures && entry.status === 'failed';
  });
  if (options.limit !== undefined) pending = pending.slice(0, options.limit);

  if (!(await fs.stat(auditFile).catch(() => null))) {
    await fs.writeFile(auditFile, 'source_url,status,attempts,checked_at,error\n');
  }

  let stopRequested = false;
  process.on('SIGINT', () => { stopRequested = true; });
  process.on('SIGTERM', () => { stopRequested = true; });
  let processedThisRun = 0;
  for (let offset = 0; offset < pending.length && !stopRequested; offset += options.concurrency) {
    const batch = pending.slice(offset, offset + options.concurrency);
    const results = await Promise.all(batch.map(async (url) => {
      const attempts = (checkpoint.entries[url]?.attempts ?? 0) + 1;
      const checkedAt = new Date().toISOString();
      try {
        const html = await fetchText(url, options.retries);
        const provider = extractProviderData(html, url);
        if (!provider) return { url, entry: { status: 'no-data', attempts, checked_at: checkedAt } satisfies CheckpointEntry };
        return { url, provider, entry: { status: 'recovered', attempts, checked_at: checkedAt } satisfies CheckpointEntry };
      } catch (error) {
        return { url, entry: { status: 'failed', attempts, checked_at: checkedAt, error: (error as Error).message } satisfies CheckpointEntry };
      }
    }));

    let recoveryAppend = '';
    let auditAppend = '';
    for (const result of results) {
      checkpoint.entries[result.url] = result.entry;
      if (result.provider && !recoveredUrls.has(result.url)) {
        recoveredUrls.add(result.url);
        recoveryAppend += `${JSON.stringify(result.provider)}\n`;
      }
      auditAppend += [result.url, result.entry.status, result.entry.attempts, result.entry.checked_at, result.entry.error ?? ''].map(escapeCsv).join(',') + '\n';
      processedThisRun++;
    }
    if (recoveryAppend) await fs.appendFile(recoveryFile, recoveryAppend);
    await fs.appendFile(auditFile, auditAppend);
    await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));
    const complete = Math.min(offset + batch.length, pending.length);
    if (complete % 100 < options.concurrency || complete === pending.length) {
      console.log(`Processed ${complete}/${pending.length} in this run`);
    }
    if (offset + options.concurrency < pending.length && !stopRequested) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
  }

  const statuses = { recovered: 0, 'no-data': 0, failed: 0 };
  for (const url of missingAtStart) {
    const status = checkpoint.entries[url]?.status;
    if (status) statuses[status]++;
  }
  const summary = {
    generated_at: new Date().toISOString(),
    sitemap_url: options.sitemapUrl,
    sitemap_sha256: sitemapHash,
    sitemap_urls: sitemapUrls.length,
    existing_rows: existingRows.length,
    existing_unique_source_urls: existingUrls.size,
    sitemap_urls_already_existing: sitemapUrls.filter((url) => existingUrls.has(url)).length,
    sitemap_urls_missing_at_start: missingAtStart.length,
    recovered_rows: recoveredUrls.size,
    recovery_statuses: statuses,
    remaining_unaccounted: missingAtStart.filter((url) => !checkpoint.entries[url]).length,
    processed_this_run: processedThisRun,
    stopped_early: stopRequested,
    files: { snapshotFile, inventoryFile, recoveryFile, auditFile, checkpointFile },
  };
  await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
