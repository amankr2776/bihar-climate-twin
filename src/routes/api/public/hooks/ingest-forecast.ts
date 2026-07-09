import { createFileRoute } from "@tanstack/react-router";

/**
 * 0–7 day forecast ingest for the Varuna digital twin.
 *
 * Runs daily via pg_cron (04:15 UTC). Pulls Open-Meteo's GFS-based forecast
 * (free, no auth) per Bihar district and upserts into `climate_forecasts`.
 * Populates the "Forecast Horizon" panels on /prediction and the T+N maps.
 */

type OpenMeteoDaily = {
  time: string[];
  precipitation_sum: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
};
type OpenMeteoResp = { daily?: OpenMeteoDaily };

const FORECAST_DAYS = 7;
const DATASET_VERSION = "openmeteo-gfs-v1";

export const Route = createFileRoute("/api/public/hooks/ingest-forecast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = new Date().toISOString();
        const apikey = request.headers.get("apikey");
        const provided = request.headers.get("x-ingest-secret");
        const secret = process.env.CLIMATE_INGEST_SECRET;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const authorized =
          (apikey && anon && apikey === anon) ||
          (provided && secret && provided === secret);
        if (!authorized) return json({ error: "unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: districts, error: dErr } = await supabaseAdmin
          .from("climate_districts")
          .select("id, lat, lng");
        if (dErr || !districts || districts.length === 0) {
          await writeAudit(supabaseAdmin, "error", 0, 0, dErr?.message ?? "no_districts", startedAt);
          return json({ error: "district_catalog_unavailable" }, 500);
        }

        const lat = districts.map((d) => d.lat).join(",");
        const lng = districts.map((d) => d.lng).join(",");
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lng}` +
          `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min` +
          `&timezone=Asia%2FKolkata` +
          `&forecast_days=${FORECAST_DAYS}`;

        let payload: OpenMeteoResp[] | OpenMeteoResp;
        try {
          const res = await fetch(url, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(25_000),
          });
          if (!res.ok) throw new Error(`upstream_${res.status}`);
          payload = (await res.json()) as OpenMeteoResp[] | OpenMeteoResp;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await writeAudit(supabaseAdmin, "error", 0, 0, `openmeteo_fetch:${msg}`, startedAt);
          return json({ error: "upstream_fetch_failed", detail: msg }, 502);
        }

        const perDistrict = Array.isArray(payload) ? payload : [payload];
        if (perDistrict.length !== districts.length) {
          await writeAudit(
            supabaseAdmin,
            "error",
            0,
            0,
            `shape_mismatch: got ${perDistrict.length}, expected ${districts.length}`,
            startedAt,
          );
          return json({ error: "shape_mismatch" }, 502);
        }

        const runAt = new Date().toISOString();
        const rows: Array<{
          district_id: string;
          forecast_for: string;
          run_at: string;
          rainfall_mm: number | null;
          tmax_c: number | null;
          tmin_c: number | null;
          source: "openmeteo-gfs";
          dataset_version: string;
        }> = [];
        let received = 0;

        for (let i = 0; i < districts.length; i++) {
          const daily = perDistrict[i]?.daily;
          if (!daily?.time) continue;
          for (let j = 0; j < daily.time.length; j++) {
            received++;
            rows.push({
              district_id: districts[i].id,
              forecast_for: daily.time[j],
              run_at: runAt,
              rainfall_mm: sanitize(daily.precipitation_sum[j]),
              tmax_c: sanitize(daily.temperature_2m_max[j]),
              tmin_c: sanitize(daily.temperature_2m_min[j]),
              source: "openmeteo-gfs",
              dataset_version: DATASET_VERSION,
            });
          }
        }

        if (rows.length === 0) {
          await writeAudit(supabaseAdmin, "error", received, 0, "no_rows_parsed", startedAt);
          return json({ error: "no_rows_parsed" }, 502);
        }

        const CHUNK = 500;
        let upserted = 0;
        let lastError: string | null = null;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const { error } = await supabaseAdmin
            .from("climate_forecasts")
            .upsert(chunk, { onConflict: "district_id,forecast_for,source" });
          if (error) {
            lastError = error.message;
            break;
          }
          upserted += chunk.length;
        }

        await writeAudit(
          supabaseAdmin,
          lastError ? "error" : "ok",
          received,
          upserted,
          lastError ??
            `Forecast ingest: ${districts.length} districts × ${FORECAST_DAYS}d via Open-Meteo GFS`,
          startedAt,
        );

        if (lastError) return json({ error: "db_error", detail: lastError, upserted }, 500);
        return json({ ok: true, districts: districts.length, received, upserted });
      },
      GET: async () => json({ ok: true, hint: "POST with apikey header to trigger forecast ingest" }),
    },
  },
});

function sanitize(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function writeAudit(
  db: Awaited<ReturnType<typeof importAdmin>>,
  status: "ok" | "error",
  received: number,
  upserted: number,
  detail: string,
  startedAt: string,
) {
  try {
    await db.from("ingest_audit").insert({
      source: "forecast",
      dataset_version: DATASET_VERSION,
      rows_received: received,
      rows_upserted: upserted,
      status,
      detail,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ingest-forecast] audit insert failed", err);
  }
}

async function importAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
