import { createFileRoute } from "@tanstack/react-router";
import { fetchDailyBatched } from "@/lib/varuna/openmeteo.server";

/**
 * Operational NRT climate ingest for the Varuna digital twin.
 *
 * Runs daily via pg_cron (04:00 UTC) and on-demand from the app. For each of
 * the 38 Bihar districts, pulls the last N days of daily rainfall + Tmax/Tmin
 * from Open-Meteo's ERA5-T reanalysis (free, no auth, ~1-day latency) and
 * upserts into `climate_observations` with dataset_version tagging the
 * provenance. When IMD Pune / MOSDAC gridded products are later published,
 * their higher-fidelity values overwrite this NRT layer via the same
 * (district_id, observed_on, source) unique key from the Python backfill.
 */


const PAST_DAYS = 10;
const DATASET_VERSION = "openmeteo-era5t-NRT";

export const Route = createFileRoute("/api/public/hooks/ingest-imd")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = new Date().toISOString();

        // Auth: shared secret only. Both scheduled (pg_cron) and manual runs
        // MUST send x-ingest-secret matching CLIMATE_INGEST_SECRET.
        const provided = request.headers.get("x-ingest-secret");
        const secret = process.env.CLIMATE_INGEST_SECRET;
        if (!secret || !provided || provided !== secret) {
          return json({ error: "unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Load district catalog (38 rows).
        const { data: districts, error: dErr } = await supabaseAdmin
          .from("climate_districts")
          .select("id, lat, lng");
        if (dErr || !districts || districts.length === 0) {
          await writeAudit(supabaseAdmin, "error", 0, 0, dErr?.message ?? "no_districts", startedAt);
          return json({ error: "district_catalog_unavailable" }, 500);
        }

        // 2. Fetch Open-Meteo ERA5-T archive with retry+chunk. ERA5-T has
        // ~5-day latency, so we target T-(PAST_DAYS+5) → T-5 for reliable
        // coverage of every district.
        let perDistrict;
        try {
          perDistrict = await fetchDailyBatched(
            "https://archive-api.open-meteo.com/v1/archive",
            districts,
            {
              daily: "precipitation_sum,temperature_2m_max,temperature_2m_min",
              timezone: "Asia/Kolkata",
              start_date: daysAgo(PAST_DAYS + 5),
              end_date: daysAgo(5),
            },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await writeAudit(supabaseAdmin, "error", 0, 0, `openmeteo_fetch:${msg}`, startedAt);
          return json({ error: "upstream_fetch_failed", detail: msg }, 502);
        }


        // 3. Flatten to (district, day) rows.
        const rows: Array<{
          district_id: string;
          observed_on: string;
          rainfall_mm: number | null;
          tmax_c: number | null;
          tmin_c: number | null;
          source: "imd";
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
              observed_on: daily.time[j],
              rainfall_mm: sanitize(daily.precipitation_sum[j]),
              tmax_c: sanitize(daily.temperature_2m_max[j]),
              tmin_c: sanitize(daily.temperature_2m_min[j]),
              source: "imd",
              dataset_version: DATASET_VERSION,
            });
          }
        }

        if (rows.length === 0) {
          await writeAudit(supabaseAdmin, "error", received, 0, "no_rows_parsed", startedAt);
          return json({ error: "no_rows_parsed" }, 502);
        }

        // 4. Upsert in chunks (Postgres param limit safety).
        const CHUNK = 500;
        let upserted = 0;
        let lastError: string | null = null;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const { error } = await supabaseAdmin
            .from("climate_observations")
            .upsert(chunk, { onConflict: "district_id,observed_on,source" });
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
            `NRT ingest: ${districts.length} districts × ${PAST_DAYS}d via Open-Meteo ERA5-T (${daysAgo(PAST_DAYS)} → ${daysAgo(1)})`,
          startedAt,
        );

        if (lastError) return json({ error: "db_error", detail: lastError, upserted }, 500);
        return json({ ok: true, districts: districts.length, received, upserted });
      },
      GET: async () => json({ ok: true, hint: "POST with apikey header to trigger ingest" }),
    },
  },
});

function sanitize(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
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
      source: "imd",
      dataset_version: DATASET_VERSION,
      rows_received: received,
      rows_upserted: upserted,
      status,
      detail,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ingest-imd] audit insert failed", err);
  }
}

// Only used for typing writeAudit's first param.
async function importAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
