import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/attributions")({
  head: () => ({
    meta: [
      { title: "Attributions · VARUNA" },
      { name: "description", content: "Data, software, and design credits for the VARUNA climate digital twin." },
      { property: "og:title", content: "VARUNA attributions" },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/attributions" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/attributions" }],
  }),
  component: AttributionsPage,
});

const CREDITS = [
  {
    category: "Data",
    items: [
      { name: "India Meteorological Department", detail: "Gridded rainfall (0.25°) and temperature (1.0°)", url: "https://www.imdpune.gov.in/" },
      { name: "ISRO / MOSDAC", detail: "INSAT-3D/3DR LST, SST, IMC products", url: "https://www.mosdac.gov.in/" },
      { name: "NRSC Bhuvan", detail: "Administrative boundary vector data", url: "https://bhuvan-app1.nrsc.gov.in/" },
      { name: "NCMRWF IMDAA", detail: "Indian regional reanalysis", url: "https://rds.ncmrwf.gov.in/" },
      { name: "ECMWF ERA5", detail: "Global reanalysis for bias correction", url: "https://cds.climate.copernicus.eu/" },
    ],
  },
  {
    category: "Open-source software",
    items: [
      { name: "PyTorch", detail: "Deep learning framework", url: "https://pytorch.org/" },
      { name: "PyTorch Geometric", detail: "Graph neural network library", url: "https://pyg.org/" },
      { name: "Xarray + Dask", detail: "N-dimensional data + parallel compute", url: "https://xarray.dev/" },
      { name: "GDAL / Rasterio", detail: "Geospatial data processing", url: "https://gdal.org/" },
      { name: "PostGIS", detail: "Spatial database extension", url: "https://postgis.net/" },
      { name: "React", detail: "UI library", url: "https://react.dev/" },
      { name: "TanStack Start / Router / Query", detail: "Full-stack React framework", url: "https://tanstack.com/" },
      { name: "Recharts", detail: "Chart primitives", url: "https://recharts.org/" },
      { name: "Tailwind CSS", detail: "Utility-first styling", url: "https://tailwindcss.com/" },
      { name: "shadcn/ui + Radix UI", detail: "Accessible UI primitives", url: "https://ui.shadcn.com/" },
      { name: "Lucide", detail: "Icon set", url: "https://lucide.dev/" },
    ],
  },
];

function AttributionsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6">
      <PageHeader
        title="Attributions"
        help={{
          title: "Credits",
          description: "VARUNA stands on the shoulders of open Indian data programmes and the open-source community. We list every dataset and library that made this platform possible.",
        }}
      />

      {CREDITS.map((section) => (
        <section key={section.category} className="mb-6 rounded-xl border border-border bg-panel p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-[color:var(--brand-cyan)]">
            {section.category}
          </h2>
          <ul className="mt-3 divide-y divide-border/60">
            {section.items.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.detail}</div>
                </div>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-[color:var(--brand-cyan)] hover:underline">
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[11px] text-muted-foreground">
        See <Link to="/data-sources" className="text-[color:var(--brand-cyan)] hover:underline">/data-sources</Link>{" "}
        for detailed dataset provenance, licensing, and cadence.
      </p>
    </div>
  );
}
