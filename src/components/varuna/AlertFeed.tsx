import type { AlertItem } from "@/lib/varuna/api";

const SEV: Record<AlertItem["severity"], { color: string; label: string }> = {
  critical: { color: "var(--risk-compound)", label: "Critical" },
  high: { color: "var(--risk-flood)", label: "High" },
  moderate: { color: "var(--risk-heat)", label: "Moderate" },
};

export function AlertFeed({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-panel">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h3 className="text-sm font-semibold">Alert feed</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">auto-refresh 3 min</span>
      </div>
      <ul className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {alerts.map((a) => {
          const s = SEV[a.severity];
          return (
            <li
              key={a.id}
              className="group border-l-2 px-3 py-2 text-xs transition-colors hover:bg-accent/40"
              style={{ borderColor: s.color }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: s.color }}>
                  {s.label}
                </span>
                <span className="text-muted-foreground">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-0.5">
                <span className="font-medium">{a.district}</span>
                {a.block && <span className="text-muted-foreground"> · {a.block}</span>}
              </div>
              <div className="text-muted-foreground">{a.message}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
