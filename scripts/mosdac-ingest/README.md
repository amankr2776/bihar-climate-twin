# VARUNA — MOSDAC INSAT ingestion

Production-ready ingestion pipeline for ISRO MOSDAC INSAT GeoTIFF products. Feeds the same
`climate_observations` table as the IMD pipeline (source = `mosdac`), so both streams appear
side-by-side in the digital twin.

## Supported products

| Filename tag       | Product                                | Field written    | Unit conversion         |
| ------------------ | -------------------------------------- | ---------------- | ----------------------- |
| `3RIMG_L2B_LST`    | Land Surface Temperature               | `tmax_c`         | Kelvin → °C             |
| `3RIMG_L2B_IMC`    | INSAT Multi-spectral Rainfall Composite| `rainfall_mm`    | mm (validated envelope) |

The script auto-detects the product from the filename, auto-clips full INSAT scenes to Bihar
(lat 24.0–27.5, lon 83.5–88.5), and samples each of the 38 Bihar district centroids used by
the IMD pipeline. Multiple scenes on the same day are averaged before sampling. Duplicate
rows are skipped by the upsert on `(district_id, observed_on, source)` in the ingest endpoint.

## Install

```bash
pip install -r requirements.txt
```

`rasterio` needs GDAL. On most systems `pip` ships a working wheel; if it fails, install GDAL
first (e.g. `apt install gdal-bin libgdal-dev`, `brew install gdal`, or use `conda install -c conda-forge rasterio`).

## Point at your MOSDAC folder

The script reads every `.tif` recursively from `MOSDAC_DATA_DIR`.

**Windows (cmd)**
```
set MOSDAC_DATA_DIR=C:\path\to\downloaded\MOSDAC
```

**Windows (PowerShell)**
```
$env:MOSDAC_DATA_DIR="C:\path\to\MOSDAC"
```

**Linux / macOS**
```bash
export MOSDAC_DATA_DIR=/path/to/MOSDAC
```

## Ingest credentials

Same environment variables as the IMD pipeline:

```bash
export VARUNA_INGEST_URL="https://<your-project>.lovable.app/api/public/ingest/climate"
export CLIMATE_INGEST_SECRET="<paste the secret you generated in Lovable>"
```

## Run

```bash
python ingest_mosdac.py --start 2024-06-01 --end 2024-09-30
```

Optional flags:

| Flag             | Default                    | Purpose                                        |
| ---------------- | -------------------------- | ---------------------------------------------- |
| `--data-dir`     | `$MOSDAC_DATA_DIR`         | Override the env var                           |
| `--batch-size`   | `500`                      | Rows per POST to the ingest endpoint           |
| `--dry-run`      | `false`                    | Parse + sample only, do not POST               |

Dry run for a quick sanity check before shipping to Lovable Cloud:

```bash
python ingest_mosdac.py --start 2024-07-01 --end 2024-07-03 --dry-run
```

## Filename conventions

The script parses MOSDAC's standard L2B filename pattern for the acquisition date:

```
3RIMG_02JUL2024_0715_L2B_LST_V01R00.tif
3RIMG_02JUL2024_0715_L2B_IMC_V01R00.tif
```

If a filename does not match the pattern, the file's modification time (UTC) is used as a
fallback. Files whose acquisition date falls outside `--start` / `--end` are skipped.

## Schema compatibility

Rows POST'd to `/api/public/ingest/climate` follow the same shape as the IMD pipeline:

```json
{
  "source": "mosdac",
  "rows": [
    {
      "district_id": "supaul",
      "observed_on": "2024-07-02",
      "rainfall_mm": 42.31,
      "tmax_c": 34.87,
      "tmin_c": null,
      "dataset_version": "mosdac-3rimg-l2b-v1"
    }
  ]
}
```

MOSDAC does not provide a T-min product, so `tmin_c` is always null for the `mosdac` source.
IMD continues to fill `tmin_c` via the separate IMD pipeline.

## Notes

- The IMD ingestion pipeline (`scripts/imd-ingest/`) is untouched. Both pipelines can run
  independently on any schedule.
- To backfill an older window, just re-run with an earlier `--start` — the ingest endpoint
  upserts, so no duplicates land in `climate_observations`.
- If you have both LST and IMC scenes on the same day for a district, the LST scenes populate
  `tmax_c` and the IMC scenes populate `rainfall_mm` — both fields end up in the same row.
