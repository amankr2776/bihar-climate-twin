// VARUNA API client — talks to Open-Meteo for real observational data
// and builds block-level state from those readings. Falls back to a
// deterministic synthetic generator if the network is unavailable.

import {
  buildStateFromReadings,
  generateBlockState,
  type BlockState,
  type DistrictState,
  type ScenarioBias,
} from "./state";
import type { RoutingTrace } from "./kosi-graph";
import { fetchBiharClimate, type ClimateSnapshot } from "./climate";
import { DISTRICTS } from "./districts";

export type SimulationInput = {
  rainfall_anomaly_pct: number;
  temperature_anomaly_c: number;
  soil_condition: "normal" | "drought-baked" | "saturated";
};

export type SimulationResult = {
  flood_level: { score: number; label: string; explanation: string };
  drought_index: { score: number; label: string; explanation: string };
  heatwave_alert: { score: number; label: string; explanation: string };
  coldwave_alert: { score: number; label: string; explanation: string };
  severity_multiplier: number;
  districts_affected: number;
  cascade: Array<{ hours_ahead: number; category_counts: Record<string, number> }>;
};

export type AlertItem = {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "moderate";
  district: string;
  block?: string;
  message: string;
};

export type CurrentState = {
  blocks: BlockState[];
  districts: DistrictState[];
  routing: RoutingTrace[];
  timestamp: string;
  source: ClimateSnapshot["source"];
};

// --- Shared climate snapshot cache (deduped across pages) ---
let climatePromise: Promise<ClimateSnapshot> | null = null;
let climateCachedAt = 0;
const CLIMATE_TTL_MS = 10 * 60 * 1000; // 10 min

async function getClimate(): Promise<ClimateSnapshot> {
  const fresh = Date.now() - climateCachedAt < CLIMATE_TTL_MS;
  if (climatePromise && fresh) return climatePromise;
  climatePromise = fetchBiharClimate()
    .then((s) => {
      climateCachedAt = Date.now();
      return s;
    })
    .catch((err) => {
      climatePromise = null;
      throw err;
    });
  return climatePromise;
}

export function invalidateClimateCache() {
  climatePromise = null;
  climateCachedAt = 0;
}

export async function getCurrentState(bias: ScenarioBias = {}): Promise<CurrentState> {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() - (now.getHours() % 3));
  const ts = now.toISOString();

  try {
    const snap = await getClimate();
    const { blocks, districts, routing } = buildStateFromReadings(snap.readings, ts, bias);
    return { blocks, districts, routing, timestamp: ts, source: snap.source };
  } catch {
    const { blocks, districts, routing } = generateBlockState(ts, bias);
    return { blocks, districts, routing, timestamp: ts, source: "fallback" };
  }
}

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  // Cascade the scenario forward using the same builder so the result is
  // consistent with what the live map will show once the scenario is applied.
  const now = new Date();
  let snapshot: ClimateSnapshot | null = null;
  try {
    snapshot = await getClimate();
  } catch {
    snapshot = null;
  }

  const cascade = [0, 3, 6, 9, 12].map((h) => {
    const ts = new Date(now.getTime() + h * 3600_000).toISOString();
    // Ramp the anomaly in over time (0 at now, full at +12h).
    const ramp = Math.min(1, h / 12 + 0.2);
    const bias: ScenarioBias = {
      rainfall_pct: input.rainfall_anomaly_pct * ramp,
      temperature_c: input.temperature_anomaly_c * ramp,
      soil_override: input.soil_condition === "normal" ? undefined : input.soil_condition,
    };
    const { blocks } = snapshot
      ? buildStateFromReadings(snapshot.readings, ts, bias)
      : generateBlockState(ts, bias);
    const counts: Record<string, number> = {};
    for (const b of blocks) counts[b.category] = (counts[b.category] ?? 0) + 1;
    return { hours_ahead: h, category_counts: counts };
  });

  const last = cascade[cascade.length - 1].category_counts;
  const flood = (last.flood ?? 0) + (last.compound ?? 0);
  const heat = (last.heat ?? 0) + (last.compound ?? 0);
  const compound = last.compound ?? 0;
  const districtsAffected = Math.round((flood + heat) / 14);

  const label = (score: number) =>
    score >= 0.75 ? "Severe" : score >= 0.5 ? "Elevated" : score >= 0.25 ? "Watch" : "Normal";

  const floodScore = Math.min(1, flood / 250);
  const droughtScore = Math.min(1, heat / 250);
  const heatScore = Math.min(
    1,
    (last.heat ?? 0) / 200 + Math.max(0, input.temperature_anomaly_c) / 10,
  );
  const coldScore = Math.max(0, -input.temperature_anomaly_c) / 8;

  return {
    flood_level: {
      score: floodScore,
      label: label(floodScore),
      explanation:
        input.soil_condition === "drought-baked"
          ? "Sun-baked soil rejects infiltration — surface runoff amplifies flood risk in Kosi-adjacent blocks."
          : "Kosi basin blocks showing elevated saturation; pre-position NDRF in Supaul, Madhepura, Saharsa.",
    },
    drought_index: {
      score: droughtScore,
      label: label(droughtScore),
      explanation: "South Bihar (Gaya, Aurangabad, Nawada) shows sustained soil moisture deficit.",
    },
    heatwave_alert: {
      score: heatScore,
      label: label(heatScore),
      explanation:
        "Heat retention score rising across south-central belt; advise cooling-shelter activation.",
    },
    coldwave_alert: {
      score: coldScore,
      label: label(coldScore),
      explanation:
        coldScore > 0
          ? "Nocturnal temperatures dropping in north corridor."
          : "No coldwave signature in projection window.",
    },
    severity_multiplier: (() => {
      const maxRisk = Math.max(floodScore, droughtScore, heatScore);
      const soilBoost =
        input.soil_condition === "saturated" ? 0.65 :
        input.soil_condition === "drought-baked" ? 0.55 : 0;
      const rainAmp = Math.abs(input.rainfall_anomaly_pct) / 100;
      const tempAmp = Math.abs(input.temperature_anomaly_c) / 10;
      const compoundBoost = compound / 25;
      let m = 1 + maxRisk * 1.4 + soilBoost + rainAmp * 0.5 + tempAmp * 0.4 + compoundBoost;
      // Compound amplification: severe + saturated + heavy rain magnifies further.
      if (floodScore >= 0.75 && input.soil_condition === "saturated") m += 0.35;
      // Floor: never show ×1 when risk label is Severe or Critical.
      if (maxRisk >= 0.75) m = Math.max(m, 2.15);
      else if (maxRisk >= 0.5) m = Math.max(m, 1.45);
      return +Math.min(3.5, m).toFixed(2);
    })(),
    districts_affected: Math.min(38, districtsAffected),
    cascade,
  };
}

export async function getAlerts(bias: ScenarioBias = {}): Promise<AlertItem[]> {
  const { blocks } = await getCurrentState(bias);
  const now = Date.now();
  const items: AlertItem[] = [];
  const sorted = [...blocks].sort(
    (a, b) => b.flood_risk + b.drought_risk - (a.flood_risk + a.drought_risk),
  );
  for (let i = 0; i < 12 && i < sorted.length; i++) {
    const b = sorted[i];
    const sev: AlertItem["severity"] = b.compound_risk || b.flood_risk > 0.82 || b.drought_risk > 0.82
      ? "critical"
      : b.flood_risk > 0.65 || b.drought_risk > 0.65
        ? "high"
        : "moderate";
    const msg = b.compound_risk
      ? `Compound risk: flood ${(b.flood_risk * 100).toFixed(0)}% + drought ${(b.drought_risk * 100).toFixed(0)}%`
      : b.flood_risk > b.drought_risk
        ? `Flood risk crossed threshold — rainfall anomaly ${b.rainfall_anomaly_pct.toFixed(0)}%`
        : `Heat stress rising — soil moisture ${(b.soil_moisture_index * 100).toFixed(0)}%`;
    items.push({
      id: `alert-${b.block_id}`,
      timestamp: new Date(now - i * 6 * 60_000).toISOString(),
      severity: sev,
      district: b.district_name,
      block: b.block_name,
      message: msg,
    });
  }
  return items;
}

// 7-day trend of Kosi-basin rainfall vs South-Bihar soil moisture, built
// from the real Open-Meteo daily arrays (past_days=3 + forecast_days=3
// gives us the full window through today).
export async function kosiTrend7Day(): Promise<
  Array<{ day: string; kosi_level_m: number; south_soil_pct: number }>
> {
  try {
    const snap = await getClimate();
    const kosiIds = new Set(DISTRICTS.filter((d) => d.kosiBasin).map((d) => d.id));
    const southIds = new Set(DISTRICTS.filter((d) => d.region === "south").map((d) => d.id));
    const readings = snap.readings;
    const daysCount = Math.min(7, readings[0]?.daily_precip_sum.length ?? 0);
    if (!daysCount) throw new Error("no daily data");

    const out: Array<{ day: string; kosi_level_m: number; south_soil_pct: number }> = [];
    for (let d = 0; d < daysCount; d++) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - (readings[0]?.daily_precip_sum.length ?? 0) + d + 3);
      const kosiRain =
        readings
          .filter((r) => kosiIds.has(r.district_id))
          .reduce((s, r) => s + (r.daily_precip_sum[d] ?? 0), 0) / (kosiIds.size || 1);
      // Approx Kosi barrage stage from cumulative rainfall (illustrative rating curve)
      const kosi_level_m = 48 + Math.min(2.4, kosiRain / 25);
      // South-Bihar current soil moisture (percentage), lagged with the day index
      const soilAvg =
        readings
          .filter((r) => southIds.has(r.district_id))
          .reduce((s, r) => s + r.soil_moisture, 0) / (southIds.size || 1);
      const south_soil_pct = Math.max(5, soilAvg * 100 - d * 0.6);
      out.push({
        day: dayDate.toISOString().slice(5, 10),
        kosi_level_m: +kosi_level_m.toFixed(2),
        south_soil_pct: +south_soil_pct.toFixed(1),
      });
    }
    return out;
  } catch {
    // Deterministic fallback so the chart still renders offline.
    const out: Array<{ day: string; kosi_level_m: number; south_soil_pct: number }> = [];
    const rand = (i: number) => Math.abs(Math.sin(i * 1.7)) * 0.5;
    for (let i = -6; i <= 0; i++) {
      const day = new Date(Date.now() + i * 86400_000).toISOString().slice(5, 10);
      out.push({
        day,
        kosi_level_m: +(48.2 + i * 0.35 + rand(i) * 0.4).toFixed(2),
        south_soil_pct: +Math.max(6, 24 - i * 1.2 - rand(i + 3) * 3).toFixed(1),
      });
    }
    return out;
  }
}
