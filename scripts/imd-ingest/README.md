# VARUNA — IMD ingestion worker

Downloads India Meteorological Department (IMD Pune) gridded observations and
ingests them into the VARUNA app so the dashboard, map, prediction, and
what-if simulator all read the real published grids instead of the Open-Meteo
model blend.

## What gets ingested

| Variable | Grid | Source |
|----------|------|--------|
| Daily rainfall (mm)   | 0.25° × 0.25° | https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html |
| Daily max temperature | 1.0° × 1.0°   | https://www.imdpune.gov.in/cmpg/Griddata/Max_1_Bin.html |
| Daily min temperature | 1.0° × 1.0°   | https://www.imdpune.gov.in/cmpg/Griddata/Min_1_Bin.html |

For each of Bihar's 38 districts, the script samples the nearest grid cell at
the district centroid for every day in the requested window and upserts one
row into `public.climate_observations` (source = `imd`).

## One-time setup

1. **Install Python 3.10+** and create a virtualenv.

    ```bash
    cd scripts/imd-ingest
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    ```

2. **Grab the ingest secret from Lovable.**  Open your Lovable project →
   Cloud → Secrets. Copy the value of `CLIMATE_INGEST_SECRET` (already
   generated for you). Export it locally:

    ```bash
    export CLIMATE_INGEST_SECRET="paste-value-here"
    export VARUNA_INGEST_URL="https://<your-project>.lovable.app/api/public/ingest/climate"
    ```

    While iterating in preview, the preview URL works too:
    `https://project--<project-id>-dev.lovable.app/api/public/ingest/climate`.

## Run it

Ingest the current monsoon window:

```bash
python ingest_imd.py --year 2024 --start 2024-06-01 --end 2024-09-30
```

Dry run (no HTTP POST, just print counts):

```bash
python ingest_imd.py --year 2024 --start 2024-06-01 --end 2024-06-07 --dry-run
```

Full year:

```bash
python ingest_imd.py --year 2024 --start 2024-01-01 --end 2024-12-31
```

The script batches 500 district-days per HTTP call, so a full year is roughly
28 POSTs.

## Scheduling

IMD publishes rainfall on a ~2-day lag and temperature on a ~1-week lag. A
nightly cron entry that ingests the last 10 days is a safe pattern:

```cron
15 3 * * *  cd /path/to/scripts/imd-ingest && \
            .venv/bin/python ingest_imd.py \
              --year $(date +\%Y) \
              --start $(date -d '10 days ago' +\%Y-\%m-\%d) \
              --end   $(date -d '2 days ago'  +\%Y-\%m-\%d)
```

Upserts are idempotent — re-running the same window is safe.

## MOSDAC INSAT (next milestone)

INSAT-derived LST/SST/OLR products live behind MOSDAC login
(https://www.mosdac.gov.in). Once you register an account, the same table
(`climate_observations`) accepts additional rows with `source = 'mosdac'`,
and a small extension of this script (using `pymosdac` or the MOSDAC REST
API with your credentials) can push those layers alongside IMD rainfall.
Share the login when you're ready and I'll extend `ingest_imd.py` to also
pull the INSAT layers.

## What the app does with this data

- `src/lib/varuna/climate.ts` reads the last 10 days of `imd`-sourced rows on
  every dashboard fetch and overlays them onto the "past days" section of
  the reading (replacing the Open-Meteo values). Any day without an IMD row
  transparently falls back to the model blend.
- `imd_days` in the snapshot and `imd_backed` per-district tell the UI how
  much of the current view is IMD-anchored, so the dashboard can honestly
  label the source.
