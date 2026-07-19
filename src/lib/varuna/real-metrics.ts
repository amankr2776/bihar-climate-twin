// React Query hooks over the real-metrics server functions. Consumers use
// these instead of the old synthetic generators in extra-api.ts.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getValidationSeries,
  getPredObsScatter,
  getBlockHistory,
  getHistoricalCompoundEvents,
  getAlertHistory,
  type ValidationRow,
  type ScatterPoint,
  type BlockHistoryRow,
  type HistoricalCompoundEvent,
  type AlertRow,
} from "./real-metrics.functions";

export type { ValidationRow, ScatterPoint, BlockHistoryRow, HistoricalCompoundEvent, AlertRow };

const FIVE_MIN = 5 * 60_000;

export function useValidationSeries() {
  const fn = useServerFn(getValidationSeries);
  return useQuery({ queryKey: ["real-metrics", "validation"], queryFn: () => fn(), staleTime: FIVE_MIN });
}

export function usePredObsScatter() {
  const fn = useServerFn(getPredObsScatter);
  return useQuery({ queryKey: ["real-metrics", "scatter"], queryFn: () => fn(), staleTime: FIVE_MIN });
}

export function useBlockHistory(districtId: string | undefined) {
  const fn = useServerFn(getBlockHistory);
  return useQuery({
    queryKey: ["real-metrics", "block-history", districtId],
    queryFn: () => fn({ data: { districtId: districtId! } }),
    enabled: !!districtId,
    staleTime: FIVE_MIN,
  });
}

export function useHistoricalCompoundEvents() {
  const fn = useServerFn(getHistoricalCompoundEvents);
  return useQuery({ queryKey: ["real-metrics", "compound-history"], queryFn: () => fn(), staleTime: FIVE_MIN });
}

export function useAlertHistory() {
  const fn = useServerFn(getAlertHistory);
  return useQuery({ queryKey: ["real-metrics", "alert-history"], queryFn: () => fn(), staleTime: FIVE_MIN });
}
