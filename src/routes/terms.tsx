import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · VARUNA" },
      { name: "description", content: "Terms of service for using the VARUNA climate digital-twin platform." },
      { property: "og:title", content: "VARUNA terms of service" },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <PageHeader title="Terms of Service" />
      <article className="rounded-xl border border-border bg-panel p-6 text-sm text-muted-foreground">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Last updated: 8 July 2026</p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">1. Acceptance</h2>
        <p>
          By accessing VARUNA, you agree to be bound by these Terms. If you do not agree, do not use the
          platform.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">2. Nature of the service</h2>
        <p>
          VARUNA is a decision-support digital twin. It provides model-derived forecasts, risk scores, and
          simulations for climate hazards. It is <strong className="text-foreground">not</strong> an official
          warning authority. See our{" "}
          <Link to="/disclaimer" className="text-[color:var(--brand-cyan)] hover:underline">Disclaimer</Link>.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">3. Acceptable use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Do not attempt to disrupt, reverse-engineer, or overload the platform.</li>
          <li>Do not scrape data at rates exceeding published API limits.</li>
          <li>Do not misrepresent VARUNA outputs as official government advisories.</li>
        </ul>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">4. Attribution</h2>
        <p>
          When citing VARUNA outputs in research or media, credit the underlying data providers listed on
          our <Link to="/data-sources" className="text-[color:var(--brand-cyan)] hover:underline">Data Sources</Link>{" "}
          page (IMD, ISRO, Bhuvan, IMDAA/NCMRWF).
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">5. Limitation of liability</h2>
        <p>
          VARUNA is provided on an "as is" basis without warranties of any kind. The developers, hosts,
          and contributors bear no liability for decisions made on the basis of information shown here.
          Cross-verify all outputs with authoritative sources before operational action.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">6. Changes</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes acceptance. Material changes
          will be surfaced in-product.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">7. Governing law</h2>
        <p>
          These Terms are governed by the laws of India. Disputes fall under the exclusive jurisdiction of
          courts in Bengaluru, Karnataka.
        </p>
      </article>
    </div>
  );
}
