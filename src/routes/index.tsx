import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CloudRain, Zap, Droplets } from "lucide-react";
import { getAlerts, getCurrentState, type AlertItem, type CurrentState } from "@/lib/varuna/api";
import type { BlockState, DistrictState } from "@/lib/varuna/state";
import { BiharMap } from "@/components/varuna/BiharMap";
import { KpiRow } from "@/components/varuna/KpiRow";
import { KosiTrendChart } from "@/components/varuna/KosiTrendChart";
import { Simulator } from "@/components/varuna/Simulator";
import { AlertFeed } from "@/components/varuna/AlertFeed";
import { BlockDetailSidebar } from "@/components/varuna/BlockDetailSidebar";
import { TimeEvolution } from "@/components/varuna/TimeEvolution";
import { Recommendations } from "@/components/varuna/Recommendations";
import { Sidebar } from "@/components/varuna/Sidebar";
import { TopBar } from "@/components/varuna/TopBar";
import { DashboardSkeleton, MapTransitionOverlay } from "@/components/varuna/DashboardSkeleton";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "VARUNA · AI-Powered Bihar Climate Digital Twin" },
      {
        name: "description",
        content:
          "Physics-informed GNN digital twin of Bihar's climate — 534 blocks, 3-hour update cycle, compound flood + heatwave risk, what-if simulator. Powered by IMD, MOSDAC/INSAT, Bhuvan, IMDAA.",
      },
      { property: "og:title", content: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        property: "og:description",
        content: "Live block-level climate digital twin for Bihar with compound-risk simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VarunaDashboard,
});

function VarunaDashboard() {
  const [state, setState] = useState<CurrentState | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockState | null>(null);
  const [tick, setTick] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Brief recalculation window when the user drills into a district so risk
  // coloring and block markers can settle without visual overlap.
  useEffect(() => {
    if (selectedDistrict === null) return;
    setTransitioning(true);
    const id = setTimeout(() => setTransitioning(false), 380);
    return () => clearTimeout(id);
  }, [selectedDistrict]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, a] = await Promise.all([getCurrentState(), getAlerts()]);
      if (cancelled) return;
      setState(s);
      setAlerts(a);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const districts: DistrictState[] = state?.districts ?? [];
  const blocks: BlockState[] = state?.blocks ?? [];

  const currentDistrict = useMemo(
    () => (selectedDistrict ? districts.find((d) => d.district.id === selectedDistrict) ?? null : null),
    [selectedDistrict, districts],
  );

  const districtsAtRisk = districts.filter((d) => d.flood_risk >= 0.6 || d.drought_risk >= 0.6).length;
  const popAffected = districts.reduce((s, d) => s + d.population_at_risk, 0);
  const infraAtRisk = Math.round(districtsAtRisk * 12 + districts.filter((d) => d.compound_risk).length * 8);
  const compoundCount = districts.filter((d) => d.compound_risk).length;

  const view: "state" | "district" = selectedDistrict ? "district" : "state";

  const lastUpdate = state
    ? new Date(state.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " IST"
    : "—";

  // Callout numbers
  const kosiExcess = useMemo(() => {
    const kosi = districts.filter((d) => d.district.kosiBasin);
    if (!kosi.length) return 0;
    const mean = kosi.reduce((s, d) => s + d.rainfall_mm, 0) / kosi.length;
    return Math.round(((mean - 30) / 30) * 100);
  }, [districts]);

  const soilAnomaly = useMemo(() => {
    const south = districts.filter((d) => d.district.region === "south");
    if (!south.length) return 0;
    const meanSoil =
      south.flatMap((d) => d.blocks).reduce((s, b) => s + b.soil_moisture_index, 0) /
      south.flatMap((d) => d.blocks).length;
    return Math.round((meanSoil - 0.55) * 100); // vs 55% baseline
  }, [districts]);

  const compoundMultiplier = (1 + compoundCount * 0.35).toFixed(1);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        districts={districts}
        onSelectDistrict={(id) => {
          setSelectedDistrict(id);
          setSelectedBlock(null);
        }}
        busy={!state || transitioning}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdate={lastUpdate} />

        <main className="flex-1 overflow-y-auto bg-grid px-4 py-4 lg:px-6">
          {!state ? (
            <DashboardSkeleton />
          ) : (
          <>
          <KpiRow
            districtsAtRisk={districtsAtRisk}
            populationAffected={popAffected}
            infraAtRisk={infraAtRisk}
            lastAssimilation={lastUpdate}
          />

          {/* Map row */}
          <div className="mt-4 grid grid-cols-12 gap-4">
            <section className="col-span-12 xl:col-span-9">
              <div className="relative rounded-xl border border-border bg-panel">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-widest">
                    Bihar — Climate Risk Zones
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--risk-drought)]" />
                      Live · Last updated: {lastUpdate} · Next update in ~3h
                    </span>
                  </div>
                </div>

                <div className="relative h-[540px]">
                  <BiharMap
                    districts={districts}
                    blocks={blocks}
                    view={view}
                    selectedDistrict={selectedDistrict}
                    onSelectDistrict={(id) => {
                      setSelectedDistrict(id);
                      setSelectedBlock(null);
                    }}
                    onSelectBlock={(b) => setSelectedBlock(b)}
                  />

                  {/* Callouts — absolute over map, hidden on mobile to prevent overlap */}
                  <div className="pointer-events-none absolute left-4 top-4 z-[500] hidden max-w-[220px] items-start gap-2 rounded-lg border border-[color:var(--risk-flood)]/50 bg-panel/95 p-2.5 shadow-lg backdrop-blur md:flex">
                    <CloudRain className="h-4 w-4 shrink-0 text-[color:var(--risk-flood)]" />
                    <div className="text-[11px] leading-tight">
                      <div className="text-muted-foreground">Excess precipitation — Kosi basin</div>
                      <div className="font-mono text-sm font-bold text-[color:var(--risk-flood)]">
                        +{Math.max(0, kosiExcess)}%
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden max-w-[220px] items-start gap-2 rounded-lg border border-[color:var(--risk-compound)]/60 bg-panel/95 p-2.5 shadow-lg backdrop-blur md:flex">
                    <Zap className="h-4 w-4 shrink-0 text-[color:var(--risk-compound)]" />
                    <div className="text-[11px] leading-tight">
                      <div className="text-muted-foreground">Compound Risk (Flood + Heat)</div>
                      <div className="font-mono text-sm font-bold text-[color:var(--risk-compound)]">
                        ×{compoundMultiplier}
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute bottom-4 right-4 z-[500] hidden max-w-[210px] items-start gap-2 rounded-lg border border-[color:var(--risk-drought)]/60 bg-panel/95 p-2.5 shadow-lg backdrop-blur md:flex">
                    <Droplets className="h-4 w-4 shrink-0 text-[color:var(--risk-drought)]" />
                    <div className="text-[11px] leading-tight">
                      <div className="text-muted-foreground">South Bihar soil moisture</div>
                      <div className="font-mono text-sm font-bold text-[color:var(--risk-drought)]">
                        {soilAnomaly > 0 ? "+" : ""}
                        {soilAnomaly}%
                      </div>
                    </div>
                  </div>

                  {/* India inset */}
                  <div className="pointer-events-none absolute left-4 top-24 z-[500] hidden rounded-lg border border-border bg-panel/95 p-2 backdrop-blur xl:block">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Bihar, India</div>
                    <IndiaInset />
                  </div>
                </div>
              </div>
            </section>

            {/* Time evolution + block detail column */}
            <section className="col-span-12 space-y-4 xl:col-span-3">
              <TimeEvolution districts={districts} />
              <BlockDetailSidebar block={selectedBlock} district={currentDistrict} />
            </section>

            {/* Second row */}
            <section className="col-span-12 xl:col-span-6">
              <div className="h-[340px]">
                <KosiTrendChart />
              </div>
            </section>
            <section className="col-span-12 xl:col-span-6">
              <Simulator />
            </section>

            {/* Third row */}
            <section className="col-span-12 xl:col-span-6">
              <Recommendations districts={districts} />
            </section>
            <section className="col-span-12 xl:col-span-6">
              <div className="h-[280px]">
                <AlertFeed alerts={alerts} />
              </div>
            </section>
          </div>

          <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-[11px] text-muted-foreground">
            <div>
              Powered by <span className="text-foreground">India's National Climate Data</span>
              <span className="mx-3 text-border">|</span>
              <span className="text-foreground">IMD</span>
              <span className="mx-2 text-border">·</span>
              <span className="text-foreground">MOSDAC / INSAT</span>
              <span className="mx-2 text-border">·</span>
              <span className="text-foreground">Bhuvan</span>
              <span className="mx-2 text-border">·</span>
              <span className="text-foreground">IMDAA</span>
            </div>
            <div>
              PI-GNN · 534 blocks · 3-hour digital-twin cycle ·{" "}
              <span className="font-mono text-primary">v0.1 PoC</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

// Minimal stylized India silhouette with Bihar highlighted
function IndiaInset() {
  return (
    <svg viewBox="0 0 60 60" className="mt-1 h-14 w-14">
      <path
        d="M18 8 L28 6 L36 10 L44 12 L48 18 L50 26 L46 34 L44 42 L38 50 L30 54 L22 50 L14 42 L10 32 L12 22 L14 14 Z"
        fill="oklch(0.28 0.03 260)"
        stroke="oklch(0.42 0.03 260)"
        strokeWidth="0.8"
      />
      <circle cx="34" cy="22" r="2.4" fill="var(--risk-heat)" />
      <circle cx="34" cy="22" r="4" fill="var(--risk-heat)" fillOpacity="0.3" />
    </svg>
  );
}
