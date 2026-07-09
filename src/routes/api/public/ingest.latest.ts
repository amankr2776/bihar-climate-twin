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
          .in("source", ["imd", "retention"])
          .order("finished_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: "unavailable" }), {
            status: 500,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }

        return new Response(JSON.stringify({ latest: data ?? null }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=60",
          },
        });
      },
    },
  },
});
