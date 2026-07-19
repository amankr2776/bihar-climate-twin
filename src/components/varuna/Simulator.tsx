import { useId, useState } from "react";
import { runSimulation, type SimulationInput, type SimulationResult } from "@/lib/varuna/api";

const SOIL_OPTIONS: Array<{ v: SimulationInput["soil_condition"]; label: string; hint: string }> = [
  { v: "normal", label: "Normal", hint: "Baseline infiltration capacity" },
  { v: "drought-baked", label: "Drought-baked", hint: "Near-zero infiltration — sun-hardened" },
  { v: "saturated", label: "Saturated", hint: "Already at field capacity" },
];

const PRESETS: Array<{
  key: string;
  label: string;
  hint: string;
  input: SimulationInput;
}> = [
  {
    key: "kosi-2008",
    label: "Kosi 2008",
    hint: "Aug 2008 embankment breach — extreme rainfall on saturated soils",
    input: { rainfall_anomaly_pct: 45, temperature_anomaly_c: 1, soil_condition: "saturated" },
  },
  {
    key: "gaya-2019",
    label: "S. Bihar heat 2019",
    hint: "Jun 2019 Gaya/Aurangabad heatwave — deficit rain, baked soils",
    input: { rainfall_anomaly_pct: -35, temperature_anomaly_c: 4, soil_condition: "drought-baked" },
  },
  {
    key: "monsoon-2020",
    label: "Monsoon 2020",
    hint: "Sept 2020 Bagmati/Kamla surge — surplus rain, saturated basin",
    input: { rainfall_anomaly_pct: 30, temperature_anomaly_c: 0.5, soil_condition: "saturated" },
  },
];


export function Simulator({ busy = false }: { busy?: boolean } = {}) {
  const baseId = useId();
  const rainId = `${baseId}-rain`;
  const tempId = `${baseId}-temp`;
  const soilId = `${baseId}-soil`;

  const [rain, setRain] = useState(15);
  const [temp, setTemp] = useState(2);
  const [soil, setSoil] = useState<SimulationInput["soil_condition"]>("drought-baked");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const disabled = busy || running;

  const run = async () => {
    setRunning(true);
    try {
      const r = await runSimulation({
        rainfall_anomaly_pct: rain,
        temperature_anomaly_c: temp,
        soil_condition: soil,
      });
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  const cards = result
    ? [
        { key: "flood", title: "Flood risk", color: "var(--risk-flood)", data: result.flood_level },
        { key: "drought", title: "Drought index", color: "var(--risk-heat)", data: result.drought_index },
        { key: "heat", title: "Heatwave alert", color: "var(--risk-compound)", data: result.heatwave_alert },
        { key: "cold", title: "Coldwave alert", color: "var(--risk-cold)", data: result.coldwave_alert },
      ]
    : [];

  return (
    <div aria-busy={busy} className={`rounded-xl border border-border bg-panel p-4 ${busy ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold">What-if simulator</h3>
          <p className="text-[11px] text-muted-foreground">
            Inject an anomaly and roll the PI-GNN forward 15 hours. Output is illustrative for the scenario shown.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label htmlFor={rainId} className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rainfall anomaly</span>
            <span className="font-mono text-primary">{rain > 0 ? "+" : ""}{rain}%</span>
          </div>
          <input
            id={rainId}
            type="range"
            min={-50}
            max={50}
            step={1}
            value={rain}
            disabled={disabled}
            onChange={(e) => setRain(Number(e.target.value))}
            className="w-full accent-[color:var(--risk-flood)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <label htmlFor={tempId} className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Temperature anomaly</span>
            <span className="font-mono text-primary">{temp > 0 ? "+" : ""}{temp} °C</span>
          </div>
          <input
            id={tempId}
            type="range"
            min={-5}
            max={5}
            step={0.5}
            value={temp}
            disabled={disabled}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="w-full accent-[color:var(--risk-heat)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <label htmlFor={soilId} className="space-y-2 text-xs">
          <span className="text-muted-foreground">Baseline soil condition</span>
          <select
            id={soilId}
            value={soil}
            disabled={disabled}
            onChange={(e) => setSoil(e.target.value as SimulationInput["soil_condition"])}
            className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {SOIL_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={run}
          disabled={disabled}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Recalculating…" : running ? "Running cascade…" : "Run scenario"}
        </button>
        {result && (
          <div className="text-xs text-muted-foreground">
            Severity multiplier ×<span className="text-foreground">{result.severity_multiplier}</span> ·{" "}
            <span className="text-foreground">{result.districts_affected}</span> districts affected
          </div>
        )}
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.key} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.title}</div>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `color-mix(in oklch, ${c.color} 20%, transparent)`, color: c.color }}
                >
                  {c.data.label}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold" style={{ color: c.color }}>
                {(c.data.score * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.data.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
