---
id: 260901-87b
slug: infra-type-prefix-not-saved-to-db
mode: quick
created: 2026-09-01
completed: 2026-09-01
status: complete
---

# Quick Task 260901-87b: Strip Infrastructure type-label prefix on diagram save

## Outcome

Diagramm-Speichern schreibt für Infrastructure-Elemente ab sofort nur noch den reinen
`name` in die Datenbank, nicht mehr den Display-Präfix `"<TypeLabel> - "`.

## Changes

- `client/src/components/diagrams/utils/architectureElements.ts`
  - `InfrastructureType` von `import type` auf value-Import umgestellt, damit
    `Object.values(...)` zur Laufzeit funktioniert.
  - Neue exportierte Utility `stripInfrastructureTypePrefix(name)` mit vorberechneter,
    längensortierter Präfix-Liste aus allen `InfrastructureType`-Labels.
- `client/src/components/diagrams/utils/databaseSyncUtils.ts`
  - Import um `stripInfrastructureTypePrefix` erweitert.
  - `updateElementName` (der einzige Choke-Point aller Save-Pfade, sowohl
    `detectNameChanges`/`applyNameChanges` als auch `syncDiagramOnSave`) filtert für
    `elementType === 'infrastructure'` den Präfix, bevor `prepareTextForDatabase` läuft
    und die Mutation abgesetzt wird.

## Verification

- `yarn tsc --noEmit` grün (exit 0).
- Manuell in der Save-Kette geprüft: `lastSyncedName` / `elementName` bleiben in der
  Display-Form (mit Präfix), damit `detectNameChanges` idempotent bleibt; nur der an die
  GraphQL-Mutation gehende `name` ist stripped. Beim nächsten Öffnen re-appliziert
  `syncElementsWithDatabase` den Präfix wieder via `getInfrastructureDisplayName`.

## Notes

- Präfix-Strip ist konservativ: nur exakt bekannte `"<label> - "`-Präfixe werden entfernt.
  Benutzer, die den Präfix manuell zu etwas Unbekanntem ändern, sehen weiterhin ihren
  Wortlaut in der DB — das ist bewusst, um Datenverlust zu vermeiden.
- Längensortierung verhindert, dass ein kürzeres Label versehentlich den Anfang eines
  längeren matcht.
