---
phase: 2
slug: canonical-sovereignty-evaluation-ux-diagnostics
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-30
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the sovereignty diagnostics surfaces of this phase: entity detail
> dialogs (SUX-01/SUX-02) and diagram markers (SUX-03/SUX-04). This phase is **read-only rendering** of a
> backend-computed canonical DTO — no new forms, no new CRUD screens, no dashboard (D-10). Scope excludes
> the existing `sovereigntyReq*`/`sovereigntyAch*` **input** fields (`SovereigntyFields.ts` building
> `buildSovereigntyRequirementFields`/`buildSovereigntyAchievedFields`), which remain unchanged data-entry
> controls; this contract governs only the **diagnostic display** replacing client-computed
> inherited/aggregated scores.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none — Material UI 7 is the mandated, pre-existing design system** (`.github/instructions/nextgen-eam.instructions.md`); no `components.json` found and shadcn/Tailwind would conflict with the project's locked MUI 7 + Emotion stack. The shadcn init gate is intentionally **not** triggered — offering shadcn here would contradict project conventions. |
| Preset | not applicable |
| Component library | Material UI 7 (`@mui/material`), MUI System `sx` prop |
| Icon library | `@mui/icons-material` ^7.0.0 (already a dependency) — new icons needed: `CheckCircle` (GREEN empty state), `HelpOutline`/`RadioButtonUnchecked` (GREY empty state), `ErrorOutline` (RED finding row), `WarningAmberOutlined` (YELLOW finding row) |
| Font | Runtime theme font (`client/src/theme/dynamic-theme.ts`), default `"Roboto", "Helvetica", "Arial", sans-serif` |

**Existing patterns reused directly (do not reinvent):**
- `Paper variant="outlined"` cards, `Chip` for clickable entity references, `Tooltip` for truncated names — all already established in [SovereigntyCapabilityView.tsx](client/src/components/sovereignty/SovereigntyCapabilityView.tsx).
- `onEntityClick({ id, type })` navigation pattern already wired to [SovereigntyEntityDialog.tsx](client/src/components/sovereignty/SovereigntyEntityDialog.tsx) — reuse verbatim for "jump from finding to violating element" (the concept doc's "Ein Klick führt vom Symptom zur Ursache").
- `CircularProgress` centered loading state, `Alert severity="error"` / `Alert severity="info"` — already the loading/error/no-company-selected pattern in the same file.

**Primary visual anchor:** the status header chips (self/downstream) are the primary focal point of the sovereignty tab — they communicate the overall compliance state at a glance. The findings list is secondary, providing supporting detail only once the header has been read. Diagram markers mirror this same hierarchy: the fill badge (self status) is the primary focal point at the element, and the ring badge (downstream chain status) is secondary/supporting.

---

## Spacing Scale

Declared values (MUI `theme.spacing()` base unit = 8px, unchanged/no override in `dynamic-theme.ts`; all values below are multiples of 4):

| Token | MUI `sx` value | px | Usage |
|-------|-----------------|-----|-------|
| xs | 0.5 | 4px | Icon-to-label gaps inside a finding row |
| sm | 1 | 8px | Compact spacing between stacked findings, chip internal gaps |
| md-tight | 1.5 | 12px | **Documented exception** — matches the pre-existing `SovereigntyCapabilityView.tsx` `Paper sx={{ p: 1.5 }}` card padding; reused verbatim, not a new value introduced by this phase |
| md | 2 | 16px | Default card/row padding for the new sovereignty diagnostics surfaces (finding rows, status header) |
| lg | 3 | 24px | Section separation inside the sovereignty tab (status header → findings list) |
| xl | 4 | 32px | Not used in this phase's surfaces (no full-page layout) |

Exceptions: `md-tight` (12px) is the single documented exception to the standard 8-point scale ({4, 8, 16, 24, 32, 48, 64}). It is not a new value this phase introduces — it inherits the existing `SovereigntyCapabilityView.tsx` card padding as-is. All new surfaces built in this phase use `md` (16px) or another scale value; `md-tight` is only used where it already exists in the reused component.

---

## Typography

| Role | Size | Weight | Line Height | MUI variant |
|------|------|--------|-------------|-------------|
| Body | 14px | 400 | 1.6 | `body2` — finding row primary text, required/actual value text |
| Label | 12px | 400 | 1.4 | `caption` — dimension labels, chain-path breadcrumbs, timestamps |
| Heading | 16px | 500 | 1.6 | `subtitle2` — status header, "Findings" section title (matches existing `sovereignty.tab` label weight) |
| Display | n/a | n/a | n/a | **Not used** — this phase has no page-level/hero content; the "display" role does not apply to a dialog tab and a diagram overlay |

Two weights only, per project convention: **400 (regular)** for values/body copy, **500 (medium)** for section headings and chip labels. The pre-existing `Chip sx={{ fontWeight: 600 }}` capability chip in [SovereigntyCapabilityView.tsx](client/src/components/sovereignty/SovereigntyCapabilityView.tsx) is **legacy styling that predates this phase and is out of scope** for this typography contract — it is not to be replicated in any new sovereignty diagnostics surface, and it does not count as a third active weight. The active contract for this phase's new surfaces (detail-view diagnostics panel, diagram markers) remains strictly 400/500.

---

## Color

Status taxonomy is **locked** by `eam-konzept.md` §3 (RED/YELLOW/GREY/GREEN, three urgency levels) — mapped to the existing MUI theme palette, no new hex values introduced:

| Status | Meaning (from `eam-konzept.md`) | Theme color | Hex |
|--------|----------------------------------|-------------|-----|
| 🔴 RED | A stated business requirement is violated — compliance-relevant, must fix | `theme.palette.error.main` | `#D32F2F` |
| 🟡 YELLOW | The architecture is internally inconsistent but no formal business requirement exists yet | `theme.palette.warning.main` | `#ED6C02` |
| ⚪ GREY | No evaluation exists for this element/dimension | `theme.palette.grey[500]` | `#9E9E9E` |
| 🟢 GREEN | Requirement met | `theme.palette.success.main` | `#2E7D32` |

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `background.paper` / `background.default` (`#FFFFFF` / `#F5F7FA`) | Dialog tab background, diagram canvas background — unchanged |
| Secondary (30%) | `Paper variant="outlined"` border + `grey[100]` | Finding row/card surfaces, chain-path chip backgrounds |
| Accent (10%) | The 4 status colors above, and **only** those | Reserved exclusively for: (1) the two status chips in the detail-view header (self/downstream), (2) each finding row's leading icon + left border stripe, (3) the diagram fill badge (self) and ring badge (downstream). **Never** used for buttons, links, or any non-status UI element in this phase. |
| Destructive | not applicable | This phase has no destructive actions (read-only diagnostics; no delete/reset control is introduced) |

**Marker/badge rendering (SUX-03/SUX-04 — no existing precedent, specified here):**

Diagram markers must **not** overwrite the user's own chosen `backgroundColor`/`strokeColor` on the main diagram element (Excalidraw diagrams are user-authored and already carry deliberate styling — unlike the transient `markMissingElements()` red-border case, sovereignty markers are a persistent, always-on overlay when the feature flag is active). Render two small bound ellipse elements at the element's top-right corner, reusing the `createIconElement()` + `boundElements` binding mechanism from `excalidrawLibraryUtils.ts`:

| Marker | Element | Size | Style | Color source |
|--------|---------|------|-------|---------------|
| Fill (self / "Kern") | Inner filled ellipse | 10px diameter | `fillStyle: 'solid'`, no stroke | `selfStatus` → status color above |
| Ring (downstream / "Ring") | Outer unfilled ellipse, concentric, offset 2px outside the inner circle | 18px diameter | `backgroundColor: transparent`, `strokeStyle: 'solid'` for RED, `strokeStyle: 'dashed'` for YELLOW (colorblind-safe redundant encoding — do not rely on color alone), `strokeWidth: 3` (matches the existing "attention" convention in `markMissingElements`, default element `strokeWidth` is 2) | `downstreamStatus` → status color above |

Both ellipses always render when `featureFlags.Sovereignty` is on, for **all four** statuses including GREEN and GREY — never suppressed for the "nothing to report" case. Suppressing GREEN/GREY badges would silently reintroduce "compliant/unknown by default," which SOV-03 explicitly forbids at the data layer; the same rule must hold visually. A `BusinessCapability` node can never show a colored fill badge (grey/neutral only, per D-05 — it has no achieved rating of its own) but can show any ring color.

---

## Copywriting Contract

No create/edit form exists in this phase's scope, so "Primary CTA" is the single click-through interaction the concept doc calls out ("Ein Klick führt vom Symptom zur Ursache" — one click leads from symptom to cause). Copy given as DE / EN pairs, following the existing `sovereigntyDetail` translation namespace convention (`messages/de.json` / `messages/en.json`).

| Element | Copy (DE) | Copy (EN) |
|---------|-----------|-----------|
| Primary interaction (finding row → violating element) | Chip label = violating element's name, clickable (no separate button copy — reuses existing `onEntityClick` Chip pattern) | same |
| Status header — self | „Eigenstatus" | "This element" |
| Status header — downstream | „Kettenstatus" | "Dependency chain" |
| Empty state (GREEN, no findings) heading | „Keine Verstöße gefunden" | "No violations found" |
| Empty state (GREEN) body | „Alle geforderten Souveränitätsdimensionen sind für dieses Element und seine Kette erfüllt." | "All required sovereignty dimensions are satisfied for this element and its chain." |
| Empty state (GREY, no evaluation at all) heading | „Keine Bewertung vorhanden" | "No evaluation on record" |
| Empty state (GREY) body | „Für dieses Element wurde noch keine Souveränitätsbewertung erfasst. Eine fehlende Bewertung gilt nicht als erfüllt." | "No sovereignty evaluation has been recorded for this element yet. A missing evaluation is not treated as compliant." |
| Finding row — required vs. actual | „gefordert: {value} → vorhanden: {value}" | "required: {value} → actual: {value}" |
| Finding row — chain context label | „Kette: {chainPath}" | "Chain: {chainPath}" |
| Error state (query failure) | „Souveränitätsdaten konnten nicht geladen werden." + existing generic retry copy pattern (`Alert severity="error"` shows `error.message`, unchanged) | "Sovereignty data could not be loaded." |
| Destructive confirmation | not applicable — no destructive action in scope | not applicable |

---

## UI Considerations

> State coverage for the two new surfaces (detail-view diagnostics panel, diagram markers). Empty/error
> COPY is defined above in Copywriting Contract; this section only tracks state coverage.

Applicable state considerations resolved: 8 covered, 2 backstop, 1 dismissed, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty (positive) | Findings list | ✅ covered | GREEN + zero findings renders the "no violations" copy above, not a blank panel |
| empty (unknown) | Findings list | ✅ covered | GREY + zero achieved values renders the distinct "no evaluation" copy — never merged with the GREEN empty state (Pitfall 2 guard) |
| loading | Detail dialog sovereignty tab | ✅ covered | Reuses existing centered `CircularProgress` pattern from `SovereigntyCapabilityView.tsx` |
| error | Detail dialog sovereignty tab, diagram marker batch fetch | ✅ covered | Reuses existing `Alert severity="error"` pattern; diagram marker fetch failure fails silently to "no markers rendered" (fail-closed, never fabricates a status) |
| populated | Findings list | ✅ covered | Each RED/YELLOW/GREY finding renders as its own row (violating element, dimension, required/actual, chain path) — GREEN dimensions are not itemized as rows, only reflected in the status header |
| partial | Multi-dimension findings | ✅ covered | An element can be evaluated on some dimensions and GREY on others simultaneously — each dimension renders its own status independently, never collapsed into one aggregate row |
| zero-one-many | Multi-parent infrastructure findings (D-01) | ✅ covered | Each hosting edge produces its own named finding row (e.g., 2 findings for 1 Infrastructure with 2 parents) — never collapsed to "worst of several" |
| long-text | Violating element name, chain path | ✅ covered | Reuses existing `Tooltip` + `Chip` truncation pattern already in `SovereigntyCapabilityView.tsx` |
| overflow | Findings list with many rows (large fan-out chains, D-01/D-02) | 🧪 backstop | No fixture confirms the exact row-count threshold for scroll vs. pagination; executor should cap visible rows at a reasonable number (e.g. scrollable `Box` with `maxHeight`) and this must be verified against real seed-data volume per `PITFALLS.md` Pitfall 5, not assumed |
| overflow | Diagram with many marker-bearing elements visible at once | 🧪 backstop | Visual density of 10–18px badges at typical diagram zoom levels is unverified against real diagrams; executor should sanity-check readability during Wave 0/verification rather than assume it holds at all zoom levels |
| long-text | Diagram marker badges (fill/ring ellipses) | ⛔ dismissed | Not applicable — badges are pure colored shapes with no text content; nothing to truncate/wrap/reflow |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none — project uses Material UI 7, not shadcn | not applicable |
| third-party | none | not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved (2026-07-30, after 1 revision cycle — spacing token fix)
