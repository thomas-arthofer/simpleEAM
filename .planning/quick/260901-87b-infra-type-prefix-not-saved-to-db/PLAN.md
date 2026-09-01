---
id: 260901-87b
slug: infra-type-prefix-not-saved-to-db
mode: quick
created: 2026-09-01
status: in-progress
---

# Quick Task 260901-87b: Strip Infrastructure type-label prefix on diagram save

## Description

Im Diagramm werden Infrastructure-Elemente immer als `"<TypeLabel> - <name>"` gerendert
(z. B. `"Virtuelle Maschine - SRLX0018"`, `"Cloud-Rechenzentrum - DC1"`). Beim Speichern
wird dieser komplette Displaytext als `Infrastructure.name` in die Datenbank
zurückgeschrieben, sodass der Typ-Präfix nach einmaligem Speichern Teil des
persistierten Namens wird.

## Root Cause

`client/src/components/diagrams/utils/architectureElements.ts::getInfrastructureDisplayName`
baut das Präfix auf; `databaseSyncUtils.ts` (`detectNameChanges` und `syncDiagramOnSave`)
übergeben den Displaytext ungefiltert an `updateElementName`, welches ihn 1:1 in
`Infrastructure.name` schreibt.

## Approach

- Neue Utility `stripInfrastructureTypePrefix(name)` in `architectureElements.ts`, die einen
  bekannten `"<TypeLabel> - "`-Präfix vom Anfang entfernt, andernfalls den Namen
  unverändert zurückgibt.
- In `updateElementName` (Choke-Point aller Save-Pfade) für `elementType === 'infrastructure'`
  den Wert vor `prepareTextForDatabase` durch die Utility laufen lassen.
- `lastSyncedName` / `elementName` bleiben unverändert in der Display-Form (matcht den
  Canvas-Text), sodass die nächste `detectNameChanges`-Prüfung idempotent bleibt.

## Files

- `client/src/components/diagrams/utils/architectureElements.ts` — Utility hinzufügen
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` — Nutzung in `updateElementName`

## Verification

- `yarn tsc --noEmit` im `client`-Verzeichnis grün.
- Manueller Save-Path-Trace: rename in Diagramm → Save → prüfen dass DB-Name ohne Präfix landet.
