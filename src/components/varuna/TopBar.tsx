import { Search, Calendar, Zap, Satellite, CircuitBoard, Clock, LogIn, LogOut, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type Props = { lastUpdate: string };

export function TopBar({ lastUpdate }: Props) {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Render date only on client to avoid SSR/CSR hydration mismatch across the IST midnight boundary.
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
    );
  }, [lang]);

  const initials = email ? email.slice(0, 2).toUpperCase() : "VA";

  const signOut = async () => {
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success(t("topbar.signOut"));
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-out failed");
    }
  };

  return (
    <header className="flex items-center gap-2 border-b border-border bg-panel/80 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-3">
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("topbar.searchPlaceholder")}
          aria-label={t("topbar.searchPlaceholder")}
          className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:gap-3">
        <StatusChip color="var(--risk-drought)" pulse label={t("topbar.live")} />
        <StatusChip color="var(--brand-cyan)" icon={<Zap className="h-3.5 w-3.5" />} label={t("topbar.twinSync")} />
        <StatusChip color="var(--muted-foreground)" icon={<Clock className="h-3.5 w-3.5" />}>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("topbar.updated")}</div>
          <div className="text-xs font-mono text-foreground">{lastUpdate}</div>
        </StatusChip>
        <div className="hidden xl:contents">
          <StatusChip color="var(--brand-cyan)" icon={<Satellite className="h-3.5 w-3.5" />} label="IMD + INSAT" outline />
          <StatusChip color="var(--brand-magenta)" icon={<CircuitBoard className="h-3.5 w-3.5" />} label="PI-GNN" outline />
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs md:flex">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono" suppressHydrationWarning>{dateStr || "\u2014"}</span>
        </div>
      </div>

      {/* Language toggle */}
      <div className="shrink-0 rounded-md border border-border bg-background/40 p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => setLang("en")}
          aria-label="Switch to English"
          className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold uppercase tracking-widest transition-colors ${
            lang === "en" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Languages className="h-3 w-3" /> EN
        </button>
        <button
          type="button"
          onClick={() => setLang("hi")}
          aria-label="हिंदी में बदलें"
          className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold uppercase tracking-widest transition-colors ${
            lang === "hi" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          हिं
        </button>
      </div>

      {email ? (
        <button
          type="button"
          onClick={signOut}
          className="flex shrink-0 items-center gap-2"
          aria-label={t("topbar.signOut")}
          title={`${email} · ${t("topbar.signOut")}`}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] text-xs font-bold text-background">
            {initials}
          </div>
          <LogOut className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
        </button>
      ) : (
        <Link
          to="/auth"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
        >
          <LogIn className="h-3.5 w-3.5" />
          {t("topbar.signIn")}
        </Link>
      )}
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
