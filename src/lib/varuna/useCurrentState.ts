import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAlerts, getCurrentState, invalidateClimateCache } from "./api";
import { useVarunaStore } from "./store";
import type { ScenarioBias } from "./state";

const REFRESH_MS = 3 * 60 * 1000;

function biasKey(b: ScenarioBias | null): string {
  if (!b) return "live";
  return `r${b.rainfall_pct ?? 0}-t${b.temperature_c ?? 0}-s${b.soil_override ?? "none"}`;
}

/**
 * Shared, TanStack-Query-cached snapshot of Bihar's climate state.
 * Every page reads through this hook so:
 *   - only ONE network request happens across the whole app per refresh
 *   - Simulator's applied scenario propagates instantly to Dashboard, Map,
 *     Compound Risk, Prediction Engine, and Alerts (query key includes bias)
 */
export function useCurrentState() {
  const bias = useVarunaStore((s) => s.scenarioBias);
  return useQuery({
    queryKey: ["varuna", "state", biasKey(bias)],
    queryFn: () => getCurrentState(bias ?? {}),
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
  });
}

export function useAlerts() {
  const bias = useVarunaStore((s) => s.scenarioBias);
  return useQuery({
    queryKey: ["varuna", "alerts", biasKey(bias)],
    queryFn: () => getAlerts(bias ?? {}),
    refetchInterval: REFRESH_MS,
    staleTime: 60_000,
  });
}

export function useVarunaRefresh() {
  const qc = useQueryClient();
  return () => {
    invalidateClimateCache();
    qc.invalidateQueries({ queryKey: ["varuna"] });
  };
}
