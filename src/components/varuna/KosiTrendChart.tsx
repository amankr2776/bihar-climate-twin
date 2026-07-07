import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { kosiTrend7Day } from "@/lib/varuna/api";

export function KosiTrendChart() {
  const { data } = useQuery({
    queryKey: ["varuna", "kosi-trend"],
    queryFn: () => kosiTrend7Day(),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
  const series = data ?? [];
  return (
    <div className="h-full rounded-xl border border-border bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold">Compound risk signal · 7-day</h3>
          <p className="text-[11px] text-muted-foreground">
            Kosi river level (north) vs South Bihar soil moisture — real Open-Meteo daily observations.
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">IMD · Open-Meteo</div>
      </div>
      <div className="mt-3 h-[calc(100%-56px)]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--grid-line)" strokeDasharray="2 4" />
            <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke="var(--risk-flood)"
              fontSize={11}
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(v) => `${v}m`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--risk-heat)"
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="kosi_level_m"
              name="Kosi level (m)"
              stroke="var(--risk-flood)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="south_soil_pct"
              name="South Bihar soil moisture (%)"
              stroke="var(--risk-heat)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
