// Shared timestamp formatters so every provenance surface renders the
// exact "last updated" moment identically.

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** e.g. "2026-07-11 04:00 UTC" */
export function formatExactUtc(input: number | string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}

/** e.g. "3 min ago" — shared relative fallback. */
export function relTime(input: number | string | Date): string {
  const t = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
