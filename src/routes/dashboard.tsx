import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CloudRain, Zap, Droplets, X } from "lucide-react";
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
import { SourceChip } from "@/components/varuna/SourceChip";
import { useCurrentState, useAlerts, useVarunaRefresh } from "@/lib/varuna/useCurrentState";
import { useVarunaStore, varunaStore } from "@/lib/varuna/store";
import { useImdNormals, stateWideNormal } from "@/lib/varuna/imd-normals";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard · VARUNA" },
      { name: "description", content: "Live block-level climate digital twin for Bihar — flood, heat and drought risk in one view." },
      { property: "og:title", content: "Dashboard · VARUNA" },
      { property: "og:description", content: "Live block-level climate digital twin for Bihar — flood, heat and drought risk in one view." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/dashboard" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VARUNA Bihar climate dashboard preview." },
      { name: "twitter:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/dashboard" }],
  }),
  component: VarunaDashboard,
});

function VarunaDashboard() {
  const { data: state } = useCurrentState();
  const { data: alerts = [] } = useAlerts();
  const { data: imdNormals } = useImdNormals();
  const refresh = useVarunaRefresh();
  const activeScenarioName = useVarunaStore((s) => s.activeScenarioName);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockState | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (selectedDistrict === null) return;
    setTransitioning(true);
    const id = setTimeout(() => setTransitioning(false), 380);
    return () => clearTimeout(id);
  }, [selectedDistrict]);

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

  const imdBaseline = useMemo(() => stateWideNormal(imdNormals), [imdNormals]);
  const observedMeanRain = useMemo(() => {
    if (!districts.length) return null;
    return districts.reduce((s, d) => s + d.rainfall_mm, 0) / districts.length;
  }, [districts]);
  const imdRainDeltaPct =
    imdBaseline?.rain_mm != null && observedMeanRain != null && imdBaseline.rain_mm > 0.1
      ? Math.round(((observedMeanRain - imdBaseline.rain_mm) / imdBaseline.rain_mm) * 100)
      : null;


  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title={t("dash.title")}
        subtitle={state?.source === "open-meteo" ? t("dash.subtitleLive") : t("dash.subtitleDefault")}
        help={{
          title: "Dashboard",
          description:
            "Mission-control view of Bihar's climate digital twin. Data comes live from the IMD-anchored Open-Meteo API — every block reflects the real observed rainfall, temperature and soil moisture for its district. When a scenario is applied from the Simulator, every page (Map, Compound Risk, Prediction, Alerts) reflects it immediately.",
        }}
        actions={
          activeScenarioName ? (
            <ScenarioBanner
              name={activeScenarioName}
              onClear={() => {
                varunaStore.set({ scenarioBias: null, activeScenarioName: null });
                refresh();
              }}
            />
          ) : null
        }
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

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sources:</span>
            <SourceChip
              source="IMD"
              dataset="Gridded rainfall 0.25° + Tmax/Tmin 1.0°"
              resolution="0.25° / 1.0°"
              cadence="Daily"
              updated={lastUpdate}
            />
            <SourceChip
              source="Open-Meteo"
              dataset="Live IMD-anchored observations"
              resolution="District"
              cadence="Hourly"
              updated={lastUpdate}
            />
            <SourceChip
              source="MOSDAC / INSAT-3DR"
              dataset="LST, SST, IMC rainfall"
              resolution="4 km"
              cadence="3-hourly"
            />
            <SourceChip
              source="Bhuvan"
              dataset="Admin boundaries (state/district/block)"
              resolution="Block vector"
              cadence="Versioned"
            />
            <SourceChip
              source="IMDAA"
              dataset="Regional reanalysis (NCMRWF)"
              resolution="12 km"
              cadence="Hourly (historical)"
            />
          </div>


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
                  {imdBaseline?.rain_mm != null && (
                    <div className="pointer-events-none absolute right-4 top-4 z-[500] hidden max-w-[240px] items-start gap-2 rounded-lg border border-[color:var(--brand-cyan)]/50 bg-panel/95 p-2.5 shadow-lg backdrop-blur md:flex">
                      <CloudRain className="h-4 w-4 shrink-0 text-[color:var(--brand-cyan)]" />
                      <div className="text-[11px] leading-tight">
                        <div className="text-muted-foreground">IMD 2022–24 normal (this week)</div>
                        <div className="font-mono text-sm font-bold text-[color:var(--brand-cyan)]">
                          {imdBaseline.rain_mm.toFixed(1)} mm/day
                          {imdRainDeltaPct != null && (
                            <span
                              className={`ml-2 font-semibold ${imdRainDeltaPct >= 0 ? "text-[color:var(--risk-flood)]" : "text-[color:var(--risk-drought)]"}`}
                            >
                              {imdRainDeltaPct >= 0 ? "+" : ""}
                              {imdRainDeltaPct}% now
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {imdBaseline.total_rows} IMD rows · {imdBaseline.districts_covered}/38 districts
                        </div>
                      </div>
                    </div>
                  )}
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

function ScenarioBanner({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[color:var(--risk-heat)]/50 bg-[color:var(--risk-heat)]/10 px-3 py-1 text-[11px]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--risk-heat)]" />
      <span className="text-foreground">Scenario active:</span>
      <span className="font-medium text-[color:var(--risk-heat)]">{name}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-panel hover:text-foreground"
        aria-label="Clear active scenario"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export { ScenarioBanner };

