import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ArrowUp, Search, Download, Clock } from "lucide-react";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ProvenanceStrip } from "@/components/varuna/ProvenanceStrip";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { type AlertItem } from "@/lib/varuna/api";
import { useAlerts } from "@/lib/varuna/useCurrentState";

import { alertHistory } from "@/lib/varuna/extra-api";
import { downloadCapXml, downloadCapBundle } from "@/lib/varuna/cap-export";
import { varunaStore, useVarunaStore } from "@/lib/varuna/store";
import { DISTRICTS } from "@/lib/varuna/districts";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/alerts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live Climate Risk Alerts · VARUNA" },
      { name: "description", content: "Live queue of flood, heat, and compound climate risk alerts for Bihar districts, with severity, ETA to peak, and escalation tracking." },
      { property: "og:title", content: "Live Climate Risk Alerts for Bihar Districts · VARUNA" },
      { property: "og:description", content: "Real-time flood, heatwave and compound risk alerts across Bihar with severity tiers, ETA to peak, and NDRF escalation status." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/alerts" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VARUNA live climate alerts feed preview." },
      { name: "twitter:image", content: "https://varuna-digital-twin.lovable.app/og-varuna.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/alerts" }],
  }),
  component: AlertsPage,
});

type LiveAlert = AlertItem & { flash?: boolean };

function AlertsPage() {
  const { t } = useI18n();
  const { data: base = [] } = useAlerts();
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "time" | "district">("severity");
  const [escalate, setEscalate] = useState<LiveAlert | null>(null);
  const [escNotes, setEscNotes] = useState("");
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const ack = useVarunaStore((s) => s.ackAlerts);
  const dismissed = useVarunaStore((s) => s.dismissedAlerts);
  const config = useVarunaStore((s) => s.alertConfig);
  const flashTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync live alert list with the shared, real-data-backed feed.
  useEffect(() => {
    setAlerts((prev) => {
      const localOnly = prev.filter((a) => a.id.startsWith("live-"));
      return [...localOnly, ...base];
    });
  }, [base]);

  useEffect(() => {
    const id = setInterval(() => {
      const d = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      const sev = (["critical", "high", "moderate"] as const)[Math.floor(Math.random() * 3)];
      const newA: LiveAlert = {
        id: `live-${Date.now()}`, timestamp: new Date().toISOString(), severity: sev,
        district: d.name, message: `${sev === "critical" ? "Compound risk" : sev === "high" ? "Flood risk" : "Heat stress"} elevated in ${d.name}`,
        flash: true,
      };
      setAlerts((prev) => [newA, ...prev].slice(0, 40));
      const t = setTimeout(() => setAlerts((prev) => prev.map((a) => a.id === newA.id ? { ...a, flash: false } : a)), 1200);
      flashTimer.current.set(newA.id, t);
    }, 45000);
    return () => clearInterval(id);
  }, []);


  const acknowledge = (id: string) => {
    varunaStore.set((s) => ({ ackAlerts: { ...s.ackAlerts, [id]: { id, ackAt: new Date().toISOString(), status: "acknowledged" } } }));
    toast.success("Alert acknowledged");
  };
  const doEscalate = () => {
    if (!escalate) return;
    varunaStore.set((s) => ({ ackAlerts: { ...s.ackAlerts, [escalate.id]: { id: escalate.id, ackAt: new Date().toISOString(), status: "escalated", notes: escNotes } } }));
    toast.success("Alert escalated");
    setEscalate(null); setEscNotes("");
  };
  const dismiss = (id: string) => {
    varunaStore.set((s) => ({ dismissedAlerts: [...s.dismissedAlerts, id] }));
    toast.success("Dismissed to history");
  };

  const visible = useMemo(() => {
    let arr = alerts.filter((a) => !dismissed.includes(a.id));
    if (severityFilter !== "all") arr = arr.filter((a) => a.severity === severityFilter);
    if (search) arr = arr.filter((a) => a.district.toLowerCase().includes(search.toLowerCase()) || a.message.toLowerCase().includes(search.toLowerCase()));
    const sevRank = { critical: 0, high: 1, moderate: 2 };
    arr.sort((a, b) => sortBy === "severity" ? sevRank[a.severity] - sevRank[b.severity]
      : sortBy === "time" ? +new Date(b.timestamp) - +new Date(a.timestamp)
      : a.district.localeCompare(b.district));
    return arr;
  }, [alerts, dismissed, severityFilter, search, sortBy]);

  const active = visible.filter((a) => !ack[a.id] || ack[a.id].status !== "acknowledged");
  const critical = active.filter((a) => a.severity === "critical").length;
  const high = active.filter((a) => a.severity === "high").length;

  const history = useMemo(() => alertHistory(), []);
  const filteredHistory = history.filter((h) => !dateFrom || h.triggeredAt >= dateFrom);
  const historyPaged = filteredHistory.slice(page * 15, page * 15 + 15);

  const exportHistoryCsv = () => {
    const rows = ["Severity,Text,District,Triggered,Resolved,Duration,Ack"];
    filteredHistory.forEach((h) => rows.push(`${h.severity},${h.text},${h.district},${h.triggeredAt},${h.resolvedAt},${h.durationH}h,${h.ackBy}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alert-log-${Date.now()}.csv`;
    a.click();
    toast.success("Alert log exported");
  };

  const sevColor = (s: "critical" | "high" | "moderate") =>
    s === "critical" ? "var(--risk-compound)" : s === "high" ? "var(--risk-heat)" : "oklch(0.85 0.15 90)";

  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title={t("page.alerts.title")}
        help={{
          title: "Alerts",
          description:
            "Operational alert center. Active alerts stream on the left with acknowledge/escalate/dismiss actions. Configure thresholds and notification channels on the right. History table exports to CSV.",
        }}
      />
      <ProvenanceStrip />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Active Critical" value={critical} color="var(--risk-compound)" pulse />
        <MetricCard label="Active High" value={high} color="var(--risk-heat)" />
        <MetricCard label="Resolved Today" value={dismissed.length} color="var(--risk-drought)" icon={<Check />} />
        <MetricCard label="Avg Resolution" value="3.2h" color="var(--brand-cyan)" icon={<Clock />} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-xl border border-border bg-panel xl:col-span-7">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Active Alerts</h2>
            <button
              onClick={() => { downloadCapBundle(active); toast.success(`Exported ${active.length} alerts as CAP-XML`); }}
              className="flex items-center gap-1 rounded border border-[color:var(--brand-cyan)]/50 bg-[color:var(--brand-cyan)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--brand-cyan)] hover:bg-[color:var(--brand-cyan)]/20"
              title="Export active alerts as OASIS CAP v1.2 XML (NDMA-compatible)"
            >
              <Download className="h-3 w-3" /> CAP-XML
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                </SelectContent>
              </Select>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search alerts" className="h-7 w-32 text-xs" />
              <div className="flex gap-1 text-[10px]">
                {(["severity", "time", "district"] as const).map((k) => (
                  <button key={k} onClick={() => setSortBy(k)} className={`rounded border px-1.5 py-0.5 ${sortBy === k ? "border-[color:var(--risk-heat)] text-[color:var(--risk-heat)]" : "border-border text-muted-foreground"}`}>{k}</button>
                ))}
              </div>
            </div>
          </div>
          <ul className="max-h-[560px] space-y-0 overflow-y-auto">
            {visible.map((a) => {
              const state = ack[a.id];
              return (
                <li
                  key={a.id}
                  className={`border-l-4 border-b border-border/50 px-3 py-2 transition-colors ${a.flash ? "bg-[color:var(--risk-heat)]/15" : ""}`}
                  style={{ borderLeftColor: sevColor(a.severity) }}
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: `color-mix(in oklch, ${sevColor(a.severity)} 25%, transparent)`, color: sevColor(a.severity) }}>{a.severity}</span>
                    <div className="flex-1 text-xs">
                      <div className="font-semibold">{a.message}</div>
                      <div className="text-muted-foreground">{a.district}{a.block ? ` · ${a.block}` : ""}</div>
                      <div className="mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                        <span>· {Math.round((Date.now() - +new Date(a.timestamp)) / 60000)}m active</span>
                        {state && <span className="rounded px-1.5" style={{ backgroundColor: state.status === "escalated" ? "color-mix(in oklch, var(--risk-heat) 25%, transparent)" : "color-mix(in oklch, var(--muted-foreground) 20%, transparent)", color: state.status === "escalated" ? "var(--risk-heat)" : "var(--muted-foreground)" }}>{state.status}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)} className="h-6 gap-1 text-[10px]"><Check className="h-3 w-3" /> Ack</Button>
                      <Button size="sm" variant="outline" onClick={() => setEscalate(a)} className="h-6 gap-1 text-[10px]"><ArrowUp className="h-3 w-3" /> Esc</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadCapXml(a)} className="h-6 gap-1 text-[10px]" title="Export as OASIS CAP-XML"><Download className="h-3 w-3" /> CAP</Button>
                    </div>
                  </div>
                  <button onClick={() => dismiss(a.id)} className="mt-1 text-[10px] text-muted-foreground hover:text-foreground">Dismiss →</button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="col-span-12 space-y-4 xl:col-span-5">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">Notification Settings</div>
            {(["emailNotifications", "smsNotifications", "dashboardAlerts", "autoEscalate"] as const).map((k) => (
              <label key={k} className="flex items-center justify-between py-1 text-xs">
                <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                <Switch checked={config[k]} onCheckedChange={(v) => varunaStore.set((s) => ({ alertConfig: { ...s.alertConfig, [k]: v } }))} />
              </label>
            ))}
            <div className="mt-3 mb-2 font-display text-sm font-semibold uppercase tracking-widest">Threshold Settings</div>
            {([
              ["floodThreshold", "Flood"],
              ["droughtThreshold", "Drought"],
              ["compoundThreshold", "Compound"],
            ] as const).map(([k, label]) => (
              <div key={k} className="mb-2">
                <div className="flex justify-between text-[11px]"><span>{label}</span><span className="font-mono text-[color:var(--risk-heat)]">{config[k].toFixed(2)}</span></div>
                <Slider value={[config[k]]} min={0.3} max={0.9} step={0.05} onValueChange={(v) => varunaStore.set((s) => ({ alertConfig: { ...s.alertConfig, [k]: v[0] } }))} />
              </div>
            ))}
            <Button size="sm" onClick={() => toast.success("Settings saved")} className="mt-2 w-full bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">Save Settings</Button>
          </div>

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-display text-sm font-semibold uppercase tracking-widest">Alert History</div>
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded border border-border bg-input px-1 py-0.5 text-[11px]" />
                <button onClick={exportHistoryCsv} className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] hover:bg-accent"><Download className="h-3 w-3" /> Export</button>
              </div>
            </div>
            <table className="w-full text-[11px]">
              <thead className="text-muted-foreground"><tr><th className="p-1 text-left">Sev</th><th className="p-1 text-left">Alert</th><th className="p-1 text-left">District</th><th className="p-1 text-right">Dur</th></tr></thead>
              <tbody>
                {historyPaged.map((h) => (
                  <tr key={h.id} className="border-t border-border/40"><td className="p-1"><span className="rounded px-1 text-[9px]" style={{ backgroundColor: `color-mix(in oklch, ${sevColor(h.severity)} 25%, transparent)`, color: sevColor(h.severity) }}>{h.severity}</span></td><td className="p-1">{h.text}</td><td className="p-1">{h.district}</td><td className="p-1 text-right font-mono">{h.durationH}h</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <button onClick={() => setPage(Math.max(0, page - 1))} className="rounded border border-border px-2 py-0.5 disabled:opacity-40" disabled={page === 0}>Prev</button>
              <span className="text-muted-foreground">Page {page + 1}/{Math.ceil(filteredHistory.length / 15)}</span>
              <button onClick={() => setPage(Math.min(Math.floor(filteredHistory.length / 15), page + 1))} className="rounded border border-border px-2 py-0.5">Next</button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!escalate} onOpenChange={(v) => !v && setEscalate(null)}>
        <DialogContent className="border-border bg-panel text-foreground">
          <DialogHeader><DialogTitle>Escalate alert</DialogTitle></DialogHeader>
          {escalate && <div className="text-sm text-muted-foreground">{escalate.message}</div>}
          <Textarea value={escNotes} onChange={(e) => setEscNotes(e.target.value)} placeholder="Escalation notes…" rows={4} />
          <Button onClick={doEscalate} className="bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">Confirm escalation</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, color, icon, pulse }: { label: string; value: string | number; color: string; icon?: React.ReactNode; pulse?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold" style={{ color }}>
        {value}{icon}{pulse && <span className="inline-flex h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: color }} />}
      </div>
    </div>
  );
}
