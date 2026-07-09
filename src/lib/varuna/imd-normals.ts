// IMD 2022-2024 monsoon climatology.
//
// For a given calendar day (defaults to today), we query the ingested IMD
// grid rows in `climate_observations` (source='imd') for a ±windowDays window
// around that day-of-year, across the 3 monsoon seasons (2022, 2023, 2024).
// The result is a per-district "normal" — real observed averages the app
// uses as an anchor for both the Dashboard KPI and the Prediction Engine.
//
// Data availability: monsoon window only (Jun 1 – Sep 30 each year).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ImdNormal = {
  district_id: string;
  rain_mm_normal: number | null; // daily average (mm/day)
  tmax_c_normal: number | null;
  tmin_c_normal: number | null;
  sample_days: number;
};

export type ImdNormalsResult = {
  reference_day: string; // ISO date the normal is centred on
  window_days: number; // ±N days around DOY
  years: number[]; // e.g. [2022, 2023, 2024]
  by_district: Record<string, ImdNormal>;
  total_rows: number;
};

const IMD_YEARS = [2022, 2023, 2024];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function windowDatesForYear(refDoyMonth: number, refDoyDay: number, year: number, windowDays: number): string[] {
  const centre = new Date(Date.UTC(year, refDoyMonth, refDoyDay));
  const out: string[] = [];
  for (let k = -windowDays; k <= windowDays; k++) {
    const d = new Date(centre);
    d.setUTCDate(centre.getUTCDate() + k);
    if (d.getUTCFullYear() !== year) continue; // stay within the IMD year we ingested
    out.push(isoDate(d));
  }
  return out;
}

export async function fetchImdNormals(
  referenceDay: Date = new Date(),
  windowDays = 3,
): Promise<ImdNormalsResult> {
  const month = referenceDay.getUTCMonth();
  const day = referenceDay.getUTCDate();

  const allDates = IMD_YEARS.flatMap((y) => windowDatesForYear(month, day, y, windowDays));

  const empty: ImdNormalsResult = {
    reference_day: isoDate(referenceDay),
    window_days: windowDays,
    years: IMD_YEARS,
    by_district: {},
    total_rows: 0,
  };
  if (allDates.length === 0) return empty;

  const { data, error } = await supabase
    .from("climate_observations")
    .select("district_id, observed_on, rainfall_mm, tmax_c, tmin_c, source")
    .in("source", ["imd", "mosdac"])
    .in("observed_on", allDates);


  if (error || !data) return empty;

  const agg = new Map<
    string,
    { r: number; rN: number; tx: number; txN: number; tn: number; tnN: number; days: Set<string> }
  >();
  for (const row of data as Array<{
    district_id: string;
    observed_on: string;
    rainfall_mm: number | null;
    tmax_c: number | null;
    tmin_c: number | null;
  }>) {
    let a = agg.get(row.district_id);
    if (!a) {
      a = { r: 0, rN: 0, tx: 0, txN: 0, tn: 0, tnN: 0, days: new Set() };
      agg.set(row.district_id, a);
    }
    a.days.add(row.observed_on);
    if (row.rainfall_mm != null) { a.r += row.rainfall_mm; a.rN++; }
    if (row.tmax_c != null) { a.tx += row.tmax_c; a.txN++; }
    if (row.tmin_c != null) { a.tn += row.tmin_c; a.tnN++; }
  }

  const by_district: Record<string, ImdNormal> = {};
  agg.forEach((a, id) => {
    by_district[id] = {
      district_id: id,
      rain_mm_normal: a.rN ? a.r / a.rN : null,
      tmax_c_normal: a.txN ? a.tx / a.txN : null,
      tmin_c_normal: a.tnN ? a.tn / a.tnN : null,
      sample_days: a.days.size,
    };
  });

  return { ...empty, by_district, total_rows: data.length };
}

/** Aggregate state-wide mean of district normals (equal-weighted). */
export function stateWideNormal(result: ImdNormalsResult | undefined) {
  if (!result) return null;
  const rows = Object.values(result.by_district);
  if (!rows.length) return null;
  const mean = (get: (r: ImdNormal) => number | null) => {
    const vals = rows.map(get).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  return {
    rain_mm: mean((r) => r.rain_mm_normal),
    tmax_c: mean((r) => r.tmax_c_normal),
    tmin_c: mean((r) => r.tmin_c_normal),
    districts_covered: rows.length,
    total_rows: result.total_rows,
  };
}

export function useImdNormals(referenceDay?: Date, windowDays = 3) {
  const key = (referenceDay ?? new Date()).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["varuna", "imd-normals", key, windowDays],
    queryFn: () => fetchImdNormals(referenceDay ?? new Date(), windowDays),
    staleTime: 60 * 60_000, // climatology doesn't change during a session
    gcTime: 4 * 60 * 60_000,
  });
}
