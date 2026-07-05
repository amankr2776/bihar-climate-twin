import type { DistrictState } from "@/lib/varuna/state";

// Rule-based recommendations derived directly from the current state.
export function Recommendations({ districts }: { districts: DistrictState[] }) {
  const kosi = districts
    .filter((d) => d.district.kosiBasin && d.flood_risk > 0.55)
    .sort((a, b) => b.flood_risk - a.flood_risk)
    .slice(0, 3);

  const heat = districts
    .filter((d) => d.district.region === "south" && d.drought_risk > 0.55)
    .sort((a, b) => b.drought_risk - a.drought_risk)
    .slice(0, 3);

  const compound = districts.filter((d) => d.compound_risk);

  const items: Array<{ tone: string; title: string; body: string }> = [];

  if (kosi.length) {
    items.push({
      tone: "var(--risk-flood)",
      title: "Pre-position NDRF (Kosi basin)",
      body: `Elevated saturation in ${kosi.map((d) => d.district.name).join(", ")}. Stage 2 boat teams recommended within 6 hours.`,
    });
  }
  if (heat.length) {
    items.push({
      tone: "var(--risk-heat)",
      title: "Activate cooling shelters (South Bihar)",
      body: `${heat.map((d) => d.district.name).join(", ")} showing sustained heat retention. Advise district admin to open cooling shelters and issue heatwave advisories.`,
    });
  }
  if (compound.length) {
    items.push({
      tone: "var(--risk-compound)",
      title: `Compound risk in ${compound.length} district${compound.length > 1 ? "s" : ""}`,
      body: `Concurrent flood + drought stress. Coordinate SDRF + agri-extension response — impact multiplier applies to standard single-hazard playbooks.`,
    });
  }
  if (!items.length) {
    items.push({
      tone: "var(--risk-normal)",
      title: "No cross-threshold actions required",
      body: "State vector within normal bounds. Continue routine 3-hour digital-twin refresh cycle.",
    });
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">AI decision support</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">rule-based on state</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded-lg border-l-2 bg-background/40 px-3 py-2 text-xs"
            style={{ borderColor: it.tone }}
          >
            <div className="font-semibold" style={{ color: it.tone }}>
              {it.title}
            </div>
            <div className="mt-0.5 text-muted-foreground">{it.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
