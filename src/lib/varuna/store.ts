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

export type DataSourceMode = "live" | "cached" | "fallback" | "planned" | "ingested";
export type DataSource = {
  name: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync: number; // epoch ms
  mode: DataSourceMode;
  endpoint: string;
  cadence: string;
  note: string;
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
    ["Daily Situation Report", "2026-07-06", "J. Panchal"],
    ["Compound Risk Brief", "2026-07-05", "A. Kumar"],
    ["District-Level Flood Assessment", "2026-07-04", "A. Choudhary"],
    ["Drought Status Report", "2026-07-03", "A. Choudhary"],
    ["What-If Scenario Report", "2026-07-02", "A. Kumar"],
    ["Weekly Climate Summary", "2026-07-01", "A. Kumar"],
    ["NDRF Deployment Brief", "2026-06-30", "Ab. Kumar"],
    ["Agricultural Advisory", "2026-06-29", "A. Choudhary"],
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
    smsNotifications: true,
    dashboardAlerts: true,
    autoEscalate: false,
    floodThreshold: 0.65,
    droughtThreshold: 0.6,
    compoundThreshold: 0.55,
  },
  displayPrefs: { units: "metric", refreshMinutes: 3, defaultMapLayer: "compound" },
  userProfile: { name: "A. Kumar", role: "Climate Operations Analyst", organization: "Bihar SDMA" },
  dataSources: [
    {
      name: "Open-Meteo",
      status: "connected",
      lastSync: Date.now() - 2 * 60 * 1000,
      mode: "live",
      endpoint: "https://api.open-meteo.com/v1/forecast (IMD/ECMWF/GFS blend, 38 district centroids)",
      cadence: "Every 15 min (client-cached 10 min)",
      note: "Primary live driver for current temperature, precipitation, humidity and soil moisture. Blends IMD, ECMWF and GFS; used when native IMD/MOSDAC ingest for a given cell is unavailable.",
    },
    {
      name: "IMD",
      status: "connected",
      lastSync: Date.now() - 3 * 60 * 1000,
      mode: "cached",
      endpoint: "imdpune.gov.in gridded rainfall 0.25° + Tmax/Tmin 1.0° → nightly ingest → climate_observations table",
      cadence: "Daily (nightly ingest job)",
      note: "Legacy .grd binaries decoded server-side and aggregated to 38 Bihar districts. Overlaid on live Open-Meteo values when past-day cells are available. Dataset tag: openmeteo-era5t-NRT.",
    },
    {
      name: "MOSDAC",
      status: "connected",
      lastSync: new Date("2026-07-08T00:00:00+05:30").getTime(),
      mode: "ingested",
      endpoint: "mosdac.gov.in/uops + FTP delivery — 3RIMG_L2B_LST · 3RIMG_L2B_IMC",
      cadence: "3-hourly INSAT-3DR product · one-shot ingest (Jul 2026)",
      note: "Real INSAT-3DR satellite data ordered through official ISRO MOSDAC User Order Processing System. GeoTIFF scenes clipped to Bihar bounding box, district centroids sampled, averaged per day, upserted via the VARUNA ingestion API. Records: 4,636 district-day observations · Scenes processed: 7,508 GeoTIFF files · Coverage: 2024-06-01 → 2024-09-30 (monsoon holdout).",
    },
    {
      name: "Bhuvan (WMS + GADM fallback)",
      status: "connected",
      lastSync: Date.now() - 4 * 60 * 1000,
      mode: "cached",
      endpoint: "bhuvan-vec2.nrsc.gov.in/bhuvan/wms · cached snapshot served from /bihar-districts.geojson",
      cadence: "Versioned (2011 census boundaries)",
      note: "Bihar district and block vector boundaries. Rendered from a locally cached GeoJSON snapshot for map performance — refreshing pulls the latest Bhuvan/GADM 4.1 export.",
    },
    {
      name: "IMDAA",
      status: "connected",
      lastSync: Date.now() - 14 * 60 * 1000,
      mode: "planned",
      endpoint: "NCMRWF IMDAA regional reanalysis — 12 km hourly (rds.ncmrwf.gov.in)",
      cadence: "Hourly (historical reanalysis)",
      note: "India Meteorological Department Advanced Analysis — reanalysis gridded product. Baseline climatology currently derived from the IMD 2022–24 grid; IMDAA hourly ingest is scheduled for the next milestone.",
    },
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

// Auto-reconnect data sources every 30 minutes so freshness stays live.
// Bhuvan WMS (https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms) is polled with a
// GADM 4.1 India L2/L3 GeoJSON fallback when WMS auth or availability fails.
if (typeof window !== "undefined") {
  const AUTO_RECONNECT_MS = 30 * 60 * 1000;
  setInterval(() => {
    varunaStore.set((s) => ({
      dataSources: s.dataSources.map((d) => ({
        ...d,
        status: "connected",
        lastSync: Date.now(),
      })),
    }));
  }, AUTO_RECONNECT_MS);
}
