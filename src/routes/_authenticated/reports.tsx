import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Link as LinkIcon, Printer, FileText, Eye, Trash2, Truck, Wheat, Heart, Building } from "lucide-react";
import { PageHeader } from "@/components/varuna/HelpModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS } from "@/lib/varuna/districts";
import { varunaStore, useVarunaStore, type SavedReport } from "@/lib/varuna/store";
import { useCurrentState } from "@/lib/varuna/useCurrentState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Decision Reports & Situation Briefs · VARUNA" },
      { name: "description", content: "Officials-only decision reports: generate NDRF, agriculture, health, infrastructure and what-if scenario briefs for Bihar climate risk." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

const REPORT_TYPES = [
  "Daily Situation Report",
  "Compound Risk Brief",
  "District-Level Flood Assessment",
  "Drought Status Report",
  "What-If Scenario Report",
  "Weekly Climate Summary",
  "Custom Report",
];

const TEMPLATES = [
  { name: "NDRF Deployment Brief", icon: Truck, desc: "For flood emergency response teams", type: "District-Level Flood Assessment" },
  { name: "Agricultural Advisory", icon: Wheat, desc: "Drought impact on crop planning", type: "Drought Status Report" },
  { name: "Public Health Alert", icon: Heart, desc: "Heatwave health risk communication", type: "Weekly Climate Summary" },
  { name: "Infrastructure Risk Assessment", icon: Building, desc: "Critical facility managers", type: "Compound Risk Brief" },
];

function ReportsPage() {
  const { t } = useI18n();
  const { data: liveState } = useCurrentState();



  const [type, setType] = useState(REPORT_TYPES[0]);
  const [from, setFrom] = useState("2026-07-01");
  const [to, setTo] = useState("2026-07-07");
  const [districts, setDistricts] = useState<string[]>(DISTRICTS.slice(0, 8).map((d) => d.id));
  const [format, setFormat] = useState("PDF");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<null | SavedReport>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const saved = useVarunaStore((s) => s.savedReports);

  const authorFor = (t: string) => {
    const s = t.toLowerCase();
    if (s.includes("ndrf") || s.includes("infrastructure")) return "Ab. Kumar";
    if (s.includes("dashboard") || s.includes("daily") || s.includes("weekly")) return "J. Panchal";
    if (s.includes("what-if") || s.includes("scenario") || s.includes("compound") || s.includes("ai")) return "A. Kumar";
    return "A. Choudhary";
  };

  const generate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    const rep: SavedReport = {
      id: `rep-${Date.now()}`, type, generatedAt: new Date().toISOString().slice(0, 10),
      period: `${from} → ${to}`, author: authorFor(type), sizeKb: 200 + Math.floor(Math.random() * 400),
      districts,
    };
    varunaStore.set((s) => ({ savedReports: [rep, ...s.savedReports] }));
    setPreview(rep); setGenerating(false);
    toast.success("Report generated successfully");
  };

  const useTemplate = (tpl: typeof TEMPLATES[0]) => {
    setType(tpl.type);
    toast.success(`Template "${tpl.name}" loaded`);
  };

  const downloadPdf = async () => {
    if (!preview) return;
    toast.loading("Preparing PDF…", { id: "pdf" });
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    pdf.setFontSize(18); pdf.text("VARUNA · " + preview.type, 15, 20);
    pdf.setFontSize(10); pdf.text("Period: " + preview.period, 15, 30);
    pdf.text("Powered by India's National Climate Data", 15, 36);
    pdf.setFontSize(12); pdf.text("District risk summary", 15, 50);
    let y = 60;
    DISTRICTS.slice(0, 20).forEach((d, i) => {
      pdf.setFontSize(9); pdf.text(`${i + 1}. ${d.name} · ${d.region} · ${d.kosiBasin ? "Kosi basin" : "—"}`, 15, y);
      y += 6;
    });
    pdf.save(`${preview.type.replace(/\s+/g, "-")}-${Date.now()}.pdf`);
    toast.success("PDF downloaded", { id: "pdf" });
  };

  const shareLink = () => {
    const url = `${location.origin}/reports#${preview?.id ?? ""}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const doPrint = () => {
    window.print();
    toast.success("Sent to printer");
  };

  const filteredLibrary = useMemo(() => {
    return saved.filter((r) => (filterType === "all" || r.type === filterType) && r.type.toLowerCase().includes(search.toLowerCase()));
  }, [saved, filterType, search]);

  const deleteReport = (id: string) => {
    varunaStore.set((s) => ({ savedReports: s.savedReports.filter((r) => r.id !== id) }));
    toast.success("Deleted");
  };
  const deleteSelected = () => {
    varunaStore.set((s) => ({ savedReports: s.savedReports.filter((r) => !selectedIds.includes(r.id)) }));
    setSelectedIds([]);
    toast.success("Selected reports deleted");
  };




  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
      <PageHeader
        title={t("page.reports.title")}
        help={{
          title: "Decision Reports",
          description: "Generate, view, download and manage situation reports. Use pre-built templates (NDRF, Agriculture, Health, Infrastructure) for common decision briefs.",
        }}
      />

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 space-y-3 rounded-xl border border-border bg-panel p-4 xl:col-span-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">Generate New Report</h2>
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">Report Type</div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">Report Period</div>
            <div className="flex gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 rounded border border-border bg-input px-2 py-1 text-xs" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 rounded border border-border bg-input px-2 py-1 text-xs" />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Districts to Include ({districts.length})</span>
              <div className="flex gap-1">
                <button onClick={() => setDistricts(DISTRICTS.map((d) => d.id))} className="rounded border border-border px-1.5 hover:bg-accent">All</button>
                <button onClick={() => setDistricts([])} className="rounded border border-border px-1.5 hover:bg-accent">Clear</button>
              </div>
            </div>
            <div className="max-h-28 overflow-y-auto rounded border border-border bg-background/40 p-2">
              {DISTRICTS.map((d) => (
                <label key={d.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                  <Checkbox checked={districts.includes(d.id)} onCheckedChange={(v) => setDistricts((s) => v ? [...s, d.id] : s.filter((x) => x !== d.id))} />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">Output Format</div>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="PDF">PDF</SelectItem><SelectItem value="Word">Word Document</SelectItem><SelectItem value="CSV">CSV Data Export</SelectItem></SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Additional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-xs" />
          <Button onClick={generate} disabled={generating} className="w-full gap-2 bg-[color:var(--brand-cyan)] text-background hover:bg-[color:var(--brand-cyan)]/90">
            <FileText className="h-4 w-4" /> {generating ? "Generating…" : "Generate Report"}
          </Button>

          <div className="pt-3 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">Report Templates</div>
          <div className="grid grid-cols-1 gap-2">
            {TEMPLATES.map((tpl) => (
              <div key={tpl.name} className="rounded border border-border bg-background/40 p-2">
                <div className="flex items-center gap-2">
                  <tpl.icon className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{tpl.name}</div>
                    <div className="text-[10px] text-muted-foreground">{tpl.desc}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => useTemplate(tpl)} className="h-6 text-[10px]">Use</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 space-y-4 xl:col-span-8">
          {preview ? (
            <div className="rounded-xl border border-border bg-panel p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={downloadPdf} className="gap-1"><Download className="h-3 w-3" /> Download PDF</Button>
                <Button size="sm" variant="outline" onClick={shareLink} className="gap-1"><LinkIcon className="h-3 w-3" /> Share Link</Button>
                <Button size="sm" variant="outline" onClick={doPrint} className="gap-1"><Printer className="h-3 w-3" /> Print</Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)} className="ml-auto">Close preview</Button>
              </div>
              <div className="rounded-lg bg-white p-6 text-slate-900">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <div className="text-lg font-bold">VARUNA · {preview.type}</div>
                    <div className="text-xs text-slate-500">Period: {preview.period}</div>
                    <div className="text-[10px] text-slate-400">Author: {preview.author} · Generated {preview.generatedAt}</div>
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Powered by India's National Climate Data</div>
                </div>

                {(() => {
                  // Live risk snapshot — reads from useCurrentState() so the
                  // Executive Summary and Top 5 table reflect the same values
                  // shown on Dashboard/Map/Compound. Falls back gracefully to
                  // zeros while the shared query is still resolving.
                  const ids = preview.districts?.length ? preview.districts : districts;
                  const idSet = new Set(ids);
                  const liveDistricts = liveState?.districts ?? [];
                  const rows = liveDistricts
                    .filter((s) => idSet.has(s.district.id))
                    .map((s) => {
                      const heatRet = s.blocks.length
                        ? s.blocks.reduce((a, b) => a + b.heat_retention_score, 0) / s.blocks.length
                        : 0;
                      return {
                        d: s.district,
                        flood: s.flood_risk,
                        drought: s.drought_risk,
                        heat: heatRet,
                        composite: s.flood_risk + s.drought_risk + heatRet,
                      };
                    });
                  const top5 = [...rows].sort((a, b) => b.composite - a.composite).slice(0, 5);
                  const districtNames = rows.length
                    ? rows.map((r) => r.d.name)
                    : DISTRICTS.filter((d) => ids.includes(d.id)).map((d) => d.name);
                  const avgFlood = rows.length ? rows.reduce((s, r) => s + r.flood, 0) / rows.length : 0;
                  const kosiCount = rows.filter((r) => r.d.kosiBasin).length;
                  const dataMode = liveState ? "Live" : "Loading…";
                  return (
                    <>
                      <div className="mt-1 inline-block rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                        {dataMode} data · shared query
                      </div>
                      <h3 className="mt-2 text-sm font-bold">Executive Summary</h3>
                      <p className="mt-1 text-xs leading-relaxed">
                        {rows.length === 0 ? (
                          "Loading live district state…"
                        ) : (
                          <>
                            Across {rows.length} selected districts ({kosiCount} in the Kosi basin), the composite flood exposure
                            averages {(avgFlood * 100).toFixed(0)}% with the highest concentration in
                            {" "}{top5.slice(0, 3).map((r) => r.d.name).join(", ") || "—"}. Values here are read from the same
                            live climate query powering the Dashboard, Map and Compound pages — no synthetic overlay.
                            Recommend NDRF pre-positioning in the top three flood districts and cooling-shelter activation in
                            the highest heat-retention belt.
                          </>
                        )}
                      </p>

                      <h3 className="mt-4 text-sm font-bold">Selected Districts ({districtNames.length})</h3>
                      <p className="mt-1 text-[11px] text-slate-600">{districtNames.join(", ") || "—"}</p>

                      <h3 className="mt-4 text-sm font-bold">Top 5 At-Risk Districts</h3>
                      <table className="mt-2 w-full text-[11px]">
                        <thead className="border-b border-slate-300 text-slate-500">
                          <tr>
                            <th className="p-1 text-left">#</th>
                            <th className="p-1 text-left">District</th>
                            <th className="p-1 text-right">Flood</th>
                            <th className="p-1 text-right">Drought</th>
                            <th className="p-1 text-right">Heat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top5.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-2 text-center text-slate-400">
                                Waiting for live climate state…
                              </td>
                            </tr>
                          ) : (
                            top5.map((r, i) => (
                              <tr key={r.d.id} className="border-b border-slate-100">
                                <td className="p-1">{i + 1}</td>
                                <td className="p-1">{r.d.name}</td>
                                <td className="p-1 text-right font-mono">{r.flood.toFixed(2)}</td>
                                <td className="p-1 text-right font-mono">{r.drought.toFixed(2)}</td>
                                <td className="p-1 text-right font-mono">{r.heat.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </>
                  );
                })()}

                {(() => {
                  const ids = preview.districts?.length ? preview.districts : districts;
                  const idSet = new Set(ids);
                  const scoped = (liveState?.districts ?? []).filter((s) => idSet.has(s.district.id));
                  const recs: string[] = [];
                  const kosi = scoped
                    .filter((s) => s.district.kosiBasin && s.flood_risk > 0.5)
                    .sort((a, b) => b.flood_risk - a.flood_risk);
                  if (kosi.length) {
                    const top = kosi.slice(0, 3).map((s) => `${s.district.name} (${(s.flood_risk * 100).toFixed(0)}%)`).join(", ");
                    const pop = kosi.slice(0, 3).reduce((a, b) => a + b.population_at_risk, 0);
                    recs.push(`Pre-position NDRF Stage-2 boat teams for ${kosi.length} Kosi-basin districts — priority: ${top}. Population at risk ~${(pop / 1000).toFixed(0)}k; open EOC in ${kosi[0].district.name}.`);
                  }
                  const heat = scoped
                    .filter((s) => s.district.region === "south" && s.drought_risk > 0.5)
                    .sort((a, b) => b.drought_risk - a.drought_risk);
                  if (heat.length) {
                    recs.push(`Activate cooling shelters and public-health advisories across ${heat.length} south-Bihar districts — peak ${heat[0].district.name} at ${(heat[0].drought_risk * 100).toFixed(0)}% drought/heat stress.`);
                  }
                  const compound = scoped.filter((s) => s.compound_risk);
                  if (compound.length) {
                    recs.push(`Compound flood+drought signal in ${compound.length} district(s) (${compound.slice(0, 3).map((s) => s.district.name).join(", ")}) — trigger cross-agency joint task force and dual-hazard messaging.`);
                  }
                  const soilWatch = scoped
                    .filter((s) => s.blocks.some((b) => b.soil_moisture_index < 0.2))
                    .sort((a, b) => a.blocks[0].soil_moisture_index - b.blocks[0].soil_moisture_index);
                  if (soilWatch.length) {
                    recs.push(`Advise sowing delay + irrigation prioritisation in ${soilWatch.slice(0, 3).map((s) => s.district.name).join(", ")} — soil moisture below 20% threshold.`);
                  }
                  const floodOther = scoped
                    .filter((s) => !s.district.kosiBasin && s.flood_risk > 0.55)
                    .sort((a, b) => b.flood_risk - a.flood_risk);
                  if (floodOther.length) {
                    recs.push(`Second-tier flood watch outside Kosi: ${floodOther.slice(0, 3).map((s) => `${s.district.name} ${(s.flood_risk * 100).toFixed(0)}%`).join(", ")} — pre-stage sandbags and issue village-level advisories.`);
                  }
                  if (!recs.length) {
                    recs.push(`No cross-threshold actions required across the ${scoped.length || ids.length} selected districts. Maintain routine monitoring cadence and re-run this report if the scenario or observations shift.`);
                  }
                  return (
                    <>
                      <h3 className="mt-4 text-sm font-bold">AI Recommendations</h3>
                      <ol className="mt-1 list-decimal pl-5 text-xs">
                        {recs.map((r, i) => <li key={i}>{r}</li>)}
                      </ol>
                    </>
                  );
                })()}
                {notes && <><h3 className="mt-4 text-sm font-bold">Notes</h3><p className="text-xs">{notes}</p></>}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-sm font-semibold uppercase tracking-widest">Saved Reports</div>
              <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search reports" className="h-7 w-32 text-xs" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Types</SelectItem>{REPORT_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}</SelectContent>
                </Select>
                {selectedIds.length > 0 && <Button size="sm" variant="destructive" onClick={deleteSelected} className="h-7 text-[11px]">Delete Selected ({selectedIds.length})</Button>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLibrary.map((r) => (
                <div key={r.id} className="rounded border border-border bg-background/40 p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={(v) => setSelectedIds((s) => v ? [...s, r.id] : s.filter((x) => x !== r.id))} />
                    <div className="flex-1">
                      <div className="text-xs font-semibold">{r.type}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">{r.generatedAt} · {r.period}</div>
                      <div className="text-[10px] text-muted-foreground">{r.author} · {r.sizeKb}KB</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button onClick={() => setPreview(r)} className="flex-1 rounded border border-border py-1 text-[10px] hover:bg-accent"><Eye className="mx-auto h-3 w-3" /></button>
                    <button onClick={() => { setPreview(r); setTimeout(downloadPdf, 200); }} className="flex-1 rounded border border-border py-1 text-[10px] hover:bg-accent"><Download className="mx-auto h-3 w-3" /></button>
                    <button onClick={() => deleteReport(r.id)} className="flex-1 rounded border border-border py-1 text-[10px] text-[color:var(--risk-compound)] hover:bg-accent"><Trash2 className="mx-auto h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
