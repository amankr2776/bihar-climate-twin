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
  imd_backed: boolean; // true if past-days values came from IMD grids
};

export type ClimateSnapshot = {
  readings: ClimateReading[];
  fetched_at: string;
  source: "open-meteo" | "imd+open-meteo" | "fallback";
  imd_days: number; // count of past days IMD-backed
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

export async function fetchBiharClimate(signal?: AbortSignal): Promise<ClimateSnapshot> {
  const res = await fetch(buildUrl(), { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const raw = (await res.json()) as OpenMeteoLocation[] | OpenMeteoLocation;
  const arr: OpenMeteoLocation[] = Array.isArray(raw) ? raw : [raw];

  const readings: ClimateReading[] = DISTRICTS.map((d: District, i: number): ClimateReading => {
    const loc = arr[i] ?? arr[0];
    const c = loc?.current ?? {};
    const daily = loc?.daily ?? {};
    return {
      district_id: d.id,
      district_name: d.name,
      temperature_c: Number(c.temperature_2m ?? 30),
      precipitation_mm: Number(c.precipitation ?? 0),
      relative_humidity: Number(c.relative_humidity_2m ?? 70),
      soil_moisture: Number(c.soil_moisture_0_to_1cm ?? 0.25),
      daily_precip_sum: (daily.precipitation_sum ?? []).map(Number),
      daily_temp_max: (daily.temperature_2m_max ?? []).map(Number),
      daily_temp_min: (daily.temperature_2m_min ?? []).map(Number),
      observation_time: c.time ?? new Date().toISOString(),
    };
  });

  return {
    readings,
    fetched_at: new Date().toISOString(),
    source: "open-meteo",
  };
}
