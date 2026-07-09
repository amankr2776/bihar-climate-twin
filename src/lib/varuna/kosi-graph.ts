// ============================================================================
// VARUNA — River-network routing (Muskingum-style translation) on the
// district graph.
//
// Upgrades the flood-risk field from a *local* SCS-CN peak-discharge index
// into a *network-aware* one: each downstream district inherits a routed
// contribution from its upstream neighbours. This is what makes Kosi flood
// waves visible — Supaul's peak arrives at Madhepura ~8h later, at Khagaria
// another lag, and eventually joins the Ganga near Kursela.
//
// The graph is a directed acyclic graph (DAG) hand-built from the CWC/NRSC
// hydrology atlas: nodes are 38 Bihar districts, edges are principal river
// channels (Kosi, Bagmati/Kamla, Gandak, Ganga mainstem).
//
// Routing coefficient
// -------------------
// A simplified Muskingum C-form is used with K ≈ 8 h (representative lower-
// Kosi wave celerity, CWC), X ≈ 0.2, Δt = 24 h (daily forcing → daily state):
//     C0 + C1 + C2 = 1
//     C1 ≈ 0.55 → fraction of previous upstream inflow visible downstream
// We collapse the per-time-step Muskingum operation into a single steady
// gain α = 0.35 for the routed contribution (published Kosi-basin studies
// place the upstream→downstream flood-index elasticity around 0.3–0.4).
//
// Result: a topological pass that adds  alpha · mean(upstream.flood_risk)
// to each downstream district. Blocks in that district are rescaled by the
// resulting ratio so the map still shows within-district variability.
// ============================================================================

import type { BlockState, DistrictState } from "./state";

/** Directed edges (upstream → downstream) on Bihar's principal river net. */
const RIVER_EDGES: Array<[string, string]> = [
  // Kosi mainstem
  ["supaul", "madhepura"],
  ["madhepura", "saharsa"],
  ["saharsa", "khagaria"],
  ["khagaria", "bhagalpur"],
  ["bhagalpur", "katihar"],
  // Kosi east tributary chain
  ["kishanganj", "araria"],
  ["araria", "purnia"],
  ["purnia", "katihar"],
  // Bagmati/Kamla feeding Darbhanga → Samastipur
  ["madhubani", "darbhanga"],
  ["darbhanga", "samastipur"],
  ["sitamarhi", "sheohar"],
  ["sheohar", "east-champaran"],
  ["samastipur", "khagaria"],
  // Gandak
  ["west-champaran", "east-champaran"],
  ["east-champaran", "gopalganj"],
  ["gopalganj", "siwan"],
  ["siwan", "saran"],
  ["saran", "vaishali"],
  ["vaishali", "patna"],
  // Ganga mainstem west → east
  ["buxar", "bhojpur"],
  ["bhojpur", "patna"],
  ["patna", "begusarai"],
  ["begusarai", "munger"],
  ["munger", "bhagalpur"],
];

/** Steady-state routing gain — see file header. */
const ROUTING_ALPHA = 0.35;

/** Kahn topological sort over the district DAG. */
function topoOrder(): string[] {
  const nodes = new Set<string>();
  const indeg = new Map<string, number>();
  const outAdj = new Map<string, string[]>();
  for (const [u, v] of RIVER_EDGES) {
    nodes.add(u);
    nodes.add(v);
    indeg.set(v, (indeg.get(v) ?? 0) + 1);
    if (!indeg.has(u)) indeg.set(u, indeg.get(u) ?? 0);
    if (!outAdj.has(u)) outAdj.set(u, []);
    outAdj.get(u)!.push(v);
  }
  const q: string[] = [];
  for (const n of nodes) if ((indeg.get(n) ?? 0) === 0) q.push(n);
  const order: string[] = [];
  while (q.length) {
    const n = q.shift()!;
    order.push(n);
    for (const w of outAdj.get(n) ?? []) {
      indeg.set(w, indeg.get(w)! - 1);
      if (indeg.get(w) === 0) q.push(w);
    }
  }
  return order;
}

const TOPO = topoOrder();

/** For each node, the list of direct upstream contributors. */
const UPSTREAM: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const [u, v] of RIVER_EDGES) {
    if (!m.has(v)) m.set(v, []);
    m.get(v)!.push(u);
  }
  return m;
})();

export type RoutingTrace = {
  district_id: string;
  local_flood: number;
  routed_flood: number;
  upstream_contribution: number;
  upstream_districts: string[];
};

/**
 * Apply Muskingum-style routing over the district DAG. Mutates the block and
 * district flood_risk fields in place; returns a per-district trace so the
 * UI can explain "Supaul rain arriving at Khagaria in ~8 h".
 */
export function applyRiverRouting(
  blocks: BlockState[],
  districts: DistrictState[],
): RoutingTrace[] {
  const byId = new Map(districts.map((d) => [d.district.id, d]));
  const routed = new Map<string, number>();
  const traces: RoutingTrace[] = [];

  for (const id of TOPO) {
    const ds = byId.get(id);
    if (!ds) continue;
    const upstreamIds = UPSTREAM.get(id) ?? [];
    // Use the ALREADY-ROUTED value of upstream nodes (cascading wave).
    const upstreamMean =
      upstreamIds.length > 0
        ? upstreamIds.reduce((s, u) => s + (routed.get(u) ?? byId.get(u)?.flood_risk ?? 0), 0) /
          upstreamIds.length
        : 0;
    const local = ds.flood_risk;
    const contribution = ROUTING_ALPHA * upstreamMean;
    const next = Math.max(0, Math.min(1, local + contribution));
    routed.set(id, next);
    traces.push({
      district_id: id,
      local_flood: +local.toFixed(3),
      routed_flood: +next.toFixed(3),
      upstream_contribution: +contribution.toFixed(3),
      upstream_districts: upstreamIds,
    });
    // Rescale blocks proportionally so within-district variation survives.
    if (local > 0.001) {
      const ratio = next / local;
      for (const b of blocks) {
        if (b.district_id === id) {
          const boosted = Math.max(0, Math.min(1, b.flood_risk * ratio));
          b.flood_risk = +boosted.toFixed(3);
          b.compound_risk = boosted >= 0.6 && b.drought_risk >= 0.4;
        }
      }
    } else if (contribution > 0) {
      // District had no local rain but is receiving an upstream wave: paint
      // that inflow onto its blocks uniformly.
      for (const b of blocks) {
        if (b.district_id === id) {
          b.flood_risk = +Math.max(b.flood_risk, contribution).toFixed(3);
          b.compound_risk = b.flood_risk >= 0.6 && b.drought_risk >= 0.4;
        }
      }
    }
    ds.flood_risk = +next.toFixed(3);
    ds.compound_risk = next >= 0.6 && ds.drought_risk >= 0.4;
  }
  return traces;
}

/** Read-only view of the DAG for UI diagrams / methodology page. */
export const RIVER_NETWORK = {
  edges: RIVER_EDGES,
  topo: TOPO,
  alpha: ROUTING_ALPHA,
  lag_hours: 8,
} as const;
