import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/varuna/HelpModal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · VARUNA" },
      { name: "description", content: "How VARUNA collects, uses, and protects personal information under the Digital Personal Data Protection Act, 2023." },
      { property: "og:title", content: "VARUNA privacy policy" },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://varuna-digital-twin.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <PageHeader title="Privacy Policy" />
      <article className="prose prose-invert max-w-none rounded-xl border border-border bg-panel p-6 text-sm text-muted-foreground">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Last updated: 8 July 2026</p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">1. Scope</h2>
        <p>
          This policy describes how VARUNA ("we", "the platform") collects, processes, and stores personal
          data in compliance with India's Digital Personal Data Protection Act, 2023 (DPDP Act).
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">2. Data we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account email address (when you sign in)</li>
          <li>Alert subscription preferences (districts / blocks you follow)</li>
          <li>Aggregated, anonymised usage analytics (page views, feature usage)</li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> collect precise location, device identifiers,
          contacts, SMS content, or any biometric information.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">3. Data we do not collect</h2>
        <p>
          Climate observations, satellite imagery, and forecast data are keyed by administrative geography
          (district / block), not by user. No personal telemetry is joined with hazard data.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">4. How we use your data</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Authenticate your account</li>
          <li>Deliver alerts for the districts you have subscribed to</li>
          <li>Improve product quality via anonymised aggregate analytics</li>
        </ul>
        <p>We never sell personal data. We never share it with advertisers.</p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">5. Retention</h2>
        <p>
          Personal data is retained while your account is active. On account deletion, personal data is
          purged within 30 days. Anonymised aggregates may be retained indefinitely for model research.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">6. Your rights under the DPDP Act</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access — request a copy of the personal data we hold about you</li>
          <li>Correction — request corrections to inaccurate data</li>
          <li>Erasure — request deletion of your data</li>
          <li>Grievance — file a grievance with our Data Protection Officer</li>
        </ul>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">7. Data location</h2>
        <p>
          VARUNA infrastructure is cloud-agnostic and can be deployed on Indian government cloud
          (MeghRaj / NIC). Personal data is stored in Indian data-centre regions.
        </p>

        <h2 className="mt-4 font-display text-base font-semibold text-foreground">8. Contact</h2>
        <p>
          For any privacy request, email <span className="text-foreground">privacy@varuna.example</span>. See
          also our <Link to="/terms" className="text-[color:var(--brand-cyan)] hover:underline">Terms</Link>{" "}
          and <Link to="/disclaimer" className="text-[color:var(--brand-cyan)] hover:underline">Disclaimer</Link>.
        </p>
      </article>
    </div>
  );
}
