## VARUNA — 6 Full Pages + Settings Build Plan

Build out the six pages plus Settings as separate routes, wired into the existing sidebar. Reuse the existing dark navy / orange tokens, TopBar, and Sidebar. All state stays client-side (Zustand-style store) so cross-page selections persist.

### Routing & shell

- Convert current single-page dashboard into a route: `src/routes/index.tsx` stays as Dashboard.
- Add routes:
  - `src/routes/map.tsx` — Bihar Map
  - `src/routes/compound.tsx` — Compound Risk
  - `src/routes/prediction.tsx` — Prediction Engine
  - `src/routes/simulator.tsx` — What-If Simulator
  - `src/routes/alerts.tsx` — Alerts
  - `src/routes/reports.tsx` — Decision Reports
  - `src/routes/settings.tsx` — Settings
- Update `__root.tsx` layout: persistent `Sidebar` + `TopBar` + breadcrumb bar + `<Outlet />`.
- `Sidebar.tsx`: replace static buttons with `<Link>` from `@tanstack/react-router`, `activeProps` for orange left-border highlight, using `useRouterState` for active detection.
- Add breadcrumb strip below header ("VARUNA → {page name}").
- Add persistent Toaster (sonner already available).
- Add cross-page state store `src/lib/varuna/store.ts` (lightweight useSyncExternalStore-based) holding: `selectedDistrict`, `selectedBlock`, `savedScenarios`, `alertConfig`, `acknowledgedAlerts`, `savedReports`.

### Shared components

- `src/components/varuna/PageHeader.tsx` — title + Help button that opens `HelpModal`.
- `src/components/varuna/HelpModal.tsx` — reusable shadcn Dialog with per-page copy.
- `src/components/varuna/Modal.tsx` — thin wrapper (dark overlay, close on outside click, X button) using shadcn Dialog.

### Page 1 — Bihar Map (`/map`)

- Left 280px collapsible control panel + full-bleed `BiharMap`.
- `MapLayers` section: 10 toggle switches driving map fill/overlays. Layer state lives in local component state; passed to a new `BiharMapExpanded` variant that swaps choropleth palette per active layer priority order.
- `FilterByRisk`: 4 checkboxes; unchecked categories rendered gray in geoJSON style.
- Compare mode: toggle splits into two `<BiharMapExpanded>` instances side-by-side; right pane uses a synthetic historical snapshot derived from `api.getHistoricalState(date)` (add helper).
- Export buttons: PNG via `html-to-image` (already used? if not, use `leaflet-image` alt: `dom-to-image-more`; simplest — use `html2canvas` via dynamic import). GeoJSON export: download current filtered features. Generate Report: open modal that navigates to `/reports` with prefilled state.
- Search box on map: fuzzy-match districts/blocks and `flyTo`.
- Scale bar (`L.control.scale`) and simple SVG north arrow overlay.
- Block popup: values + 7-day sparkline (recharts) + "View Full History" opens modal with 30-day 6-feature line chart grid.

### Page 2 — Compound Risk (`/compound`)

- Orange gradient banner + 3 metric boxes computed from state.
- Left: specialized compound map (custom style function on existing GeoJSON layer — blue hatch / orange hatch / pulsing red fill via SVG pattern defs injected into leaflet pane). Timeline slider (past 30 synthetic days) drives historical state.
- Right: recharts `ScatterChart` of 534 blocks with dashed reference box in upper-right (ReferenceArea), tooltip, click → highlights on map (via store).
- Active events list — expandable rows.
- Historical catalog table — sortable columns, search, pagination (10 rows/page).

### Page 3 — Prediction Engine (`/prediction`)

- Top 4 status cards (Model Status, Forecast Horizon, Validation Score with progress ring, Baseline Comparison).
- Middle left: forecast map with current/T+1 toggle + rainfall/temp toggle + T+1/2/4/8 rollout buttons. Iterative predictions synthesized via existing `api` helpers extended with `getForecast(step)`.
- Middle right: block prediction explorer — search, 6 feature cards (current vs T+1), 24-h forecast recharts line + shaded ConfidenceArea, Physics Constraint Status panel.
- Bottom: 3 recharts panels — pred vs obs scatter with 45° reference line + R², CSI 30-day line with target dashed, RMSE line with persistence baseline.
- Model Notes text block (matches deck footnote).

### Page 4 — What-If Simulator (`/simulator`)

- 3-column layout.
- Left: name input, 3 sliders (rainfall/temp/humidity anomaly) with orange chip readouts and tick marks (custom range styling), soil / antecedent rainfall / season dropdowns, district multi-select (checkbox list w/ Select All / Clear All), cascade depth button group, Run button (2-sec progress), Save Scenario.
- Center: placeholder when idle; on run — scenario summary, 2×2 result cards, projected risk map, cascade timeline strip (8 thumb maps), impact breakdown sortable table with CSV export, AI recommendations list. Simulation results derived from anomaly deltas applied to current state.
- Right: saved scenarios list (from store) with load/delete icons; compare panel with up-to-3 checkbox selection and side-by-side comparison table.

### Page 5 — Alerts (`/alerts`)

- 4 metric header cards.
- Left: active alerts list — filter dropdown + search + sort toggles (Severity/Time/District), alert cards with Acknowledge / Escalate / Dismiss actions, escalate opens modal with notes textarea. New alert every 45s via `setInterval` (yellow flash class + auto-remove after animation).
- Right top: Notification Settings toggles + Threshold sliders + Save (toast). Persist in store.
- Right bottom: Alert History table — date range picker (shadcn), 15 rows, pagination, Export CSV button.

### Page 6 — Decision Reports (`/reports`)

- Left: Generate form (report type, date range, districts multi-select, format, notes) + Generate button (2s loader, toast). Templates cards (4) with "Use Template" prefill.
- Main: When generated → styled white-background report preview embedding relevant charts/tables per type; action buttons Download PDF (jsPDF), Share Link (clipboard + toast), Print (`window.print()` on a print-only wrapper). Default state → Saved Reports grid with 8 seeded cards, search + type filter, per-card View/Download/Delete, bulk select + Delete Selected.

### Settings (`/settings`)

- 2-column: category menu + form panel.
- Data Sources: IMD/MOSDAC/IMDAA/Bhuvan status badges + last sync + Sync Now (toast).
- Display Preferences: unit toggle, refresh interval select, default map layer select.
- Alert Configuration: mirror alerts thresholds.
- User Profile: name / role / org fields + Save Profile.
- API Configuration: readonly keys + regenerate (toast).
- System Status: uptime, last inference, DB status, next-run times.

### Technical

- New deps: `jspdf` (PDF), `html2canvas` (PNG export). Install via `bun add`.
- Extend `src/lib/varuna/api.ts` with `getHistoricalState(dateOffsetDays)`, `getForecast(step)`, `getHistoricalCompoundEvents()`, `getValidationSeries()`.
- Extend `src/lib/varuna/state.ts` with any missing helpers (feature vectors for prediction cards).
- All modals via shadcn `Dialog` (already installed under `components/ui`).
- All toasts via `sonner`.
- Ensure every route file has a `head()` block with page-specific title/description; add `<Outlet />` in `__root.tsx`.

### Out of scope

- Real backend integration beyond existing synthetic `api.ts` helpers.
- Actual multi-user auth for User Profile.
- Real WebSocket alerts (simulated via interval).
