/**
 * Static, GPU-free fallback for the cinematic 3D hero.
 * Uses pure CSS radial gradients + a slow ring pulse (~1 keyframe animation).
 * Respects prefers-reduced-motion via CSS media query automatically.
 */
export default function HeroStatic() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* deep space base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, #0a1a35 0%, #060d1e 45%, #030612 100%)",
        }}
      />
      {/* faint starfield */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 75% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 85% 80%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 15% 85%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 60% 45%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 90% 50%, rgba(255,255,255,0.5), transparent)",
        }}
      />
      {/* orange atmosphere glow */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          width: "min(80vmin, 720px)",
          height: "min(80vmin, 720px)",
          background:
            "radial-gradient(circle, rgba(255,107,61,0.35) 0%, rgba(255,45,117,0.18) 40%, transparent 70%)",
        }}
      />
      {/* the "planet" */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "min(48vmin, 420px)",
          height: "min(48vmin, 420px)",
          background:
            "radial-gradient(circle at 35% 30%, #2b4a7a 0%, #12213f 40%, #050b18 85%)",
          boxShadow:
            "inset -30px -40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(79,139,255,0.25), 0 0 120px rgba(255,107,61,0.15)",
        }}
      />
      {/* wireframe overlay via conic gradient meridians */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 motion-safe:animate-[spin_60s_linear_infinite]"
        style={{
          width: "min(48vmin, 420px)",
          height: "min(48vmin, 420px)",
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(255,138,61,0.35) 2deg, transparent 4deg, transparent 45deg, rgba(255,138,61,0.35) 47deg, transparent 49deg, transparent 90deg, rgba(255,138,61,0.35) 92deg, transparent 94deg, transparent 135deg, rgba(255,138,61,0.35) 137deg, transparent 139deg, transparent 180deg, rgba(255,138,61,0.35) 182deg, transparent 184deg, transparent 225deg, rgba(255,138,61,0.35) 227deg, transparent 229deg, transparent 270deg, rgba(255,138,61,0.35) 272deg, transparent 274deg, transparent 315deg, rgba(255,138,61,0.35) 317deg, transparent 319deg)",
          maskImage: "radial-gradient(circle, black 55%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 70%)",
        }}
      />
      {/* orbital rings */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-[#ff6b3d]/40"
        style={{
          width: "min(72vmin, 640px)",
          height: "min(72vmin, 640px)",
          transform: "translate(-50%, -50%) rotate(-18deg)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full border border-[#4f8bff]/30"
        style={{
          width: "min(84vmin, 760px)",
          height: "min(84vmin, 760px)",
          transform: "translate(-50%, -50%) rotate(24deg) scaleY(0.94)",
        }}
      />
    </div>
  );
}
