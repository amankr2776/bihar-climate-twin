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
import { DashboardSkeleton, MapTransitionOverlay } from "@/components/varuna/DashboardSkeleton";
import { PageHeader } from "@/components/varuna/HelpModal";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard · VARUNA" },
      { name: "description", content: "Live block-level climate digital twin for Bihar." },
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

  const kosiExcess = useMemo(() => {
    const kosi = districts.filter((d) => d.district.kosiBasin);
    if (!kosi.length) return 0;
    const mean = kosi.reduce((s, d) => s + d.rainfall_mm, 0) / kosi.length;
    return Math.round(((mean - 30) / 30) * 100);
  }, [districts]);

  const soilAnomaly = useMemo(() => {
    const south = districts.filter((d) => d.district.region === "south");
    if (!south.length) return 0;
    const flat = south.flatMap((d) => d.blocks);
    return Math.round((flat.reduce((s, b) => s + b.soil_moisture_index, 0) / flat.length - 0.55) * 100);
  }, [districts]);

  const compoundMultiplier = (1 + compoundCount * 0.35).toFixed(1);

  return (
    <div className="px-4 py-4 lg:px-6">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time compound climate risk across 38 districts · 534 blocks"
        help={{
          title: "Dashboard",
          description:
            "Mission-control view of Bihar's climate digital twin. KPI strip summarises statewide risk, the map shows district and block-level categories, and the panels below cover trends, simulator, recommendations and the live alert feed.",
        }}
      />

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

          <div className="mt-4 grid grid-cols-12 gap-4">
            <section className="col-span-12 xl:col-span-9">
              <div className="relative rounded-xl border border-border bg-panel">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-widest">
                    Bihar — Climate Risk Zones
                  </h2>
                  <div className="text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--risk-drought)]" />
                      Live · Updated: {lastUpdate}
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
                  <MapTransitionOverlay show={transitioning} />
                </div>
              </div>
            </section>

            <section className="col-span-12 space-y-4 xl:col-span-3">
              <TimeEvolution districts={districts} />
              <BlockDetailSidebar block={selectedBlock} district={currentDistrict} />
            </section>

            <section className="col-span-12 xl:col-span-6">
              <div className="h-[340px]">
                <KosiTrendChart />
              </div>
            </section>
            <section className="col-span-12 xl:col-span-6">
              <Simulator busy={transitioning} />
            </section>

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
              <span className="text-foreground">IMD · MOSDAC / INSAT · Bhuvan · IMDAA</span>
            </div>
            <div>
              PI-GNN · 534 blocks · 3-hour digital-twin cycle ·{" "}
              <span className="font-mono text-primary">v0.1 PoC</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
