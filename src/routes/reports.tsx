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

export const Route = createFileRoute("/reports")({
  ssr: false,
  head: () => ({ meta: [{ title: "Decision Reports · VARUNA" }] }),
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

  const generate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2000));
    const rep: SavedReport = {
      id: `rep-${Date.now()}`, type, generatedAt: new Date().toISOString().slice(0, 10),
      period: `${from} → ${to}`, author: "A. Kumar", sizeKb: 200 + Math.floor(Math.random() * 400),
      districts,
    };
    varunaStore.set((s) => ({ savedReports: [rep, ...s.savedReports] }));
    setPreview(rep); setGenerating(false);
    toast.success("Report generated successfully");
  };

  const useTemplate = (t: typeof TEMPLATES[0]) => {
    setType(t.type);
    toast.success(`Template "${t.name}" loaded`);
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
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Decision Reports"
        help={{
          title: "Decision Reports",
          description: "Generate, view, download and manage situation reports. Use pre-built templates (NDRF, Agriculture, Health, Infrastructure) for common decision briefs.",
        }}
      />

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 space-y-3 rounded-xl border border-border bg-panel p-4 xl:col-span-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">Generate New Report</div>
          <div>
            <div className="mb-1 text-[11px] text-muted-foreground">Report Type</div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
            {TEMPLATES.map((t) => (
              <div key={t.name} className="rounded border border-border bg-background/40 p-2">
                <div className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => useTemplate(t)} className="h-6 text-[10px]">Use</Button>
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
                    <div className="text-xs text-slate-500">{preview.period}</div>
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Powered by India's National Climate Data</div>
                </div>
                <h3 className="mt-3 text-sm font-bold">District Risk Summary</h3>
                <table className="mt-2 w-full text-[11px]">
                  <thead className="border-b border-slate-300 text-slate-500"><tr><th className="p-1 text-left">District</th><th className="p-1 text-left">Region</th><th className="p-1 text-left">Kosi Basin</th><th className="p-1 text-right">Population (k)</th></tr></thead>
                  <tbody>
                    {DISTRICTS.slice(0, 15).map((d) => (
                      <tr key={d.id} className="border-b border-slate-100"><td className="p-1">{d.name}</td><td className="p-1">{d.region}</td><td className="p-1">{d.kosiBasin ? "Yes" : "No"}</td><td className="p-1 text-right font-mono">{d.population}</td></tr>
                    ))}
                  </tbody>
                </table>
                <h3 className="mt-4 text-sm font-bold">AI Recommendations</h3>
                <ol className="mt-1 list-decimal pl-5 text-xs">
                  <li>Pre-position NDRF teams in Purnia and Kishanganj.</li>
                  <li>Issue flood warnings for Kosi basin districts.</li>
                  <li>Monitor soil moisture across southern districts.</li>
                </ol>
                {notes && <><h3 className="mt-4 text-sm font-bold">Notes</h3><p className="text-xs">{notes}</p></>}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-sm font-semibold uppercase tracking-widest">Saved Reports</div>
              <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="h-7 w-32 text-xs" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Types</SelectItem>{REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
