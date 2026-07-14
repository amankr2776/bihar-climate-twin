import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ArrowRight, Clock, Database, Layers, Map, Radar, ShieldAlert, Waves } from "lucide-react";

export const Route = createFileRoute("/_authenticated/methodology/digital-twin-vs-fema-maps")({
  head: () => ({
    meta: [
      { title: "Digital Twin vs. FEMA Flood Maps · VARUNA" },
      { name: "description", content: "Compare real-time AI digital twins with FEMA flood maps: 3-hour refresh, block-level resolution, and predictive forecasts vs. decadal static hazard layers." },
      { property: "og:title", content: "Digital Twin vs. FEMA Flood Maps · VARUNA" },
      { property: "og:description", content: "Compare real-time AI digital twins with FEMA flood maps: 3-hour refresh, block-level resolution, and predictive forecasts vs. decadal static hazard layers." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/methodology/digital-twin-vs-fema-maps" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/methodology/digital-twin-vs-fema-maps" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "Digital Twin vs. FEMA Flood Maps",
          description:
            "Compare real-time AI digital twins with FEMA flood maps: 3-hour refresh, block-level resolution, and predictive forecasts vs. decadal static hazard layers.",
          author: { "@type": "Organization", name: "VARUNA Digital Twin", url: "https://varuna-digital-twin.lovable.app" },
          publisher: { "@type": "Organization", name: "VARUNA Digital Twin", url: "https://varuna-digital-twin.lovable.app" },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://varuna-digital-twin.lovable.app/methodology/digital-twin-vs-fema-maps",
          },
          keywords: [
            "FEMA flood maps",
            "digital twin flood",
            "flood risk assessment",
            "real-time flood forecasting",
            "PI-GNN",
            "AI flood prediction",
            "flood hazard map alternative",
          ],
        }),
      },
    ],
  }),
  component: DigitalTwinVsFemaPage,
});

function DigitalTwinVsFemaPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <PageHeader
        title="Digital Twin vs. FEMA Flood Maps: A Modern Approach to Flood Risk"
        help={{
          title: "Why compare these tools",
          description:
            "FEMA flood maps are the industry reference for insurance and land-use planning. Real-time digital twins like VARUNA answer a different question: what will happen in the next 3 hours to 7 days?",
        }}
      />

      <section className="rounded-xl border border-border bg-panel p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">FEMA flood maps</strong> — formally the Flood Insurance Rate Maps
          (FIRMs) — remain the definitive US reference for delineating 100-year and 500-year floodplains. They
          are built from historical stream-gauge records, terrain surveys, and hydraulic models, and they drive
          insurance premiums, zoning, and building codes. But they are, by design, <em>static</em>: a FIRM
          panel may not be re-studied for a decade or more, and it cannot tell a homeowner whether the storm
          arriving tonight will actually breach the levee. An <strong className="text-foreground">AI digital
          twin</strong> is the operational counterpart — a live simulation that ingests rainfall, satellite,
          and river-gauge data every few hours and projects risk forward in time.
        </p>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--muted-foreground)]/15 text-[color:var(--muted-foreground)]">
              <Map className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              FEMA flood maps (FIRMs)
            </h2>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Built from historical gauge records and hydraulic simulations of 1%/0.2%-annual-chance events.</li>
            <li>Updated on a multi-year to decadal cycle; many panels are 10+ years old.</li>
            <li>Resolution follows study boundaries — often coarse in rural and unstudied areas.</li>
            <li>No real-time signal: rainfall, snowmelt, or upstream releases do not update the map.</li>
            <li>Excellent for insurance rating, floodplain zoning, and long-term planning.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-[color:var(--brand-cyan)]/40 bg-panel p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--brand-cyan)]/15 text-[color:var(--brand-cyan)]">
              <Radar className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-[color:var(--brand-cyan)]">
              VARUNA AI digital twin
            </h2>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            <li>534 CD-block nodes across Bihar refresh every 3 h with IMD gridded rainfall and MOSDAC satellite data.</li>
            <li>Physics-informed graph neural network (PI-GNN) enforces mass conservation across river DAG edges.</li>
            <li>T+1 to T+7 rolling forecasts, not a single design-storm boundary.</li>
            <li>Block-level risk score derived from live antecedent soil moisture, LST, and rainfall.</li>
            <li>Continuously backtested against IMD observations — RMSE and CSI update daily.</li>
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Head-to-head: refresh cycle, resolution, and horizon</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Dimension</th>
                <th className="px-4 py-2">FEMA flood maps</th>
                <th className="px-4 py-2">VARUNA digital twin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Refresh cycle</td>
                <td className="px-4 py-2.5 text-muted-foreground">Every 5–15 years per panel</td>
                <td className="px-4 py-2.5 font-mono text-[color:var(--brand-cyan)]">Every 3 hours</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Spatial resolution</td>
                <td className="px-4 py-2.5 text-muted-foreground">Study-boundary polygons</td>
                <td className="px-4 py-2.5 font-mono text-[color:var(--brand-cyan)]">534 CD-blocks (~150 km²)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Forecast horizon</td>
                <td className="px-4 py-2.5 text-muted-foreground">None (climatological)</td>
                <td className="px-4 py-2.5 font-mono text-[color:var(--brand-cyan)]">T+1 h to T+7 d</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Antecedent conditions</td>
                <td className="px-4 py-2.5 text-muted-foreground">Not represented</td>
                <td className="px-4 py-2.5 text-muted-foreground">Live soil moisture, LST, discharge</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Upstream routing</td>
                <td className="px-4 py-2.5 text-muted-foreground">Implicit in study reach</td>
                <td className="px-4 py-2.5 text-muted-foreground">Explicit river DAG edges</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-foreground">Primary use case</td>
                <td className="px-4 py-2.5 text-muted-foreground">Insurance, zoning, building codes</td>
                <td className="px-4 py-2.5 text-muted-foreground">Operational response, pre-positioning</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Three operational advantages</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Feature icon={<Clock />} title="3-hour refresh" description="Live IMD rainfall + INSAT-3DR/MOSDAC feeds keep every block in sync with the atmosphere during monsoon." />
          <Feature icon={<Layers />} title="Block-level detail" description="A district-average FIRM can hide the Kosi-basin block at 0.95 risk next to a dry non-basin block at 0.35." />
          <Feature icon={<Waves />} title="7-day lookahead" description="Rolling forecasts translate weather into risk hours to days before water arrives — impossible with a static polygon." />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">When to use which</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          FEMA flood maps and digital twins are complementary, not competing. FIRMs answer <em>"what is the
          long-term probability of a flood at this address?"</em> — the right question for insurance and codes.
          The digital twin answers <em>"what is the probability of a flood at this block in the next 72
          hours?"</em> — the right question for evacuations, boat pre-positioning, and shelter activation. A
          modern flood-risk program uses both: the FIRM for the mortgage, the twin for the storm.
        </p>
        <div className="mt-3 rounded-lg border border-[color:var(--brand-cyan)]/40 bg-[color:var(--brand-cyan)]/5 p-3 text-[11px] text-muted-foreground">
          <strong className="text-[color:var(--brand-cyan)]">India context:</strong> Bihar has no FIRM-equivalent
          product. The Central Water Commission publishes district-level flood atlases updated on multi-year
          cycles. VARUNA's 3-hour, block-level twin is designed to fill that operational gap for the State
          Disaster Management Authority.
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--risk-heat)]" />
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-[color:var(--risk-heat)]">
              Not a replacement for official warnings
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              VARUNA is a decision-support layer. It does not replace IMD, CWC, FEMA, or state advisories.
              Always confirm operational response with the relevant government authority.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-xl border border-[color:var(--brand-cyan)]/40 bg-[color:var(--brand-cyan)]/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-cyan)]">
            See it in action
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a what-if scenario, inspect the twin state machine, or read the deep-dive comparison with
            traditional static maps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/methodology/flood-risk-assessment"
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--brand-cyan)]/20 px-3 py-1.5 text-xs font-semibold text-[color:var(--brand-cyan)] hover:bg-[color:var(--brand-cyan)]/30"
          >
            Flood Risk Guide <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/simulator"
            search={{ districts: "all" }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--brand-cyan)]/20 px-3 py-1.5 text-xs font-semibold text-[color:var(--brand-cyan)] hover:bg-[color:var(--brand-cyan)]/30"
          >
            Simulator <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/dashboard"
            search={{ district: "supaul" }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--brand-cyan)]/20 px-3 py-1.5 text-xs font-semibold text-[color:var(--brand-cyan)] hover:bg-[color:var(--brand-cyan)]/30"
          >
            What-If Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2 text-[color:var(--brand-cyan)]">
        {icon}
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
