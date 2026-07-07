import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ChevronRight } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Sidebar } from "@/components/varuna/Sidebar";
import { TopBar } from "@/components/varuna/TopBar";
import { useCurrentState } from "@/lib/varuna/useCurrentState";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again or go home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        name: "description",
        content:
          "Physics-informed GNN digital twin of Bihar's climate at block level — compound flood + heat risk, 3-hour update cycle, what-if simulator.",
      },
      { property: "og:title", content: "VARUNA · AI Digital Twin of Bihar's Climate" },
      {
        property: "og:description",
        content: "Live block-level climate digital twin for Bihar with compound-risk simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const BREADCRUMBS: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/map": "Bihar Map",
  "/compound": "Compound Risk",
  "/prediction": "Prediction Engine",
  "/simulator": "What-If Simulator",
  "/alerts": "Alerts",
  "/reports": "Decision Reports",
  "/settings": "Settings",
};

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RootInner />
      <Toaster position="bottom-right" theme="dark" richColors />
    </QueryClientProvider>
  );
}

function RootInner() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: state } = useCurrentState();

  const districts = state?.districts ?? [];
  const lastUpdate = state
    ? new Date(state.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " IST"
    : "—";
  const label = BREADCRUMBS[pathname] ?? "Dashboard";

  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar districts={districts} onSelectDistrict={() => {}} busy={!state} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar lastUpdate={lastUpdate} />
        <div className="flex items-center gap-1.5 border-b border-border bg-panel/50 px-4 py-1.5 text-[11px] text-muted-foreground lg:px-6">
          <Link to="/" className="hover:text-foreground">
            VARUNA
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{label}</span>
        </div>
        <main className="flex-1 overflow-y-auto bg-grid">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

