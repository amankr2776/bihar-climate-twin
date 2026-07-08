import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer · VARUNA" },
      { name: "description", content: "VARUNA is a decision-support digital twin. It does not replace India Meteorological Department, Central Water Commission, or State Emergency Operation Centre advisories." },
      { property: "og:title", content: "VARUNA disclaimer" },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/disclaimer" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/disclaimer" }],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <PageHeader title="Disclaimer" />

      <div className="rounded-xl border border-[color:var(--risk-compound)]/40 bg-[color:var(--risk-compound)]/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[color:var(--risk-compound)]" />
          <div>
            <h2 className="font-display text-base font-semibold text-[color:var(--risk-compound)]">
              Not an official warning authority
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              VARUNA is a research and decision-support digital twin. Outputs shown on this platform —
              forecasts, risk scores, alerts, what-if simulations — are model-derived estimates. They are
              <strong className="text-foreground"> not official meteorological or disaster warnings</strong>.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-5 space-y-4 rounded-xl border border-border bg-panel p-5 text-sm text-muted-foreground">
        <p>
          For authoritative advisories and warnings, always refer to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer" className="text-[color:var(--brand-cyan)] hover:underline">
              India Meteorological Department (IMD)
            </a> — official weather warnings
          </li>
          <li>
            <a href="https://cwc.gov.in/" target="_blank" rel="noreferrer" className="text-[color:var(--brand-cyan)] hover:underline">
              Central Water Commission (CWC)
            </a> — flood forecasting authority
          </li>
          <li>
            <a href="https://ndma.gov.in/" target="_blank" rel="noreferrer" className="text-[color:var(--brand-cyan)] hover:underline">
              National Disaster Management Authority (NDMA)
            </a> — CAP alerts and SOPs
          </li>
          <li>
            State and District Emergency Operation Centres (SEOC / DEOC)
          </li>
        </ul>
        <p>
          By using VARUNA, you accept that the developers, contributors, and hosts of this platform bear
          no liability for decisions taken on the basis of information shown here. Cross-verify with
          official sources before any operational action.
        </p>
        <p>
          For methodology and known limitations of the underlying PI-GNN model, see{" "}
          <Link to="/methodology" className="text-[color:var(--brand-cyan)] hover:underline">/methodology</Link>{" "}
          and <Link to="/validation" className="text-[color:var(--brand-cyan)] hover:underline">/validation</Link>.
        </p>
      </section>
    </div>
  );
}
