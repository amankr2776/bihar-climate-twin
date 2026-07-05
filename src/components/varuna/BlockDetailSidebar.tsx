import type { BlockState, DistrictState } from "@/lib/varuna/state";
import { RISK_LABELS } from "@/lib/varuna/state";

type Props = {
  block: BlockState | null;
  district: DistrictState | null;
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 text-xs last:border-none">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-foreground">{v}</span>
    </div>
  );
}

export function BlockDetailSidebar({ block, district }: Props) {
  if (!block && !district) {
    return (
      <div className="rounded-xl border border-border bg-panel p-4 text-xs text-muted-foreground">
        Click a district on the map to drill into its 14 blocks. Click a block to inspect its full state vector.
      </div>
    );
  }

  if (block) {
    return (
      <div className="rounded-xl border border-border bg-panel p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Block state vector</div>
            <h3 className="text-sm font-semibold">{block.block_name}</h3>
            <div className="text-[11px] text-muted-foreground">
              {block.district_name} · {block.kosi_basin ? "Kosi basin" : "Non-Kosi"}
            </div>
          </div>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: `color-mix(in oklch, var(--risk-${block.category}) 22%, transparent)`,
              color: `var(--risk-${block.category})`,
            }}
          >
            {RISK_LABELS[block.category]}
          </span>
        </div>
        <div className="mt-3">
          <Row k="Timestamp" v={new Date(block.timestamp).toLocaleString()} />
          <Row k="Rainfall (T)" v={`${block.rainfall_mm} mm`} />
          <Row k="Temperature" v={`${block.temperature_c} °C`} />
          <Row k="LST (INSAT)" v={`${block.lst_k} K`} />
          <Row k="Soil moisture idx" v={`${(block.soil_moisture_index * 100).toFixed(0)}%`} />
          <Row k="Heat retention" v={`${(block.heat_retention_score * 100).toFixed(0)}%`} />
          <Row k="Rainfall anomaly" v={`${block.rainfall_anomaly_pct > 0 ? "+" : ""}${block.rainfall_anomaly_pct}%`} />
          <Row k="Flood risk" v={`${(block.flood_risk * 100).toFixed(0)}%`} />
          <Row k="Drought risk" v={`${(block.drought_risk * 100).toFixed(0)}%`} />
          <Row k="Population" v={block.population.toLocaleString()} />
        </div>
      </div>
    );
  }

  const d = district!;
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">District</div>
          <h3 className="text-sm font-semibold">{d.district.name}</h3>
          <div className="text-[11px] text-muted-foreground capitalize">
            {d.district.region} Bihar · {d.blocks.length} blocks
          </div>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: `color-mix(in oklch, var(--risk-${d.category}) 22%, transparent)`,
            color: `var(--risk-${d.category})`,
          }}
        >
          {RISK_LABELS[d.category]}
        </span>
      </div>
      <div className="mt-3">
        <Row k="Mean rainfall" v={`${d.rainfall_mm} mm`} />
        <Row k="Mean temperature" v={`${d.temperature_c} °C`} />
        <Row k="Flood risk (mean)" v={`${(d.flood_risk * 100).toFixed(0)}%`} />
        <Row k="Drought risk (mean)" v={`${(d.drought_risk * 100).toFixed(0)}%`} />
        <Row k="Compound risk" v={d.compound_risk ? "Yes" : "No"} />
        <Row k="Population at risk" v={d.population_at_risk.toLocaleString()} />
        <Row k="Kosi basin" v={d.district.kosiBasin ? "Yes" : "No"} />
      </div>
    </div>
  );
}
