import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ExternalLink, Database, Satellite, MapPin, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources · VARUNA" },
      { name: "description", content: "Indigenous datasets powering VARUNA: IMD gridded observations, ISRO INSAT/MOSDAC satellite telemetry, Bhuvan boundaries, and IMDAA/ERA5 reanalysis." },
      { property: "og:title", content: "VARUNA data sources" },
      { property: "og:description", content: "IMD + ISRO + Bhuvan + IMDAA — 100% indigenous data provenance." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/data-sources" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/data-sources" }],
  }),
  component: DataSourcesPage,
});

type Source = {
  icon: React.ReactNode;
  name: string;
  agency: string;
  datasets: { name: string; detail: string; url?: string }[];
  cadence: string;
  resolution: string;
  license: string;
};

const SOURCES: Source[] = [
  {
    icon: <Database />,
    name: "India Meteorological Department (IMD)",
    agency: "Ministry of Earth Sciences, GoI",
    datasets: [
      { name: "Gridded Rainfall", detail: "0.25° × 0.25° daily, 1951–present", url: "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html" },
      { name: "Gridded Max/Min Temperature", detail: "1.0° × 1.0° daily, 1951–present", url: "https://www.imdpune.gov.in/cmpg/Griddata/Max_1_Bin.html" },
    ],
    cadence: "Daily",
    resolution: "0.25° / 1.0°",
    license: "Public research use; IMD attribution required",
  },
  {
    icon: <Satellite />,
    name: "ISRO INSAT-3D / 3DR (via MOSDAC)",
    agency: "Indian Space Research Organisation",
    datasets: [
      { name: "Land Surface Temperature", detail: "Product 3RIMG_L2B_LST", url: "https://www.mosdac.gov.in/" },
      { name: "Sea Surface Temperature", detail: "Product 3RIMG_L2B_SST" },
      { name: "Rainfall (INSAT Multi-spectral)", detail: "Product 3RIMG_L2B_IMC" },
    ],
    cadence: "3-hourly",
    resolution: "4 km",
    license: "Open scientific use via MOSDAC registration",
  },
  {
    icon: <MapPin />,
    name: "Bhuvan Geospatial APIs",
    agency: "NRSC, ISRO",
    datasets: [
      { name: "Administrative Boundaries", detail: "State / District / Block vector polygons", url: "https://bhuvan-app1.nrsc.gov.in/" },
    ],
    cadence: "Static (versioned)",
    resolution: "Block-level vector",
    license: "Bhuvan open data policy",
  },
  {
    icon: <History />,
    name: "IMDAA / ERA5 Reanalysis",
    agency: "NCMRWF (IMDAA) · ECMWF (ERA5)",
    datasets: [
      { name: "IMDAA Regional Reanalysis", detail: "12 km, India-region reconstruction", url: "https://rds.ncmrwf.gov.in/" },
      { name: "ERA5 Global Reanalysis", detail: "Bias-correction reference for training" },
    ],
    cadence: "Hourly (historical)",
    resolution: "12 km / 0.25°",
    license: "Open research use",
  },
];

function DataSourcesPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <PageHeader
        title="Data Sources"
        help={{
          title: "Indigenous data provenance",
          description:
            "VARUNA operates on 100% national datasets. Every forecast, alert, and map layer traces back to one of the sources listed below. Attribution is preserved in the UI via source chips.",
        }}
      />

      <div className="mb-4 rounded-xl border border-[color:var(--brand-cyan)]/40 bg-[color:var(--brand-cyan)]/10 p-4">
        <div className="font-display text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-cyan)]">
          Atmanirbhar Bharat · Indigenous Intelligence
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every data source powering VARUNA is Indian-agency-issued. No foreign APIs, no proprietary
          third-party climate feeds. Cloud infrastructure remains cloud-agnostic and portable to MeghRaj or
          NIC hosting.
        </p>
      </div>

      <div className="space-y-4">
        {SOURCES.map((s) => (
          <div key={s.name} className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)]">{s.icon}</span>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-foreground">{s.name}</h3>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.agency}</div>
              </div>
              <div className="hidden text-right md:block">
                <Meta label="Cadence" value={s.cadence} />
                <Meta label="Resolution" value={s.resolution} />
              </div>
            </div>
            <ul className="mt-3 divide-y divide-border/60">
              {s.datasets.map((d) => (
                <li key={d.name} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">{d.detail}</div>
                  </div>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-[color:var(--brand-cyan)] hover:underline">
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[11px] text-muted-foreground">License: {s.license}</div>
          </div>
        ))}
      </div>

      <IngestionLog />
    </div>
  );
}

function IngestionLog() {
  const { data, isLoading } = useQuery({
    queryKey: ["ingest_audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_audit")
        .select("id, source, dataset_version, rows_upserted, rows_received, status, detail, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="mt-6 rounded-xl border border-border bg-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest">
          Ingestion Audit Log
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Live log of every IMD ingest run · public read-only for transparency
        </span>
      </div>
      {isLoading ? (
        <div className="py-4 text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No ingest runs recorded yet. The daily IMD ingest publishes here as soon as it runs.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="pb-2 pr-3">Started (IST)</th>
                <th className="pb-2 pr-3">Source</th>
                <th className="pb-2 pr-3">Version</th>
                <th className="pb-2 pr-3 text-right">Rows</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-2 pr-3 font-mono text-[11px]">
                    {new Date(row.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="py-2 pr-3 uppercase">{row.source}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{row.dataset_version ?? "—"}</td>
                  <td className="py-2 pr-3 text-right font-mono">
                    {row.rows_upserted}
                    <span className="text-muted-foreground">/{row.rows_received}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        row.status === "ok"
                          ? "bg-[color:var(--brand-cyan)]/15 text-[color:var(--brand-cyan)]"
                          : row.status === "partial"
                          ? "bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)]"
                          : "bg-[color:var(--risk-flood)]/15 text-[color:var(--risk-flood)]"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 text-[11px] text-muted-foreground">{row.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[10px]">
      <span className="uppercase tracking-widest text-muted-foreground">{label}:</span>{" "}
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
