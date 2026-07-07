import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Database, Monitor, Bell, User, Key, Activity, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/varuna/HelpModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { varunaStore, useVarunaStore } from "@/lib/varuna/store";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings · VARUNA" }] }),
  component: SettingsPage,
});

const CATEGORIES = [
  { id: "data", label: "Data Sources", icon: Database },
  { id: "display", label: "Display Preferences", icon: Monitor },
  { id: "alerts", label: "Alert Configuration", icon: Bell },
  { id: "profile", label: "User Profile", icon: User },
  { id: "api", label: "API Configuration", icon: Key },
  { id: "status", label: "System Status", icon: Activity },
];


function relTime(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function SettingsPage() {
  const [cat, setCat] = useState("data");
  const [profile, setProfile] = useState(varunaStore.getState().userProfile);
  const [prefs, setPrefs] = useState(varunaStore.getState().displayPrefs);
  const config = useVarunaStore((s) => s.alertConfig);
  const sources = useVarunaStore((s) => s.dataSources);
  const apiKey = useVarunaStore((s) => s.apiKey);
  const systemStatus = useVarunaStore((s) => s.systemStatus);
  // tick every 15s so "3 min ago" refreshes
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const sync = (name: string) => {
    varunaStore.set((s) => ({
      dataSources: s.dataSources.map((d) => (d.name === name ? { ...d, status: "syncing" } : d)),
    }));
    toast.loading(`Syncing ${name}…`, { id: `sync-${name}` });
    setTimeout(() => {
      varunaStore.set((s) => ({
        dataSources: s.dataSources.map((d) =>
          d.name === name ? { ...d, status: "connected", lastSync: Date.now() } : d,
        ),
        systemStatus: { ...s.systemStatus, lastInference: Date.now() },
      }));
      toast.success(`${name} synced successfully`, { id: `sync-${name}` });
    }, 1100 + Math.random() * 600);
  };
  const saveProfile = () => {
    varunaStore.set({ userProfile: profile });
    toast.success("Profile saved");
  };
  const savePrefs = () => {
    varunaStore.set({ displayPrefs: prefs });
    toast.success("Preferences saved");
  };
  const saveAlertConfig = () => {
    // config already lives in store via onCheckedChange; just confirm
    toast.success("Alert configuration saved");
  };
  const regenKey = () => {
    const hex = () => Math.random().toString(16).slice(2, 6);
    const newKey = `vk_${hex()}${hex()}${hex()}${hex()}`;
    varunaStore.set({ apiKey: newKey });
    toast.success("New API key generated");
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader title="Settings" help={{ title: "Settings", description: "Configure data sources, display preferences, alert thresholds, user profile, API keys and view system status." }} />

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 space-y-1 rounded-xl border border-border bg-panel p-2 lg:col-span-3">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${cat === c.id ? "bg-[color:var(--risk-heat)]/15 text-[color:var(--risk-heat)] shadow-[inset_2px_0_0_0_var(--risk-heat)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              <c.icon className="h-4 w-4" />{c.label}
            </button>
          ))}
        </aside>

        <section className="col-span-12 rounded-xl border border-border bg-panel p-5 lg:col-span-9">
          {cat === "data" && (
            <>
              <SectionTitle>Data Sources</SectionTitle>
              <div className="space-y-2">
                {sources.map((s) => {
                  const syncing = s.status === "syncing";
                  return (
                    <div key={s.name} className="flex items-center gap-3 rounded border border-border bg-background/40 px-3 py-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Last sync: {syncing ? "syncing…" : relTime(s.lastSync)}
                        </div>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "connected"
                            ? "bg-[color:var(--risk-drought)]/20 text-[color:var(--risk-drought)]"
                            : syncing
                              ? "bg-[color:var(--risk-heat)]/20 text-[color:var(--risk-heat)]"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncing}
                        onClick={() => sync(s.name)}
                        className="gap-1 text-xs disabled:opacity-60"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} /> Sync Now
                      </Button>
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sources.forEach((s) => sync(s.name))}
                  className="mt-2 gap-1 text-xs"
                >
                  <RefreshCw className="h-3 w-3" /> Sync All Sources
                </Button>
              </div>
            </>
          )}

          {cat === "display" && (
            <>
              <SectionTitle>Display Preferences</SectionTitle>
              <div className="space-y-4">
                <Row label="Units">
                  <Select value={prefs.units} onValueChange={(v: "metric" | "imperial") => setPrefs((p) => ({ ...p, units: v }))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="metric">Metric</SelectItem><SelectItem value="imperial">Imperial</SelectItem></SelectContent>
                  </Select>
                </Row>
                <Row label="Refresh Interval (minutes)">
                  <Select value={String(prefs.refreshMinutes)} onValueChange={(v) => setPrefs((p) => ({ ...p, refreshMinutes: +v }))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="5">5</SelectItem><SelectItem value="15">15</SelectItem></SelectContent>
                  </Select>
                </Row>
                <Row label="Default Map Layer">
                  <Select value={prefs.defaultMapLayer} onValueChange={(v) => setPrefs((p) => ({ ...p, defaultMapLayer: v }))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="compound">Compound risk</SelectItem><SelectItem value="flood">Flood</SelectItem><SelectItem value="heat">Heatwave</SelectItem><SelectItem value="soil">Soil moisture</SelectItem></SelectContent>
                  </Select>
                </Row>
                <Button onClick={savePrefs} className="bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">Save Preferences</Button>
              </div>
            </>
          )}

          {cat === "alerts" && (
            <>
              <SectionTitle>Alert Configuration</SectionTitle>
              <div className="space-y-3">
                {(["emailNotifications", "smsNotifications", "dashboardAlerts", "autoEscalate"] as const).map((k) => (
                  <Row key={k} label={k.replace(/([A-Z])/g, " $1")}><Switch checked={config[k]} onCheckedChange={(v) => varunaStore.set((s) => ({ alertConfig: { ...s.alertConfig, [k]: v } }))} /></Row>
                ))}
                {([["floodThreshold", "Flood"], ["droughtThreshold", "Drought"], ["compoundThreshold", "Compound"]] as const).map(([k, label]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span>{label} threshold</span><span className="font-mono text-[color:var(--risk-heat)]">{config[k].toFixed(2)}</span></div>
                    <Slider value={[config[k]]} min={0.3} max={0.9} step={0.05} onValueChange={(v) => varunaStore.set((s) => ({ alertConfig: { ...s.alertConfig, [k]: v[0] } }))} />
                  </div>
                ))}
                <Button onClick={saveAlertConfig} className="bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">Save Alert Configuration</Button>
              </div>
            </>
          )}

          {cat === "profile" && (
            <>
              <SectionTitle>User Profile</SectionTitle>
              <div className="max-w-md space-y-3">
                <Row label="Name"><Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Row>
                <Row label="Role"><Input value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))} /></Row>
                <Row label="Organization"><Input value={profile.organization} onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))} /></Row>
                <Button onClick={saveProfile} className="bg-[color:var(--risk-heat)] text-background hover:bg-[color:var(--risk-heat)]/90">Save Profile</Button>
              </div>
            </>
          )}

          {cat === "api" && (
            <>
              <SectionTitle>API Configuration</SectionTitle>
              <div className="space-y-3 text-sm">
                <Row label="API Base URL"><Input readOnly value="https://api.varuna.gov.in/v1" /></Row>
                <Row label="API Key"><Input readOnly value={apiKey} /></Row>
                <Button onClick={regenKey} variant="outline">Regenerate Key</Button>
              </div>
            </>
          )}

          {cat === "status" && (
            <>
              <SectionTitle>System Status</SectionTitle>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatusItem label="Uptime" value={systemStatus.uptime} />
                <StatusItem label="Last inference" value={relTime(systemStatus.lastInference)} />
                <StatusItem
                  label="Database"
                  value={systemStatus.dbHealthy ? "Healthy" : "Degraded"}
                  color={systemStatus.dbHealthy ? "var(--risk-drought)" : "var(--risk-heat)"}
                />
                <StatusItem
                  label="Next model run"
                  value={`in ${Math.floor(systemStatus.nextModelRunMin / 60)}h ${systemStatus.nextModelRunMin % 60}m`}
                />
                <StatusItem label="Ingestion job" value={`in ${systemStatus.ingestionMin}m`} />
                <StatusItem label="Queue depth" value={`${systemStatus.queueDepth} tasks`} />
              </div>
              <Button
                onClick={() => {
                  varunaStore.set((s) => ({ systemStatus: { ...s.systemStatus, lastInference: Date.now(), queueDepth: 0 } }));
                  toast.success("System status refreshed");
                }}
                variant="outline"
                className="mt-4 gap-1 text-xs"
              >
                <RefreshCw className="h-3 w-3" /> Refresh Status
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">{children}</h2>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm capitalize text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}
function StatusItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
