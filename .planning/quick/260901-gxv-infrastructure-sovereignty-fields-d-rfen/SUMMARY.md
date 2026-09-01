---
id: 260901-gxv
slug: infrastructure-sovereignty-fields-d-rfen
type: quick
status: complete
created: 2026-09-01
completed: 2026-09-01
commit: 5ee6af4
files_modified: 4
files_added: 1
---

# Quick Task Summary: Infrastructure Sovereignty-Felder pro Schicht

## Outcome

Behoben: `InfrastructureForm.tsx` versteckte die eigenen
`sovereigntyAch*`-Felder, sobald eine `parentInfrastructure` gesetzt war,
und zeigte stattdessen zwei Info-Alerts
("Sovereignty information is inherited from parent infrastructure: …").
Damit konnte z. B. eine VM keine eigene Bewertung mehr pflegen, obwohl
der Chain-Rollup im Backend genau darauf ausgelegt ist. Der Fix entfernt
das Gate und bringt Infrastructure damit auf den gleichen Stand wie
Applications (Phase 02 Decision D-02: "GREY if empty, never hidden").

## Changes

- `client/src/components/infrastructure/InfrastructureForm.tsx`
  - Ternary `parentWithInheritedSovereignty ? [ …zwei Alerts… ]
    : buildSovereigntyAchievedFields(…)` → unbedingter
    `buildSovereigntyAchievedFields(…)`-Aufruf (identisch zu
    `ApplicationForm.tsx:1349-1351`).
  - Entfernt: `hasAnySovereigntyData`-Helper, `useStore`-Ableitung
    (`selectedParentInfrastructureIds` / `selectedParentInfrastructureId`
    / `selectedParentInfrastructure`), `parentWithInheritedSovereignty`,
    `parentHasSovereigntyData`.
  - Imports bereinigt: `Alert` (`@mui/material`) und `useStore`
    (`@tanstack/react-form`) werden nicht mehr benötigt.
- `client/messages/{de,en,fr}.json`
  - Keys `sovereigntyInheritedFromParent`,
    `parentSovereigntyDataAvailable`, `parentSovereigntyDataMissing`
    gelöscht (im Code keine Referenzen mehr, per grep verifiziert).

## Verification

- `yarn tsc --noEmit` im `client/` → EXIT 0.
- `grep_search` auf alle entfernten Symbole und i18n-Keys → nur noch
  Referenzen in `PLAN.md` (Dokumentation).
- Manuelle UAT durch den User: eine VM mit `parentInfrastructure`
  (z. B. "On-Premise Rechenzentrum – Datacenter Ranshofen") öffnen und
  bestätigen, dass jetzt die vier Level-Felder + Evidence-Textarea
  gerendert werden statt der Vererbungs-Alerts.

## Files Changed

- `client/src/components/infrastructure/InfrastructureForm.tsx`
- `client/messages/de.json`
- `client/messages/en.json`
- `client/messages/fr.json`

## Commit

`5ee6af4` — fix(infrastructure): remove parent-inheritance UI gate on
sovereignty fields

## References

- `.planning/debug/resolved/sovereignty-inherited-warning-resurfaced.md`
  (identische Regression bei Apps, gefixt 2026-08-31)
- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-RESEARCH.md`
  D-02 / D-07 (locked design)
- `client/src/components/applications/ApplicationForm.tsx:1349-1351`
  (Referenz-Implementierung)
