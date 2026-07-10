import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Waves, Brain, Satellite, Activity, ShieldCheck, Zap } from "lucide-react";
import heroImage from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "VARUNA · AI Digital Twin for Climate Resilience" },
      {
        name: "description",
        content:
          "A cinematic, real-time digital twin of Bihar's climate — physics-informed AI predicting floods, heat, and compound risk at block level.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const enter = () => navigate({ to: authed ? "/dashboard" : "/auth" });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Cinematic hero background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImage}
          alt="Cinematic aerial view of a flooded metropolis with digital twin overlays"
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_85%)]" />
        {/* Subtle animated scanlines */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,255,255,0.6) 0px, rgba(0,255,255,0.6) 1px, transparent 1px, transparent 4px)",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] font-display text-xl font-black text-background shadow-lg shadow-cyan-500/30">
            V
          </div>
          <div className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] bg-clip-text text-transparent">
            VARUNA
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {authed ? (
            <Button onClick={enter} size="sm" className="bg-white text-black hover:bg-white/90">
              Open dashboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-white/80 transition hover:text-white"
              >
                Sign in
              </Link>
              <Button
                onClick={() => navigate({ to: "/auth" })}
                size="sm"
                className="bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] text-background hover:opacity-90"
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col items-start justify-center px-6 py-16 lg:px-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          Live · Block-level climate telemetry across 38 districts
        </div>

        <h1 className="font-display max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white drop-shadow-2xl md:text-7xl lg:text-8xl">
          When the river rises,
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-white to-amber-300 bg-clip-text text-transparent">
            we see it first.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-white/70 md:text-xl">
          VARUNA is a physics-informed graph neural digital twin of Bihar's climate.
          Real satellite feeds, real rainfall grids, real decisions — rendered as a
          living map of flood, heat, and compound risk.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            onClick={enter}
            size="lg"
            className="group h-14 bg-white px-8 text-base font-semibold text-black hover:bg-white/90"
          >
            {authed ? "Enter the twin" : "Sign in to enter"}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Link
            to="/auth"
            className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            Create an account →
          </Link>
        </div>

        {/* Stat strip */}
        <div className="mt-16 grid w-full grid-cols-2 gap-4 border-t border-white/10 pt-8 md:grid-cols-4">
          {[
            { k: "4,636", v: "MOSDAC satellite obs" },
            { k: "0.25°", v: "IMD rainfall grid" },
            { k: "R² 0.97", v: "Flood model holdout" },
            { k: "3 h", v: "Refresh cadence" },
          ].map((s) => (
            <div key={s.v}>
              <div className="font-display text-3xl font-bold text-white md:text-4xl">{s.k}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-white/50">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative z-10 border-t border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-12">
          <h2 className="font-display max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
            A twin for the atmosphere, the river, and every block in between.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Satellite, title: "Live satellite feeds", body: "INSAT-3DR LST & IMC blended with IMD 0.25° gridded rainfall, refreshed every three hours." },
              { icon: Brain, title: "Physics-informed GNN", body: "A graph neural network constrained by hydrology and heat-balance physics — not just curve fitting." },
              { icon: Waves, title: "Compound risk", body: "Flood, drought and heat scored jointly for every district — the way disasters actually arrive." },
              { icon: Activity, title: "What-if simulator", body: "Push rainfall, temperature or discharge and watch the twin re-forecast in seconds." },
              { icon: ShieldCheck, title: "Decision-grade", body: "CAP-format alert export, provenance chips on every value, and validation against 2022–24 monsoon." },
              { icon: Zap, title: "3-hour cadence", body: "From MOSDAC ingestion to dashboard update in under 180 minutes — automated end-to-end." },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/[0.05]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 text-cyan-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-background to-black">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-12">
          <h2 className="font-display text-4xl font-black tracking-tight text-white md:text-6xl">
            Step into the digital twin.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Sign in with Google or email to access the live operational dashboard.
          </p>
          <div className="mt-10">
            <Button
              onClick={enter}
              size="lg"
              className="h-14 bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] px-10 text-base font-semibold text-background hover:opacity-90"
            >
              {authed ? "Open dashboard" : "Sign in to VARUNA"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
        <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/40 lg:px-12">
          VARUNA · Decision-support digital twin. Not an official warning authority — verify with IMD / CWC / SEOC.
        </footer>
      </section>
    </div>
  );
}
