import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Layers, Zap, Droplets, Activity, ShieldAlert } from "lucide-react";
import HeroStatic from "@/components/varuna/HeroStatic";
import { useLowPower } from "@/lib/varuna/useLowPower";

// Lazy so the ~500KB three.js/drei bundle only loads on capable devices.
const HeroScene = lazy(() => import("@/components/varuna/HeroScene"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        name: "description",
        content:
          "VARUNA — AI digital twin of Bihar's climate. Live block-level flood and heat risk, updated every three hours.",
      },
      { property: "og:title", content: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        property: "og:description",
        content:
          "VARUNA — AI digital twin of Bihar's climate. Live block-level flood and heat risk, updated every three hours.",
      },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/" }],
  }),
  component: Landing,
});

function HeroBackdrop() {
  const lowPower = useLowPower();
  if (lowPower) return <HeroStatic />;
  return (
    <Suspense fallback={<HeroStatic />}>
      <HeroScene />
    </Suspense>
  );
}

// -------------- UI --------------


function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050914] text-foreground">
      {/* radial vignette + noise */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,9,20,0.85)_75%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-12">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[#ff6b3d] to-[#ff2d75] font-display text-lg font-black text-background shadow-[0_0_24px_rgba(255,107,61,0.5)]">
            V
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-[#ffb684] via-[#ff6b3d] to-[#ff2d75] bg-clip-text text-transparent">
              VARUNA
            </div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-white/50">
              Bihar Climate Digital Twin
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#capabilities" className="hover:text-white">Capabilities</a>
          <a href="#pipeline" className="hover:text-white">Pipeline</a>
          <a href="#impact" className="hover:text-white">Impact</a>
        </nav>
        <Link
          to="/dashboard"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-[#ff6b3d]/70 hover:bg-[#ff6b3d]/10"
        >
          Open Dashboard
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 h-[92vh]">
          <HeroBackdrop />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-white/70 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6b3d]" />
            Live · v0.1 PoC · 3-Hour Assimilation Cycle
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[13vw] leading-[0.9] font-black tracking-tight sm:text-[110px] lg:text-[160px]"
          >
            <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
              VAR
            </span>
            <span className="bg-gradient-to-b from-[#ffb684] via-[#ff6b3d] to-[#ff2d75] bg-clip-text text-transparent">
              UNA
            </span>
            <span className="mt-4 block font-display text-lg font-medium leading-normal tracking-normal text-white/80 sm:text-xl lg:text-2xl">
              — AI Digital Twin of Bihar's Climate
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-2xl text-balance text-base text-white/70 sm:text-lg"
          >
            An AI digital twin of Bihar's climate. Physics-informed graph neural forecasting across
            <span className="text-white"> 38 districts · 534 blocks</span> — mapping compound flood
            and heat risk before it becomes disaster.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff6b3d] to-[#ff2d75] px-7 py-3 text-sm font-semibold text-background shadow-[0_10px_40px_-8px_rgba(255,107,61,0.6)] transition hover:shadow-[0_14px_50px_-6px_rgba(255,45,117,0.7)]"
            >
              Enter Mission Control
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white/85 backdrop-blur transition hover:bg-white/10"
            >
              Explore the Live Map
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9 }}
            className="mt-16 grid w-full max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-4 backdrop-blur"
          >
            <StatChip value="38" label="Districts" />
            <StatChip value="534" label="Blocks" />
            <StatChip value="3h" label="Update Cycle" />
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative z-10 border-t border-white/5 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Capabilities"
            title="Six systems working as one climate mind."
            desc="Every layer of VARUNA is built to move from raw satellite pixels to on-the-ground evacuation orders in minutes, not days."
          />
          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CAPS.map((c, i) => (
              <FeatureCard key={c.title} {...c} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="relative z-10 border-t border-white/5 bg-gradient-to-b from-transparent via-[#08122a] to-transparent px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Pipeline"
            title="Satellite pixels → decisions in four steps."
            desc="A physics-guided graph neural network keeps every forecast anchored to real hydrology, not just statistical patterns."
          />
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <div className="font-mono text-[11px] text-[#ff6b3d]">STEP {String(i + 1).padStart(2, "0")}</div>
                <div className="mt-2 font-display text-xl font-bold text-white">{p.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="relative z-10 border-t border-white/5 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Impact"
            title="Built for the state, tuned for the block."
            desc="Bihar sees a compound flood-and-heat cascade almost every monsoon. VARUNA is designed for the officers who have to act on it at 3am."
          />
          <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {IMPACT.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <div className="font-display text-4xl font-black bg-gradient-to-b from-[#ffb684] to-[#ff2d75] bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-medium text-white">{s.label}</div>
                <div className="mt-1 text-xs text-white/50">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/5 px-6 py-28 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
          >
            The next monsoon is already
            <span className="block bg-gradient-to-r from-[#ffb684] via-[#ff6b3d] to-[#ff2d75] bg-clip-text text-transparent">
              being modelled.
            </span>
          </motion.h2>
          <p className="mt-6 text-white/60">
            Step into the mission control view and watch Bihar's climate as one living system.
          </p>
          <Link
            to="/dashboard"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff6b3d] to-[#ff2d75] px-8 py-3.5 text-sm font-semibold text-background shadow-[0_10px_50px_-6px_rgba(255,45,117,0.55)] transition hover:shadow-[0_14px_60px_-4px_rgba(255,45,117,0.75)]"
          >
            Enter VARUNA
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-[11px] text-white/40 lg:px-12">
        VARUNA · Physics-Informed Graph Neural Digital Twin ·{" "}
        <span className="font-mono">v0.1 PoC</span>
      </footer>
    </div>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 text-center">
      <div className="font-display text-3xl font-black text-white sm:text-4xl">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/50">{label}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#ff8a3d]"
      >
        <span className="h-1 w-1 rounded-full bg-[#ff6b3d]" />
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-4 text-base text-white/60"
      >
        {desc}
      </motion.p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
  delay,
}: {
  icon: typeof Cpu;
  title: string;
  desc: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-white/25"
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-3xl transition group-hover:opacity-60"
        style={{ background: accent }}
      />
      <div
        className="grid h-11 w-11 place-items-center rounded-xl"
        style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="mt-5 font-display text-lg font-bold text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{desc}</p>
    </motion.div>
  );
}

const CAPS = [
  {
    icon: Layers,
    title: "Compound Risk Fusion",
    desc: "Flood and heat modelled together, not in silos — surfacing the cascade months that break districts.",
    accent: "rgba(255,45,117,0.55)",
  },
  {
    icon: Cpu,
    title: "Physics-Informed GNN",
    desc: "Graph neural network anchored to hydrological conservation laws so forecasts stay physically plausible.",
    accent: "rgba(79,139,255,0.55)",
  },
  {
    icon: Activity,
    title: "Iterative T+1 → T+8 Forecast",
    desc: "Rolling multi-step prediction with drift monitoring across 534 blocks, updated every three hours.",
    accent: "rgba(255,138,61,0.55)",
  },
  {
    icon: Zap,
    title: "What-If Simulator",
    desc: "Perturb rainfall, temperature, soil state — see risk propagate through the graph before you commit resources.",
    accent: "rgba(255,107,61,0.55)",
  },
  {
    icon: ShieldAlert,
    title: "Operational Alerts",
    desc: "Threshold-driven flood, drought and compound alerts with acknowledgement, escalation and audit trail.",
    accent: "rgba(255,45,117,0.55)",
  },
  {
    icon: Droplets,
    title: "Kosi Basin Watch",
    desc: "Special-cased hydrology for the Kosi — where 76% of Bihar's flood-affected population lives.",
    accent: "rgba(79,139,255,0.55)",
  },
];

const PIPELINE = [
  { title: "Ingest", desc: "IMD gauges, MOSDAC / INSAT, Bhuvan LULC, IMDAA reanalysis — assimilated on a 3-hour cycle." },
  { title: "Encode", desc: "Blocks and their hydrologic neighbours form a graph; features embed elevation, soil, land use, gauges." },
  { title: "Forecast", desc: "PI-GNN rolls T+1 to T+8 forecasts under conservation constraints for water and energy balance." },
  { title: "Decide", desc: "Compound risk scores drive alerts, recommendations and one-click decision reports." },
];

const IMPACT = [
  { value: "76%", label: "of Bihar's flood-affected population", desc: "Concentrated in the Kosi basin — VARUNA's primary focus." },
  { value: "3h", label: "assimilation cycle", desc: "From satellite pixel to district risk score." },
  { value: "T+8", label: "rolling horizon", desc: "Multi-step forecast, physically constrained." },
  { value: "534", label: "blocks tracked", desc: "Every administrative block, every three hours." },
];
