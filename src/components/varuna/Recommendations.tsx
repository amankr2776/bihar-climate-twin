import type { DistrictState } from "@/lib/varuna/state";
import { useVarunaStore } from "@/lib/varuna/store";

// Rule-based recommendations derived from live state + any active scenario.
// Output changes as districts flip categories, as scenario bias is applied,
// and as compound events form/dissolve. Every action carries specific
// district names, numeric risk % and a concrete operational instruction.
export function Recommendations({ districts }: { districts: DistrictState[] }) {
  const scenarioName = useVarunaStore((s) => s.activeScenarioName);
  const bias = useVarunaStore((s) => s.scenarioBias);

  const kosi = districts
    .filter((d) => d.district.kosiBasin && d.flood_risk > 0.5)
    .sort((a, b) => b.flood_risk - a.flood_risk);
  const heat = districts
    .filter((d) => d.district.region === "south" && d.drought_risk > 0.5)
    .sort((a, b) => b.drought_risk - a.drought_risk);
  const compound = districts
    .filter((d) => d.compound_risk)
    .sort((a, b) => b.flood_risk + b.drought_risk - (a.flood_risk + a.drought_risk));
  const droughtAll = districts
    .filter((d) => d.drought_risk > 0.55 && d.district.region !== "south")
    .sort((a, b) => b.drought_risk - a.drought_risk);
  const floodOther = districts
    .filter((d) => !d.district.kosiBasin && d.flood_risk > 0.55)
    .sort((a, b) => b.flood_risk - a.flood_risk);

  const rainPct = bias?.rainfall_pct ?? 0;
  const tempC = bias?.temperature_c ?? 0;
  const soil = bias?.soil_override;

  const items: Array<{ tone: string; title: string; body: string; tag?: string }> = [];

  if (kosi.length) {
    const top = kosi.slice(0, 4);
    const worst = top[0];
    const pop = top.reduce((s, d) => s + d.population_at_risk, 0);
    items.push({
      tone: "var(--risk-flood)",
      title: `Pre-position NDRF · Kosi basin (${top.length} districts)`,
      tag: `Peak flood risk ${(worst.flood_risk * 100).toFixed(0)}% · ${worst.district.name}`,
      body: `${top.map((d) => `${d.district.name} ${(d.flood_risk * 100).toFixed(0)}%`).join(" · ")}. Stage-2 boat teams within 6h; open EOC in ${worst.district.name}; ~${(pop / 1000).toFixed(0)}k population at risk. ${soil === "saturated" ? "Soil already saturated — runoff response will be near-instant." : soil === "drought-baked" ? "Sun-baked soil rejects infiltration — expect flash-runoff even on moderate rain." : ""}`,
    });
  }
  if (heat.length) {
    const top = heat.slice(0, 4);
    items.push({
      tone: "var(--risk-heat)",
      title: `Activate cooling shelters · South Bihar (${top.length})`,
      tag: `Peak drought/heat ${(top[0].drought_risk * 100).toFixed(0)}% · ${top[0].district.name}`,
      body: `${top.map((d) => `${d.district.name} ${(d.drought_risk * 100).toFixed(0)}%`).join(" · ")}. Open shelters at PHC + panchayat halls; issue heatwave advisory in Hindi/Maithili; pre-stage ORS at Anganwadis. ${tempC >= 2 ? `Scenario temperature anomaly +${tempC}°C amplifies exposure — extend advisory to 5-day.` : ""}`,
    });
  }
  if (compound.length) {
    const worst = compound[0];
    const names = compound.slice(0, 5).map((d) => d.district.name).join(", ");
    items.push({
      tone: "var(--risk-compound)",
      title: `Compound risk · ${compound.length} district${compound.length > 1 ? "s" : ""}`,
      tag: `Severity ×${(1 + compound.length * 0.35).toFixed(1)}`,
      body: `Concurrent flood + drought/heat stress in ${names}. Worst cell: ${worst.district.name} — flood ${(worst.flood_risk * 100).toFixed(0)}% / drought ${(worst.drought_risk * 100).toFixed(0)}%. Coordinate SDRF + agri-extension jointly; single-hazard playbooks under-count impact by ~35% per compound district.`,
    });
  }
  if (floodOther.length) {
    const top = floodOther.slice(0, 3);
    items.push({
      tone: "var(--risk-flood)",
      title: `Elevated flood risk outside Kosi (${top.length})`,
      tag: `${top[0].district.name} ${(top[0].flood_risk * 100).toFixed(0)}%`,
      body: `${top.map((d) => `${d.district.name} ${(d.flood_risk * 100).toFixed(0)}%`).join(" · ")}. Alert local CD volunteers; verify embankment condition on Bagmati/Gandak/Ganga reach.`,
    });
  }
  if (droughtAll.length) {
    const top = droughtAll.slice(0, 3);
    items.push({
      tone: "var(--risk-drought)",
      title: `Agri-drought watch · ${top.length} non-south district${top.length > 1 ? "s" : ""}`,
      tag: `${top[0].district.name} ${(top[0].drought_risk * 100).toFixed(0)}%`,
      body: `${top.map((d) => `${d.district.name} ${(d.drought_risk * 100).toFixed(0)}%`).join(" · ")}. Recommend agri-extension advisory: shift to short-duration paddy varieties; verify tubewell head at panchayat level.`,
    });
  }

  if (!items.length) {
    items.push({
      tone: "var(--risk-normal)",
      title: "No cross-threshold actions required",
      body: `All 38 districts within normal bounds (max flood ${(Math.max(...districts.map((d) => d.flood_risk), 0) * 100).toFixed(0)}%, max drought ${(Math.max(...districts.map((d) => d.drought_risk), 0) * 100).toFixed(0)}%). Continue routine 3-hour digital-twin refresh cycle.`,
    });
  }

  const scenarioLine = scenarioName
    ? `Scenario "${scenarioName}" · rain ${rainPct >= 0 ? "+" : ""}${rainPct}% · temp ${tempC >= 0 ? "+" : ""}${tempC}°C${soil ? ` · soil ${soil}` : ""}`
    : "Baseline · live observed state";

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">AI decision support</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">rule-based on state</span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{scenarioLine}</div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded-lg border-l-2 bg-background/40 px-3 py-2 text-xs"
            style={{ borderColor: it.tone }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold" style={{ color: it.tone }}>
                {it.title}
              </div>
              {it.tag && (
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ backgroundColor: `color-mix(in oklch, ${it.tone} 18%, transparent)`, color: it.tone }}
                >
                  {it.tag}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-muted-foreground">{it.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
