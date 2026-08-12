---
status: resolved
trigger: 'Vergleich letzte debug session "speichern im diagramm geht nicht" - es kommt kein fehler mehr, aber es speichert auch nicht.'
created: 2026-08-12
updated: 2026-08-12
---

# Debug Session: sovereignty-score-not-saved

## Symptoms

- **Expected behavior:** Changing the Sovereignty Score of an element (e.g. an
  Application) from the Excalidraw diagram editor's element form (e.g. "Very
  High" -> "High"), clicking Save, should persist the new rating both in the
  database and reflect it in the diagram/element afterwards.
- **Actual behavior:** No error appears anywhere (console, network) anymore.
  The mutation appears to complete ("Mutation onCompleted called", "Mutation
  completed successfully" logged with a `data` payload). The dialog closes
  normally. But the Sovereignty Score value is unchanged both in the diagram
  marker and in the element/entity itself afterwards (still shows "Very High"
  after trying to change it to "High").
- **Error messages:** None. This is a change from the previous, related debug
  session (`infra-update-input-mismatch`, resolved) where the failure to save
  was ACCOMPANIED by a visible GraphQL 400 error (field name mismatch in
  `InfrastructureFormWrapper`'s transform, plus `errorPolicy: 'all'` masking
  `result.errors` so the dialog closed despite the mutation failing). This
  time there is no visible error at all, yet the value still does not change.
- **Timeline:** Broken before (with a visible error, for Infrastructure
  elements specifically) and still broken now (silently, and reportedly for
  more than one entity type — not confirmed to be Infrastructure-only).
- **Reproduction:** Open the Excalidraw diagram editor, edit an element (e.g.
  Application), change the "Sovereignty Score" field (e.g. Very High -> High),
  click Save. Console log trace provided by user (verbatim, `ApplicationForm`
  / `ApplicationFormWrapper` / `ExcalidrawWrapper`):

  ```
  [GenericForm] handleSubmitClick called, isViewMode: false
  [GenericForm] Calling form.handleSubmit() from button click...
  [GenericForm] form.handleSubmit() called from button click
  [ApplicationForm] onSubmit called with value: {name: 'CoilDNA - Rolle unbestimmt (Test)', description: '...', status: 'ACTIVE', criticality: 'MEDIUM', costs: null, ...}
  [ApplicationForm] Running validation...
  [ApplicationForm] Validation passed
  [ApplicationForm] Calling onSubmit prop with processedValue: {...}
  [ApplicationFormWrapper] handleSubmit called with formData: {...}
  [ApplicationFormWrapper] Transforming form data to GraphQL input format...
  [ApplicationFormWrapper] Transformed input: {name: {...}, description: {...}, status: {...}, criticality: {...}, costs: {...}, ...}
  [ApplicationFormWrapper] Calling updateApplication mutation...
  [ApplicationFormWrapper] Mutation onCompleted called {updateApplications: {...}}
  [ExcalidrawWrapper] onElementUpdated called with name: CoilDNA - Rolle unbestimmt (Test)
  [ExcalidrawWrapper] Element text updated in diagram
  [ApplicationFormWrapper] Mutation completed successfully: {data: {...}}
  [ApplicationFormWrapper] Calling onClose()...
  [ExcalidrawWrapper] ElementFormDialog onClose called
  [ExcalidrawWrapper] Dialog state reset to closed
  [ApplicationFormWrapper] onClose() called successfully
  [ApplicationForm] onSubmit prop completed successfully
  ```

  Note: the logged "Transformed input" object is truncated in the console
  (`{name: {...}, description: {...}, status: {...}, criticality: {...},
costs: {...}, ...}` — trailing `...`), so it is NOT confirmed from this log
  alone whether the Sovereignty Score field is actually present in the
  transformed GraphQL input at all.

## Related prior session (for comparison, per user request)

`.planning/debug/infra-update-input-mismatch.md` (resolved) — same file family
(`client/src/components/diagrams/dialogs/ElementFormDialog.tsx`), same general
shape of bug (form-wrapper builds GraphQL input, mutation looks like it
succeeds, real persistence doesn't happen), same "wrappers other than
Infrastructure were never fixed" caveat:

- Root cause #1 there: `InfrastructureFormWrapper`'s transform used field
  names (`type`, `model`, `serialNumber`, `purchaseDate`, `warrantyEndDate`)
  that never existed on `Infrastructure` — server rejected with 400.
- Root cause #2 there: app-wide `errorPolicy: 'all'` (`client/src/lib/apollo-client.ts`)
  means Apollo resolves the mutation promise even when it returns only
  `errors` and no `data` — `InfrastructureFormWrapper.handleSubmit` never
  checked `result.errors`, so the dialog closed as if it had succeeded.
- Explicitly flagged as an unresolved follow-up in that session: "the same
  unchecked-`result.errors` pattern exists in the other wrappers in this
  file — Application/Capability/ApplicationInterface/DataObject/AiComponent —
  but per the session scope only `InfrastructureFormWrapper` was fixed."
- This new session's symptom (`ApplicationFormWrapper`, no visible error, no
  actual persistence) is consistent with that flagged follow-up still being
  open, PLUS a possible field-name/transform bug specific to the Sovereignty
  Score field (analogous to root cause #1, but for a field that may silently
  no-op instead of triggering a 400 — e.g. wrong field name dropped by
  `JSON.stringify`, or the field being outside the `where`-matched node scope,
  or a `result.errors` silently swallowed because `ApplicationFormWrapper`
  also never checks `result.errors` after `updateApplication(...)`).

Other prior sessions in the same domain, also worth the debugger cross-
referencing:

- `.planning/debug/sovereignty-marker-sync-not-live.md` — sovereignty marker
  rendering not updating live on the diagram canvas after element changes.
- `.planning/debug/resolved/sovereignty-low-dc-green.md` — sovereignty marker
  color computed incorrectly for nested BusinessCapability chains.

Neither of those two is confirmed to be the same bug as this one — this
session's symptom is about the underlying Sovereignty Score VALUE not
persisting/changing at all after Save, not about marker color computation or
live re-render — but they touch the same `ApplicationFormWrapper` /
`ExcalidrawWrapper` / sovereignty data path and may share root cause.

## Current Focus

hypothesis: "CONFIRMED — Sovereignty fields are entirely omitted from the GraphQL input transform in all diagram form wrappers (ApplicationFormWrapper, CapabilityFormWrapper, DataObjectFormWrapper, AiComponentFormWrapper). The mutation succeeds on other fields but sovereignty values are never sent."
next_action: "Fix applied."

## Resolution

**Root Cause:** All four diagram form wrappers in `ElementFormDialog.tsx` constructed the GraphQL mutation `input` object with an explicit allowlist of scalar fields but never included any sovereignty fields (`sovereigntyAch*` for Application/AiComponent, `sovereigntyReq*` for BusinessCapability/DataObject). The form data DID contain the sovereignty values (they're part of `...applicationData` / `...capabilityData` / etc. after relationship IDs are destructured out), but the input transform simply never mapped them to `{ set: value }` entries. The mutation therefore succeeded (updating name, status, etc.) while silently dropping sovereignty changes.

This is the same class of bug as the previously-fixed `InfrastructureFormWrapper` field-name issue (`infra-update-input-mismatch`), except here the failure mode is silent omission rather than a 400 error — because the fields are simply absent from the input (not mis-named), the server accepts the mutation and updates what IS present, ignoring what's absent.

**Fix:** Added sovereignty fields to the input transform in all four wrappers:

- `ApplicationFormWrapper`: added `sovereigntyAchStrategicAutonomy`, `sovereigntyAchResilience`, `sovereigntyAchSecurity`, `sovereigntyAchControl`, `sovereigntyAchStrategicAutonomyEvidence`, `lastSovereigntyAssessmentAt`
- `CapabilityFormWrapper`: added `sovereigntyReqStrategicAutonomy`, `sovereigntyReqResilience`, `sovereigntyReqSecurity`, `sovereigntyReqControl`, `sovereigntyReqWeight`, `sovereigntyReqStrategicAutonomyRationale`
- `DataObjectFormWrapper`: added `sovereigntyReqStrategicAutonomy`, `sovereigntyReqResilience`, `sovereigntyReqSecurity`, `sovereigntyReqControl`, `sovereigntyReqWeight`, `sovereigntyReqStrategicAutonomyRationale`
- `AiComponentFormWrapper`: added `sovereigntyAchStrategicAutonomy`, `sovereigntyAchResilience`, `sovereigntyAchSecurity`, `sovereigntyAchControl`, `sovereigntyAchStrategicAutonomyEvidence`, `lastSovereigntyAssessmentAt`

**Files changed:** `client/src/components/diagrams/dialogs/ElementFormDialog.tsx`

**Prevention:** The root cause is a maintenance gap — when sovereignty fields were added to the entity forms and page-level update handlers, the parallel diagram-wrapper transforms were not updated. A structural guard would be a shared `buildScalarInput(formData)` utility (or at minimum a linter/test that asserts the diagram wrapper's input keys are a superset of the page-level handler's input keys for the same entity type).
