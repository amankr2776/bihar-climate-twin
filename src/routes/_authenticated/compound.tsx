import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Flame, Users } from "lucide-react";
import { useCurrentState } from "@/lib/varuna/useCurrentState";

import { historicalCompoundEvents } from "@/lib/varuna/extra-api";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ProvenanceStrip } from "@/components/varuna/ProvenanceStrip";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, ReferenceArea, Tooltip as RTooltip, ZAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/compound")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Compound Risk · VARUNA" },
      { name: "description", content: "Compound flood and heat risk analysis for Bihar blocks, with historical event comparison." },
      { property: "og:title", content: "Compound Risk · VARUNA" },
      { property: "og:description", content: "Compound flood and heat risk analysis for Bihar blocks, with historical event comparison." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/compound" },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VARUNA compound flood and heat risk analysis preview." },
      { name: "twitter:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/compound" }],
  }),
  component: CompoundPage,
});

const SCENARIOS = {
  current: { label: "Current — Live monsoon state", eventsBoost: 0, blocksBoost: 0, severityBoost: 0, districtBoost: [] as string[] },
  aug2024: {
    label: "Aug 2024 — Kosi Flood + South Bihar Drought",
    eventsBoost: 7,
    blocksBoost: 34,
    severityBoost: 1.8,
    districtBoost: ["supaul", "madhepura", "saharsa", "khagaria", "araria", "kishanganj", "gaya", "aurangabad", "nawada"],
  },
  jul2023: {
    label: "Jul 2023 — Monsoon Compound Event",
    eventsBoost: 5,
    blocksBoost: 22,
    severityBoost: 1.2,
    districtBoost: ["patna", "vaishali", "muzaffarpur", "darbhanga", "samastipur", "bhagalpur"],
  },
} as const;
type ScenarioKey = keyof typeof SCENARIOS;

function CompoundPage() {
  const { data: state } = useCurrentState();
  const [day, setDay] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"date" | "peakSeverity" | "durationHours" | "blocksAffected">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [scenario, setScenario] = useState<ScenarioKey>("current");
  const [hover, setHover] = useState<{ x: number; y: number; name: string; flood: number; drought: number; severity: number; pop: number; compound: boolean } | null>(null);

  const scen = SCENARIOS[scenario];
  const districts = state?.districts ?? [];
  const blocks = state?.blocks ?? [];
  const boostedDistrictIds = new Set(scen.districtBoost);
  const compoundBlocks = blocks.filter((b) => b.compound_risk);
  const activeEvents = useMemo(() => {
    const byDistrict = new Map<string, typeof compoundBlocks>();
    compoundBlocks.forEach((b) => {
      const list = byDistrict.get(b.district_name) ?? [];
      list.push(b);
      byDistrict.set(b.district_name, list);
    });
    return Array.from(byDistrict.entries()).map(([district, bs]) => ({
      id: district,
      area: district,
      type: bs[0].heat_retention_score > 0.5 ? "Flood + Heatwave" : "Flood + Drought",
      severity: +(1 + bs.length * 0.25).toFixed(1),
      durationH: 12 + bs.length,
      blockCount: bs.length,
      populationAffected: bs.reduce((s, b) => s + b.population, 0),
      blocks: bs,
    }));
  }, [compoundBlocks]);

  const displayedEventCount = activeEvents.length + scen.eventsBoost;
  const displayedBlockCount = compoundBlocks.length + scen.blocksBoost;
  const maxSeverity = (activeEvents.length ? Math.max(...activeEvents.map((e) => e.severity)) : 0) + scen.severityBoost;

  const history = historicalCompoundEvents();
  const filteredHistory = history.filter((h) => h.region.toLowerCase().includes(search.toLowerCase()));
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
  const paged = sortedHistory.slice(page * 10, page * 10 + 10);
  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / 10));

  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title="Compound Risk Analysis"
        help={{
          title: "Compound Risk",
          description:
            "This page surfaces simultaneous multi-hazard events — where flood risk and drought/heat risk are elevated at the same time in the same window. Use the scatter to spot compound blocks and the timeline slider to replay the past 30 days.",
        }}
      />
      <ProvenanceStrip />

      <style>{`
        @keyframes varuna-compound-pulse {
          0%, 100% { filter: drop-shadow(0 0 1px var(--risk-compound)) drop-shadow(0 0 2px var(--risk-compound)); opacity: 0.85; }
          50% { filter: drop-shadow(0 0 6px var(--risk-compound)) drop-shadow(0 0 12px var(--risk-compound)); opacity: 1; }
        }
        .compound-pulse { animation: varuna-compound-pulse 1.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel/60 px-4 py-3">
        <div>
          <label htmlFor="scenario-select" className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Load Historical Scenario</label>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Replay a past compound event for demonstration</div>
        </div>
        <select
          id="scenario-select"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioKey)}
          className="min-w-[280px] rounded border border-border bg-background px-3 py-2 text-xs"
        >
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => (
            <option key={k} value={k}>{SCENARIOS[k].label}</option>
          ))}
        </select>
      </div>

      {scenario !== "current" && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-start gap-3 rounded-lg border-2 border-dashed border-[color:var(--risk-compound)] bg-[color:var(--risk-compound)]/10 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--risk-compound)]" />
          <div className="flex-1 text-xs">
            <div className="font-display font-semibold uppercase tracking-widest text-[color:var(--risk-compound)]">
              Scenario replay mode · not live
            </div>
            <div className="mt-1 text-muted-foreground">
              The metrics, map markers and severity indices below are a
              deterministic overlay of <strong className="text-foreground">{scen.label}</strong> on top
              of today&apos;s live block state — for demonstration and drills only. Switch back to
              &ldquo;Current&rdquo; for actual operational values.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScenario("current")}
            className="rounded border border-[color:var(--risk-compound)] px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-compound)] hover:bg-[color:var(--risk-compound)]/20"
          >
            Exit replay
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[color:var(--risk-heat)]/40 to-[color:var(--risk-compound)]/30 p-5">
        <div>
          <div className="font-display text-2xl font-bold uppercase tracking-widest">Compound Risk Analysis</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {scenario === "current" ? "Simultaneous multi-hazard monitoring across Bihar" : `Replaying: ${scen.label}`}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Active Compound Events" value={displayedEventCount} icon={<AlertTriangle />} color="var(--risk-compound)" pulse />
          <Metric label="Blocks in Dual Extremes" value={displayedBlockCount} icon={<Flame />} color="var(--risk-heat)" />
          <Metric label="Max Compound Severity" value={`×${maxSeverity.toFixed(1)}`} icon={<Users />} color="var(--risk-compound)" />
        </div>
      </div>


      <div className="grid grid-cols-12 gap-4">
        {/* Left column */}
        <section className="col-span-12 xl:col-span-7">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 font-display text-sm font-semibold uppercase tracking-widest">Compound Risk Map</div>
            <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-background/40">
              {/* Stylised compound risk visualization */}
              <svg viewBox="0 0 400 260" className="h-full w-full" onMouseLeave={() => setHover(null)}>
                <defs>
                  <pattern id="flood-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--risk-flood)" strokeWidth="2" />
                  </pattern>
                  <pattern id="drought-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--risk-heat)" strokeWidth="2" />
                  </pattern>
                </defs>
                {districts.map((d) => {
                  const isNorth = d.district.region === "north" || d.district.kosiBasin;
                  const isSouth = d.district.region === "south";
                  const x = ((d.district.lng - 83) / 5.5) * 400;
                  const y = 260 - ((d.district.lat - 24.3) / 3.5) * 260;
                  const boosted = boostedDistrictIds.has(d.district.id);
                  const compound = d.compound_risk || boosted;
                  const pop = d.blocks.reduce((s, b) => s + b.population, 0);
                  const flood = boosted ? Math.max(d.flood_risk, 0.72) : d.flood_risk;
                  const drought = boosted ? Math.max(d.drought_risk, 0.55) : d.drought_risk;
                  const severity = compound ? +(1.4 + flood + drought + scen.severityBoost * 0.3).toFixed(1) : +(1 + Math.max(flood, drought)).toFixed(1);
                  const onEnter = (e: React.MouseEvent<SVGGElement>) => {
                    const svg = e.currentTarget.ownerSVGElement;
                    if (!svg) return;
                    const rect = svg.getBoundingClientRect();
                    setHover({
                      x: ((x / 400) * rect.width),
                      y: ((y / 260) * rect.height),
                      name: d.district.name, flood, drought, severity, pop, compound,
                    });
                  };
                  return (
                    <g key={d.district.id} onMouseEnter={onEnter} style={{ cursor: "pointer" }}>
                      <circle
                        cx={x} cy={y}
                        r={compound ? 14 : 10}
                        fill={compound ? "var(--risk-compound)" : isNorth ? "url(#flood-hatch)" : isSouth ? "url(#drought-hatch)" : "oklch(0.3 0.02 260)"}
                        stroke="oklch(1 0 0 / 30%)"
                        strokeWidth="0.8"
                        opacity={0.9}
                        className={compound ? "compound-pulse" : undefined}
                      />
                      <text x={x} y={y + 3} fontSize="9" fontWeight="600" fill="white" textAnchor="middle" style={{ pointerEvents: "none" }}>
                        {d.district.name.slice(0, 4)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {hover && (
                <div
                  className="pointer-events-none absolute z-10 min-w-[180px] -translate-x-1/2 rounded-md border border-border bg-panel/95 p-2 text-[11px] shadow-lg backdrop-blur"
                  style={{ left: hover.x, top: Math.max(0, hover.y - 100) }}
                >
                  <div className="mb-1 font-semibold text-foreground">{hover.name}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                    <span className="text-muted-foreground">Flood risk</span><span style={{ color: "var(--risk-flood)" }}>{(hover.flood * 100).toFixed(0)}%</span>
                    <span className="text-muted-foreground">Drought risk</span><span style={{ color: "var(--risk-heat)" }}>{(hover.drought * 100).toFixed(0)}%</span>
                    <span className="text-muted-foreground">Severity</span><span style={{ color: "var(--risk-compound)" }}>×{hover.severity}</span>
                    <span className="text-muted-foreground">Population</span><span>{hover.pop.toLocaleString()}</span>
                  </div>
                  {hover.compound && <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-compound)]">Compound event</div>}
                </div>
              )}
              <div className="absolute bottom-2 left-2 space-y-1 rounded border border-border bg-panel/90 p-2 text-[10px]">
                <div className="flex items-center gap-1.5"><span className="h-2 w-4" style={{ background: "url(#flood-hatch), var(--risk-flood)" }} /><span>Flood-dominant north</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-4" style={{ background: "url(#drought-hatch), var(--risk-heat)" }} /><span>Drought-dominant south</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm compound-pulse" style={{ background: "var(--risk-compound)" }} /><span>Compound (pulsing)</span></div>
              </div>
            </div>


            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Timeline · Past 30 days</span>
                <span className="font-mono">Day T{day === 0 ? "" : day}</span>
              </div>
              <Slider value={[day]} min={-30} max={0} step={1} onValueChange={(v) => setDay(v[0])} />
            </div>
          </div>
        </section>

        {/* Right column */}
        <section className="col-span-12 xl:col-span-5">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 font-display text-sm font-semibold uppercase tracking-widest">Compound Risk Matrix</div>
            <div className="h-64">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 30 }}>
                  <XAxis type="number" dataKey="flood_risk" domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: "Flood risk →", position: "bottom", fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis type="number" dataKey="drought_risk" domain={[0, 1]} tick={{ fontSize: 10 }} label={{ value: "Drought risk →", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 10 }} />
                  <ZAxis range={[20, 120]} />
                  <ReferenceArea x1={0.5} x2={1} y1={0.35} y2={1} strokeDasharray="4 4" stroke="var(--risk-compound)" fill="var(--risk-compound)" fillOpacity={0.15} label={{ value: "COMPOUND ZONE", fill: "var(--risk-compound)", fontSize: 10 }} />
                  <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  <Scatter
                    data={blocks.map((b) => ({
                      flood_risk: b.flood_risk,
                      drought_risk: b.drought_risk,
                      block: b.block_name,
                      district: b.district_name,
                      z: b.compound_risk ? 100 : 30,
                      fill: b.compound_risk ? "var(--risk-compound)" : b.flood_risk > b.drought_risk ? "var(--risk-flood)" : "var(--risk-heat)",
                    }))}
                    fill="var(--risk-flood)"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Active events */}
        <section className="col-span-12 xl:col-span-7">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 font-display text-sm font-semibold uppercase tracking-widest">Active Compound Events</div>
            {activeEvents.length === 0 && <div className="text-xs text-muted-foreground">No compound events currently active.</div>}
            <ul className="space-y-2">
              {activeEvents.map((e) => (
                <li key={e.id} className="rounded border border-border bg-background/40">
                  <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs">
                    <div className="flex-1">
                      <div className="font-semibold">{e.area}</div>
                      <div className="text-muted-foreground">{e.type} · {e.durationH}h · {e.blockCount} blocks · {e.populationAffected.toLocaleString()} pop</div>
                    </div>
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "color-mix(in oklch, var(--risk-compound) 25%, transparent)", color: "var(--risk-compound)" }}>
                      ×{e.severity}
                    </span>
                  </button>
                  {expanded === e.id && (
                    <div className="border-t border-border px-3 py-2 text-[11px]">
                      <div className="font-semibold text-muted-foreground">Affected blocks</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.blocks.slice(0, 8).map((b) => (
                          <span key={b.block_id} className="rounded bg-background px-1.5 py-0.5">{b.block_name}</span>
                        ))}
                      </div>
                      <div className="mt-2 rounded bg-[color:var(--risk-compound)]/10 p-2 text-[color:var(--risk-compound)]">
                        Recommend: pre-position NDRF; issue heatwave + flood joint advisory.
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Historical catalog */}
        <section className="col-span-12 xl:col-span-5">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-sm font-semibold uppercase tracking-widest">Historical Compound Events</div>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search region" className="h-7 w-40 text-xs" />
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-muted-foreground">
                  {(["date", "peakSeverity", "durationHours", "blocksAffected"] as const).map((k) => (
                    <th key={k} className="cursor-pointer py-1 text-left" onClick={() => { setSortKey(k); setSortAsc(!sortAsc); }}>
                      {k === "peakSeverity" ? "Peak" : k === "durationHours" ? "Dur" : k === "blocksAffected" ? "Blocks" : "Date"} {sortKey === k ? (sortAsc ? "▲" : "▼") : ""}
                    </th>
                  ))}
                  <th className="py-1 text-left">Region</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-t border-border/50">
                    <td className="py-1 font-mono">{r.date}</td>
                    <td className="py-1 font-mono">×{r.peakSeverity}</td>
                    <td className="py-1 font-mono">{r.durationHours}h</td>
                    <td className="py-1 font-mono">{r.blocksAffected}</td>
                    <td className="py-1">{r.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <button onClick={() => setPage(Math.max(0, page - 1))} className="rounded border border-border px-2 py-0.5 disabled:opacity-40" disabled={page === 0}>Prev</button>
              <span className="text-muted-foreground">Page {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} className="rounded border border-border px-2 py-0.5 disabled:opacity-40" disabled={page + 1 === totalPages}>Next</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon, color, pulse }: { label: string; value: string | number; icon: React.ReactNode; color: string; pulse?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span style={{ color }}>{icon}</span>{label}
      </div>
      <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold" style={{ color }}>
        {value}
        {pulse && <span className="inline-flex h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: color }} />}
      </div>
    </div>
  );
}
