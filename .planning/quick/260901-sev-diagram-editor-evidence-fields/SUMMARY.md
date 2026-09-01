---
gsd_summary_version: 1.0
task_id: 260901-sev
slug: diagram-editor-evidence-fields
date: 2026-09-01
status: complete
---

# Summary: Diagram-Editor speichert alle vier Sovereignty-Evidence-Felder

## Problem behoben

Beim Bearbeiten von Application-, Infrastructure- und AI-Component-Elementen im Diagram-Editor wurde nur `sovereigntyAchStrategicAutonomyEvidence` in die Datenbank geschrieben. Die anderen drei Nachweisfelder (Resilienz, Sicherheit, Kontrolle) blieben leer, obwohl die Textareas in der Form angezeigt und ausgefüllt wurden.

## Root Cause

Systemischer Copy/Paste-Fehler: Der ursprüngliche Sovereignty-Fix hatte nur ein einziges Evidence-Feld (Autonomy) implementiert. Dieses wurde später in `SovereigntyFields.ts` (`buildSovereigntyAchievedFields`) auf vier UI-Felder erweitert, aber die drei zusätzlichen Felder fehlten weiterhin in:

- den Zod-Schemas und `AicomponentFormValues` interface
- den `defaultValues` / `form.reset(...)`-Aufrufen der drei Forms (`ApplicationForm`, `AicomponentForm`, `InfrastructureForm`)
- den GraphQL-Update-Inputs in den drei Diagram-Wrappers in `ElementFormDialog.tsx`

Konsequenz: Werte aus der DB wurden beim Öffnen des Editors nicht in die Form geladen, und Nutzereingaben wurden am Mutation-Boundary in TypeScript-Typen "unsichtbar" und nicht ans GraphQL-Update übergeben.

## Fix

Drei Evidence-Felder (`sovereigntyAchResilienceEvidence`, `sovereigntyAchSecurityEvidence`, `sovereigntyAchControlEvidence`) analog zu Autonomy-Evidence hinzugefügt in:

- `client/src/components/applications/ApplicationForm.tsx` — Zod-Schema, `defaultValues`, Reset-Werte
- `client/src/components/aicomponents/AicomponentForm.tsx` — `AicomponentFormValues` Interface, Zod-Schema, `defaultValues`, Reset-Werte
- `client/src/components/infrastructure/InfrastructureForm.tsx` — Zod-Schema, `defaultValues`, Reset-Werte
- `client/src/components/diagrams/dialogs/ElementFormDialog.tsx` — GraphQL-Update-Input in `ApplicationFormWrapper`, `InfrastructureFormWrapper`, `AiComponentFormWrapper`

Alle Zusätze sind reine Insertions (keine Modifikation existierender Logik): **57 Zeilen hinzugefügt, 0 gelöscht** über 4 Dateien.

## Verification

- `yarn tsc --noEmit` in `client/` clean (exit 0).
- Manueller Test empfohlen: im Diagram-Editor Application/Infrastructure/AI-Component öffnen → alle vier Evidence-Textareas ausfüllen → speichern → Element erneut öffnen und prüfen, dass alle vier Werte persistiert sind.

## Restlicher, nicht-behobener Same-Pattern-Scope

Der gleiche Bug (nur Autonomy-Evidence im Mutation-Input) existiert weiterhin in nicht-diagrammbezogenen Codepfaden. Vom Nutzer nicht gemeldet, daher außerhalb dieser Quick-Task:

- `client/src/app/[lang]/applications/page.tsx` — page-basierte Edit/Create-Mutation
- `client/src/app/[lang]/aicomponents/page.tsx` — dito
- `client/src/app/[lang]/infrastructure/page.tsx` — dito
- `client/src/app/[lang]/suppliers/page.tsx` + `SupplierForm.tsx` (Supplier-UI insgesamt nur mit Autonomy-Evidence)
- `client/src/components/sovereignty/SovereigntyEntityDialog.tsx` (line 196ff)
- `client/src/components/common/NestedEntityFormDialog.tsx` (line 253ff)
- Excel/JSON Import- und Export-Pfade (`excel/utils.ts`, `jsonInputUtils.ts`, `jsonDataService.ts`, `excelDataService.ts`, Table-Export-Snippets)
- Diverse Mutation-Selection-Sets in `client/src/graphql/{application,infrastructure,aicomponent}.ts` (Update-Response gibt nur Autonomy-Evidence zurück)

Empfehlung: separater Quick-Task, wenn dieselben Symptome in einem dieser Kanäle auftreten.
