---
id: 260901-gxv
slug: infrastructure-sovereignty-fields-d-rfen
type: quick
created: 2026-09-01
mode: run
---

# Quick Task: Infrastructure — Sovereignty-Felder pro Schicht statt Vererbung

## Description

Analog zum Fix bei `ApplicationForm.tsx` (siehe
`.planning/debug/resolved/sovereignty-inherited-warning-resurfaced.md`,
Phase 02 Decision D-02) verletzt `InfrastructureForm.tsx` weiterhin die
gesperrte UX-Regel: **"GREY if empty, never hidden"**. Sobald eine
Infrastruktur (z. B. eine VM) eine `parentInfrastructure` gesetzt hat,
ersetzt das Formular die eigenen `sovereigntyAch*`-Felder durch zwei
Info-Alerts ("Sovereignty information is inherited from parent
infrastructure: …"). Dadurch kann die Bewertung pro Infra-Schicht (VM,
Container-Host, Rechenzentrum, …) nicht mehr unabhängig gepflegt werden,
obwohl der Chain-Rollup im Backend genau darauf ausgelegt ist.

## Scope

Betroffene Datei: `client/src/components/infrastructure/InfrastructureForm.tsx`

1. Den Zweig `parentWithInheritedSovereignty ? [ …zwei Alerts… ]
   : buildSovereigntyAchievedFields(…)` durch einen unbedingten Aufruf
   von `buildSovereigntyAchievedFields(…)` ersetzen — genauso wie in
   `ApplicationForm.tsx:1349-1351`.
2. Nicht mehr referenzierten Hilfscode entfernen:
   - `hasAnySovereigntyData` (lokale Funktion)
   - `selectedParentInfrastructureIds` / `selectedParentInfrastructureId`
     / `selectedParentInfrastructure` (`useMemo`)
   - `parentWithInheritedSovereignty` / `parentHasSovereigntyData`
   - Import `Alert` (`@mui/material`)
   - Import `useStore` (`@tanstack/react-form`) — wird sonst nicht
     verwendet.
3. Ungenutzte i18n-Keys aus `client/messages/{de,en,fr}.json` löschen:
   - `sovereigntyInheritedFromParent`
   - `parentSovereigntyDataAvailable`
   - `parentSovereigntyDataMissing`

Keine Backend-Änderungen — der Chain-Rollup (`server/src/sovereignty/*`)
respektiert bereits pro Knoten gepflegte Felder.

## Files Modified

- `client/src/components/infrastructure/InfrastructureForm.tsx`
- `client/messages/de.json`
- `client/messages/en.json`
- `client/messages/fr.json`

## Verification

- Öffne im Diagramm oder in der Infrastruktur-Liste eine VM mit einem
  `parentInfrastructure` (z. B. das gemeldete
  "On-Premise Rechenzentrum – Datacenter Ranshofen").
- Erwartetes Ergebnis: der Sovereignty-Tab zeigt **immer** die vier
  `sovereigntyAch*`-Level-Felder + Strategic-Autonomy-Evidence, nie mehr
  einen Vererbungs-Alert.
- `yarn tsc --noEmit` bzw. Next-Build im Client muss ohne neue Errors
  durchlaufen.

## References

- `.planning/debug/resolved/sovereignty-inherited-warning-resurfaced.md`
  (identisches Anti-Pattern, gefixt bei Apps am 2026-08-31)
- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-RESEARCH.md`
  D-02 / D-07
- `client/src/components/applications/ApplicationForm.tsx:1349-1351`
  (Referenz-Implementierung)
