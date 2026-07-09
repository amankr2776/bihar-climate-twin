import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ArrowRight, Cpu, Layers, Network, Repeat, Database, Waves, Satellite, MapPin, History, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "PI-GNN Methodology · VARUNA" },
      { name: "description", content: "How VARUNA's Physics-Informed Graph Neural Network models Bihar's climate — 534-block spatial graph, spatio-temporal transformer, IMD ground-truth validation loop." },
      { property: "og:title", content: "VARUNA PI-GNN Methodology" },
      { property: "og:description", content: "Physics-Informed Graph Neural Network + Spatio-Temporal Transformer digital twin — architecture, features, training, validation." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/methodology" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/methodology" }],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <PageHeader
        title="Methodology · PI-GNN Digital Twin"
        help={{
          title: "How VARUNA works",
          description:
            "This page describes VARUNA's model architecture, training data, validation protocol, and the continuous learning loop that keeps the twin synchronised with IMD/INSAT observations.",
        }}
      />

      <section className="rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          VARUNA is a Physics-Informed Graph Neural Network (PI-GNN) coupled with a Spatio-Temporal
          Transformer, wrapped in a continuously-updating state-machine that mirrors Bihar's climate at
          block-level granularity. The system ingests indigenous IMD gridded observations and INSAT/MOSDAC
          satellite telemetry, fuses them into a unified spatial graph, and forecasts rainfall and temperature
          at each of Bihar's 534 blocks with a T+1 → T+7 rolling horizon.
        </p>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card icon={<Database />} title="1. Indigenous data layer" tone="cyan">
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            <li>IMD gridded rainfall (0.25° × 0.25°, 1951–present)</li>
            <li>IMD max/min temperature (1.0° × 1.0°)</li>
            <li>INSAT-3D/3DR LST, SST, IMC via MOSDAC</li>
            <li>Bhuvan block/district vector boundaries</li>
            <li>IMDAA / ERA5 reanalysis for bias correction and training baseline</li>
          </ul>
        </Card>

        <Card icon={<Layers />} title="2. Fusion pipeline" tone="magenta">
          <p className="mt-2 text-sm text-muted-foreground">
            Heterogeneous sources are regridded to a unified 4 km lattice via GDAL/Rasterio, temporally
            aligned to 3-hour epochs, and gap-filled through linear interpolation for &lt; 6h gaps. Longer
            gaps are flagged and excluded from training. Xarray/Dask distribute the NetCDF workload; PostGIS
            stores the unified feature store.
          </p>
        </Card>

        <Card icon={<Network />} title="3. Spatial graph" tone="heat">
          <p className="mt-2 text-sm text-muted-foreground">
            Bihar's 534 blocks form the nodes of the PI-GNN. Edges connect geographically adjacent blocks and
            hydrologically-linked pairs along the Kosi, Gandak, Bagmati, and Sone drainage networks. Each
            node carries a 6-feature state vector: rainfall, T<sub>max</sub>, T<sub>min</sub>, soil-moisture
            proxy, cumulative heat retention, and antecedent-precipitation index.
          </p>
        </Card>

        <Card icon={<Cpu />} title="4. PI-GNN + Transformer" tone="compound">
          <p className="mt-2 text-sm text-muted-foreground">
            Message-passing across the block graph captures spatial correlation; a downstream
            Spatio-Temporal Transformer models temporal dependencies across the last 72 hours. Physics
            enters as a <em>soft regularization</em> term in the training loss — the network is data-driven,
            but penalized when its outputs violate conservation-of-mass and non-negativity constraints. No
            hand-authored formulas are executed at inference.
          </p>
        </Card>

        <Card icon={<Waves />} title="5. Digital-twin state" tone="cyan">
          <p className="mt-2 text-sm text-muted-foreground">
            Each block holds a persistent state vector updated every 3 hours by newly assimilated
            observations. This turns forecasts into a <em>live replica</em> rather than a series of one-shot
            predictions — soil moisture and cumulative heat retention carry forward, enabling compound-risk
            queries the deck describes.
          </p>
        </Card>

        <Card icon={<Repeat />} title="6. Continuous learning loop" tone="magenta">
          <p className="mt-2 text-sm text-muted-foreground">
            Every T+24 forecast is backtested against the corresponding IMD ground-truth grid. RMSE and CSI
            (Critical Success Index) metrics feed a scheduled retraining job on preemptible cloud GPUs. The
            model is compared each cycle against an IMD persistence-forecast baseline; only checkpoints that
            beat baseline on the 2022–24 monsoon holdout are promoted.
          </p>
          <div className="mt-3">
            <a href="#validation" className="inline-flex items-center gap-1 text-xs text-[color:var(--brand-cyan)] hover:underline">
              See live validation metrics <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </Card>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Physically-based hydrology core (PoC)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The PI-GNN is coupled to a lightweight rainfall → runoff → peak-discharge chain so every block's
          <span className="mx-1 font-mono text-[color:var(--brand-cyan)]">flood_risk</span> value is
          reproducible from three inputs (rainfall, antecedent soil moisture, land-cover class). This is
          PoC-grade — a stepping stone to a full HEC-RAS / SWAT / Muskingum coupling in v1.0 — but every
          coefficient is cited and every equation is executed at inference time. Source:{" "}
          <code className="text-[color:var(--brand-cyan)]">src/lib/varuna/hydrology.ts</code>.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Equation
            title="1. SCS Curve Number infiltration"
            body={
              <>
                <div className="font-mono text-[12px] text-foreground">
                  S = 25400 / CN − 254 &nbsp;(mm)
                </div>
                <div className="font-mono text-[12px] text-foreground">
                  Q = (P − 0.2·S)² / (P + 0.8·S) &nbsp;when&nbsp; P &gt; 0.2·S, else Q = 0
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Source: USDA-NRCS TR-55 (1986); AMC-II CN values for HSG-C soils per Singh et&nbsp;al.
                  2017, "SCS-CN parameterisation for the Kosi basin", <em>J. Hydrol. Reg. Studies</em>.
                </p>
              </>
            }
          />
          <Equation
            title="2. SCS triangular unit hydrograph"
            body={
              <>
                <div className="font-mono text-[12px] text-foreground">
                  Q<sub>p</sub> = 0.208 · A · Q / T<sub>p</sub>
                </div>
                <div className="font-mono text-[12px] text-foreground">
                  T<sub>p</sub> = 0.6 · T<sub>c</sub>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Peak discharge in m³/s, A in km², Q in mm, T<sub>p</sub>/T<sub>c</sub> in hours. Source:
                  SCS National Engineering Handbook Part 630, Chapter 16.
                </p>
              </>
            }
          />
          <Equation
            title="3. Antecedent moisture adjustment"
            body={
              <>
                <div className="font-mono text-[12px] text-foreground">
                  CN<sub>adj</sub> = CN<sub>II</sub> + (soil − 0.5) · 20 &nbsp;∈ [35, 98]
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Continuous AMC-I/II/III correction using soil moisture (0..1) as a 5-day antecedent-rain
                  proxy. Bounds are the physical TR-55 envelope.
                </p>
              </>
            }
          />
          <Equation
            title="4. Kosi channel-routing surrogate"
            body={
              <>
                <div className="font-mono text-[12px] text-foreground">
                  Q<sub>peak,routed</sub> = Q<sub>p</sub> · f<sub>Kosi</sub> &nbsp;(f = 1.6 for alluvial fan, else 1.0)
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Placeholder for full Muskingum X-K routing (K ≈ 8 h, X ≈ 0.2 for lower Kosi per CWC
                  studies) that v1.0 will run over the 534-node block graph.
                </p>
              </>
            }
          />
        </div>

        <div className="mt-4 rounded-lg border border-[color:var(--risk-drought)]/40 bg-[color:var(--risk-drought)]/5 p-3 text-[11px] text-muted-foreground">
          <strong className="text-[color:var(--risk-drought)]">Calibration anchors:</strong>{" "}
          25 mm/day rain on cropland at soil = 0.5 (non-Kosi) → flood_risk ≈ 0.35 · 100 mm/day rain on
          alluvial fan, soil = 0.9 (Kosi) → flood_risk ≈ 0.95. Reference peak = 260 m³/s.
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Spatial resolution &amp; graceful degradation
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          VARUNA runs at Bihar's <strong>534 CD-block</strong> granularity — the same unit the State
          Disaster Management Authority uses for operational planning. The PoC currently renders each
          block as a centroid because full Bhuvan block polygons (Survey of India 1:50,000) are pending
          licensing sync. When polygons are missing, the map degrades gracefully to district-level
          choropleth plus block centroid markers rather than dropping the layer.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>State → District → Block drill-down is already wired end-to-end.</li>
          <li>Every block has a stable <code className="text-[color:var(--brand-cyan)]">block_id</code>; swapping centroids for polygons is a data-layer change with no model rework.</li>
          <li>Village-level (~45,000 units) is architected as the next tier below block once Bhuvan revenue-village vectors arrive.</li>
        </ul>
      </section>



      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Target benchmarks</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="CSI (flood, ≥ 50 mm/24h)" target="&gt; 0.85" />
          <Stat label="RMSE (rainfall, mm/day)" target="&lt; 12%" />
          <Stat label="Heatwave hit-rate" target="&gt; 0.90" />
          <Stat label="Twin refresh cadence" target="3 h" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Targets are informed by published India-region GNN/transformer rainfall-forecast studies and will
          be validated against the 2022–24 monsoon holdout before v1.0 release. See{" "}
          <Link to="/validation" className="text-[color:var(--brand-cyan)] hover:underline">/validation</Link>
          {" "}for current numbers and the persistence-forecast baseline comparison.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Not a warning authority</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          VARUNA is a decision-support tool. It does not replace India Meteorological Department (IMD),
          Central Water Commission (CWC), or State Emergency Operation Centre (SEOC) advisories. Authoritative
          warnings must be sourced from those agencies. See our{" "}
          <Link to="/disclaimer" className="text-[color:var(--brand-cyan)] hover:underline">disclaimer</Link>.
        </p>
      </section>
    </div>
  );
}

function Card({ icon, title, children, tone }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone: "cyan" | "magenta" | "heat" | "compound" }) {
  const color = tone === "cyan" ? "var(--brand-cyan)" : tone === "magenta" ? "var(--brand-magenta)" : tone === "heat" ? "var(--risk-heat)" : "var(--risk-compound)";
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in oklch, ${color} 20%, transparent)`, color }}>
          {icon}
        </span>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider" style={{ color }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, target }: { label: string; target: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-[color:var(--risk-heat)]" dangerouslySetInnerHTML={{ __html: target }} />
    </div>
  );
}

function Equation({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-[color:var(--brand-cyan)]">{title}</div>
      {body}
    </div>
  );
}
