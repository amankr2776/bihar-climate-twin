import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology · VARUNA" },
      { name: "description", content: "VARUNA methodology, model architecture, validation, and technical guides for Bihar climate risk." },
      { property: "og:title", content: "Methodology · VARUNA" },
      { property: "og:description", content: "VARUNA methodology, model architecture, validation, and technical guides for Bihar climate risk." },
      { property: "og:url", content: "https://varuna-digital-twin.lovable.app/methodology" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <Outlet />,
});
