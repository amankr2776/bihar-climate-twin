#!/usr/bin/env python3
"""
VARUNA — IMD gridded climate ingestion for Bihar.

Downloads IMD Pune gridded observational data (rainfall 0.25° and max/min
temperature 1°), samples each Bihar district centroid at nearest grid, and
POSTs one row per (district, day) to VARUNA's /api/public/ingest/climate
endpoint. The endpoint upserts the rows into the climate_observations table
using the service-role key on the backend.

Sources
-------
- Rainfall (0.25°):  https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_Bin.html
- Max temp (1°):     https://www.imdpune.gov.in/cmpg/Griddata/Max_1_Bin.html
- Min temp (1°):     https://www.imdpune.gov.in/cmpg/Griddata/Min_1_Bin.html

Usage
-----
    pip install -r requirements.txt
    export VARUNA_INGEST_URL="https://<your-project>.lovable.app/api/public/ingest/climate"
    export CLIMATE_INGEST_SECRET="<paste the secret you generated in Lovable>"
    python ingest_imd.py --year 2024 --start 2024-06-01 --end 2024-09-30

Notes
-----
- IMD publishes rainfall daily on a ~2 day lag; temperature on a ~1 week lag.
  Re-run this script on a schedule (cron / launchd) to keep the twin fresh.
- Only district-centroid sampling is done here. To aggregate to full district
  polygons or to block level, add a rasterio + geopandas step and swap the
  point sample for a masked mean — the target table schema does not change.
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta
from typing import Optional

import numpy as np
import requests

try:
    import imdlib as imd  # type: ignore
except ImportError as exc:
    print(
        "ERROR: imdlib is required. Install with:  pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


BIHAR_DISTRICTS: list[tuple[str, float, float]] = [
    # (district_id, lat, lng) — must match public.climate_districts.id
    ("araria", 26.15, 87.52), ("arwal", 25.25, 84.68), ("aurangabad", 24.75, 84.37),
    ("banka", 24.88, 86.92), ("begusarai", 25.42, 86.13), ("bhagalpur", 25.24, 86.98),
    ("bhojpur", 25.55, 84.53), ("buxar", 25.57, 83.98), ("darbhanga", 26.15, 85.9),
    ("east-champaran", 26.65, 84.9), ("gaya", 24.78, 85.0), ("gopalganj", 26.47, 84.43),
    ("jamui", 24.93, 86.22), ("jehanabad", 25.21, 84.98), ("kaimur", 25.05, 83.6),
    ("katihar", 25.55, 87.58), ("khagaria", 25.5, 86.47), ("kishanganj", 26.1, 87.95),
    ("lakhisarai", 25.17, 86.08), ("madhepura", 25.92, 86.79), ("madhubani", 26.35, 86.07),
    ("munger", 25.37, 86.47), ("muzaffarpur", 26.12, 85.4), ("nalanda", 25.13, 85.44),
    ("nawada", 24.88, 85.53), ("patna", 25.61, 85.14), ("purnia", 25.78, 87.47),
    ("rohtas", 24.95, 84.02), ("saharsa", 25.88, 86.6), ("samastipur", 25.86, 85.78),
    ("saran", 25.92, 84.83), ("sheikhpura", 25.14, 85.85), ("sheohar", 26.52, 85.29),
    ("sitamarhi", 26.6, 85.48), ("siwan", 26.22, 84.36), ("supaul", 26.13, 86.6),
    ("vaishali", 25.68, 85.36), ("west-champaran", 26.9, 84.4),
]


def download_grid(variable: str, year: int, cache_dir: str):
    """
    variable ∈ {"rain", "tmax", "tmin"}
    Returns an imdlib dataset. imdlib downloads and caches the .grd file
    under cache_dir/<variable>/ and parses the binary format for us.
    """
    print(f"[imd] downloading {variable} {year} …", flush=True)
    os.makedirs(cache_dir, exist_ok=True)
    ds = imd.get_data(variable, year, year, fn_format="yearwise", file_dir=cache_dir)
    return ds


def sample_district(ds, lat: float, lng: float, day: date) -> Optional[float]:
    """Nearest-neighbour sample at (lat, lng) for the given calendar day."""
    xr = ds.get_xarray()
    key = np.datetime64(day.isoformat())
    if key not in xr["time"].values:
        return None
    val = xr.sel(time=key, lat=lat, lon=lng, method="nearest").values.item()
    if val is None or np.isnan(val) or val <= -999:
        return None
    return float(val)


def iter_dates(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def post_batch(rows: list[dict], url: str, secret: str) -> None:
    if not rows:
        return
    resp = requests.post(
        url,
        json={"source": "imd", "rows": rows},
        headers={"content-type": "application/json", "x-ingest-secret": secret},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"ingest failed [{resp.status_code}]: {resp.text}")
    print(f"[ingest] wrote {len(rows)} rows -> {resp.json()}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--year", type=int, required=True, help="IMD data year to download")
    p.add_argument("--start", type=str, required=True, help="YYYY-MM-DD inclusive")
    p.add_argument("--end", type=str, required=True, help="YYYY-MM-DD inclusive")
    p.add_argument("--cache-dir", type=str, default="./imd_cache")
    p.add_argument("--batch-size", type=int, default=500)
    p.add_argument("--dry-run", action="store_true", help="Do not POST; print counts")
    args = p.parse_args()

    url = os.environ.get("VARUNA_INGEST_URL")
    secret = os.environ.get("CLIMATE_INGEST_SECRET")
    if not args.dry_run and (not url or not secret):
        print("ERROR: set VARUNA_INGEST_URL and CLIMATE_INGEST_SECRET env vars.", file=sys.stderr)
        return 2

    start = datetime.strptime(args.start, "%Y-%m-%d").date()
    end = datetime.strptime(args.end, "%Y-%m-%d").date()
    if end < start:
        print("ERROR: --end before --start", file=sys.stderr)
        return 2

    rain_ds = download_grid("rain", args.year, args.cache_dir)
    tmax_ds = download_grid("tmax", args.year, args.cache_dir)
    tmin_ds = download_grid("tmin", args.year, args.cache_dir)

    version = f"imd-{args.year}-rain0.25-tmax1-tmin1"
    batch: list[dict] = []
    total = 0

    for day in iter_dates(start, end):
        for did, lat, lng in BIHAR_DISTRICTS:
            row = {
                "district_id": did,
                "observed_on": day.isoformat(),
                "rainfall_mm": sample_district(rain_ds, lat, lng, day),
                "tmax_c": sample_district(tmax_ds, lat, lng, day),
                "tmin_c": sample_district(tmin_ds, lat, lng, day),
                "dataset_version": version,
            }
            # Skip empty rows
            if row["rainfall_mm"] is None and row["tmax_c"] is None and row["tmin_c"] is None:
                continue
            batch.append(row)
            if len(batch) >= args.batch_size:
                if not args.dry_run:
                    post_batch(batch, url, secret)  # type: ignore[arg-type]
                total += len(batch)
                batch = []

    if batch:
        if not args.dry_run:
            post_batch(batch, url, secret)  # type: ignore[arg-type]
        total += len(batch)

    print(f"[done] {total} district-day rows ingested "
          f"({(end - start).days + 1} days × {len(BIHAR_DISTRICTS)} districts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
