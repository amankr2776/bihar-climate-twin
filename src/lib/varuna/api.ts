// VARUNA API client.
//
// If VITE_VARUNA_API_URL is set, requests are proxied to your FastAPI backend
// (endpoints described in the PoC brief). Otherwise the client falls back to a
// deterministic mock generator so the dashboard is fully demoable stand-alone.

import { generateBlockState, type BlockState, type DistrictState } from "./state";

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

const BASE_URL = (import.meta.env.VITE_VARUNA_API_URL as string | undefined) ?? "";

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE_URL) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type CurrentState = { blocks: BlockState[]; districts: DistrictState[]; timestamp: string };

export async function getCurrentState(): Promise<CurrentState> {
  const now = new Date();
  // snap to previous 3-hour slot
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() - (now.getHours() % 3));
  const ts = now.toISOString();

  const remote = await tryFetch<CurrentState>(`/state/current`);
  if (remote) return remote;

  const { blocks, districts } = generateBlockState(ts);
  return { blocks, districts, timestamp: ts };
}

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const remote = await tryFetch<SimulationResult>(`/simulate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (remote) return remote;

  // Local rule-based cascade for the mock path.
  const now = new Date();
  const cascade = [0, 3, 6, 9, 12].map((h) => {
    const ts = new Date(now.getTime() + h * 3600_000).toISOString();
    const { blocks } = generateBlockState(ts, {
      rainfall_pct: input.rainfall_anomaly_pct,
      temperature_c: input.temperature_anomaly_c,
      soil_override: input.soil_condition,
    });
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
  const heatScore = Math.min(1, (last.heat ?? 0) / 200 + Math.max(0, input.temperature_anomaly_c) / 10);
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
      explanation: "Heat retention score rising across south-central belt; advise cooling-shelter activation.",
    },
    coldwave_alert: {
      score: coldScore,
      label: label(coldScore),
      explanation: coldScore > 0 ? "Nocturnal temperatures dropping in north corridor." : "No coldwave signature in projection window.",
    },
    severity_multiplier: +(1 + compound / 40).toFixed(2),
    districts_affected: Math.min(38, districtsAffected),
    cascade,
  };
}

export async function getAlerts(): Promise<AlertItem[]> {
  const remote = await tryFetch<AlertItem[]>(`/alerts`);
  if (remote) return remote;

  const { blocks } = await getCurrentState();
  const now = Date.now();
  const items: AlertItem[] = [];
  const sorted = [...blocks].sort((a, b) => b.flood_risk + b.drought_risk - (a.flood_risk + a.drought_risk));
  for (let i = 0; i < 12 && i < sorted.length; i++) {
    const b = sorted[i];
    const sev: AlertItem["severity"] = b.compound_risk ? "critical" : b.flood_risk > 0.7 || b.drought_risk > 0.7 ? "high" : "moderate";
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

export function kosiTrend7Day(): Array<{ day: string; kosi_level_m: number; south_soil_pct: number }> {
  const out: Array<{ day: string; kosi_level_m: number; south_soil_pct: number }> = [];
  const rand = (i: number) => Math.abs(Math.sin(i * 1.7)) * 0.5;
  for (let i = -6; i <= 0; i++) {
    const day = new Date(Date.now() + i * 86400_000).toISOString().slice(5, 10);
    // Kosi rising, south soil falling — classic compound
    const kosi = 48.2 + i * 0.35 + rand(i) * 0.4;
    const soil = 24 - i * 1.2 - rand(i + 3) * 3; // %
    out.push({ day, kosi_level_m: +kosi.toFixed(2), south_soil_pct: +Math.max(6, soil).toFixed(1) });
  }
  return out;
}
