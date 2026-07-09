#!/usr/bin/env python3
"""
VARUNA — MOSDAC INSAT ingestion for Bihar.

Reads GeoTIFF (.tif) rasters downloaded from ISRO MOSDAC:

    - 3RIMG_L2B_LST  → Land Surface Temperature (Kelvin → °C, mapped to tmax_c)
    - 3RIMG_L2B_IMC  → INSAT Multi-spectral Rainfall Composite (mm → rainfall_mm)

Downloaded scenes are typically full INSAT disks. This script auto-clips each
raster to the Bihar bounding box (lat 24.0–27.5, lon 83.5–88.5), samples each
Bihar district centroid, aggregates same-day observations, and POSTs one row
per (district, acquisition-date) to VARUNA's public ingest endpoint. Duplicate
observations are handled by the endpoint's upsert on (district_id, observed_on,
source) so re-running is safe.

Usage
-----
    pip install -r requirements.txt

    # Point at the folder containing your MOSDAC .tif downloads
    export MOSDAC_DATA_DIR=/path/to/MOSDAC
    export VARUNA_INGEST_URL="https://<your-project>.lovable.app/api/public/ingest/climate"
    export CLIMATE_INGEST_SECRET="<paste the secret you generated in Lovable>"

    python ingest_mosdac.py --start 2024-06-01 --end 2024-09-30

Notes
-----
- The script does NOT modify the IMD ingestion pipeline. It writes to the same
  `climate_observations` table via the same /api/public/ingest/climate endpoint,
  using source="mosdac".
- Acquisition date is inferred from the MOSDAC filename convention:
      3RIMG_DDMONYYYY_HHMM_L2B_<PRODUCT>_<...>.tif
  Falls back to the file mtime if the pattern cannot be parsed.
- Multiple scenes per day for the same product are averaged before sampling
  (typical for INSAT half-hourly cadence).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import requests

try:
    import rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform as warp_transform
except ImportError as exc:
    print(
        "ERROR: rasterio is required. Install with:  pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc


# ---------------------------------------------------------------------------
# District catalog — MUST match the IDs in public.climate_districts.
# Kept in sync with scripts/imd-ingest/ingest_imd.py by design; edit both if
# the canonical list ever changes.
# ---------------------------------------------------------------------------
BIHAR_DISTRICTS: list[tuple[str, float, float]] = [
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

# Bihar bounding box (WGS84). Used to window the full INSAT scene before sampling.
BIHAR_BBOX = {"min_lon": 83.5, "min_lat": 24.0, "max_lon": 88.5, "max_lat": 27.5}

# Product tag → normalised name. Detected from filename.
PRODUCT_LST = "lst"
PRODUCT_IMC = "imc"

# Common MOSDAC L2B filename pattern:
#   3RIMG_02JUL2024_0715_L2B_LST_V01R00.tif
_DATE_RE = re.compile(
    r"(?P<day>\d{2})(?P<mon>JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(?P<year>\d{4})",
    re.IGNORECASE,
)
_MONTHS = {m: i + 1 for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
)}


# ---------------------------------------------------------------------------
# Filename / product detection
# ---------------------------------------------------------------------------
def detect_product(name: str) -> Optional[str]:
    upper = name.upper()
    if "3RIMG_L2B_LST" in upper or "_L2B_LST" in upper or "_LST_" in upper:
        return PRODUCT_LST
    if "3RIMG_L2B_IMC" in upper or "_L2B_IMC" in upper or "_IMC_" in upper:
        return PRODUCT_IMC
    return None


def detect_acquisition_date(path: Path) -> Optional[date]:
    m = _DATE_RE.search(path.name.upper())
    if m:
        try:
            return date(int(m["year"]), _MONTHS[m["mon"].upper()], int(m["day"]))
        except (KeyError, ValueError):
            pass
    # Fallback: mtime (UTC).
    try:
        return datetime.utcfromtimestamp(path.stat().st_mtime).date()
    except OSError:
        return None


# ---------------------------------------------------------------------------
# Raster clip + sample
# ---------------------------------------------------------------------------
def sample_bihar_from_raster(path: Path) -> Optional[dict[str, float]]:
    """
    Open a MOSDAC GeoTIFF, clip to the Bihar bounding box, and return a dict
    keyed by district_id whose value is the nearest-pixel sample at the
    district centroid. Returns None if the raster does not intersect Bihar or
    cannot be read.
    """
    try:
        with rasterio.open(path) as src:
            # 1) Reproject Bihar bbox corners into raster CRS.
            if src.crs is None:
                # Assume WGS84 if metadata is missing (common in MOSDAC quicklooks).
                src_crs = "EPSG:4326"
            else:
                src_crs = src.crs

            xs = [BIHAR_BBOX["min_lon"], BIHAR_BBOX["max_lon"]]
            ys = [BIHAR_BBOX["min_lat"], BIHAR_BBOX["max_lat"]]
            rxs, rys = warp_transform("EPSG:4326", src_crs, xs, ys)
            left, right = min(rxs), max(rxs)
            bottom, top = min(rys), max(rys)

            # 2) Build a read window clipped to the raster bounds so full-disk
            #    scenes don't blow up memory.
            try:
                window = from_bounds(left, bottom, right, top, transform=src.transform)
                window = window.round_offsets().round_lengths()
            except Exception:
                # Bounds outside raster → skip.
                return None

            if window.width <= 0 or window.height <= 0:
                return None

            data = src.read(1, window=window, boundless=False, masked=True)
            if data.size == 0:
                return None

            # 3) Build a lat/lon grid over the windowed pixels.
            win_transform = src.window_transform(window)

            # 4) Sample each district centroid.
            out: dict[str, float] = {}
            for did, lat, lng in BIHAR_DISTRICTS:
                # Reproject centroid into raster CRS.
                cx, cy = warp_transform("EPSG:4326", src_crs, [lng], [lat])
                px_col, px_row = ~win_transform * (cx[0], cy[0])
                col = int(round(px_col))
                row = int(round(px_row))
                if row < 0 or col < 0 or row >= data.shape[0] or col >= data.shape[1]:
                    continue
                val = data[row, col]
                if np.ma.is_masked(val):
                    continue
                fval = float(val)
                # MOSDAC fill/no-data guards (common sentinels).
                if not np.isfinite(fval) or fval <= -999 or fval >= 1e6:
                    continue
                out[did] = fval
            return out or None
    except Exception as exc:
        print(f"[mosdac] failed to read {path.name}: {exc}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Unit conversions
# ---------------------------------------------------------------------------
def convert_lst_to_c(k: float) -> Optional[float]:
    # MOSDAC LST is in Kelvin. Reasonable Bihar sanity window: 260–340 K.
    if k > 200 and k < 400:
        return round(k - 273.15, 3)
    # Some MOSDAC GeoTIFFs are already scaled to °C; pass-through if in range.
    if -20 < k < 65:
        return round(k, 3)
    return None


def convert_imc_to_mm(v: float) -> Optional[float]:
    # INSAT rainfall composite is mm (0..~300 for extreme events). Clip to a
    # sane operational envelope and drop obvious fill values.
    if v < 0 or v > 800:
        return None
    return round(v, 3)


# ---------------------------------------------------------------------------
# HTTP batching (mirrors ingest_imd.py)
# ---------------------------------------------------------------------------
def post_batch(rows: list[dict], url: str, secret: str) -> None:
    if not rows:
        return
    resp = requests.post(
        url,
        json={"source": "mosdac", "rows": rows},
        headers={"content-type": "application/json", "x-ingest-secret": secret},
        timeout=45,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"ingest failed [{resp.status_code}]: {resp.text}")
    print(f"[ingest] wrote {len(rows)} rows -> {resp.json()}")


def iter_dates(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--start", type=str, required=True, help="YYYY-MM-DD inclusive")
    p.add_argument("--end", type=str, required=True, help="YYYY-MM-DD inclusive")
    p.add_argument("--data-dir", type=str, default=None,
                   help="Override MOSDAC_DATA_DIR env var")
    p.add_argument("--batch-size", type=int, default=500)
    p.add_argument("--dry-run", action="store_true", help="Do not POST; print counts")
    args = p.parse_args()

    data_dir = args.data_dir or os.environ.get("MOSDAC_DATA_DIR")
    if not data_dir:
        print("ERROR: set MOSDAC_DATA_DIR env var or pass --data-dir", file=sys.stderr)
        return 2
    root = Path(data_dir).expanduser().resolve()
    if not root.exists():
        print(f"ERROR: MOSDAC_DATA_DIR does not exist: {root}", file=sys.stderr)
        return 2

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

    # ---- 1) Discover .tif files, classify by product, group by date. --------
    print(f"[mosdac] scanning {root} …")
    tifs = [q for q in root.rglob("*.tif")] + [q for q in root.rglob("*.tiff")]
    if not tifs:
        print(f"ERROR: no .tif files found under {root}", file=sys.stderr)
        return 2
    print(f"[mosdac] found {len(tifs)} rasters")

    # keyed by (date, product) -> list of per-district samples across scenes
    accumulator: dict[tuple[date, str], dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    kept = 0
    skipped_range = 0
    skipped_product = 0
    skipped_nodata = 0

    for tif in sorted(tifs):
        product = detect_product(tif.name)
        if not product:
            skipped_product += 1
            continue
        acq = detect_acquisition_date(tif)
        if not acq or acq < start or acq > end:
            skipped_range += 1
            continue
        samples = sample_bihar_from_raster(tif)
        if not samples:
            skipped_nodata += 1
            continue
        for did, val in samples.items():
            accumulator[(acq, product)][did].append(val)
        kept += 1

    print(f"[mosdac] processed {kept} scenes  "
          f"(skipped: product={skipped_product} range={skipped_range} nodata={skipped_nodata})")

    if not accumulator:
        print("[mosdac] nothing to ingest in the requested window.")
        return 0

    # ---- 2) Collapse to one row per (district, day). ------------------------
    version = "mosdac-3rimg-l2b-v1"
    per_day: dict[tuple[date, str], dict[str, Optional[float]]] = defaultdict(dict)
    for (day, product), districts in accumulator.items():
        for did, values in districts.items():
            if not values:
                continue
            mean_val = float(np.mean(values))
            if product == PRODUCT_LST:
                converted = convert_lst_to_c(mean_val)
                if converted is not None:
                    per_day[(day, did)]["tmax_c"] = converted
            elif product == PRODUCT_IMC:
                converted = convert_imc_to_mm(mean_val)
                if converted is not None:
                    per_day[(day, did)]["rainfall_mm"] = converted

    # ---- 3) Emit rows in batches. -------------------------------------------
    batch: list[dict] = []
    total = 0
    for (day, did), fields in sorted(per_day.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        row = {
            "district_id": did,
            "observed_on": day.isoformat(),
            "rainfall_mm": fields.get("rainfall_mm"),
            "tmax_c": fields.get("tmax_c"),
            "tmin_c": None,  # MOSDAC does not provide Tmin directly
            "dataset_version": version,
        }
        if row["rainfall_mm"] is None and row["tmax_c"] is None:
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

    days_span = (end - start).days + 1
    print(f"[done] {total} district-day rows ingested from MOSDAC "
          f"({days_span} days × up to {len(BIHAR_DISTRICTS)} districts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
