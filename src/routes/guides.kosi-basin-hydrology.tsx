import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, MapPin, Radar, ShieldAlert, Waves } from "lucide-react";

const SITE_URL = "https://varuna-digital-twin.lovable.app";
const PAGE_PATH = "/guides/kosi-basin-hydrology";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

const GUIDE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Kosi Basin Hydrology: Block-Level Flood Risk in Bihar",
  description:
    "Why the Kosi River causes 76% of Bihar's flood impact and how AI-powered block-level forecasting gives earlier warnings than district-level alerts.",
  author: {
    "@type": "Organization",
    name: "VARUNA",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "VARUNA",
    logo: `${SITE_URL}/og-varuna.jpg`,
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": PAGE_URL,
  },
  about: {
    "@type": "Thing",
    name: "Kosi River",
    description: "A transboundary river in Nepal and India known for catastrophic flooding in Bihar.",
  },
};

export const Route = createFileRoute("/guides/kosi-basin-hydrology")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kosi Basin Hydrology · Block-Level Flood Risk in Bihar · VARUNA" },
      {
        name: "description",
        content:
          "Why the Kosi River causes 76% of Bihar's flood impact and how VARUNA's AI block-level forecasting gives earlier warnings than district-level Bihar flood alerts.",
      },
      {
        property: "og:title",
        content: "Kosi Basin Hydrology · Block-Level Flood Risk in Bihar · VARUNA",
      },
      {
        property: "og:description",
        content:
          "Why the Kosi River causes 76% of Bihar's flood impact and how AI block-level forecasting gives earlier warnings than district-level alerts.",
      },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "article" },
      { property: "og:image", content: `${SITE_URL}/og-varuna.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "VARUNA Kosi Basin hydrology guide — block-level flood risk in Bihar.",
      },
      { name: "twitter:image", content: `${SITE_URL}/og-varuna.jpg` },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(GUIDE_STRUCTURED_DATA),
      },
    ],
  }),
  component: KosiBasinHydrologyGuide,
});

function KosiBasinHydrologyGuide() {
  return (
    <article className="mx-auto max-w-4xl p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--risk-flood)]/30 bg-[color:var(--risk-flood)]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[color:var(--risk-flood)]">
            <Waves className="h-3.5 w-3.5" />
            Basin Guide
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Kosi Basin Hydrology
            <span className="block text-[color:var(--brand-cyan)]">
              Block-Level Flood Risk in Bihar
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Why the Kosi River is Bihar's most destructive waterway, how its shifting course creates
            sudden risk, and why block-level AI forecasting matters for the 76% of flood-affected people
            who live in its shadow.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard icon={Droplets} value="76%" label="of Bihar's flood impact" />
          <StatCard icon={MapPin} value="534" label="blocks monitored" />
          <StatCard icon={Radar} value="3h" label="forecast update cycle" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-10 space-y-10"
      >
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            The Kosi: a river with a mind of its own
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            The Kosi drains the southern slopes of the Himalayas through Nepal before it enters Bihar
            near Bhimnagar. It carries an enormous sediment load — one of the highest in the world —
            because its steep upper course erodes young, fragile mountain rock. When the river slows on
            Bihar's flat plains, that sediment drops out, raising the river bed and pushing water into
            new channels. This is why the Kosi is often called the "Sorrow of Bihar": it does not just
            overflow; it can jump tens of kilometres in a single monsoon.
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            In 2008, a breach in the eastern Kosi embankment redirected the river eastward, inundating
            districts that had not seen major Kosi flooding in generations. Events like this show why
            static flood maps based on historical channels can fail: the risk moves faster than the map.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Why 76% of Bihar's flood impact is concentrated here
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Bihar's floodplain is one of the most exposed in South Asia, and the Kosi basin sits at the
            centre of that exposure. Three factors compound the damage:
          </p>
          <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
            <li>
              <strong className="text-foreground">High population density on the fan.</strong> The
              Kosi megafan is some of the most fertile land in Bihar, so millions of people live and
              farm directly on historically active channels.
            </li>
            <li>
              <strong className="text-foreground">Embankment confinement.</strong> Embankments
              protect large areas, but when they are overtopped or breached, water is trapped behind
              them and drains slowly, extending inundation.
            </li>
            <li>
              <strong className="text-foreground">Synchronised tributary flooding.</strong> The Kosi
              joins the Ganga, and heavy rain in Nepal, north Bihar and the Ganga catchment can peak
              at the same time, backing water up across multiple districts.
            </li>
          </ul>
          <p className="mt-4 leading-7 text-muted-foreground">
            Together, these forces mean that a Kosi event is rarely a single-point failure. It is a
            basin-wide cascade that affects blocks far from the main channel.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            District alerts are too coarse for the Kosi fan
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Traditional Bihar flood warnings are often issued at the district level. A district like
            Saharsa or Madhubani can span dozens of blocks with very different elevation, soil, drainage
            and distance from the Kosi. A district-wide "heavy rain" or "flood alert" tells an officer
            in one block almost nothing about what is happening in the next.
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            Block-level data changes that. Bihar is administratively divided into 534 blocks. Each
            block has distinct topography, land cover, population centres and road networks. By modelling
            rainfall, river level, soil moisture and elevation at block scale, it becomes possible to
            identify which panchayats will be cut off first, which evacuation routes are at risk, and
            where water is likely to pond even when the district average looks normal.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            How VARUNA's AI sees the basin earlier
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            VARUNA treats Bihar as a digital twin: a graph of 534 blocks connected by real hydrology —
            rivers, canals, terrain and soil. A physics-informed graph neural network (PI-GNN) rolls
            forecasts forward T+1 to T+8 steps, constrained by conservation of water and energy so the
            predictions stay physically plausible.
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            For the Kosi basin specifically, the model ingests IMD gauge and gridded rainfall, MOSDAC /
            INSAT satellite estimates, Bhuvan land-use data and IMDAA reanalysis. It updates every three
            hours during the monsoon. Because the graph structure encodes how water moves between
            neighbouring blocks, a heavy burst upstream can propagate through the model and raise risk
            scores downstream before gauges in the lower basin even register the rise.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-panel p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--risk-flood)]/10">
                <ShieldAlert className="h-5 w-5 text-[color:var(--risk-flood)]" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Earlier warning, smaller geography
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Block-level forecasting can flag rising flood risk 24–72 hours before district-level
                  thresholds are crossed. That extra time is what lets local teams pre-position boats,
                  open shelters and evacuate vulnerable pockets instead of reacting to already
                  submerged roads.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            What "kosi bihar" searchers should know
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            If you are searching for "kosi bihar" or "Bihar flood" because you live, farm or work in
            the basin, the key takeaway is that flood risk is local. The same rainfall event can be
            dangerous in one block and manageable in the next. Historical flood maps are useful, but
            they are not enough: the Kosi's channels move, embankments change pressure points, and
            land use shifts every season.
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            A live block-level forecast is the closest practical equivalent to a continuously updated
            risk map. It combines weather nowcasts, river state and terrain physics to show which blocks
            are likely to flood next — not just which districts are on alert.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Explore the data live
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            VARUNA's dashboard and map visualise Kosi basin risk at block level, updated on a 3-hour
            assimilation cycle. You can view current flood and compound-risk scores, run what-if
            rainfall scenarios, and generate decision reports for specific blocks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff6b3d] to-[#ff2d75] px-6 py-2.5 text-sm font-semibold text-background shadow transition hover:shadow-lg"
            >
              Open the Bihar Risk Map
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-panel/80"
            >
              View Dashboard
            </Link>
          </div>
        </section>
      </motion.div>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>
          Last updated July 2026. This guide is part of the VARUNA climate intelligence platform and is
          intended for disaster-management professionals, researchers, journalists and residents
          interested in Kosi basin flood risk.
        </p>
      </footer>
    </article>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Droplets;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <Icon className="h-6 w-6 text-[color:var(--brand-cyan)]" />
      <div className="mt-3 font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
