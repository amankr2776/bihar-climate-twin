import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  Layers,
  Cpu,
  FlaskConical,
  Bell,
  FileText,
  Settings,
  ChevronRight,
  BookOpen,
  LineChart,
  Database,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { DistrictState } from "@/lib/varuna/state";
import { varunaStore } from "@/lib/varuna/store";
import { useI18n } from "@/lib/i18n";
import { getMyRoles } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

type NavItem = { icon: React.ReactNode; key: string; to: string };

const NAV: NavItem[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, key: "nav.dashboard", to: "/dashboard" },
  { icon: <Map className="h-4 w-4" />, key: "nav.map", to: "/map" },
  { icon: <Layers className="h-4 w-4" />, key: "nav.compound", to: "/compound" },
  { icon: <Cpu className="h-4 w-4" />, key: "nav.prediction", to: "/prediction" },
  { icon: <FlaskConical className="h-4 w-4" />, key: "nav.simulator", to: "/simulator" },
  { icon: <Bell className="h-4 w-4" />, key: "nav.alerts", to: "/alerts" },
  { icon: <FileText className="h-4 w-4" />, key: "nav.reports", to: "/reports" },
  { icon: <BookOpen className="h-4 w-4" />, key: "nav.methodology", to: "/methodology" },
  { icon: <LineChart className="h-4 w-4" />, key: "nav.validation", to: "/validation" },
  { icon: <Database className="h-4 w-4" />, key: "nav.dataSources", to: "/data-sources" },
  { icon: <Settings className="h-4 w-4" />, key: "nav.settings", to: "/settings" },
];

type Props = {
  districts: DistrictState[];
  onSelectDistrict: (id: string) => void;
  busy?: boolean;
};

export function Sidebar({ districts, onSelectDistrict, busy = false }: Props) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const rolesFn = useServerFn(getMyRoles);
  const rolesQuery = useQuery({
    queryKey: ["myRoles"],
    queryFn: () => rolesFn(),
    enabled: authed,
    staleTime: 60_000,
  });
  const isAdmin = (rolesQuery.data ?? []).includes("admin");

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
              {t("sidebar.tagline")}
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-6 space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
          return (
            <Link
              key={n.key}
              to={n.to}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)] shadow-[inset_2px_0_0_0_var(--risk-heat)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {n.icon}
              <span>{t(n.key)}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-[color:var(--brand-magenta)]/15 text-[color:var(--brand-magenta)] shadow-[inset_2px_0_0_0_var(--brand-magenta)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{t("nav.admin")}</span>
          </Link>
        )}
      </nav>

      <div className="mt-5 flex-1 overflow-hidden border-t border-border px-3 pt-4">
        <div className="px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("sidebar.topAlerts")}
        </div>
        <ul className="mt-2 space-y-1 overflow-y-auto pb-4">
          {top.map((d, i) => {
            const score = Math.round(Math.max(d.flood_risk, d.drought_risk) * 100);
            const badge =
              d.compound_risk
                ? { key: "badge.critical", color: "var(--risk-compound)" }
                : d.category === "flood"
                  ? { key: "badge.flood", color: "var(--risk-flood)" }
                  : d.category === "heat"
                    ? { key: "badge.heatwave", color: "var(--risk-heat)" }
                    : { key: "badge.drought", color: "var(--risk-drought)" };
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
                    {t(badge.key)}
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
          {t("sidebar.viewAll")} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
