import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroVideo from "@/assets/landing-hero.mp4.asset.json";
import heroPoster from "@/assets/landing-poster.jpg";

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
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Nudge autoplay in strict browsers
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    return () => document.removeEventListener("visibilitychange", tryPlay);
  }, []);

  const enter = () => navigate({ to: authed ? "/dashboard" : "/auth" });

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Poster fallback (shows instantly, hides once video is playing) */}
      <img
        src={heroPoster}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        style={{ animation: "heroKenBurns 30s ease-in-out infinite alternate" }}
      />

      {/* Cinematic looping video background */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        src={heroVideo.url}
        poster={heroPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onLoadedData={() => setVideoReady(true)}
        aria-hidden="true"
      />

      {/* Cinematic vignette + tint */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/95" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,transparent_0%,rgba(0,0,0,0.75)_85%)]" />

      {/* Animated cyan/amber data-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.25) 1px, transparent 1px)",
          backgroundSize: "60px 60px, 60px 60px",
          animation: "heroGridDrift 25s linear infinite",
        }}
      />

      {/* Subtle scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,255,255,0.6) 0px, rgba(0,255,255,0.6) 1px, transparent 1px, transparent 4px)",
        }}
      />

      {/* Local keyframes */}
      <style>{`
        @keyframes heroKenBurns {
          0% { transform: scale(1.05) translate(0, 0); }
          100% { transform: scale(1.15) translate(-2%, -1%); }
        }
        @keyframes heroGridDrift {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 60px 60px, -60px 60px; }
        }
      `}</style>


      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] font-display text-xl font-black text-black shadow-lg shadow-cyan-500/30">
            V
          </div>
          <div className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] bg-clip-text text-transparent">
            VARUNA
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {authed ? (
            <Button onClick={enter} size="sm" className="bg-white text-black hover:bg-white/90">
              Dashboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Link
              to="/auth"
              className="text-sm text-white/80 transition hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero — minimal text */}
      <section className="relative z-10 mx-auto flex h-[calc(100vh-88px)] max-w-6xl flex-col items-start justify-center px-6 lg:px-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 backdrop-blur animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
          Live · Bihar climate digital twin
        </div>

        <h1
          className="font-display max-w-4xl text-6xl font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl md:text-8xl lg:text-9xl animate-fade-in"
          style={{ animationDuration: "900ms" }}
        >
          See the flood
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-white to-amber-300 bg-clip-text text-transparent">
            before it arrives.
          </span>
        </h1>

        <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          <Button
            onClick={enter}
            size="lg"
            className="group h-14 bg-white px-10 text-base font-semibold text-black hover:bg-white/90"
          >
            {authed ? "Enter" : "Get started"}
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </section>

      {/* Bottom footer strip */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/40 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white/50 backdrop-blur lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>IMD · MOSDAC · INSAT-3DR</span>
          <span className="hidden md:inline">Physics-informed GNN · 3h refresh</span>
          <span>v1.0</span>
        </div>
      </div>
    </div>
  );
}
