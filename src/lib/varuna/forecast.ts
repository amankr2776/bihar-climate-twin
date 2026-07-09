import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ForecastRow = {
  district_id: string;
  forecast_for: string; // YYYY-MM-DD
  run_at: string;
  rainfall_mm: number | null;
  tmax_c: number | null;
  tmin_c: number | null;
  source: string;
  dataset_version: string | null;
};

export type ForecastSummary = {
  rows: ForecastRow[];
  latest_run_at: string | null;
  days: number;
  districts_covered: number;
};

async function fetchForecast(): Promise<ForecastSummary> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("climate_forecasts")
    .select("district_id,forecast_for,run_at,rainfall_mm,tmax_c,tmin_c,source,dataset_version")
    .gte("forecast_for", todayIso)
    .order("forecast_for", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as ForecastRow[];
  const latest_run_at = rows.reduce<string | null>(
    (acc, r) => (!acc || r.run_at > acc ? r.run_at : acc),
    null,
  );
  const districts = new Set(rows.map((r) => r.district_id));
  const days = new Set(rows.map((r) => r.forecast_for));
  return {
    rows,
    latest_run_at,
    days: days.size,
    districts_covered: districts.size,
  };
}

export function useForecast() {
  return useQuery({
    queryKey: ["varuna", "forecast"],
    queryFn: fetchForecast,
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}

export function forecastForDistrict(
  summary: ForecastSummary | undefined,
  districtId: string | undefined,
): ForecastRow[] {
  if (!summary || !districtId) return [];
  return summary.rows
    .filter((r) => r.district_id === districtId)
    .sort((a, b) => a.forecast_for.localeCompare(b.forecast_for));
}
