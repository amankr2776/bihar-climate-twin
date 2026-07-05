import { DISTRICTS, type District } from "./districts";

export type RiskCategory = "flood" | "compound" | "heat" | "normal" | "cold";

export type BlockState = {
  block_id: string;
  block_name: string;
  district_id: string;
  district_name: string;
  lat: number;
  lng: number;
  timestamp: string;
  rainfall_mm: number;
  temperature_c: number;
  lst_k: number;
  soil_moisture_index: number; // 0..1
  heat_retention_score: number; // 0..1
  rainfall_anomaly_pct: number; // deviation vs 30-day climatology
  flood_risk: number; // 0..1
  drought_risk: number; // 0..1
  compound_risk: boolean;
  category: RiskCategory;
  kosi_basin: boolean;
  population: number;
};

export type DistrictState = {
  district: District;
  blocks: BlockState[];
  category: RiskCategory;
  flood_risk: number;
  drought_risk: number;
  compound_risk: boolean;
  rainfall_mm: number;
  temperature_c: number;
  population_at_risk: number;
};

// Deterministic seeded PRNG so mock data is stable across renders.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCKS_PER_DISTRICT = 14; // 38 * 14 = 532 ≈ 534

function classify(flood: number, drought: number): RiskCategory {
  if (flood >= 0.6 && drought >= 0.4) return "compound";
  if (flood >= 0.55) return "flood";
  if (drought >= 0.55) return "heat";
  if (flood < 0.15 && drought < 0.15) return "cold";
  return "normal";
}

export function generateBlockState(
  timestampISO: string,
  anomalyBias: { rainfall_pct?: number; temperature_c?: number; soil_override?: "normal" | "drought-baked" | "saturated" } = {},
): { blocks: BlockState[]; districts: DistrictState[] } {
  const seedBase = Math.floor(new Date(timestampISO).getTime() / (3 * 60 * 60 * 1000));
  const blocks: BlockState[] = [];

  const rainfallBias = (anomalyBias.rainfall_pct ?? 0) / 100;
  const tempBias = anomalyBias.temperature_c ?? 0;

  for (const d of DISTRICTS) {
    const rand = mulberry32(seedBase + d.id.length * 7 + d.name.charCodeAt(0));
    for (let i = 0; i < BLOCKS_PER_DISTRICT; i++) {
      const jitterLat = (rand() - 0.5) * 0.28;
      const jitterLng = (rand() - 0.5) * 0.28;
      const lat = d.lat + jitterLat;
      const lng = d.lng + jitterLng;

      // Base signals — north Bihar gets rainfall pressure, south gets heat.
      const isNorth = d.region === "north" || d.kosiBasin;
      const isSouth = d.region === "south";
      const baseRain = (isNorth ? 42 : 8) + rand() * (isNorth ? 55 : 22);
      const baseTemp = (isSouth ? 38 : 32) + rand() * (isSouth ? 6 : 4);

      const rainfall_mm = Math.max(0, baseRain * (1 + rainfallBias) * (0.7 + rand() * 0.6));
      const temperature_c = baseTemp + tempBias + (rand() - 0.5) * 1.5;
      const lst_k = temperature_c + 273.15 + (rand() - 0.5) * 3;

      let soil =
        anomalyBias.soil_override === "drought-baked"
          ? 0.03 + rand() * 0.05
          : anomalyBias.soil_override === "saturated"
            ? 0.9 + rand() * 0.08
            : Math.min(1, Math.max(0, (isNorth ? 0.55 : 0.25) + (rand() - 0.5) * 0.35 + rainfallBias * 0.3));

      const heat = Math.min(1, Math.max(0, (isSouth ? 0.55 : 0.25) + (temperature_c - 32) * 0.05 + (rand() - 0.5) * 0.2));

      const rainfall_anomaly_pct = (rainfall_mm - (isNorth ? 45 : 12)) / (isNorth ? 45 : 12) * 100;

      // Flood risk: rain × antecedent moisture × Kosi weighting
      const flood_risk = Math.min(
        1,
        Math.max(
          0,
          0.35 * (rainfall_mm / 90) + 0.35 * soil + (d.kosiBasin ? 0.25 : 0.05) + (rand() - 0.5) * 0.1,
        ),
      );
      // Drought risk: heat × soil deficit
      const drought_risk = Math.min(1, Math.max(0, 0.5 * heat + 0.4 * (1 - soil) + (rand() - 0.5) * 0.1));

      const compound = flood_risk >= 0.6 && drought_risk >= 0.4;

      blocks.push({
        block_id: `${d.id}-b${i + 1}`,
        block_name: `${d.name} Block ${i + 1}`,
        district_id: d.id,
        district_name: d.name,
        lat,
        lng,
        timestamp: timestampISO,
        rainfall_mm: +rainfall_mm.toFixed(2),
        temperature_c: +temperature_c.toFixed(2),
        lst_k: +lst_k.toFixed(2),
        soil_moisture_index: +soil.toFixed(3),
        heat_retention_score: +heat.toFixed(3),
        rainfall_anomaly_pct: +rainfall_anomaly_pct.toFixed(1),
        flood_risk: +flood_risk.toFixed(3),
        drought_risk: +drought_risk.toFixed(3),
        compound_risk: compound,
        category: classify(flood_risk, drought_risk),
        kosi_basin: d.kosiBasin,
        population: Math.round((d.population * 1000) / BLOCKS_PER_DISTRICT),
      });
    }
  }

  const districts: DistrictState[] = DISTRICTS.map((d) => {
    const dBlocks = blocks.filter((b) => b.district_id === d.id);
    const flood = dBlocks.reduce((s, b) => s + b.flood_risk, 0) / dBlocks.length;
    const drought = dBlocks.reduce((s, b) => s + b.drought_risk, 0) / dBlocks.length;
    const rain = dBlocks.reduce((s, b) => s + b.rainfall_mm, 0) / dBlocks.length;
    const temp = dBlocks.reduce((s, b) => s + b.temperature_c, 0) / dBlocks.length;
    const compound = flood >= 0.6 && drought >= 0.4;
    const highRiskBlocks = dBlocks.filter((b) => b.flood_risk >= 0.6 || b.drought_risk >= 0.6);
    const pop = highRiskBlocks.reduce((s, b) => s + b.population, 0);
    return {
      district: d,
      blocks: dBlocks,
      category: classify(flood, drought),
      flood_risk: +flood.toFixed(3),
      drought_risk: +drought.toFixed(3),
      compound_risk: compound,
      rainfall_mm: +rain.toFixed(1),
      temperature_c: +temp.toFixed(1),
      population_at_risk: pop,
    };
  });

  return { blocks, districts };
}

export const RISK_COLORS: Record<RiskCategory, string> = {
  flood: "var(--risk-flood)",
  compound: "var(--risk-compound)",
  heat: "var(--risk-heat)",
  normal: "var(--risk-normal)",
  cold: "var(--risk-cold)",
};

export const RISK_LABELS: Record<RiskCategory, string> = {
  flood: "Flood / heavy rainfall",
  compound: "Compound (flood + heat)",
  heat: "Heatwave / drought",
  normal: "Normal",
  cold: "Cool / dry",
};
