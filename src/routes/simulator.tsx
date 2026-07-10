import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Play, Save, Trash2, RotateCcw, Download, Zap, PowerOff } from "lucide-react";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ProvenanceStrip } from "@/components/varuna/ProvenanceStrip";
import { useI18n } from "@/lib/i18n";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS } from "@/lib/varuna/districts";
import { runSimulation, type SimulationResult } from "@/lib/varuna/api";
import { varunaStore, useVarunaStore, type SavedScenario } from "@/lib/varuna/store";
import { useVarunaRefresh } from "@/lib/varuna/useCurrentState";


export const Route = createFileRoute("/simulator")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "What-If Simulator · VARUNA" },
      { name: "description", content: "What-if climate simulator for Bihar — test rainfall, temperature and soil scenarios across districts." },
      { property: "og:title", content: "What-If Simulator · VARUNA" },
      { property: "og:description", content: "What-if climate simulator for Bihar — test rainfall, temperature and soil scenarios across districts." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/simulator" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VARUNA what-if climate simulator preview." },
      { name: "twitter:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/simulator" }],
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const { t } = useI18n();
  const [name, setName] = useState("Scenario 1");
  const [rainfall, setRainfall] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [soil, setSoil] = useState<"normal" | "drought-baked" | "saturated">("normal");
  const [antecedent, setAntecedent] = useState("normal");
  const [season, setSeason] = useState("active-monsoon");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(DISTRICTS.map((d) => d.id));
  const [cascadeDepth, setCascadeDepth] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const saved = useVarunaStore((s) => s.savedScenarios);
  const activeScenarioName = useVarunaStore((s) => s.activeScenarioName);
  const refresh = useVarunaRefresh();

  const applyToLiveTwin = () => {
    varunaStore.set({
      scenarioBias: {
        rainfall_pct: rainfall,
        temperature_c: temperature,
        soil_override: soil === "normal" ? undefined : soil,
      },
      activeScenarioName: name,
    });
    refresh();
    toast.success(`Scenario "${name}" applied to live twin — reflected across all pages`);
  };

  const clearLiveTwin = () => {
    varunaStore.set({ scenarioBias: null, activeScenarioName: null });
    refresh();
    toast.success("Live twin restored to observed baseline");
  };


  const runSim = async () => {
    setRunning(true);
    setProgress(0);
    const int = setInterval(() => setProgress((p) => Math.min(95, p + 8)), 150);
    const r = await runSimulation({ rainfall_anomaly_pct: rainfall, temperature_anomaly_c: temperature, soil_condition: soil });
    await new Promise((r) => setTimeout(r, 800));
    clearInterval(int);
    setProgress(100);
    setResult(r);
    setRunning(false);
    toast.success("Simulation complete");
  };

  const saveScenario = () => {
    if (!result) {
      toast.error("Run the simulation first");
      return;
    }
    const s: SavedScenario = {
      id: `sc-${Date.now()}`,
      name,
      savedAt: new Date().toISOString(),
      rainfall, temperature, humidity, soil, antecedent, season,
      districts: selectedDistricts, cascadeDepth,
      result: {
        floodLabel: result.flood_level.label,
        heatLabel: result.heatwave_alert.label,
        severityMultiplier: result.severity_multiplier,
        districtsAffected: result.districts_affected,
      },
    };
    varunaStore.set((st) => ({ savedScenarios: [s, ...st.savedScenarios] }));
    toast.success(`Scenario "${name}" saved`);
  };

  const loadScenario = (s: SavedScenario) => {
    setName(s.name); setRainfall(s.rainfall); setTemperature(s.temperature); setHumidity(s.humidity);
    setSoil(s.soil as never); setAntecedent(s.antecedent); setSeason(s.season);
    setSelectedDistricts(s.districts); setCascadeDepth(s.cascadeDepth);
    toast.success("Scenario loaded");
  };

  const deleteScenario = (id: string) => {
    varunaStore.set((st) => ({ savedScenarios: st.savedScenarios.filter((x) => x.id !== id) }));
    toast.success("Deleted");
  };

  // Per-district scaling by geography — Kosi/north dominate flood, south
  // dominates drought/heat. Deterministic hash keeps the table stable
  // across renders but differentiated across districts.
  const districtImpact = useMemo(() => {
    if (!result) return [] as Array<{ id: string; name: string; population: number; flood: number; drought: number; heat: number }>;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const hash = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
      return ((h >>> 0) % 1000) / 1000; // 0..1
    };
    return DISTRICTS.map((d) => {
      const j = hash(d.id) - 0.5; // -0.5..0.5 deterministic jitter
      const floodMul =
        (d.kosiBasin ? 1.35 : 1) *
        (d.region === "north" ? 1.15 : d.region === "east" ? 1.05 : d.region === "central" ? 0.95 : d.region === "west" ? 0.85 : 0.6);
      const droughtMul =
        d.region === "south" ? 1.4 : d.region === "west" ? 1.15 : d.region === "central" ? 0.9 : d.kosiBasin ? 0.45 : 0.6;
      const heatMul =
        d.region === "south" ? 1.3 : d.region === "central" ? 1.1 : d.region === "west" ? 1.0 : 0.75;
      const flood = clamp(result.flood_level.score * floodMul + j * 0.08);
      const drought = clamp(result.drought_index.score * droughtMul + j * 0.06);
      const heat = clamp(result.heatwave_alert.score * heatMul + j * 0.05);
      return { id: d.id, name: d.name, population: d.population, flood, drought, heat };
    });
  }, [result]);

  const exportCsv = () => {
    if (!result) return;
    const rows = ["District,Flood,Drought,Heatwave,Coldwave,Blocks,Population"];
    districtImpact.forEach((r) => {
      rows.push(`${r.name},${r.flood.toFixed(2)},${r.drought.toFixed(2)},${r.heat.toFixed(2)},${result.coldwave_alert.score.toFixed(2)},14,${r.population}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `varuna-scenario-${Date.now()}.csv`;
    a.click();
    toast.success("CSV downloaded");
  };

  const compareScenarios = useMemo(() => saved.filter((s) => compareIds.includes(s.id)), [saved, compareIds]);

  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title={t("page.simulator.title")}
        help={{
          title: "What-If Simulator",
          description:
            "Configure rainfall/temperature/humidity anomalies, choose baseline soil and season, pick districts, and set cascade depth. Runs iterative simulation and lists AI recommendations. Save scenarios and compare up to three side by side.",
        }}
      />
      <ProvenanceStrip />

      <div className="grid grid-cols-12 gap-4">
        {/* Config */}
        <section className="col-span-12 space-y-3 rounded-xl border border-border bg-panel p-4 xl:col-span-4">
          <SectionLabel>Scenario Setup</SectionLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scenario name" aria-label="Scenario name" className="h-8 text-xs" />

          <SectionLabel>Climate Anomalies</SectionLabel>
          <SliderRow label="Rainfall Anomaly" value={rainfall} onChange={setRainfall} min={-50} max={50} unit="%" />
          <SliderRow label="Temperature Anomaly" value={temperature} onChange={setTemperature} min={-5} max={5} step={0.5} unit="°C" />
          <SliderRow label="Humidity Anomaly" value={humidity} onChange={setHumidity} min={-30} max={30} unit="%" />

          <SectionLabel>Baseline Conditions</SectionLabel>
          <SelectRow label="Soil" value={soil} onChange={(v) => setSoil(v as never)} opts={[["normal", "Normal"], ["drought-baked", "Drought-Baked"], ["saturated", "Saturated"], ["post-monsoon", "Post-Monsoon"]]} />
          <SelectRow label="Antecedent Rainfall" value={antecedent} onChange={setAntecedent} opts={[["dry", "Dry 14d"], ["normal", "Normal"], ["wet", "Wet 7d"]]} />
          <SelectRow label="Season" value={season} onChange={setSeason} opts={[["pre-monsoon", "Pre-Monsoon"], ["active-monsoon", "Active Monsoon"], ["post-monsoon", "Post-Monsoon"], ["winter", "Winter"]]} />

          <SectionLabel>Geographic Scope</SectionLabel>
          <div className="flex gap-2 text-[11px]">
            <button onClick={() => setSelectedDistricts(DISTRICTS.map((d) => d.id))} className="rounded border border-border px-2 py-0.5 hover:bg-accent">Select All</button>
            <button onClick={() => setSelectedDistricts([])} className="rounded border border-border px-2 py-0.5 hover:bg-accent">Clear</button>
            <span className="ml-auto text-muted-foreground">{selectedDistricts.length}/38</span>
          </div>
          <div className="max-h-32 overflow-y-auto rounded border border-border bg-background/40 p-2">
            {DISTRICTS.map((d) => (
              <label key={d.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                <Checkbox
                  checked={selectedDistricts.includes(d.id)}
                  onCheckedChange={(v) => setSelectedDistricts((s) => v ? [...s, d.id] : s.filter((x) => x !== d.id))}
                />
                {d.name}
              </label>
            ))}
          </div>

          <SectionLabel>Cascade Depth</SectionLabel>
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            {[
              [1, "T+1 · 3h"], [3, "T+3 · 9h"], [5, "T+5 · 15h"], [8, "T+8 · 24h"],
            ].map(([n, label]) => (
              <button key={n} onClick={() => setCascadeDepth(n as number)} className={`rounded border px-1.5 py-1 ${cascadeDepth === n ? "border-[color:var(--risk-heat)] bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)]" : "border-border text-muted-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          <Button onClick={runSim} disabled={running} className="w-full gap-2 bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">
            {running ? <><RotateCcw className="h-4 w-4 animate-spin" /> Running… {progress}%</> : <><Play className="h-4 w-4" /> Run Simulation</>}
          </Button>
          {running && <div className="h-1 w-full rounded bg-background/60"><div className="h-full rounded bg-[color:var(--risk-heat)]" style={{ width: `${progress}%` }} /></div>}
          <Button onClick={saveScenario} variant="outline" className="w-full gap-2 border-[color:var(--risk-heat)]/50 text-[color:var(--risk-heat)]">
            <Save className="h-4 w-4" /> Save Scenario
          </Button>
          {activeScenarioName ? (
            <Button onClick={clearLiveTwin} variant="outline" className="w-full gap-2 border-border">
              <PowerOff className="h-4 w-4" /> Clear scenario · restore baseline
            </Button>
          ) : (
            <Button
              onClick={applyToLiveTwin}
              disabled={!result}
              variant="outline"
              className="w-full gap-2 border-primary/60 text-primary hover:bg-primary/10"
            >
              <Zap className="h-4 w-4" /> Apply to Live Twin
            </Button>
          )}
        </section>


        {/* Results */}
        <section className="col-span-12 space-y-3 rounded-xl border border-border bg-panel p-4 xl:col-span-5">
          {!result ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Play className="mb-2 h-8 w-8 opacity-50" />
              Configure scenario parameters and run simulation to see results.
            </div>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Scenario Summary</div>
              <div className="rounded border border-border bg-background/40 p-2 text-xs">
                <div className="font-semibold">{name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <Chip>rain {rainfall}%</Chip><Chip>temp {temperature}°C</Chip><Chip>humidity {humidity}%</Chip>
                  <Chip>cascade T+{cascadeDepth}</Chip><Chip>{selectedDistricts.length} districts</Chip>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 rounded border border-[color:var(--risk-heat)]/20 bg-[color:var(--risk-heat)]/10 px-3 py-2 text-[11px]">
                <span className="font-bold text-[color:var(--risk-heat)]">Severity ×{result.severity_multiplier}</span>
                <span className="text-[color:var(--risk-heat)]/60">|</span>
                <span className="font-bold text-[color:var(--risk-heat)]">{result.districts_affected} districts affected</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ResultCard label="Flood Risk" value={result.flood_level.label} score={result.flood_level.score} color="var(--risk-flood)" desc={result.flood_level.explanation} />
                <ResultCard label="Drought Index" value={result.drought_index.label} score={result.drought_index.score} color="var(--risk-drought)" desc={result.drought_index.explanation} />
                <ResultCard label="Heatwave Alert" value={`${Math.round(result.heatwave_alert.score * 100)}%`} score={result.heatwave_alert.score} color="var(--risk-heat)" desc={result.heatwave_alert.explanation} subtitle="Heat retention score — cumulative soil heat, not current air temperature." />
                <ResultCard label="Coldwave Alert" value={result.coldwave_alert.label} score={result.coldwave_alert.score} color="var(--risk-cold)" desc={result.coldwave_alert.explanation} />
              </div>

              <div className="flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cascade Evolution</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Blocks at elevated risk</div>
              </div>
              <div className="flex gap-1">
                {result.cascade.map((c, i) => {
                  const total = Object.values(c.category_counts).reduce((s, v) => s + v, 0);
                  const tiers: Array<[string, string]> = [
                    ["normal", "Normal"],
                    ["elevated", "Elevated"],
                    ["high", "High"],
                    ["critical", "Critical"],
                  ];
                  return (
                    <div key={i} className="flex-1 rounded border border-border bg-background/40 p-1 text-center text-[9px]">
                      <div className="mb-1 text-muted-foreground">T+{c.hours_ahead}h</div>
                      <div className="text-[8px] uppercase tracking-wider text-muted-foreground/70">blocks</div>
                      <div className="text-sm font-mono font-semibold text-foreground">{total}</div>
                      <div className="mt-1 space-y-px">
                        {tiers.map(([k, label]) => {
                          const v = c.category_counts[k] ?? 0;
                          return (
                            <div
                              key={k}
                              className="flex items-center justify-between rounded-sm px-1 font-mono"
                              style={{
                                backgroundColor: `color-mix(in oklch, var(--risk-${k}) 22%, transparent)`,
                                color: `var(--risk-${k})`,
                              }}
                            >
                              <span className="text-[8px] uppercase tracking-wide opacity-80">{label}</span>
                              <span>{v}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Projected Impact Breakdown</div>
                <button onClick={exportCsv} className="flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent">
                  <Download className="h-3 w-3" /> CSV
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto rounded border border-border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-panel text-muted-foreground">
                    <tr><th className="p-1 text-left">District</th><th className="p-1 text-right">Flood</th><th className="p-1 text-right">Drought</th><th className="p-1 text-right">Heat</th><th className="p-1 text-right">Pop</th></tr>
                  </thead>
                  <tbody>
                    {districtImpact.map((d) => (
                      <tr key={d.id} className="border-t border-border/40"><td className="p-1">{d.name}</td><td className="p-1 text-right font-mono">{d.flood.toFixed(2)}</td><td className="p-1 text-right font-mono">{d.drought.toFixed(2)}</td><td className="p-1 text-right font-mono">{d.heat.toFixed(2)}</td><td className="p-1 text-right font-mono">{d.population}k</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded border border-[color:var(--risk-heat)]/40 bg-[color:var(--risk-heat)]/10 p-3 text-[11px]">
                <div className="mb-1 font-semibold text-[color:var(--risk-heat)]">AI Recommendation</div>
                <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
                  <li>Pre-position NDRF teams in Purnia and Kishanganj.</li>
                  <li>Issue flood warnings for Kosi basin districts.</li>
                  <li>Monitor soil moisture in southern districts for drought escalation.</li>
                  <li>Activate cooling shelters in Gaya, Aurangabad.</li>
                </ol>
              </div>
            </>
          )}
        </section>

        {/* Saved scenarios */}
        <section className="col-span-12 rounded-xl border border-border bg-panel p-4 xl:col-span-3">
          <div className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">Saved Scenarios</div>
          {saved.length === 0 && <div className="text-xs text-muted-foreground">No scenarios saved yet.</div>}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {saved.map((s) => (
              <li key={s.id} className="rounded border border-border bg-background/40 p-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={compareIds.includes(s.id)}
                    onCheckedChange={(v) => {
                      if (v && compareIds.length >= 3) return toast.error("Max 3");
                      setCompareIds((prev) => v ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                    }}
                  />
                  <span className="flex-1 font-semibold">{s.name}</span>
                  <button onClick={() => loadScenario(s)} title="Load" className="text-primary hover:opacity-70"><RotateCcw className="h-3 w-3" /></button>
                  <button onClick={() => deleteScenario(s.id)} title="Delete" className="text-[color:var(--risk-compound)] hover:opacity-70"><Trash2 className="h-3 w-3" /></button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-muted-foreground">
                  <Chip>r{s.rainfall}</Chip><Chip>t{s.temperature}</Chip><Chip>h{s.humidity}</Chip>
                  {s.result && <span className="rounded bg-[color:var(--risk-heat)]/20 px-1.5 text-[color:var(--risk-heat)]">{s.result.floodLabel}</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 font-display text-sm font-semibold uppercase tracking-widest">Compare Scenarios</div>
          {compareScenarios.length === 0 ? (
            <div className="mt-1 text-xs text-muted-foreground">Check up to 3 scenarios.</div>
          ) : (
            <table className="mt-2 w-full text-[10px]">
              <thead className="text-muted-foreground"><tr><th className="text-left">Field</th>{compareScenarios.map((s) => <th key={s.id} className="text-right">{s.name}</th>)}</tr></thead>
              <tbody>
                {[
                  ["Rainfall", (s: SavedScenario) => `${s.rainfall}%`],
                  ["Temp", (s: SavedScenario) => `${s.temperature}°C`],
                  ["Cascade", (s: SavedScenario) => `T+${s.cascadeDepth}`],
                  ["Flood", (s: SavedScenario) => s.result?.floodLabel ?? "—"],
                  ["Heat", (s: SavedScenario) => s.result?.heatLabel ?? "—"],
                  ["×Severity", (s: SavedScenario) => `×${s.result?.severityMultiplier ?? "—"}`],
                ].map(([label, fn]) => (
                  <tr key={label as string} className="border-t border-border/30"><td className="py-0.5">{label as string}</td>{compareScenarios.map((s) => <td key={s.id} className="py-0.5 text-right font-mono">{(fn as (s: SavedScenario) => string)(s)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">{children}</h2>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-background px-1.5 py-0.5 font-mono">{children}</span>;
}
function SliderRow({ label, value, onChange, min, max, step = 1, unit }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="rounded bg-[color:var(--risk-heat)]/20 px-2 py-0.5 font-mono font-bold text-[color:var(--risk-heat)]">{value > 0 ? "+" : ""}{value}{unit}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} className="mt-1" />
    </div>
  );
}
function SelectRow({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
function ResultCard({ label, value, score, color, desc, subtitle }: { label: string; value: string | number; score: number; color: string; desc: string; subtitle?: string }) {
  return (
    <div className="rounded border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-xl font-bold" style={{ color }}>{value}</span>
        <div className="h-1 flex-1 rounded bg-background"><div className="h-full rounded" style={{ width: `${score * 100}%`, backgroundColor: color }} /></div>
      </div>
      {subtitle && <div className="mt-1 text-[10px] leading-tight text-muted-foreground/80">{subtitle}</div>}
      <div className="mt-1 text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}
