import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Shape of one row the Python ingestion script sends. Nullable numeric fields
// let the script upsert rainfall-only or temperature-only days.
const RowSchema = z.object({
  district_id: z.string().min(1).max(64),
  observed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rainfall_mm: z.number().finite().nullable().optional(),
  tmax_c: z.number().finite().nullable().optional(),
  tmin_c: z.number().finite().nullable().optional(),
  dataset_version: z.string().max(64).optional(),
});

const PayloadSchema = z.object({
  source: z.enum(["imd", "mosdac"]),
  rows: z.array(RowSchema).min(1).max(5000),
});

export const Route = createFileRoute("/api/public/ingest/climate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CLIMATE_INGEST_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "server_misconfigured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const provided = request.headers.get("x-ingest-secret") ?? "";
        // Constant-time compare
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        const { timingSafeEqual } = await import("crypto");
        if (!timingSafeEqual(a, b)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let payload: z.infer<typeof PayloadSchema>;
        try {
          payload = PayloadSchema.parse(await request.json());
        } catch (err) {
          return new Response(JSON.stringify({ error: "invalid_payload", detail: String(err) }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const rows = payload.rows.map((r) => ({
          district_id: r.district_id,
          observed_on: r.observed_on,
          rainfall_mm: r.rainfall_mm ?? null,
          tmax_c: r.tmax_c ?? null,
          tmin_c: r.tmin_c ?? null,
          source: payload.source,
          dataset_version: r.dataset_version ?? null,
        }));

        const startedAt = new Date().toISOString();
        const datasetVersion = payload.rows.find((r) => r.dataset_version)?.dataset_version ?? null;
        const { error } = await supabaseAdmin
          .from("climate_observations")
          .upsert(rows, { onConflict: "district_id,observed_on,source" });

        // Best-effort audit log (never fails the response)
        try {
          await supabaseAdmin.from("ingest_audit").insert({
            source: payload.source,
            dataset_version: datasetVersion,
            rows_received: rows.length,
            rows_upserted: error ? 0 : rows.length,
            status: error ? "error" : "ok",
            detail: error ? error.message : null,
            started_at: startedAt,
            finished_at: new Date().toISOString(),
          });
        } catch (auditErr) {
          console.error("[ingest.climate] audit log failed", auditErr);
        }

        if (error) {
          console.error("[ingest.climate] upsert failed", error);
          return new Response(JSON.stringify({ error: "db_error", detail: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
