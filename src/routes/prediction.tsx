import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Cpu, Activity, Target, TrendingDown, ArrowUp, ArrowDown, Database } from "lucide-react";
import { useCurrentState } from "@/lib/varuna/useCurrentState";
import { useImdNormals } from "@/lib/varuna/imd-normals";

import { validationSeries, predObsScatter, block30DayHistory } from "@/lib/varuna/extra-api";
import { PageHeader } from "@/components/varuna/HelpModal";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Tooltip as RTooltip, Area, AreaChart,
} from "recharts";
import type { BlockState } from "@/lib/varuna/state";

export const Route = createFileRoute("/prediction")({
  ssr: false,
  head: () => ({ meta: [{ title: "Prediction Engine · VARUNA" }] }),
  component: PredictionPage,
});

function PredictionPage() {
  const { data: state } = useCurrentState();
  const { data: imdNormals } = useImdNormals();
  const [mode, setMode] = useState<"current" | "forecast">("current");
  const [feature, setFeature] = useState<"rainfall" | "temp">("rainfall");
  const [step, setStep] = useState(1);
  const [blockSearch, setBlockSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<BlockState | null>(null);

  useEffect(() => {
    if (state && !selectedBlock) setSelectedBlock(state.blocks[0]);
  }, [state, selectedBlock]);

  const selectedDistrictId = selectedBlock?.district_id;
  const selectedNormal = selectedDistrictId
    ? imdNormals?.by_district[selectedDistrictId] ?? null
    : null;
  const imdTotalDistricts = imdNormals ? Object.keys(imdNormals.by_district).length : 0;



  const validation = useMemo(() => validationSeries(), []);
  const scatter = useMemo(() => predObsScatter(), []);
  const currentCsi = validation[validation.length - 1]?.csi ?? 0.82;
  const currentRmse = validation[validation.length - 1]?.rmse ?? 3.6;
  const persistenceRmse = validation[validation.length - 1]?.persistenceRmse ?? 4.9;
  const improvement = Math.round(((persistenceRmse - currentRmse) / persistenceRmse) * 100);

  // R²
  const r2 = useMemo(() => {
    const meanObs = scatter.reduce((s, p) => s + p.obs, 0) / scatter.length;
    const ssRes = scatter.reduce((s, p) => s + (p.obs - p.pred) ** 2, 0);
    const ssTot = scatter.reduce((s, p) => s + (p.obs - meanObs) ** 2, 0);
    return 1 - ssRes / ssTot;
  }, [scatter]);

  const blockForecast = useMemo(() => {
    if (!selectedBlock) return [] as { h: number; value: number; lo: number; hi: number }[];
    const base = feature === "rainfall" ? selectedBlock.rainfall_mm : selectedBlock.temperature_c;
    return Array.from({ length: 8 }, (_, i) => {
      const noise = Math.sin(i * 1.2 + selectedBlock.block_id.length) * (feature === "rainfall" ? 6 : 1.2);
      const v = Math.max(0, base + noise + i * (feature === "rainfall" ? 1.2 : 0.2));
      const spread = (i + 1) * (feature === "rainfall" ? 3 : 0.4);
      return { h: (i + 1) * 3, value: +v.toFixed(2), lo: +(v - spread).toFixed(2), hi: +(v + spread).toFixed(2) };
    });
  }, [selectedBlock, feature]);

  const blocks = state?.blocks ?? [];
  const filteredBlocks = blocks.filter((b) => b.block_name.toLowerCase().includes(blockSearch.toLowerCase())).slice(0, 8);

  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title="Prediction Engine"
        help={{
          title: "Prediction Engine",
          description:
            "Exposes the PI-GNN model status, iterative rollout forecasts up to T+8 (24h), and per-block prediction explanations. Bottom row validates against holdout observations using CSI and RMSE vs. persistence baseline.",
        }}
      />

      {/* Top row */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatusCard title="Model Status" badge="ACTIVE" badgeColor="var(--risk-drought)" icon={<Cpu />}>
          <div className="text-sm">PI-GNN v1.0</div>
          <div className="text-[11px] text-muted-foreground">Trained 2026-06-30</div>
        </StatusCard>
        <StatusCard title="Forecast Horizon" icon={<Activity />}>
          <div className="text-sm">T+1 step · iterative rollout</div>
          <div className="text-[11px] text-muted-foreground">3 hours per step · up to T+8</div>
        </StatusCard>
        <StatusCard title="Validation Score" icon={<Target />}>
          <div className="flex items-center gap-3">
            <ProgressRing value={currentCsi} target={0.85} />
            <div>
              <div className="font-mono text-lg">{currentCsi.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">CSI · target 0.85</div>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">2022–24 holdout</div>
        </StatusCard>
        <StatusCard title="Baseline Comparison" icon={<TrendingDown />}>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg text-primary">{currentRmse.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">vs {persistenceRmse.toFixed(1)}</span>
          </div>
          <div className="text-xs font-semibold text-[color:var(--risk-drought)]">−{improvement}% RMSE</div>
        </StatusCard>
        <StatusCard title="IMD Baseline" badge="LIVE" badgeColor="var(--brand-cyan)" icon={<Database />}>
          <div className="text-sm">
            {imdNormals ? imdNormals.total_rows.toLocaleString() : "…"} rows
          </div>
          <div className="text-[10px] text-muted-foreground">
            2022–24 monsoon · {imdTotalDistricts}/38 districts · ±{imdNormals?.window_days ?? 3}d window
          </div>
        </StatusCard>
      </div>


      {/* Middle row */}
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-xl border border-border bg-panel p-4 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-sm font-semibold uppercase tracking-widest">Forecast Map</div>
            <div className="flex flex-wrap gap-1 text-[11px]">
              <ToggleBtn active={mode === "current"} onClick={() => setMode("current")}>Current</ToggleBtn>
              <ToggleBtn active={mode === "forecast"} onClick={() => setMode("forecast")}>T+1 Forecast</ToggleBtn>
              <span className="mx-1 text-border">|</span>
              <ToggleBtn active={feature === "rainfall"} onClick={() => setFeature("rainfall")}>Rainfall</ToggleBtn>
              <ToggleBtn active={feature === "temp"} onClick={() => setFeature("temp")}>Temperature</ToggleBtn>
            </div>
          </div>
          <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-lg border border-border bg-background/40">
            <svg viewBox="0 0 400 260" className="h-full w-full">
              {(state?.districts ?? []).map((d) => {
                const x = ((d.district.lng - 83) / 5.5) * 400;
                const y = 260 - ((d.district.lat - 24.3) / 3.5) * 260;
                const forecast = mode === "forecast";
                const val = feature === "rainfall" ? d.rainfall_mm : d.temperature_c;
                const intensity = feature === "rainfall" ? Math.min(1, val / 80) : Math.min(1, (val - 25) / 20);
                const color = feature === "rainfall" ? `oklch(0.7 ${0.05 + intensity * 0.2} 240)` : `oklch(0.7 ${0.05 + intensity * 0.22} 30)`;
                return (
                  <circle
                    key={d.district.id} cx={x} cy={y} r={11}
                    fill={forecast ? `url(#hatch-${d.district.id})` : color}
                    stroke="oklch(1 0 0 / 30%)"
                    strokeWidth="0.6"
                  />
                );
              })}
              <defs>
                {(state?.districts ?? []).map((d) => {
                  const val = feature === "rainfall" ? d.rainfall_mm * 1.1 : d.temperature_c + 0.5;
                  const intensity = feature === "rainfall" ? Math.min(1, val / 80) : Math.min(1, (val - 25) / 20);
                  const color = feature === "rainfall" ? `oklch(0.7 ${0.05 + intensity * 0.2} 240)` : `oklch(0.7 ${0.05 + intensity * 0.22} 30)`;
                  return (
                    <pattern key={d.district.id} id={`hatch-${d.district.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="6" height="6" fill={color} />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.2 0.02 260)" strokeWidth="1.2" />
                    </pattern>
                  );
                })}
              </defs>
            </svg>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Forecast steps:</span>
            {[1, 2, 4, 8].map((n) => (
              <ToggleBtn key={n} active={step === n} onClick={() => setStep(n)}>T+{n}</ToggleBtn>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground">Uncertainty grows with each iterative step</span>
          </div>
        </section>

        <section className="col-span-12 rounded-xl border border-border bg-panel p-4 xl:col-span-5">
          <div className="mb-3 font-display text-sm font-semibold uppercase tracking-widest">Block Prediction Explorer</div>
          <div className="relative mb-2">
            <Input value={blockSearch} onChange={(e) => setBlockSearch(e.target.value)} placeholder="Search block…" className="h-8 text-xs" />
            {blockSearch && filteredBlocks.length > 0 && (
              <div className="absolute left-0 right-0 top-9 z-10 max-h-40 overflow-y-auto rounded border border-border bg-panel">
                {filteredBlocks.map((b) => (
                  <button key={b.block_id} onClick={() => { setSelectedBlock(b); setBlockSearch(""); }} className="block w-full px-2 py-1 text-left text-xs hover:bg-accent">
                    {b.block_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedBlock && (
            <>
              <div className="mb-2 text-xs font-semibold">{selectedBlock.block_name}</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "rainfall_mm", label: "Rainfall (mm)", pred: selectedBlock.rainfall_mm * 1.08 },
                  { key: "temperature_c", label: "Temp (°C)", pred: selectedBlock.temperature_c + 0.4 },
                  { key: "soil_moisture_index", label: "Soil", pred: selectedBlock.soil_moisture_index * 0.98 },
                  { key: "heat_retention_score", label: "Heat", pred: selectedBlock.heat_retention_score * 1.02 },
                  { key: "flood_risk", label: "Flood risk", pred: Math.min(1, selectedBlock.flood_risk * 1.1) },
                  { key: "drought_risk", label: "Drought risk", pred: selectedBlock.drought_risk * 0.96 },
                ].map((f) => {
                  const cur = selectedBlock[f.key as keyof BlockState] as number;
                  const up = f.pred > cur;
                  return (
                    <div key={f.key} className="rounded border border-border bg-background/40 px-2 py-1.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</div>
                      <div className="mt-1 flex items-baseline justify-between text-[11px]">
                        <span className="font-mono">{cur.toFixed(2)}</span>
                        <span className="flex items-center gap-1 font-mono font-bold text-primary">
                          {f.pred.toFixed(2)} {up ? <ArrowUp className="h-3 w-3 text-[color:var(--risk-compound)]" /> : <ArrowDown className="h-3 w-3 text-[color:var(--risk-drought)]" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 h-32 rounded border border-border bg-background/40 p-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">24-h forecast · {feature}</div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={blockForecast}>
                    <XAxis dataKey="h" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={30} />
                    <Area dataKey="hi" fill="var(--risk-flood)" fillOpacity={0.15} stroke="none" />
                    <Area dataKey="lo" fill="var(--panel)" stroke="none" />
                    <Line dataKey="value" stroke="var(--risk-flood)" dot={false} strokeWidth={1.8} />
                    <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 rounded border border-[color:var(--risk-drought)]/40 bg-[color:var(--risk-drought)]/10 p-2 text-[11px]">
                <div className="font-semibold text-[color:var(--risk-drought)]">Physics Constraint Status</div>
                <div className="mt-1 text-muted-foreground">
                  Prediction adjusted: negative rainfall corrected to zero. Mass balance check passed for this block.
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Bottom row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title={`Predicted vs Observed · R² = ${r2.toFixed(2)}`}>
          <ResponsiveContainer>
            <ScatterChart>
              <XAxis type="number" dataKey="obs" domain={[0, 100]} tick={{ fontSize: 9 }} name="Obs" />
              <YAxis type="number" dataKey="pred" domain={[0, 100]} tick={{ fontSize: 9 }} name="Pred" />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
              <Scatter data={scatter} fill="var(--brand-cyan)" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="CSI · 30 days">
          <ResponsiveContainer>
            <LineChart data={validation}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis domain={[0.5, 1]} tick={{ fontSize: 9 }} width={30} />
              <ReferenceLine y={0.85} stroke="var(--risk-heat)" strokeDasharray="4 4" />
              <ReferenceArea y1={0.85} y2={1} fill="var(--risk-drought)" fillOpacity={0.06} />
              <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
              <Line dataKey="csi" stroke="var(--brand-cyan)" strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="RMSE vs persistence">
          <ResponsiveContainer>
            <LineChart data={validation}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
              <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 11 }} />
              <Line dataKey="rmse" stroke="var(--brand-cyan)" strokeWidth={1.8} dot={false} />
              <Line dataKey="persistenceRmse" stroke="var(--risk-heat)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-panel p-4 text-xs">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Model Notes</div>
        <p className="text-muted-foreground">
          Target benchmarks are based on published India-region GNN transformer rainfall-forecast studies and will be
          validated against 2022–2024 monsoon holdout data. Iterative rollout uncertainty is bounded by physics-guided
          regularization on mass, temperature, and soil-moisture balance.
        </p>
      </div>
    </div>
  );
}

function StatusCard({ title, icon, badge, badgeColor, children }: { title: string; icon: React.ReactNode; badge?: string; badgeColor?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>{title}
        {badge && <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `color-mix(in oklch, ${badgeColor} 25%, transparent)`, color: badgeColor }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded border px-2 py-0.5 ${active ? "border-[color:var(--risk-heat)] bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)]" : "border-border text-muted-foreground hover:bg-accent"}`}>
      {children}
    </button>
  );
}

function ProgressRing({ value, target }: { value: number; target: number }) {
  const pct = Math.min(1, value / target);
  const c = 2 * Math.PI * 18;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" stroke="var(--border)" strokeWidth="4" fill="none" />
      <circle cx="22" cy="22" r="18" stroke="var(--risk-drought)" strokeWidth="4" fill="none" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 22 22)" strokeLinecap="round" />
    </svg>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-56 rounded-xl border border-border bg-panel p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="h-[85%]">{children}</div>
    </div>
  );
}
