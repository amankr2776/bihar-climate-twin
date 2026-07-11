import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { SourceChip } from "./SourceChip";
import { formatExactUtc, relTime } from "@/lib/varuna/format-time";





type IngestRow = {
  source: string;
  dataset_version: string | null;
  rows_upserted: number;
  status: string;
  finished_at: string;
};

type IngestLatest = {
  latest: IngestRow | null;
  imd: IngestRow | null;
  mosdac: IngestRow | null;
  retention: IngestRow | null;
};

function useLatestIngest() {
  return useQuery({
    queryKey: ["varuna", "latest-ingest"],
    queryFn: async (): Promise<IngestLatest> => {
      const res = await fetch("/api/public/ingest/latest", { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error("ingest_latest_unavailable");
      return (await res.json()) as IngestLatest;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
  });
}

function FreshnessPill({
  row,
  label,
  archive = false,
}: {
  row: IngestRow | null;
  label: string;
  archive?: boolean;
}) {
  if (!row) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-[color:var(--risk-heat)]/50 bg-[color:var(--risk-heat)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--risk-heat)]"
        title={`No ${label} ingest run recorded yet.`}
      >
        <AlertCircle className="h-2.5 w-2.5" />
        No {label} yet
      </span>
    );
  }
  const ok = row.status === "ok";
  const color = ok ? "var(--risk-drought)" : "var(--risk-heat)";
  const exact = formatExactUtc(row.finished_at);
  const rel = relTime(row.finished_at);
  const prefix = archive ? "ARCHIVE · " : "";
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest"
      style={{
        color,
        borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
      }}
      title={`Source: ${row.source}${row.dataset_version ? ` · ${row.dataset_version}` : ""} · ${row.rows_upserted.toLocaleString()} rows · ${row.status} · last updated ${exact} (${rel})${archive ? " · historical one-shot ingest" : ""}`}
    >
      {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
      {label}: {prefix}{exact}
    </span>
  );
}

export function IngestFreshness({ compact: _compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useLatestIngest();

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <Clock className="h-2.5 w-2.5 animate-pulse" />
        Checking ingest…
      </span>
    );
  }

  return (
    <>
      <FreshnessPill row={data?.imd ?? null} label="IMD" />
      <FreshnessPill row={data?.mosdac ?? null} label="MOSDAC" archive />
    </>
  );
}


/**
 * Reusable provenance strip pinned under every page header so every widget
 * downstream inherits a visible data lineage — IMD/MOSDAC/Bhuvan/IMDAA +
 * live freshness signal from the ingest_audit table.
 */
export function ProvenanceStrip({ variant = "full" }: { variant?: "full" | "compact" }) {
  const chips = (
    <>
      <SourceChip
        source="IMD"
        dataset="Gridded rainfall 0.25° + Tmax/Tmin 1.0°"
        resolution="0.25° / 1.0°"
        cadence="Daily"
      />
      <SourceChip
        source="MOSDAC / INSAT-3DR"
        dataset="LST, SST, IMC rainfall"
        resolution="4 km"
        cadence="3-hourly"
      />
      <SourceChip source="Bhuvan" dataset="Admin boundaries" resolution="Block vector" cadence="Versioned" />
      {variant === "full" && (
        <SourceChip source="IMDAA" dataset="Regional reanalysis (NCMRWF)" resolution="12 km" cadence="Hourly" />
      )}
    </>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sources</span>
      {chips}
      <IngestFreshness />
    </div>
  );
}
