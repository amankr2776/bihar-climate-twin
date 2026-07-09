import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SourceChip } from "./SourceChip";

type IngestRow = {
  source: string;
  dataset_version: string | null;
  rows_upserted: number;
  status: string;
  finished_at: string;
};

/**
 * Reads latest public ingest_audit row and renders a freshness pill.
 * "Last IMD ingest: 2h ago · 21,432 rows · ok" — required for ISRO-grade
 * provenance so any KPI can be traced back to the actual ingestion run.
 */
function useLatestIngest() {
  return useQuery({
    queryKey: ["varuna", "latest-ingest"],
    queryFn: async (): Promise<IngestRow | null> => {
      const { data, error } = await supabase
        .from("ingest_audit")
        .select("source, dataset_version, rows_upserted, status, finished_at")
        .in("source", ["imd", "retention"])
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as IngestRow | null;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
  });
}

function relative(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function IngestFreshness({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useLatestIngest();

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <Clock className="h-2.5 w-2.5 animate-pulse" />
        Checking ingest…
      </span>
    );
  }

  if (!data) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-[color:var(--risk-heat)]/50 bg-[color:var(--risk-heat)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--risk-heat)]"
        title="No IMD ingest run recorded yet — run scripts/imd-ingest/ingest_imd.py to backfill."
      >
        <AlertCircle className="h-2.5 w-2.5" />
        No IMD ingest yet
      </span>
    );
  }

  const ok = data.status === "ok";
  const color = ok ? "var(--risk-drought)" : "var(--risk-heat)";
  const label = data.source === "retention" ? "DB heartbeat" : `IMD ingest`;

  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest"
      style={{
        color,
        borderColor: `color-mix(in oklch, ${color} 50%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
      }}
      title={`Source: ${data.source}${data.dataset_version ? ` · ${data.dataset_version}` : ""} · ${data.rows_upserted.toLocaleString()} rows · ${data.status}`}
    >
      {ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
      {compact ? relative(data.finished_at) : `Last ${label}: ${relative(data.finished_at)}`}
    </span>
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
