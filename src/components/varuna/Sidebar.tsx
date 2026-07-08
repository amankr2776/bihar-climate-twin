import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Map, Layers, Cpu, FlaskConical, Bell, FileText, Settings, ChevronRight, BookOpen, LineChart, Database } from "lucide-react";
import type { DistrictState } from "@/lib/varuna/state";
import { varunaStore } from "@/lib/varuna/store";

type NavItem = { icon: React.ReactNode; label: string; to: string };

const NAV: NavItem[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", to: "/dashboard" },
  { icon: <Map className="h-4 w-4" />, label: "Bihar Map", to: "/map" },
  { icon: <Layers className="h-4 w-4" />, label: "Compound Risk", to: "/compound" },
  { icon: <Cpu className="h-4 w-4" />, label: "Prediction Engine", to: "/prediction" },
  { icon: <FlaskConical className="h-4 w-4" />, label: "What-If Simulator", to: "/simulator" },
  { icon: <Bell className="h-4 w-4" />, label: "Alerts", to: "/alerts" },
  { icon: <FileText className="h-4 w-4" />, label: "Decision Reports", to: "/reports" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Methodology", to: "/methodology" },
  { icon: <LineChart className="h-4 w-4" />, label: "Validation", to: "/validation" },
  { icon: <Database className="h-4 w-4" />, label: "Data Sources", to: "/data-sources" },
  { icon: <Settings className="h-4 w-4" />, label: "Settings", to: "/settings" },
];

type Props = {
  districts: DistrictState[];
  onSelectDistrict: (id: string) => void;
  busy?: boolean;
};

export function Sidebar({ districts, onSelectDistrict, busy = false }: Props) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const top = [...districts]
    .sort((a, b) => b.flood_risk + b.drought_risk - (a.flood_risk + a.drought_risk))
    .slice(0, 8);

  return (
    <aside
      aria-busy={busy}
      className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-panel lg:flex"
    >
      <div className="px-5 pt-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] font-display text-lg font-black text-background">
            V
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight text-glow bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] bg-clip-text text-transparent">
              VARUNA
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              AI Bihar Climate Digital Twin
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-6 space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
          return (
            <Link
              key={n.label}
              to={n.to}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)] shadow-[inset_2px_0_0_0_var(--risk-heat)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {n.icon}
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 flex-1 overflow-hidden border-t border-border px-3 pt-4">
        <div className="px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Top District Alerts</div>
        <ul className="mt-2 space-y-1 overflow-y-auto pb-4">
          {top.map((d, i) => {
            const score = Math.round(Math.max(d.flood_risk, d.drought_risk) * 100);
            const badge =
              d.compound_risk
                ? { label: "CRITICAL", color: "var(--risk-compound)" }
                : d.category === "flood"
                  ? { label: "FLOOD", color: "var(--risk-flood)" }
                  : d.category === "heat"
                    ? { label: "HEATWAVE", color: "var(--risk-heat)" }
                    : { label: "DROUGHT", color: "var(--risk-drought)" };
            return (
              <li key={d.district.id}>
                <button
                  onClick={() => {
                    varunaStore.set({ selectedDistrict: d.district.id });
                    onSelectDistrict(d.district.id);
                  }}
                  disabled={busy}
                  className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-background text-[10px] font-mono text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-xs">{d.district.name}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${badge.color} 20%, transparent)`,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                  <span className="w-8 text-right font-mono text-[11px] text-foreground">{score}%</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link
          to="/alerts"
          className="flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs text-primary hover:bg-accent"
        >
          View All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
