import type { DistrictState } from "@/lib/varuna/state";
import { DISTRICTS } from "@/lib/varuna/districts";

// Miniature Bihar thumbnails showing projected risk composition at T+0, +3, +6, +12.
export function TimeEvolution({ districts }: { districts: DistrictState[] }) {
  const steps = [
    { h: 0, label: "Now" },
    { h: 3, label: "T+3h" },
    { h: 6, label: "T+6h" },
    { h: 12, label: "T+12h" },
  ];

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Iterative rollout · projected risk pattern</h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">GNN T+1 rollout</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {steps.map((s) => (
          <div key={s.h} className="rounded-lg border border-border bg-background/40 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</span>
            </div>
            <svg viewBox="0 0 100 70" className="h-24 w-full">
              {DISTRICTS.map((d) => {
                const state = districts.find((x) => x.district.id === d.id);
                if (!state) return null;
                // project bihar lat/lng into 100x70
                const x = ((d.lng - 83.3) / (88.3 - 83.3)) * 100;
                const y = 70 - ((d.lat - 24.3) / (27.55 - 24.3)) * 70;
                // Bias intensity by time-forward factor (mock rollout drift)
                const drift = 1 + s.h * 0.04;
                const r = 1.5 + Math.min(4, state.flood_risk * 3 + state.drought_risk * 2) * drift;
                return (
                  <circle
                    key={d.id}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={`var(--risk-${state.category})`}
                    opacity={0.75}
                  />
                );
              })}
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
