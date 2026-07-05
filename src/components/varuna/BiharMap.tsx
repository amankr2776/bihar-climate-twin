import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, Popup, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { PathOptions, Layer } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import type { DistrictState, BlockState, RiskCategory } from "@/lib/varuna/state";
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

// slug a name like "West Champaran" -> "west-champaran" for id matching
function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function FitOnChange({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

export function BiharMap({ districts, blocks, view, selectedDistrict, onSelectDistrict, onSelectBlock }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/bihar-districts.geojson")
      .then((r) => r.json())
      .then((g: FeatureCollection) => setGeo(g))
      .catch(() => setGeo(null));
  }, []);

  const catByDistrict = useMemo(() => {
    const m = new Map<string, DistrictState>();
    for (const d of districts) m.set(d.district.id, d);
    return m;
  }, [districts]);

  const activeDistrict = selectedDistrict ? catByDistrict.get(selectedDistrict) : null;
  const activeBlocks =
    view === "district" && selectedDistrict ? blocks.filter((b) => b.district_id === selectedDistrict) : [];

  const styleFeature = (feature?: Feature<Geometry, { district: string }>): PathOptions => {
    if (!feature) return {};
    const id = slug(feature.properties.district);
    const state = catByDistrict.get(id);
    const cat: RiskCategory = state?.category ?? "normal";
    const isSelected = selectedDistrict === id;
    return {
      fillColor: `var(--risk-${cat})`,
      fillOpacity: isSelected ? 0.85 : 0.72,
      color: isSelected ? "oklch(1 0 0)" : "oklch(0.16 0.02 260 / 55%)",
      weight: isSelected ? 2.5 : 1,
    };
  };

  const onEach = (feature: Feature<Geometry, { district: string }>, layer: Layer) => {
    const id = slug(feature.properties.district);
    const state = catByDistrict.get(id);
    layer.on({
      click: () => onSelectDistrict(id),
      mouseover: (e) => {
        const l = e.target as { setStyle: (s: PathOptions) => void };
        l.setStyle({ fillOpacity: 0.95, weight: 2 });
      },
      mouseout: (e) => {
        const l = e.target as { setStyle: (s: PathOptions) => void };
        l.setStyle(styleFeature(feature));
      },
    });
    // Permanent label with district name
    layer.bindTooltip(
      `<div class="v-map-label">${feature.properties.district}${
        state?.compound_risk ? "<div class='v-map-label-sub'>compound</div>" : ""
      }</div>`,
      { permanent: true, direction: "center", className: "v-map-label-wrap", opacity: 1 },
    );
  };

  // Rebuild GeoJSON layer when state or selection changes so styles refresh.
  const geoKey = useMemo(() => `${districts.length}-${selectedDistrict ?? "all"}`, [districts, selectedDistrict]);

  const bounds = activeDistrict
    ? ([
        [activeDistrict.district.lat - 0.4, activeDistrict.district.lng - 0.5],
        [activeDistrict.district.lat + 0.4, activeDistrict.district.lng + 0.5],
      ] as [[number, number], [number, number]])
    : BIHAR_BOUNDS;

  return (
    <MapContainer
      bounds={BIHAR_BOUNDS}
      style={{ height: "100%", width: "100%", background: "oklch(0.14 0.02 260)" }}
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        attribution='&copy; OpenStreetMap · CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />

      {geo && (
        <GeoJSON
          key={geoKey}
          data={geo}
          style={styleFeature as never}
          onEachFeature={onEach as never}
        />
      )}

      {view === "district" &&
        activeBlocks.map((b) => (
          <CircleMarker
            key={b.block_id}
            center={[b.lat, b.lng]}
            radius={5 + b.flood_risk * 5 + b.drought_risk * 3}
            pathOptions={{
              color: "oklch(1 0 0 / 85%)",
              fillColor: `var(--risk-${b.category})`,
              fillOpacity: 0.9,
              weight: 1,
            }}
            eventHandlers={{ click: () => onSelectBlock(b) }}
          >
            <Tooltip>{b.block_name}</Tooltip>
            <Popup>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold">{b.block_name}</div>
                <div>Rainfall: {b.rainfall_mm} mm</div>
                <div>Temp: {b.temperature_c} °C</div>
                <div>Soil moisture: {(b.soil_moisture_index * 100).toFixed(0)}%</div>
                <div>Flood risk: {(b.flood_risk * 100).toFixed(0)}%</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      <FitOnChange bounds={bounds} />

      {/* legend + drill overlay markup lives in parent for layering with callouts */}
      <MapLegend
        selectedDistrict={selectedDistrict}
        onReset={() => onSelectDistrict(null)}
        activeName={activeDistrict?.district.name ?? null}
      />
    </MapContainer>
  );
}

function MapLegend({
  selectedDistrict,
  onReset,
  activeName,
}: {
  selectedDistrict: string | null;
  onReset: () => void;
  activeName: string | null;
}) {
  const legend: Array<{ k: RiskCategory; label: string }> = [
    { k: "flood", label: "Rainfall / Flood" },
    { k: "compound", label: "Compound Risk" },
    { k: "heat", label: "Heatwave / Drought" },
    { k: "drought", label: "Drought (Low soil)" },
    { k: "normal", label: "Normal" },
  ];
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control m-3 rounded-lg border border-border bg-panel/90 p-3 backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Legend</div>
          {selectedDistrict && (
            <button
              onClick={onReset}
              className="rounded border border-border bg-background/60 px-2 py-0.5 text-[10px] text-primary hover:bg-accent"
            >
              ← Bihar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1 text-[11px]">
          {legend.map((l) => (
            <div key={l.k} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[l.k] }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
        {activeName && (
          <div className="mt-2 border-t border-border pt-2 text-[11px]">
            <span className="text-muted-foreground">Drilled: </span>
            <span className="font-semibold text-foreground">{activeName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
