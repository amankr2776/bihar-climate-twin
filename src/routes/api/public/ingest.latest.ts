import { createFileRoute } from "@tanstack/react-router";

// Public, read-only endpoint that exposes only the freshness metadata needed
// by the ProvenanceStrip UI. The underlying ingest_audit table is admin-only;
// this route uses the service role server-side to return a minimal projection
// (no error detail, no internal fields).
export const Route = createFileRoute("/api/public/ingest/latest")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("ingest_audit")
          .select("source, dataset_version, rows_upserted, status, finished_at")
          .in("source", ["imd", "mosdac", "retention"])
          .order("finished_at", { ascending: false })
          .limit(50);

        if (error) {
          return new Response(JSON.stringify({ error: "unavailable" }), {
            status: 500,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }

        const rows = data ?? [];
        const pick = (s: string) => rows.find((r) => r.source === s) ?? null;
        const latest = rows[0] ?? null;
        return new Response(
          JSON.stringify({ latest, imd: pick("imd"), mosdac: pick("mosdac"), retention: pick("retention") }),
          {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "public, max-age=60" },
          },
        );

      },
    },
  },
});
