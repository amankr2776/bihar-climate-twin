import { AlertTriangle, Users, Building2, Target, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

type Kpi = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  spark: Array<{ v: number }>;
};

function makeSpark(seed: number, trend: "up" | "down" | "flat" = "up") {
  return Array.from({ length: 16 }, (_, i) => {
    const base = trend === "up" ? i * 1.3 : trend === "down" ? (15 - i) * 1.3 : 8;
    const wobble = Math.sin(i * 0.9 + seed) * 2.5;
    return { v: Math.max(0, base + wobble + 4) };
  });
}

export function KpiRow({
  districtsAtRisk,
  populationAffected,
  infraAtRisk,
  lastAssimilation,
}: {
  districtsAtRisk: number;
  populationAffected: number;
  infraAtRisk: number;
  lastAssimilation: string;
}) {
  const kpis: Kpi[] = [
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Districts at Risk",
      value: String(districtsAtRisk),
      color: "var(--risk-compound)",
      spark: makeSpark(1, "up"),
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Population Potentially Affected",
      value: formatCompact(populationAffected),
      color: "var(--risk-flood)",
      spark: makeSpark(2, "up"),
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      label: "Critical Infrastructure at Risk",
      value: String(infraAtRisk),
      color: "var(--risk-heat)",
      spark: makeSpark(3, "flat"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="relative overflow-hidden rounded-xl border border-border bg-panel p-4"
        >
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
              style={{
                backgroundColor: `color-mix(in oklch, ${k.color} 18%, transparent)`,
                color: k.color,
              }}
            >
              {k.icon}
            </div>
            <div className="min-w-0">
              <div className="font-display text-3xl font-bold leading-none tracking-tight text-foreground">
                {k.value}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {k.label}
              </div>
            </div>
          </div>
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={k.spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${k.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={k.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={k.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={k.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${k.label})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      {/* Accuracy + assimilation combined tile */}
      <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-panel p-4">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: "color-mix(in oklch, var(--risk-drought) 18%, transparent)",
            color: "var(--risk-drought)",
          }}
        >
          <Target className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold leading-none tracking-tight text-foreground">
              91<span className="text-xl">%</span>
            </div>
            <span className="text-[10px] font-mono text-primary">/ 98%</span>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground truncate">
            Accuracy Goal<span className="align-top text-primary">*</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Activity className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate">Last: {lastAssimilation}</span>
          </div>
        </div>
        <div className="shrink-0">
          <RingProgress value={98} />
        </div>
      </div>
    </div>
  );
}

function RingProgress({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} stroke="var(--border)" strokeWidth="4" fill="none" />
        <circle
          cx="28"
          cy="28"
          r={r}
          stroke="var(--primary)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold text-primary">{value}%</span>
    </div>
  );
}

function formatCompact(n: number) {
  if (n >= 1e7) {
    const v = n / 1e7;
    return (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, "") + " Cr";
  }
  if (n >= 1e5) {
    const v = n / 1e5;
    // Show one decimal, but if the natural rounding lands on .0, reveal
    // finer precision so the KPI never reads as a placeholder round number.
    const one = (Math.round(v * 10) / 10).toFixed(1);
    if (one.endsWith(".0")) {
      const two = (Math.round(v * 100) / 100).toFixed(2);
      return (two.endsWith("0") ? two.slice(0, -1) : two) + " Lakh";
    }
    return one + " Lakh";
  }
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}
