import type { DistrictState, RiskCategory } from "@/lib/varuna/state";
import { DISTRICTS } from "@/lib/varuna/districts";

// Simplified Bihar outline (approximate, in the same 100x70 space as the district points).
const BIHAR_OUTLINE =
  "M8,20 L18,14 L30,10 L44,8 L58,10 L72,12 L84,16 L92,22 L90,32 L86,40 L82,50 L74,58 L64,62 L52,60 L40,58 L28,54 L18,48 L12,38 Z";

type Step = { h: number; label: string };

function stepMultiplier(h: number) {
  // Iterative rollout drift — later steps amplify dominant signal.
  return 1 + h * 0.04;
}

function dominantRisk(districts: DistrictState[], drift: number): RiskCategory {
  if (!districts.length) return "normal";
  let flood = 0;
  let drought = 0;
  let compound = 0;
  for (const d of districts) {
    flood += d.flood_risk * drift;
    drought += d.drought_risk * drift;
    if (d.compound_risk) compound += 1;
  }
  if (compound >= 3 && Math.min(flood, drought * 1.2) > 0) return "compound";
  return flood >= drought ? "flood" : "drought";
}

// Miniature Bihar thumbnails showing projected risk composition at T+0, +3, +6, +12.
export function TimeEvolution({ districts }: { districts: DistrictState[] }) {
  const steps: Step[] = [
    { h: 0, label: "Now" },
    { h: 3, label: "T+3h" },
    { h: 6, label: "T+6h" },
    { h: 12, label: "T+12h" },
  ];

  const empty = districts.length === 0;

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Iterative rollout · projected risk pattern</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          GNN T+1 rollout
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {steps.map((s) => {
          const drift = stepMultiplier(s.h);
          const dom = dominantRisk(districts, drift);
          const tint = `var(--risk-${dom})`;
          return (
            <div
              key={s.h}
              className="relative overflow-hidden rounded-lg border border-border bg-background/40 p-2"
              style={{
                boxShadow: empty
                  ? undefined
                  : `inset 0 0 0 1px color-mix(in oklch, ${tint} 30%, transparent)`,
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </span>
                {!empty && (
                  <span
                    className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                    style={{
                      color: tint,
                      backgroundColor: `color-mix(in oklch, ${tint} 18%, transparent)`,
                    }}
                  >
                    {dom}
                  </span>
                )}
              </div>
              {empty ? (
                <div className="grid h-24 place-items-center">
                  <div className="flex flex-col items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-8 w-14 animate-pulse rounded bg-muted-foreground/15" />
                    <span>Computing…</span>
                  </div>
                </div>
              ) : (
                <svg viewBox="0 0 100 70" className="h-24 w-full">
                  <defs>
                    <radialGradient id={`glow-${s.h}`} cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor={tint} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={tint} stopOpacity={0} />
                    </radialGradient>
                  </defs>
                  <rect width="100" height="70" fill={`url(#glow-${s.h})`} />
                  <path
                    d={BIHAR_OUTLINE}
                    fill={`color-mix(in oklch, ${tint} 10%, transparent)`}
                    stroke={`color-mix(in oklch, ${tint} 55%, transparent)`}
                    strokeWidth="0.8"
                  />
                  {DISTRICTS.map((d) => {
                    const state = districts.find((x) => x.district.id === d.id);
                    if (!state) return null;
                    const x = ((d.lng - 83.3) / (88.3 - 83.3)) * 100;
                    const y = 70 - ((d.lat - 24.3) / (27.55 - 24.3)) * 70;
                    const r = 1.5 + Math.min(4, state.flood_risk * 3 + state.drought_risk * 2) * drift;
                    return (
                      <circle
                        key={d.id}
                        cx={x}
                        cy={y}
                        r={r}
                        fill={`var(--risk-${state.category})`}
                        opacity={0.85}
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
