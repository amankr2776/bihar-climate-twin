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

export const Route = createFileRoute("/compound")({
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

function CompoundPage() {
  const { data: state } = useCurrentState();
  const [day, setDay] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"date" | "peakSeverity" | "durationHours" | "blocksAffected">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);


  const districts = state?.districts ?? [];
  const blocks = state?.blocks ?? [];
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

  const maxSeverity = activeEvents.length ? Math.max(...activeEvents.map((e) => e.severity)) : 0;

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[color:var(--risk-heat)]/40 to-[color:var(--risk-compound)]/30 p-5">
        <div>
          <div className="font-display text-2xl font-bold uppercase tracking-widest">Compound Risk Analysis</div>
          <div className="mt-1 text-xs text-muted-foreground">Simultaneous multi-hazard monitoring across Bihar</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Active Compound Events" value={activeEvents.length} icon={<AlertTriangle />} color="var(--risk-compound)" pulse />
          <Metric label="Blocks in Dual Extremes" value={compoundBlocks.length} icon={<Flame />} color="var(--risk-heat)" />
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
              <svg viewBox="0 0 400 260" className="h-full w-full">
                <defs>
                  <pattern id="flood-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--risk-flood)" strokeWidth="2" />
                  </pattern>
                  <pattern id="drought-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="var(--risk-heat)" strokeWidth="2" />
                  </pattern>
                </defs>
                {districts.map((d, i) => {
                  const isNorth = d.district.region === "north" || d.district.kosiBasin;
                  const isSouth = d.district.region === "south";
                  const x = ((d.district.lng - 83) / 5.5) * 400;
                  const y = 260 - ((d.district.lat - 24.3) / 3.5) * 260;
                  const compound = d.compound_risk;
                  return (
                    <g key={d.district.id}>
                      <circle
                        cx={x} cy={y}
                        r={compound ? 14 : 10}
                        fill={compound ? "var(--risk-compound)" : isNorth ? "url(#flood-hatch)" : isSouth ? "url(#drought-hatch)" : "oklch(0.3 0.02 260)"}
                        stroke="oklch(1 0 0 / 30%)"
                        strokeWidth="0.8"
                        opacity={0.85}
                      >
                        {compound && <animate attributeName="opacity" values="0.6;1;0.6" dur="1.6s" repeatCount="indefinite" />}
                      </circle>
                      <text x={x} y={y + 3} fontSize="6" fill="white" textAnchor="middle" style={{ pointerEvents: "none" }}>
                        {d.district.name.slice(0, 4)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="absolute bottom-2 left-2 space-y-1 rounded border border-border bg-panel/90 p-2 text-[10px]">
                <div className="flex items-center gap-1.5"><span className="h-2 w-4" style={{ background: "url(#flood-hatch), var(--risk-flood)" }} /><span>Flood-dominant north</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-4" style={{ background: "url(#drought-hatch), var(--risk-heat)" }} /><span>Drought-dominant south</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm" style={{ background: "var(--risk-compound)" }} /><span>Compound (pulsing)</span></div>
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
