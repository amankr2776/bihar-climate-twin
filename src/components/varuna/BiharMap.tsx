import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import type { DistrictState, BlockState } from "@/lib/varuna/state";
import { RISK_COLORS } from "@/lib/varuna/state";
import { BIHAR_BOUNDS } from "@/lib/varuna/districts";

type Props = {
  districts: DistrictState[];
  blocks: BlockState[];
  view: "state" | "district";
  selectedDistrict: string | null;
  onSelectDistrict: (id: string | null) => void;
  onSelectBlock: (block: BlockState | null) => void;
};

export function BiharMap({ districts, blocks, view, selectedDistrict, onSelectDistrict, onSelectBlock }: Props) {
  const activeBlocks = view === "district" && selectedDistrict
    ? blocks.filter((b) => b.district_id === selectedDistrict)
    : [];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-panel">
      <MapContainer
        bounds={BIHAR_BOUNDS}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; OpenStreetMap · CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {view === "state" &&
          districts.map((d) => {
            const color = `var(--risk-${d.category})`;
            const radius = 10 + d.flood_risk * 18 + d.drought_risk * 10;
            return (
              <CircleMarker
                key={d.district.id}
                center={[d.district.lat, d.district.lng]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: d.compound_risk ? 3 : 1.5,
                }}
                eventHandlers={{ click: () => onSelectDistrict(d.district.id) }}
              >
                <Tooltip direction="top" opacity={0.95} sticky>
                  <div className="text-xs">
                    <div className="font-semibold">{d.district.name}</div>
                    <div>Flood risk: {(d.flood_risk * 100).toFixed(0)}%</div>
                    <div>Drought risk: {(d.drought_risk * 100).toFixed(0)}%</div>
                    {d.compound_risk && <div className="text-[color:var(--risk-compound)] font-semibold">Compound risk</div>}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {view === "district" &&
          activeBlocks.map((b) => (
            <CircleMarker
              key={b.block_id}
              center={[b.lat, b.lng]}
              radius={7 + b.flood_risk * 6 + b.drought_risk * 4}
              pathOptions={{
                color: `var(--risk-${b.category})`,
                fillColor: `var(--risk-${b.category})`,
                fillOpacity: 0.65,
                weight: b.compound_risk ? 2.5 : 1,
              }}
              eventHandlers={{ click: () => onSelectBlock(b) }}
            >
              <Popup>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">{b.block_name}</div>
                  <div>Rainfall: {b.rainfall_mm} mm</div>
                  <div>Temp: {b.temperature_c} °C</div>
                  <div>Soil moisture: {(b.soil_moisture_index * 100).toFixed(0)}%</div>
                  <div>Flood risk: {(b.flood_risk * 100).toFixed(0)}%</div>
                  <div>Drought risk: {(b.drought_risk * 100).toFixed(0)}%</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      {/* Overlays: legend + drill-down controls */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="pointer-events-auto flex items-start justify-between gap-2">
          <div className="rounded-lg border border-border bg-panel/85 px-3 py-2 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Drill</div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <button
                onClick={() => onSelectDistrict(null)}
                className={`rounded px-2 py-1 ${view === "state" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              >
                India → Bihar
              </button>
              <span className="text-muted-foreground">/</span>
              <span className={`rounded px-2 py-1 ${view === "district" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {selectedDistrict
                  ? districts.find((d) => d.district.id === selectedDistrict)?.district.name
                  : "District"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-panel/85 px-3 py-2 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk legend</div>
            <div className="mt-1 grid grid-cols-1 gap-1 text-[11px]">
              {(["compound", "flood", "heat", "normal", "cold"] as const).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[k] }} />
                  <span className="capitalize">{k === "compound" ? "Compound flood+heat" : k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kosi callout */}
        <div className="pointer-events-auto max-w-xs rounded-lg border border-[color:var(--risk-flood)]/40 bg-panel/85 p-3 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-widest text-[color:var(--risk-flood)]">Kosi basin anomaly</div>
          <div className="mt-1 text-sm">
            +{(
              (districts.filter((d) => d.district.kosiBasin).reduce((s, d) => s + Math.max(0, d.rainfall_mm - 45), 0) /
                Math.max(1, districts.filter((d) => d.district.kosiBasin).length)) *
              1.2
            ).toFixed(0)}
            % excess precipitation vs 30-day climatology
          </div>
          <div className="text-xs text-muted-foreground">
            Compound severity multiplier: ×
            {(1 + districts.filter((d) => d.compound_risk).length / 20).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
