// Additional synthetic data producers for the six sub-pages.
import { DISTRICTS } from "./districts";

export type HistoricalCompoundEvent = {
  id: string;
  date: string;
  region: string;
  durationHours: number;
  peakSeverity: number;
  blocksAffected: number;
  outcome: string;
};

export function historicalCompoundEvents(): HistoricalCompoundEvent[] {
  const rows: HistoricalCompoundEvent[] = [
    { id: "e1", date: "2024-08-14", region: "Kosi Basin — Northeast", durationHours: 62, peakSeverity: 3.4, blocksAffected: 84, outcome: "NDRF deployed · 12 blocks evacuated" },
    { id: "e2", date: "2024-07-28", region: "Gaya + Nawada — South", durationHours: 48, peakSeverity: 2.8, blocksAffected: 41, outcome: "Heat + drought advisory issued" },
    { id: "e3", date: "2024-07-11", region: "Purnia + Kishanganj", durationHours: 30, peakSeverity: 2.2, blocksAffected: 26, outcome: "Contained · water rationing" },
    { id: "e4", date: "2024-06-22", region: "Aurangabad + Rohtas", durationHours: 21, peakSeverity: 1.9, blocksAffected: 18, outcome: "Advisory only" },
    { id: "e5", date: "2023-09-05", region: "Supaul + Madhepura", durationHours: 74, peakSeverity: 3.1, blocksAffected: 68, outcome: "Major flood response" },
    { id: "e6", date: "2023-08-19", region: "Darbhanga + Madhubani", durationHours: 45, peakSeverity: 2.5, blocksAffected: 39, outcome: "Preemptive evacuation" },
    { id: "e7", date: "2023-07-30", region: "Katihar + Bhagalpur", durationHours: 36, peakSeverity: 2.3, blocksAffected: 31, outcome: "Contained" },
    { id: "e8", date: "2023-06-15", region: "Jamui + Banka", durationHours: 18, peakSeverity: 1.7, blocksAffected: 12, outcome: "Advisory" },
    { id: "e9", date: "2022-08-09", region: "Sitamarhi + Sheohar", durationHours: 55, peakSeverity: 2.9, blocksAffected: 45, outcome: "NDRF assist" },
    { id: "e10", date: "2022-07-24", region: "Muzaffarpur + Vaishali", durationHours: 40, peakSeverity: 2.4, blocksAffected: 33, outcome: "Contained" },
    { id: "e11", date: "2022-06-30", region: "East Champaran", durationHours: 25, peakSeverity: 2.0, blocksAffected: 20, outcome: "Advisory" },
    { id: "e12", date: "2021-09-12", region: "Saharsa + Khagaria", durationHours: 58, peakSeverity: 2.7, blocksAffected: 42, outcome: "Response deployed" },
  ];
  return rows;
}

export function validationSeries(): { date: string; csi: number; rmse: number; persistenceRmse: number }[] {
  const out: { date: string; csi: number; rmse: number; persistenceRmse: number }[] = [];
  const now = Date.now();
  const rand = (i: number) => (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * 0.05;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400_000).toISOString().slice(5, 10);
    const csi = Math.max(0.6, Math.min(0.92, 0.82 + rand(i)));
    const rmse = Math.max(2.0, 3.6 + rand(i + 2) * 8);
    out.push({ date: d, csi: +csi.toFixed(3), rmse: +rmse.toFixed(2), persistenceRmse: +(rmse * 1.35).toFixed(2) });
  }
  return out;
}

export function predObsScatter(): { pred: number; obs: number }[] {
  const out: { pred: number; obs: number }[] = [];
  for (let i = 0; i < 200; i++) {
    const obs = Math.random() * 90;
    const noise = (Math.random() - 0.5) * 14;
    out.push({ obs: +obs.toFixed(2), pred: +Math.max(0, obs + noise).toFixed(2) });
  }
  return out;
}

export function block30DayHistory(seed: number): { day: string; rainfall: number; temp: number; soil: number; flood: number; drought: number; heat: number }[] {
  const out: { day: string; rainfall: number; temp: number; soil: number; flood: number; drought: number; heat: number }[] = [];
  const now = Date.now();
  const rnd = (i: number) => Math.abs(Math.sin(i * seed * 0.31));
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400_000).toISOString().slice(5, 10);
    out.push({
      day: d,
      rainfall: +(rnd(i) * 65 + 5).toFixed(1),
      temp: +(28 + rnd(i + 1) * 12).toFixed(1),
      soil: +(0.2 + rnd(i + 2) * 0.6).toFixed(2),
      flood: +(rnd(i + 3) * 0.9).toFixed(2),
      drought: +(rnd(i + 4) * 0.8).toFixed(2),
      heat: +(rnd(i + 5) * 0.85).toFixed(2),
    });
  }
  return out;
}

export function districtList() {
  return DISTRICTS.map((d) => ({ id: d.id, name: d.name }));
}

export function alertHistory(): {
  id: string;
  severity: "critical" | "high" | "moderate";
  text: string;
  district: string;
  triggeredAt: string;
  resolvedAt: string;
  durationH: number;
  ackBy: string;
}[] {
  const arr: {
    id: string;
    severity: "critical" | "high" | "moderate";
    text: string;
    district: string;
    triggeredAt: string;
    resolvedAt: string;
    durationH: number;
    ackBy: string;
  }[] = [];
  const sevs: ("critical" | "high" | "moderate")[] = ["critical", "high", "moderate"];
  for (let i = 0; i < 30; i++) {
    const d = DISTRICTS[i % DISTRICTS.length];
    const t = Date.now() - (i + 1) * 3600_000 * 4;
    const dur = 2 + (i % 8);
    arr.push({
      id: `h-${i}`,
      severity: sevs[i % 3],
      text: i % 2 === 0 ? `Flood risk elevated in ${d.name}` : `Heatwave watch — ${d.name}`,
      district: d.name,
      triggeredAt: new Date(t).toISOString(),
      resolvedAt: new Date(t + dur * 3600_000).toISOString(),
      durationH: dur,
      ackBy: ["System", "A. Kumar", "R. Sharma"][i % 3],
    });
  }
  return arr;
}
