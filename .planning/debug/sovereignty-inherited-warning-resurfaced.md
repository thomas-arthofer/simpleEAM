---
slug: sovereignty-inherited-warning-resurfaced
status: root_cause_found
trigger: |
  User: We previously removed the warning "Sovereignty assessment is inherited
  from components. Sovereignty fields are hidden for this application." The
  sovereignty assessment is done on each app / business case alone. We have
  the calculation done over a chain, so each component can have its own rating
  and status is collected over the chain. We did undo some changes ago, but why
  did this resurface?
created: 2026-08-31
updated: 2026-08-31
---

# sovereignty-inherited-warning-resurfaced

## Symptoms

- The i18n string `sovereigntyInheritedFromComponents` ("Sovereignty assessment
  is inherited from components. Sovereignty fields are hidden for this
  application.") is visible again in the Application form when the application
  has component relationships.
- User expects: the container application should always render its own
  sovereigntyAch* fields (Phase 02 design D-02: "GREY if empty, never hidden").
- Chain roll-up is intended to be done in the calculation engine, not by hiding
  UI on the container.

## Current Focus

- hypothesis: The behavior was NEVER actually removed from
  `ApplicationForm.tsx`. Phase 02's design decision D-02 deleted the _utility_
  (`client/src/components/sovereignty/utils.ts::buildEffectiveApplication`), but
  a later commit re-introduced an equivalent hide-container-fields gate inline
  in the form itself under a new local flag (`hasComponentRelationships`).
- next_action: Confirm with user, then remove the gate in ApplicationForm.tsx.
- reasoning_checkpoint: none pending.

## Evidence

- timestamp: 2026-08-31 — `grep_search "sovereigntyInheritedFromComponents"`
  finds one code site: `client/src/components/applications/ApplicationForm.tsx`
  lines 1372–1408. Translation keys exist in `de.json` (1191), `en.json` (1187),
  `fr.json` (1187).

- timestamp: 2026-08-31 — `git log --all --oneline -S
"sovereigntyInheritedFromComponents"` returns exactly ONE commit that ever
  introduced this string anywhere in the codebase: `7fc2e8e "fix sovereignty
calculation and some other small issues"` (Mar 27 2026, author
  marcus-friedrich-atos). There is no earlier commit that added-then-removed
  this behavior in `ApplicationForm.tsx`. The user's memory of it being
  "removed previously" refers to the deletion of the separate utility
  `buildEffectiveApplication()` in phase 02, not to this form's alert.

- timestamp: 2026-08-31 — `git show 7fc2e8e -- ApplicationForm.tsx` confirms
  that commit is what introduced the gate: it added `hasComponentRelationships`
  (line 610), swapped the sovereignty-fields branch to render two Alerts
  (`sovereigntyInheritedFromComponentsNotice` + `sovereigntyComponentsAvailabilityInfo`)
  INSTEAD of `buildSovereigntyAchievedFields()` whenever the app has one or
  more component apps selected. Commit message mentions no rationale for this
  UX change — it is bundled inside "fix sovereignty calculation and some other
  small issues".

- timestamp: 2026-08-31 — Phase 02 explicit design contract
  (`.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-RESEARCH.md`
  line 34, **D-02**):

  > Composite/container applications are evaluated as **two independent
  > things**: the container's own `sovereigntyAch*` fields are chain-checked
  > like any entity (GREY if empty, never hidden), AND each component
  > application is independently chain-checked too. The old
  > `buildEffectiveApplication()` "hide container values" behavior is
  > removed entirely.
  > Also `PROJECT.md`: "exposing missing ratings is intentional and should not
  > be hidden by new fallback logic" and "hidden fallback values defeat the
  > purpose of traceable compliance."

- timestamp: 2026-08-31 — the offending gate is the ONLY inline field-hiding
  logic; `buildSovereigntyAchievedFields` from
  `client/src/components/common/SovereigntyFields.ts` is still the canonical
  builder used by every other entity form (Capability/AiComponent/
  Infrastructure/DataObject/BusinessProcess), and none of those forms has a
  parallel "inherited from components" gate.

## Eliminated

- hypothesis: A translation-file regression re-added the string in
  a stale de/en/fr file. — DISMISSED: the string is only USED at one call
  site (`ApplicationForm.tsx:1382`). A dead translation key alone would not
  render the alert.

- hypothesis: The gate lives in a shared component
  (`SovereigntyFields.ts` or `SovereigntyEntityDialog.tsx`) that other
  entities also render. — DISMISSED: grep for `hasComponentRelationships` and
  for `sovereigntyInheritedFromComponents` shows a single call site in
  `ApplicationForm.tsx` only.

## Root Cause

Commit `7fc2e8e` ("fix sovereignty calculation and some other small issues",
Mar 27 2026) re-introduced a hide-container-sovereignty-fields UX pattern
inline in `client/src/components/applications/ApplicationForm.tsx`. This
contradicts the Phase 02 locked design decision **D-02** ("container's own
`sovereigntyAch*` fields are chain-checked like any entity — GREY if empty,
never hidden") and Phase 02 D-07 (buildEffectiveApplication utility deleted).

The regression was possible because:

1. The Phase 02 removal only deleted the SEPARATE UTILITY
   (`sovereignty/utils.ts::buildEffectiveApplication`). It did not add a test
   or a guardrail that prevents another surface from re-implementing the same
   "hide when container" behavior inline.
2. Commit `7fc2e8e` bundled the UX change ("hide sovereignty fields when app
   has components; show inherited-from-components alert") inside a broadly
   named "fix sovereignty calculation" commit whose title implied backend
   calculation fixes, not a UX policy reversal. No PR/commit note references
   D-02.
3. The Application form is the only entity type where this gate exists (all
   other entity forms already correctly call `buildSovereigntyAchievedFields`
   unconditionally), so the anomaly does not surface until an application is
   opened with at least one component relationship.

## Fix Proposal

In `client/src/components/applications/ApplicationForm.tsx`:

1. Remove the `hasComponentRelationships ? [...notice + availability...] :
buildSovereigntyAchievedFields(...)` branching at lines ~1371–1408.
   Replace with the unconditional call:
   `...(isSovereigntyEnabled ? buildSovereigntyAchievedFields((key: string) =>
tCommon(key as any)) : []),`
2. Decide (with user) whether to also keep the "N of M components have
   sovereignty data" info banner (`sovereigntyComponentsAvailabilityInfo`) as
   an ADDITIONAL informational alert alongside the fields, or drop it too.
   Design-wise it is fine to keep as a supplementary hint but MUST NOT replace
   the fields.
3. If both alerts are dropped, delete the now-unused local vars
   `hasComponentRelationships`, `selectedComponents`,
   `componentsWithSovereigntyValuesCount` (lines ~605–625) and the translation
   keys `sovereigntyInheritedFromComponents` +
   `componentsSovereigntyDataCount` in `de.json` / `en.json` / `fr.json`.

## Guardrail (post-fix)

Consider adding to `client/src/components/common/SovereigntyFields.ts` a
comment or unit test that pins "sovereigntyAch* fields must render for every
sovereignty-enabled entity type unconditionally" so that a future entity-
specific reversal produces a visible test failure instead of silent UX drift.

## Files Involved

- `client/src/components/applications/ApplicationForm.tsx` (lines 605–625,
  1371–1408) — regression site
- `client/messages/de.json`, `en.json`, `fr.json` — translation keys
  `sovereigntyInheritedFromComponents`, `componentsSovereigntyDataCount`
- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-RESEARCH.md`
  — governing design decision (D-02, D-07)
