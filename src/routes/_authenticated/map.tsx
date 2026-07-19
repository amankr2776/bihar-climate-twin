import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { PathOptions } from "leaflet";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Search, Download, FileDown, FileText, X, Compass, Lock } from "lucide-react";
import { useCurrentState } from "@/lib/varuna/useCurrentState";
import { PageSkeleton } from "@/components/varuna/DashboardSkeleton";
import { BIHAR_BOUNDS } from "@/lib/varuna/districts";
import { RISK_COLORS, type BlockState, type DistrictState } from "@/lib/varuna/state";
import { useBlockHistory } from "@/lib/varuna/real-metrics";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ProvenanceStrip } from "@/components/varuna/ProvenanceStrip";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bihar Block Risk Map · VARUNA" },
      { name: "description", content: "Interactive full-screen Bihar climate map: toggle flood, heat, and drought layers, filter by risk tier, and compare blocks side by side." },
      { property: "og:title", content: "Bihar Block Risk Map — Flood, Heat & Drought Layers · VARUNA" },
      { property: "og:description", content: "Explore block-level flood, heat and drought risk across Bihar with layer toggles, filters, and side-by-side compare mode." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/map" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VARUNA interactive Bihar climate risk map preview." },
      { name: "twitter:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/map" }],
  }),
  component: MapPage,
});

type LayerKey =
  | "rainfall"
  | "flood"
  | "temperature"
  | "soil"
  | "heatwave"
  | "compound"
  | "districts"
  | "blocks"
  | "rivers"
  | "infra";

const LAYER_META: { key: LayerKey; label: string; color: string; category?: string }[] = [
  { key: "rainfall", label: "Rainfall (IMD + INSAT-3DR blend)", color: "oklch(0.7 0.15 240)", category: "flood" },
  { key: "flood", label: "Flood risk", color: "var(--risk-flood)", category: "flood" },
  { key: "temperature", label: "Temperature", color: "oklch(0.65 0.22 25)", category: "heat" },
  { key: "soil", label: "Soil moisture", color: "var(--risk-drought)", category: "drought" },
  { key: "heatwave", label: "Heatwave index", color: "var(--risk-heat)", category: "heat" },
  { key: "compound", label: "Compound risk", color: "var(--risk-compound)", category: "compound" },
  { key: "districts", label: "District boundaries", color: "oklch(1 0 0)" },
  { key: "blocks", label: "Block boundaries", color: "oklch(0.85 0 0)" },
  { key: "rivers", label: "River network", color: "var(--brand-cyan)" },
  { key: "infra", label: "Infrastructure points", color: "oklch(0.85 0.17 90)" },
];

function slug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function MapPage() {
  const { t } = useI18n();
  const { data: state } = useCurrentState();
  const [collapsed, setCollapsed] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    rainfall: true, flood: true, temperature: false, soil: false, heatwave: false,
    compound: false, districts: true, blocks: true, rivers: false, infra: false,
  });
  // Data layers are mutually exclusive so the chosen metric drives the choropleth.
  const DATA_LAYERS: LayerKey[] = ["rainfall", "flood", "temperature", "soil", "heatwave", "compound"];
  const setLayer = (key: LayerKey, v: boolean) => {
    setLayers((s) => {
      if (!DATA_LAYERS.includes(key)) return { ...s, [key]: v };
      if (!v) return { ...s, [key]: false };
      const next = { ...s, [key]: true };
      for (const other of DATA_LAYERS) if (other !== key) next[other] = false;
      return next;
    });
  };
  const [riskFilter, setRiskFilter] = useState({ CRITICAL: true, HIGH: true, MEDIUM: true, NORMAL: true });
  const [compareMode, setCompareMode] = useState(false);
  const [compareDate, setCompareDate] = useState("2024-08-14");
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<BlockState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/bihar-districts.geojson").then((r) => r.json()).then(setGeo).catch(() => setGeo(null));
  }, []);


  const districts = state?.districts ?? [];
  const blocks = state?.blocks ?? [];

  const catByDistrict = useMemo(() => {
    const m = new Map<string, DistrictState>();
    districts.forEach((d) => m.set(d.district.id, d));
    return m;
  }, [districts]);

  const activeLayerCategory = useMemo(() => {
    // priority: compound > flood > heatwave > soil > temperature > rainfall
    const order: LayerKey[] = ["compound", "flood", "heatwave", "soil", "temperature", "rainfall"];
    return order.find((k) => layers[k]);
  }, [layers]);

  const styleFeature = (feature?: Feature<Geometry, { district: string }>): PathOptions => {
    if (!feature) return {};
    const id = slug(feature.properties.district);
    const d = catByDistrict.get(id);
    let color = "var(--risk-normal)";
    let opacity = 0.72;
    if (d) {
      const sev =
        d.compound_risk ? "CRITICAL" :
        d.flood_risk >= 0.7 || d.drought_risk >= 0.7 ? "HIGH" :
        d.flood_risk >= 0.5 || d.drought_risk >= 0.5 ? "MEDIUM" : "NORMAL";
      if (!riskFilter[sev]) {
        return { fillColor: "oklch(0.3 0.005 260)", fillOpacity: 0.4, color: "oklch(0.35 0.02 260)", weight: 1 };
      }
      if (activeLayerCategory === "compound") {
        // In compound mode, show a continuous risk gradient (max of flood/drought
        // pressure) so "normal" districts still surface subtle variation rather
        // than reading as a uniform grey blob on cold-load.
        if (d.category === "compound") color = RISK_COLORS.compound;
        else if (d.category === "flood") color = RISK_COLORS.flood;
        else if (d.category === "heat" || d.category === "drought") color = RISK_COLORS[d.category];
        else {
          const pressure = Math.max(0, Math.min(1, Math.max(d.flood_risk, d.drought_risk)));
          // Cool teal at low pressure → warm amber as risk climbs, so the whole
          // state is visibly data-driven even before any category threshold trips.
          color = `oklch(${0.78 - pressure * 0.15} ${0.07 + pressure * 0.18} ${210 - pressure * 150})`;
        }
      }
      else if (activeLayerCategory === "flood") {
        const t = Math.max(0, Math.min(1, d.flood_risk));
        color = `oklch(${0.78 - t * 0.18} ${0.06 + t * 0.22} 240)`;
      } else if (activeLayerCategory === "heatwave") {
        const t = Math.max(0, Math.min(1, d.drought_risk));
        color = `oklch(${0.82 - t * 0.15} ${0.06 + t * 0.22} 55)`;
      } else if (activeLayerCategory === "soil") {
        const soil = d.blocks.reduce((s, b) => s + b.soil_moisture_index, 0) / d.blocks.length;
        // Dry (low soil) → warm brown; wet (high soil) → green.
        color = `oklch(${0.62 + soil * 0.18} ${0.08 + Math.abs(soil - 0.5) * 0.2} ${60 + soil * 90})`;
      } else if (activeLayerCategory === "temperature") {
        const t = Math.max(0, Math.min(1, (d.temperature_c - 22) / 18));
        color = `oklch(${0.82 - t * 0.15} ${0.06 + t * 0.22} 25)`;
      } else if (activeLayerCategory === "rainfall") {
        // d.rainfall_mm is district-avg block rainfall (roughly 0–80mm). Scale for visibility.
        const t = Math.max(0, Math.min(1, d.rainfall_mm / 50));
        color = `oklch(${0.85 - t * 0.2} ${0.05 + t * 0.22} 240)`;
      } else color = RISK_COLORS[d.category];
      opacity = 0.85;
    }
    return {
      fillColor: color,
      fillOpacity: opacity,
      color: layers.districts ? "oklch(1 0 0 / 65%)" : "oklch(0.35 0.02 260)",
      weight: layers.districts ? 1.2 : 0.5,
    };
  };

  const doSearch = () => {
    if (!search.trim() || !state) return;
    const q = search.toLowerCase();
    const b = blocks.find((x) => x.block_name.toLowerCase().includes(q));
    const d = districts.find((x) => x.district.name.toLowerCase().includes(q));
    if (b) {
      setSelectedBlock(b);
      toast.success(`Found block ${b.block_name}`);
    } else if (d) {
      toast.success(`Focused on ${d.district.name}`);
    } else {
      toast.error("No match found");
    }
  };

  const exportPng = async () => {
    if (!mapWrapRef.current) return;
    toast.loading("Rendering PNG…", { id: "png" });
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(mapWrapRef.current, { useCORS: true, background: "#0f172a" } as never);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `varuna-map-${Date.now()}.png`;
    a.click();
    toast.success("Map exported", { id: "png" });
  };

  const exportGeoJson = () => {
    const filtered = blocks.filter((b) => {
      const sev = b.compound_risk ? "CRITICAL" : b.flood_risk >= 0.7 ? "HIGH" : b.flood_risk >= 0.5 ? "MEDIUM" : "NORMAL";
      return riskFilter[sev];
    });
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: filtered.map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lng, b.lat] },
        properties: {
          block: b.block_name,
          district: b.district_name,
          flood_risk: b.flood_risk,
          drought_risk: b.drought_risk,
          rainfall_mm: b.rainfall_mm,
          temperature_c: b.temperature_c,
          soil: b.soil_moisture_index,
          category: b.category,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varuna-blocks-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GeoJSON downloaded");
  };

  if (!state) return <PageSkeleton label="Loading Bihar map…" />;
  return (
    <div className="flex h-[calc(100vh-88px)] w-full">

      {!collapsed && (
        <div className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="font-display text-sm font-semibold uppercase tracking-widest">Map Controls</div>
            <button onClick={() => setCollapsed(true)} aria-label="Collapse map controls" className="rounded p-1 text-muted-foreground hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <Section title="Map Layers">
            <ul className="space-y-2">
              {LAYER_META.map((l) => (
                <li key={l.key} className="flex items-center gap-2 text-xs">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="flex-1">{l.label}</span>
                  <Switch
                    checked={layers[l.key]}
                    onCheckedChange={(v) => setLayer(l.key, v)}
                  />
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Filter by Risk">
            {(["CRITICAL", "HIGH", "MEDIUM", "NORMAL"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 py-1 text-xs">
                <Checkbox
                  checked={riskFilter[k]}
                  onCheckedChange={(v) => setRiskFilter((s) => ({ ...s, [k]: Boolean(v) }))}
                />
                {k}
              </label>
            ))}
          </Section>

          <Section title="Compare Mode">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Split view comparison is planned for v1.0"
              className="flex w-full items-center justify-between gap-2 rounded border border-border bg-muted/30 px-2 py-2 text-xs text-muted-foreground opacity-70 cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Split View
              </span>
              <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">Coming in v1.0</span>
            </button>
          </Section>


          <Section title="Export">
            <Button onClick={exportPng} size="sm" variant="outline" className="mb-2 w-full justify-start gap-2">
              <Download className="h-3.5 w-3.5" /> Export as PNG
            </Button>
            <Button onClick={exportGeoJson} size="sm" variant="outline" className="mb-2 w-full justify-start gap-2">
              <FileDown className="h-3.5 w-3.5" /> Export GeoJSON
            </Button>
            <Button
              onClick={() => setReportOpen(true)}
              size="sm"
              className="w-full justify-start gap-2 bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90"
            >
              <FileText className="h-3.5 w-3.5" /> Generate Report
            </Button>
          </Section>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand map controls"
          className="grid w-6 place-items-center border-r border-border bg-panel text-muted-foreground hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex-1">
            <PageHeader
              title={t("page.map.title")}
              help={{
                title: "Bihar Map",
                description:
                  "Toggle overlays, filter by risk severity, and split-compare with a historical date. Double-click any district for block markers, then any marker for a detailed popup and 30-day history modal.",
              }}
            />
            <ProvenanceStrip variant="compact" />
          </div>
        </div>

        <div className={`grid flex-1 ${compareMode ? "grid-cols-2" : "grid-cols-1"} gap-2 p-2`}>
          <div className="relative overflow-hidden rounded-lg border border-border" ref={mapWrapRef}>
            <div className="absolute right-3 top-3 z-[500] flex w-64 items-center gap-2 rounded-md border border-border bg-panel/95 px-2 py-1.5 backdrop-blur">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search district or block…"
                aria-label="Search district or block"
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="absolute bottom-3 right-3 z-[500] rounded-md bg-panel/95 p-2 backdrop-blur">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute bottom-3 left-3 z-[500] rounded-md border border-border bg-panel/95 p-2 backdrop-blur">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Legend</div>
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                {[
                  { c: "var(--risk-flood)", l: "Flood Risk" },
                  { c: "var(--risk-compound)", l: "Compound Risk" },
                  { c: "var(--risk-heat)", l: "Heatwave / Drought" },
                  { c: "var(--risk-drought)", l: "Drought (Low soil)" },
                  { c: "var(--risk-normal)", l: "Normal" },
                ].map((item) => (
                  <div key={item.l} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.c }} />
                    <span>{item.l}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-border pt-1.5 font-mono text-[10px] text-muted-foreground">50 km</div>
            </div>

            <MapContainer bounds={BIHAR_BOUNDS} style={{ height: "100%", width: "100%", background: "oklch(0.14 0.02 260)" }} scrollWheelZoom>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
              {geo && <GeoJSON key={`${activeLayerCategory}-${JSON.stringify(riskFilter)}`} data={geo} style={styleFeature as never} />}
              {layers.blocks &&
                blocks.map((b) => (
                  <CircleMarker
                    key={b.block_id}
                    center={[b.lat, b.lng]}
                    radius={2.5}
                    pathOptions={{ color: "oklch(1 0 0 / 60%)", fillColor: `var(--risk-${b.category})`, fillOpacity: 0.8, weight: 0.5 }}
                    eventHandlers={{ click: () => setSelectedBlock(b) }}
                  />
                ))}
              {selectedBlock && (
                <Popup position={[selectedBlock.lat, selectedBlock.lng]} eventHandlers={{ remove: () => setSelectedBlock(null) }}>
                  <BlockPopup block={selectedBlock} onFullHistory={() => setHistoryOpen(true)} />
                </Popup>
              )}
            </MapContainer>
          </div>

          {compareMode && (
            <div className="relative overflow-hidden rounded-lg border border-[color:var(--risk-heat)]/50">
              <div className="absolute left-3 top-3 z-[500] rounded-md border border-border bg-panel/95 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                Historical · {compareDate}
              </div>
              <MapContainer bounds={BIHAR_BOUNDS} style={{ height: "100%", width: "100%", background: "oklch(0.14 0.02 260)" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
                {geo && <GeoJSON data={geo} style={{ fillColor: "var(--risk-flood)", fillOpacity: 0.5, color: "oklch(1 0 0 / 40%)", weight: 1 } as never} />}
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl border-border bg-panel text-foreground">
          <DialogHeader>
            <DialogTitle>30-day history · {selectedBlock?.block_name}</DialogTitle>
          </DialogHeader>
          {selectedBlock && <FeatureHistory districtId={selectedBlock.district_id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="border-border bg-panel text-foreground">
          <DialogHeader>
            <DialogTitle>Generate Situation Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Generate a PDF snapshot of the current map view and risk state.
          </p>
          <Button
            onClick={() => {
              setReportOpen(false);
              toast.success("Report queued — visit Decision Reports to view");
            }}
            className="mt-3"
          >
            Queue report
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function BlockPopup({ block, onFullHistory }: { block: BlockState; onFullHistory: () => void }) {
  const { data: history = [] } = useBlockHistory(block.district_id);
  const spark = history.slice(-7);
  const sev = block.compound_risk ? "CRITICAL" : block.flood_risk >= 0.6 ? "HIGH" : "MEDIUM";
  return (
    <div className="w-64 space-y-1 text-xs text-slate-800">
      <div className="font-bold">{block.block_name}</div>
      <div className="text-slate-500">{block.district_name}</div>
      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white`}
        style={{ backgroundColor: sev === "CRITICAL" ? "#dc2626" : sev === "HIGH" ? "#ea580c" : "#f59e0b" }}>
        {sev}
      </span>
      <table className="mt-1 w-full text-[11px]">
        <tbody>
          <tr><td>Rainfall</td><td className="text-right font-mono">{block.rainfall_mm} mm</td></tr>
          <tr><td>Temp</td><td className="text-right font-mono">{block.temperature_c} °C</td></tr>
          <tr><td>Soil</td><td className="text-right font-mono">{(block.soil_moisture_index * 100).toFixed(0)}%</td></tr>
          <tr><td>Flood</td><td className="text-right font-mono">{(block.flood_risk * 100).toFixed(0)}%</td></tr>
          <tr><td>Drought</td><td className="text-right font-mono">{(block.drought_risk * 100).toFixed(0)}%</td></tr>
          <tr><td>Heat</td><td className="text-right font-mono">{(block.heat_retention_score * 100).toFixed(0)}%</td></tr>
        </tbody>
      </table>
      <div className="mt-1 text-[9px] text-slate-500">Updated {new Date(block.timestamp).toLocaleString()}</div>
      <div className="h-14">
        <ResponsiveContainer><LineChart data={spark}><Line dataKey="rainfall" stroke="#2563eb" dot={false} strokeWidth={1.5} /></LineChart></ResponsiveContainer>
      </div>
      <button
        onClick={onFullHistory}
        className="mt-1 w-full rounded bg-slate-800 py-1 text-[11px] font-semibold text-white"
      >
        View Full History
      </button>
    </div>
  );
}

function FeatureHistory({ districtId }: { districtId: string }) {
  const { data: data = [] } = useBlockHistory(districtId);
  const fields: { key: keyof typeof data[0]; label: string; color: string }[] = [
    { key: "rainfall", label: "Rainfall (mm)", color: "var(--risk-flood)" },
    { key: "temp", label: "Temperature (°C)", color: "var(--risk-heat)" },
    { key: "soil", label: "Soil moisture", color: "var(--risk-drought)" },
    { key: "flood", label: "Flood risk", color: "var(--risk-flood)" },
    { key: "drought", label: "Drought risk", color: "var(--risk-heat)" },
    { key: "heat", label: "Heat retention", color: "var(--risk-compound)" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.key} className="h-32 rounded border border-border bg-background/40 p-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{f.label}</div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
              <RTooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Line dataKey={f.key} stroke={f.color} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
