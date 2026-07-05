import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getAlerts, getCurrentState, type AlertItem, type CurrentState } from "@/lib/varuna/api";
import type { BlockState, DistrictState } from "@/lib/varuna/state";
import { BiharMap } from "@/components/varuna/BiharMap";
import { KpiStrip } from "@/components/varuna/KpiStrip";
import { KosiTrendChart } from "@/components/varuna/KosiTrendChart";
import { Simulator } from "@/components/varuna/Simulator";
import { AlertFeed } from "@/components/varuna/AlertFeed";
import { BlockDetailSidebar } from "@/components/varuna/BlockDetailSidebar";
import { TimeEvolution } from "@/components/varuna/TimeEvolution";
import { Recommendations } from "@/components/varuna/Recommendations";

export const Route = createFileRoute("/")({
  // Leaflet touches window; render this route client-only.
  ssr: false,
  head: () => ({
    meta: [
      { title: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        name: "description",
        content:
          "Physics-informed GNN digital twin of Bihar's climate — 534 blocks, 3-hour update cycle, compound flood + heat risk, what-if simulator. Built on IMD, MOSDAC/INSAT, Bhuvan, IMDAA.",
      },
      { property: "og:title", content: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        property: "og:description",
        content: "Live block-level climate digital twin for Bihar with compound-risk simulation.",
      },
    ],
  }),
  component: VarunaDashboard,
});

function VarunaDashboard() {
  const [state, setState] = useState<import("@/lib/varuna/state").CurrentState | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockState | null>(null);
  const [tick, setTick] = useState(0);

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

  // Auto-refresh alerts every 3 min (mocked polling)
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

  const view: "state" | "district" = selectedDistrict ? "district" : "state";

  return (
    <div className="min-h-screen bg-background bg-grid text-foreground">
      {/* Top header */}
      <header className="border-b border-border bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary text-glow">
              <span className="font-mono text-sm font-bold">V</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-glow">
                VARUNA
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  AI digital twin · Bihar climate
                </span>
              </h1>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Bharatiya Antariksh Hackathon 2026 · Indigenous intelligence
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <StatusPill color="var(--risk-normal)" label="State machine" value="LIVE · 3h cycle" />
            <StatusPill
              color="var(--primary)"
              label="Last update"
              value={state ? new Date(state.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            />
            <button
              onClick={() => setTick((t) => t + 1)}
              className="rounded-md border border-border bg-panel px-3 py-1.5 text-foreground transition-colors hover:bg-accent"
            >
              Force refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-6 py-4">
        <KpiStrip
          districtsAtRisk={districtsAtRisk}
          populationAffected={popAffected}
          infraAtRisk={infraAtRisk}
        />

        <div className="grid grid-cols-12 gap-4">
          {/* Map — dominant center */}
          <div className="col-span-12 lg:col-span-8">
            <div className="h-[560px]">
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
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 space-y-4 lg:col-span-4">
            <BlockDetailSidebar block={selectedBlock} district={currentDistrict} />
            <div className="h-[300px]">
              <AlertFeed alerts={alerts} />
            </div>
          </div>

          {/* Trend + rollout */}
          <div className="col-span-12 lg:col-span-8">
            <div className="h-[320px]">
              <KosiTrendChart />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <TimeEvolution districts={districts} />
          </div>

          {/* Simulator + recs */}
          <div className="col-span-12 lg:col-span-8">
            <Simulator />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Recommendations districts={districts} />
          </div>
        </div>

        {/* Data attribution */}
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-[11px] text-muted-foreground">
          <div>
            Built entirely on India's National Climate Data ·{" "}
            <span className="text-foreground">IMD</span> · <span className="text-foreground">MOSDAC / INSAT-3R</span>{" "}
            · <span className="text-foreground">Bhuvan</span> · <span className="text-foreground">IMDAA</span>
          </div>
          <div>
            PI-GNN · 534 blocks · 3-hour digital-twin cycle · What-if cascade over 15h ·{" "}
            <span className="font-mono text-primary">v0.1 PoC</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatusPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="uppercase tracking-widest text-[9px] text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
