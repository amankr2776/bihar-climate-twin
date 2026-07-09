import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Real backtest against `climate_observations`.
 *
 * We do NOT yet have a trained PI-GNN inference layer, so the honest baseline
 * is a **24-h persistence forecast**: ŷ(t) = y(t-1). Every metric on this page
 * is computed live from the last N days of IMD/Open-Meteo observations for
 * every Bihar district in the catalog.
 *
 *   RMSE          — rainfall (mm/day), persistence forecast vs observation
 *   CSI/POD/FAR   — flood-event detection (rainfall >= 50 mm/24 h)
 *   Weekly series — CSI(persistence) and CSI(3-day climatology) side-by-side
 *
 * When a real PI-GNN checkpoint is promoted we swap `pignn_csi` from
 * `persistence_csi` to the model's out-of-sample score. Until then the label
 * on the page says "persistence baseline (PI-GNN pending)".
 */

const FLOOD_THRESHOLD_MM = 50;
const WINDOW_DAYS = 30;

export type ValidationResult = {
  window_days: number;
  rows: number;
  districts: number;
  rmse_mm: number;
  mae_mm: number;
  bias_mm: number;
  csi: number;
  pod: number;
  far: number;
  confusion: { hits: number; misses: number; false_alarms: number; correct_negatives: number };
  weekly: Array<{ week: string; persistence_csi: number; climatology_csi: number; rmse: number; n: number }>;
  baseline: "persistence-24h";
  computed_at: string;
  note: string;
};

export const getValidationBacktest = createServerFn({ method: "GET" }).handler(
  async (): Promise<ValidationResult> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("supabase_env_missing");
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (WINDOW_DAYS + 2));
    const sinceIso = since.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("climate_observations")
      .select("district_id, observed_on, rainfall_mm")
      .gte("observed_on", sinceIso)
      .order("observed_on", { ascending: true });
    if (error) throw new Error(error.message);
    const obs = data ?? [];

    // Group by district → sorted date series.
    const byDistrict = new Map<string, Array<{ d: string; r: number | null }>>();
    for (const row of obs) {
      const arr = byDistrict.get(row.district_id) ?? [];
      arr.push({ d: row.observed_on, r: row.rainfall_mm });
      byDistrict.set(row.district_id, arr);
    }

    // Climatology baseline: rolling 3-day mean (ŷ(t) = mean(y(t-3..t-1))).
    let se = 0;
    let ae = 0;
    let biasSum = 0;
    let n = 0;
    let hits = 0;
    let misses = 0;
    let fa = 0;
    let cn = 0;

    // Weekly aggregates
    const weekAgg = new Map<
      string,
      { se: number; n: number; hitsP: number; missP: number; faP: number; cnP: number; hitsC: number; missC: number; faC: number; cnC: number }
    >();

    for (const [, series] of byDistrict) {
      series.sort((a, b) => a.d.localeCompare(b.d));
      for (let i = 3; i < series.length; i++) {
        const y = series[i].r;
        const y1 = series[i - 1].r;
        const y2 = series[i - 2].r;
        const y3 = series[i - 3].r;
        if (y == null || y1 == null || y2 == null || y3 == null) continue;
        const persistence = y1;
        const clim = (y1 + y2 + y3) / 3;
        const err = persistence - y;
        se += err * err;
        ae += Math.abs(err);
        biasSum += err;
        n += 1;

        const truthFlood = y >= FLOOD_THRESHOLD_MM;
        const persistFlood = persistence >= FLOOD_THRESHOLD_MM;
        const climFlood = clim >= FLOOD_THRESHOLD_MM;
        if (persistFlood && truthFlood) hits++;
        else if (!persistFlood && truthFlood) misses++;
        else if (persistFlood && !truthFlood) fa++;
        else cn++;

        // Weekly bucket keyed by ISO week
        const dt = new Date(series[i].d + "T00:00:00Z");
        const weekKey = isoWeekKey(dt);
        const w =
          weekAgg.get(weekKey) ??
          { se: 0, n: 0, hitsP: 0, missP: 0, faP: 0, cnP: 0, hitsC: 0, missC: 0, faC: 0, cnC: 0 };
        w.se += err * err;
        w.n += 1;
        if (persistFlood && truthFlood) w.hitsP++;
        else if (!persistFlood && truthFlood) w.missP++;
        else if (persistFlood && !truthFlood) w.faP++;
        else w.cnP++;
        if (climFlood && truthFlood) w.hitsC++;
        else if (!climFlood && truthFlood) w.missC++;
        else if (climFlood && !truthFlood) w.faC++;
        else w.cnC++;
        weekAgg.set(weekKey, w);
      }
    }

    const rmse = n > 0 ? Math.sqrt(se / n) : 0;
    const mae = n > 0 ? ae / n : 0;
    const bias = n > 0 ? biasSum / n : 0;
    const csi = hits + misses + fa > 0 ? hits / (hits + misses + fa) : 0;
    const pod = hits + misses > 0 ? hits / (hits + misses) : 0;
    const far = hits + fa > 0 ? fa / (hits + fa) : 0;

    const weekly = Array.from(weekAgg.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, w]) => ({
        week: week.slice(5), // "W##" style
        persistence_csi: safeCsi(w.hitsP, w.missP, w.faP),
        climatology_csi: safeCsi(w.hitsC, w.missC, w.faC),
        rmse: w.n > 0 ? +Math.sqrt(w.se / w.n).toFixed(2) : 0,
        n: w.n,
      }));

    return {
      window_days: WINDOW_DAYS,
      rows: n,
      districts: byDistrict.size,
      rmse_mm: +rmse.toFixed(2),
      mae_mm: +mae.toFixed(2),
      bias_mm: +bias.toFixed(2),
      csi: +csi.toFixed(3),
      pod: +pod.toFixed(3),
      far: +far.toFixed(3),
      confusion: { hits, misses, false_alarms: fa, correct_negatives: cn },
      weekly,
      baseline: "persistence-24h",
      computed_at: new Date().toISOString(),
      note: "Computed live from climate_observations (IMD + Open-Meteo). PI-GNN inference pending discharge data + GPU training.",
    };
  },
);

function safeCsi(h: number, m: number, f: number): number {
  const denom = h + m + f;
  return denom > 0 ? +(h / denom).toFixed(3) : 0;
}

function isoWeekKey(dt: Date): string {
  const t = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
