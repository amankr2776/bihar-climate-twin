// Real-data client for VARUNA.
//
// Uses the Open-Meteo Forecast API (open, no key, no auth) which serves
// IMD/ECMWF/GFS-blended observations and forecasts. We batch all 38 Bihar
// district centroids into one HTTP call.
//
// This is the honest data anchor for the app: current rainfall, temperature,
// relative humidity, soil moisture, and multi-day precipitation & temperature
// series come from a real physical-model source, not synthetic random.
//
// Notes on IMD/MOSDAC gridded datasets referenced in the brief:
//  - IMD gridded rainfall/temp (imdpune.gov.in) ships as legacy .grd binary
//    that must be decoded server-side (Python + imdlib) and aggregated to
//    admin polygons. That pipeline needs Lovable Cloud + a Python worker
//    (planned as the next milestone).
//  - MOSDAC INSAT products (LST/SST/IMC) sit behind login and require the
//    user's MOSDAC credentials.
// Until that ingestion worker is stood up, Open-Meteo gives us real,
// citable, forecast-grade values (see https://open-meteo.com/en/docs).

import { DISTRICTS, type District } from "./districts";
import { supabase } from "@/integrations/supabase/client";

export type CellProvenance = "mosdac" | "imd" | "open-meteo";

export type ClimateReading = {
  district_id: string;
  district_name: string;
  temperature_c: number;
  precipitation_mm: number; // last hour
  relative_humidity: number;
  soil_moisture: number; // m³/m³
  daily_precip_sum: number[]; // past + forecast days
  daily_temp_max: number[];
  daily_temp_min: number[];
  observation_time: string;
  imd_backed: boolean; // true if any past-day value came from IMD grids
  mosdac_backed: boolean; // true if any past-day value came from MOSDAC INSAT
  // Per-past-day provenance ledger; length == past_days used in buildUrl().
  provenance_rain: CellProvenance[];
  provenance_tmax: CellProvenance[];
  provenance_tmin: CellProvenance[];
};

export type ClimateSnapshot = {
  readings: ClimateReading[];
  fetched_at: string;
  source: "open-meteo" | "imd+open-meteo" | "mosdac+open-meteo" | "imd+mosdac+open-meteo" | "fallback";
  imd_days: number; // count of past-day cells overlaid from IMD
  mosdac_days: number; // count of past-day cells overlaid from MOSDAC
};



const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

function buildUrl(): string {
  const lats = DISTRICTS.map((d) => d.lat).join(",");
  const lngs = DISTRICTS.map((d) => d.lng).join(",");
  const params = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    current: "temperature_2m,precipitation,relative_humidity_2m,soil_moisture_0_to_1cm",
    daily: "precipitation_sum,temperature_2m_max,temperature_2m_min",
    past_days: "3",
    forecast_days: "3",
    timezone: "Asia/Kolkata",
  });
  return `${OPEN_METEO}?${params.toString()}`;
}

type OpenMeteoLocation = {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    relative_humidity_2m?: number;
    soil_moisture_0_to_1cm?: number;
    time?: string;
  };
  daily?: {
    precipitation_sum?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

type OverlayRow = {
  district_id: string;
  observed_on: string;
  rainfall_mm: number | null;
  tmax_c: number | null;
  tmin_c: number | null;
  source: string;
};

async function fetchDbOverlay(): Promise<Map<string, OverlayRow[]>> {
  const since = new Date();
  since.setDate(since.getDate() - 10);
  const { data, error } = await supabase
    .from("climate_observations")
    .select("district_id, observed_on, rainfall_mm, tmax_c, tmin_c, source")
    .in("source", ["imd", "mosdac"])
    .gte("observed_on", since.toISOString().slice(0, 10))
    .order("observed_on", { ascending: true });
  if (error || !data) return new Map();
  const map = new Map<string, OverlayRow[]>();
  for (const row of data as OverlayRow[]) {
    const list = map.get(row.district_id) ?? [];
    list.push(row);
    map.set(row.district_id, list);
  }
  return map;
}

export async function fetchBiharClimate(signal?: AbortSignal): Promise<ClimateSnapshot> {
  const [res, overlay] = await Promise.all([
    fetch(buildUrl(), { signal }),
    fetchDbOverlay().catch(() => new Map<string, OverlayRow[]>()),
  ]);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const raw = (await res.json()) as OpenMeteoLocation[] | OpenMeteoLocation;
  const arr: OpenMeteoLocation[] = Array.isArray(raw) ? raw : [raw];

  let imdCells = 0;
  let mosdacCells = 0;
  const readings: ClimateReading[] = DISTRICTS.map((d: District, i: number): ClimateReading => {
    const loc = arr[i] ?? arr[0];
    const c = loc?.current ?? {};
    const daily = loc?.daily ?? {};
    const dailyPrecip = (daily.precipitation_sum ?? []).map(Number);
    const dailyTmax = (daily.temperature_2m_max ?? []).map(Number);
    const dailyTmin = (daily.temperature_2m_min ?? []).map(Number);

    const rows = overlay.get(d.id) ?? [];
    const pastCount = Math.min(3, dailyPrecip.length);
    const provRain: CellProvenance[] = new Array(pastCount).fill("open-meteo");
    const provTmax: CellProvenance[] = new Array(pastCount).fill("open-meteo");
    const provTmin: CellProvenance[] = new Array(pastCount).fill("open-meteo");
    let imdHit = false;
    let mosdacHit = false;

    if (rows.length > 0 && pastCount > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let k = 0; k < pastCount; k++) {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() - (pastCount - k));
        const key = dayDate.toISOString().slice(0, 10);
        const dayRows = rows.filter((r) => r.observed_on === key);
        if (!dayRows.length) continue;
        const imd = dayRows.find((r) => r.source === "imd");
        const mos = dayRows.find((r) => r.source === "mosdac");

        // Rainfall: prefer MOSDAC (INSAT IMC satellite); fallback IMD.
        if (mos?.rainfall_mm != null) {
          dailyPrecip[k] = mos.rainfall_mm; provRain[k] = "mosdac"; mosdacHit = true; mosdacCells++;
        } else if (imd?.rainfall_mm != null) {
          dailyPrecip[k] = imd.rainfall_mm; provRain[k] = "imd"; imdHit = true; imdCells++;
        }
        // Tmax: prefer MOSDAC LST-derived; fallback IMD air-temp grid.
        if (mos?.tmax_c != null) {
          dailyTmax[k] = mos.tmax_c; provTmax[k] = "mosdac"; mosdacHit = true; mosdacCells++;
        } else if (imd?.tmax_c != null) {
          dailyTmax[k] = imd.tmax_c; provTmax[k] = "imd"; imdHit = true; imdCells++;
        }
        // Tmin: only IMD provides it.
        if (imd?.tmin_c != null) {
          dailyTmin[k] = imd.tmin_c; provTmin[k] = "imd"; imdHit = true; imdCells++;
        }
      }
    }

    return {
      district_id: d.id,
      district_name: d.name,
      temperature_c: Number(c.temperature_2m ?? 30),
      precipitation_mm: Number(c.precipitation ?? 0),
      relative_humidity: Number(c.relative_humidity_2m ?? 70),
      soil_moisture: Number(c.soil_moisture_0_to_1cm ?? 0.25),
      daily_precip_sum: dailyPrecip,
      daily_temp_max: dailyTmax,
      daily_temp_min: dailyTmin,
      observation_time: c.time ?? new Date().toISOString(),
      imd_backed: imdHit,
      mosdac_backed: mosdacHit,
      provenance_rain: provRain,
      provenance_tmax: provTmax,
      provenance_tmin: provTmin,
    };
  });

  const src: ClimateSnapshot["source"] =
    imdCells > 0 && mosdacCells > 0
      ? "imd+mosdac+open-meteo"
      : mosdacCells > 0
      ? "mosdac+open-meteo"
      : imdCells > 0
      ? "imd+open-meteo"
      : "open-meteo";

  return {
    readings,
    fetched_at: new Date().toISOString(),
    source: src,
    imd_days: imdCells,
    mosdac_days: mosdacCells,
  };
}



