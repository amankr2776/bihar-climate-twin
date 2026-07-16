/**
 * Shared Open-Meteo fetch helper for VARUNA ingestion hooks.
 *
 * Handles the two chronic reliability issues we saw in ingest_audit:
 *   1. Bursty 429s when 38 coords are stuffed into one URL — we now split
 *      the district list into smaller coordinate chunks and interleave a
 *      short delay between chunks so we stay under Open-Meteo's per-minute
 *      quota.
 *   2. Transient upstream_429 / upstream_5xx with no retry — we now
 *      exponential-backoff (respecting Retry-After when the server sends
 *      it) up to `MAX_ATTEMPTS` before giving up on that chunk.
 *
 * The response is always an array of per-district daily blocks aligned
 * with the input district order, matching what the previous single-URL
 * flow returned.
 */

export type OpenMeteoDaily = {
  time: string[];
  precipitation_sum: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
};

export type OpenMeteoResp = { daily?: OpenMeteoDaily };

type District = { id: string; lat: number; lng: number };

const COORD_CHUNK = 12; // 3–4 chunks for 38 districts
const MAX_ATTEMPTS = 4;
const CHUNK_DELAY_MS = 900;

const UA = "VarunaDigitalTwin/1.0 (+https://varuna-digital-twin.lovable.app)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string): Promise<OpenMeteoResp[]> {
  let lastMsg = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json", "user-agent": UA },
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok) {
        const body = (await res.json()) as OpenMeteoResp[] | OpenMeteoResp;
        return Array.isArray(body) ? body : [body];
      }
      lastMsg = `upstream_${res.status}`;
      // Only retry on transient failures.
      if (res.status !== 429 && res.status < 500) throw new Error(lastMsg);
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15_000)
        : Math.min(1500 * 2 ** (attempt - 1), 12_000) + Math.floor(Math.random() * 500);
      if (attempt < MAX_ATTEMPTS) await sleep(backoff);
    } catch (err) {
      lastMsg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(Math.min(1500 * 2 ** (attempt - 1), 12_000));
      }
    }
  }
  throw new Error(lastMsg);
}

/**
 * Fetch Open-Meteo daily data for many districts, chunking coordinates and
 * retrying transient failures. Returns one entry per district, in input order.
 */
export async function fetchDailyBatched(
  baseUrl: "https://api.open-meteo.com/v1/forecast" | "https://archive-api.open-meteo.com/v1/archive",
  districts: District[],
  params: Record<string, string>,
): Promise<OpenMeteoResp[]> {
  const out: OpenMeteoResp[] = [];
  for (let i = 0; i < districts.length; i += COORD_CHUNK) {
    const slice = districts.slice(i, i + COORD_CHUNK);
    const lat = slice.map((d) => d.lat).join(",");
    const lng = slice.map((d) => d.lng).join(",");
    const qs = new URLSearchParams({ latitude: lat, longitude: lng, ...params });
    const url = `${baseUrl}?${qs.toString()}`;
    const chunkResp = await fetchWithRetry(url);
    if (chunkResp.length !== slice.length) {
      throw new Error(`shape_mismatch:chunk got ${chunkResp.length}, expected ${slice.length}`);
    }
    out.push(...chunkResp);
    if (i + COORD_CHUNK < districts.length) await sleep(CHUNK_DELAY_MS);
  }
  return out;
}
