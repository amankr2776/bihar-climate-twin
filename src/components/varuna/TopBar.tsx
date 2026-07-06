import { Search, Calendar, Zap, Satellite, CircuitBoard, Clock } from "lucide-react";

type Props = { lastUpdate: string };

export function TopBar({ lastUpdate }: Props) {
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <header className="flex items-center gap-2 border-b border-border bg-panel/80 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-3">
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search district, block or coordinates…"
          className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:gap-3">
        <StatusChip color="var(--risk-drought)" pulse label="LIVE" />
        <StatusChip color="var(--brand-cyan)" icon={<Zap className="h-3.5 w-3.5" />} label="Twin: SYNC" />
        <StatusChip color="var(--muted-foreground)" icon={<Clock className="h-3.5 w-3.5" />}>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Updated</div>
          <div className="text-xs font-mono text-foreground">{lastUpdate}</div>
        </StatusChip>
        <div className="hidden xl:contents">
          <StatusChip color="var(--brand-cyan)" icon={<Satellite className="h-3.5 w-3.5" />} label="IMD + INSAT" outline />
          <StatusChip color="var(--brand-magenta)" icon={<CircuitBoard className="h-3.5 w-3.5" />} label="PI-GNN" outline />
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs md:flex">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono">{dateStr}</span>
        </div>
      </div>

      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] text-xs font-bold text-background">
        AK
      </div>
    </header>
  );
}

function StatusChip({
  color,
  label,
  icon,
  pulse,
  outline,
  children,
}: {
  color: string;
  label?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  outline?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap"
      style={{
        border: `1px solid ${outline ? color : "var(--border)"}`,
        backgroundColor: outline ? `color-mix(in oklch, ${color} 10%, transparent)` : "color-mix(in oklch, var(--panel) 60%, transparent)",
        color: outline ? color : "var(--foreground)",
      }}
    >
      {pulse ? (
        <span className="relative inline-flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
            style={{ backgroundColor: color }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        </span>
      ) : (
        icon
      )}
      {children ? children : <span className="font-semibold" style={{ color: outline ? color : undefined }}>{label}</span>}
    </div>
  );
}
