---
gsd_plan_version: 1.0
task_id: 260901-sev
slug: diagram-editor-evidence-fields
created: 2026-09-01
status: in-progress
---

# Quick Task: Diagram-Editor speichert nur Nachweis Autonomie, nicht Resilienz/Sicherheit/Kontrolle

## Problem

Beim Bearbeiten eines Elements im Diagram-Editor wird nur `sovereigntyAchStrategicAutonomyEvidence` in die Datenbank geschrieben. `sovereigntyAchResilienceEvidence`, `sovereigntyAchSecurityEvidence` und `sovereigntyAchControlEvidence` bleiben leer, obwohl die Felder in der Form angezeigt und ausgefüllt werden.

## Root Cause

`client/src/components/diagrams/dialogs/ElementFormDialog.tsx` enthält drei Wrapper (`ApplicationFormWrapper`, `InfrastructureFormWrapper`, `AiComponentFormWrapper`), die das GraphQL-Update-Input-Objekt bauen. Alle drei setzen nur `sovereigntyAchStrategicAutonomyEvidence.set`, die anderen drei Evidence-Felder fehlen komplett im Input.

Betroffene Zeilen (vor Fix):

- ApplicationFormWrapper: L257-259
- InfrastructureFormWrapper: L794-796
- AiComponentFormWrapper: L1086-1088

Das UI-Helper `buildSovereigntyAchievedFields` in `client/src/components/common/SovereigntyFields.ts` rendert alle vier Felder — die Benutzereingaben landen im Form-State, werden aber am Mutation-Boundary abgeworfen.

## Fix

Pro Wrapper drei zusätzliche `{ set: ... ?? null }`-Einträge im GraphQL-Update-Input ergänzen:

```ts
sovereigntyAchResilienceEvidence: { set: <data>.sovereigntyAchResilienceEvidence ?? null },
sovereigntyAchSecurityEvidence:   { set: <data>.sovereigntyAchSecurityEvidence   ?? null },
sovereigntyAchControlEvidence:    { set: <data>.sovereigntyAchControlEvidence    ?? null },
```

Analog neben dem bestehenden `sovereigntyAchStrategicAutonomyEvidence`-Block einfügen.

## Scope Boundary

- IN scope: die drei Wrapper in `ElementFormDialog.tsx`.
- OUT of scope (gleiches Pattern, aber vom User nicht gemeldet — separater Fix falls gewünscht):
  - Zod-Schemata und `defaultValues`/`reset` in `ApplicationForm.tsx`, `AicomponentForm.tsx`, `InfrastructureForm.tsx`, `SupplierForm.tsx` (nur Autonomy-Evidence gepflegt)
  - `page.tsx` Update-Mutations für Applications, AiComponents, Infrastructure, Suppliers (nur Autonomy-Evidence gepflegt)
  - Excel/JSON-Import-/Export-Utilities
  - Tabellenexport in `*Table.tsx`

## Files to change

- `client/src/components/diagrams/dialogs/ElementFormDialog.tsx`

## Verification

- `yarn tsc --noEmit` im `client/`-Verzeichnis muss clean sein.
- Manueller Test: im Diagram-Editor Application/Infrastructure/AiComponent bearbeiten, alle vier Evidence-Textareas ausfüllen, speichern → in der Application-Detail-Ansicht (bzw. GraphQL-Playground) müssen alle vier Werte persistiert sein.
