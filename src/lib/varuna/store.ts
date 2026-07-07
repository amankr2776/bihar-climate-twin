// Simple cross-page store using useSyncExternalStore.
import { useSyncExternalStore } from "react";
import type { ScenarioBias } from "./state";


export type SavedScenario = {
  id: string;
  name: string;
  savedAt: string;
  rainfall: number;
  temperature: number;
  humidity: number;
  soil: string;
  antecedent: string;
  season: string;
  districts: string[];
  cascadeDepth: number;
  result?: {
    floodLabel: string;
    heatLabel: string;
    severityMultiplier: number;
    districtsAffected: number;
  };
};

export type AckAlert = { id: string; ackAt: string; status: "acknowledged" | "escalated"; notes?: string };

export type SavedReport = {
  id: string;
  type: string;
  generatedAt: string;
  period: string;
  author: string;
  sizeKb: number;
  districts: string[];
};

export type AlertConfig = {
  emailNotifications: boolean;
  smsNotifications: boolean;
  dashboardAlerts: boolean;
  autoEscalate: boolean;
  floodThreshold: number;
  droughtThreshold: number;
  compoundThreshold: number;
};

export type DataSource = {
  name: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync: number; // epoch ms
};

export type SystemStatus = {
  uptime: string;
  lastInference: number;
  dbHealthy: boolean;
  nextModelRunMin: number;
  ingestionMin: number;
  queueDepth: number;
};

export type VarunaState = {
  selectedDistrict: string | null;
  selectedBlock: string | null;
  savedScenarios: SavedScenario[];
  ackAlerts: Record<string, AckAlert>;
  dismissedAlerts: string[];
  savedReports: SavedReport[];
  alertConfig: AlertConfig;
  displayPrefs: {
    units: "metric" | "imperial";
    refreshMinutes: number;
    defaultMapLayer: string;
  };
  userProfile: {
    name: string;
    role: string;
    organization: string;
  };
  dataSources: DataSource[];
  apiKey: string;
  systemStatus: SystemStatus;
  /** Active scenario driving the live twin. null = observed baseline. */
  scenarioBias: ScenarioBias | null;
  activeScenarioName: string | null;
};


const seedReports = (): SavedReport[] =>
  [
    ["Daily Situation Report", "2026-07-06", "System"],
    ["Compound Risk Brief", "2026-07-05", "A. Kumar"],
    ["District-Level Flood Assessment", "2026-07-04", "System"],
    ["Drought Status Report", "2026-07-03", "R. Sharma"],
    ["What-If Scenario Report", "2026-07-02", "System"],
    ["Weekly Climate Summary", "2026-07-01", "A. Kumar"],
    ["NDRF Deployment Brief", "2026-06-30", "System"],
    ["Agricultural Advisory", "2026-06-29", "R. Sharma"],
  ].map(([type, gen, author], i) => ({
    id: `rep-${i}`,
    type: type as string,
    generatedAt: gen as string,
    period: "Last 7 days",
    author: author as string,
    sizeKb: 120 + i * 32,
    districts: [],
  }));

const initial: VarunaState = {
  selectedDistrict: null,
  selectedBlock: null,
  savedScenarios: [],
  ackAlerts: {},
  dismissedAlerts: [],
  savedReports: seedReports(),
  alertConfig: {
    emailNotifications: true,
    smsNotifications: false,
    dashboardAlerts: true,
    autoEscalate: false,
    floodThreshold: 0.65,
    droughtThreshold: 0.6,
    compoundThreshold: 0.55,
  },
  displayPrefs: { units: "metric", refreshMinutes: 3, defaultMapLayer: "compound" },
  userProfile: { name: "A. Kumar", role: "Climate Operations Analyst", organization: "Bihar SDMA" },
  dataSources: [
    { name: "IMD", status: "connected", lastSync: Date.now() - 3 * 60 * 1000 },
    { name: "MOSDAC", status: "connected", lastSync: Date.now() - 8 * 60 * 1000 },
    { name: "IMDAA", status: "connected", lastSync: Date.now() - 14 * 60 * 1000 },
    { name: "Bhuvan", status: "disconnected", lastSync: Date.now() - 2 * 60 * 60 * 1000 },
  ],
  apiKey: "vk_****************a91f",
  systemStatus: {
    uptime: "14d 6h 23m",
    lastInference: Date.now() - 2 * 60 * 1000,
    dbHealthy: true,
    nextModelRunMin: 134,
    ingestionMin: 42,
    queueDepth: 3,
  },
  scenarioBias: null,
  activeScenarioName: null,
};

let state: VarunaState = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const varunaStore = {
  getState: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set: (patch: Partial<VarunaState> | ((s: VarunaState) => Partial<VarunaState>)) => {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    emit();
  },
};

export function useVarunaStore<T>(selector: (s: VarunaState) => T): T {
  return useSyncExternalStore(
    varunaStore.subscribe,
    () => selector(varunaStore.getState()),
    () => selector(initial),
  );
}
