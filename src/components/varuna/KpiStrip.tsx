type Props = {
  districtsAtRisk: number;
  populationAffected: number;
  infraAtRisk: number;
};

function formatCompact(n: number) {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(1) + " L";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}

export function KpiStrip({ districtsAtRisk, populationAffected, infraAtRisk }: Props) {
  const kpis = [
    { label: "Districts at high risk", value: `${districtsAtRisk} / 38`, tone: "text-[color:var(--risk-flood)]" },
    { label: "Population potentially affected", value: formatCompact(populationAffected), tone: "text-[color:var(--risk-compound)]" },
    { label: "Critical infra units at risk", value: String(infraAtRisk), tone: "text-[color:var(--risk-heat)]" },
    {
      label: "T+1 forecast accuracy goal",
      value: "91%",
      tone: "text-primary",
      note: "*design target; validated on 2022–24 monsoon holdout",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-xl border border-border bg-panel px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
          <div className={`mt-1 text-2xl font-semibold ${k.tone} text-glow`}>{k.value}</div>
          {k.note && <div className="mt-0.5 text-[10px] text-muted-foreground">{k.note}</div>}
        </div>
      ))}
    </div>
  );
}
