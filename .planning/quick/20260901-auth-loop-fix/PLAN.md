---
id: 20260901-auth-loop-fix
slug: auth-loop-fix
date: 2026-09-01
status: in-progress
type: quick
---

# Quick Task: Auth-Refresh-Loop im Client beheben

## Problem

Nachdem der GraphQL-Server via Quick-Task 260901-rar wieder oben war,
zeigte der Client (im bereits geöffneten Browser-Tab) folgendes Verhalten:

- Alle Queries (Recent Diagrams, Business Capabilities, …) loopen endlos.
- Im Network-Tab werden Requests sofort wieder gecancelt.
- Server-Logs zeigen keine Aktivität passend zum Loop.
- Inkognito-Fenster mit frischem Login funktioniert einwandfrei
  → nicht Server-, sondern Session-/Auth-Bug.

## Root Cause

Zwei Bugs im Client verstärken sich zu einem endlosen Retry-Loop, sobald
ein Keycloak-Access-Token abgelaufen ist (was während des API-Ausfalls
nach dem Reboot passierte, weil `onTokenExpired`-Refresh gegen den toten
Server fehlgeschlagen ist):

1. `client/src/lib/apollo-client.ts` (errorLink):
   - Dispatcht bei jedem `Unauthenticated`/401 unbedingt `authError`.
   - Macht bei *jedem* Network-Error unbedingt `forward(operation)` —
     kein Retry-Limit, kein Backoff → tight retry loop bei anhaltendem
     Fehler.

2. `client/src/components/layout/AppLayout.tsx` (`handleAuthError`):
   - Erzeugt bei `authError` einen **neuen Apollo-Client ohne Token**
     und setzt ihn in State (`setClient(unauthenticatedClient)`).
   - React re-rendert alle `useQuery`-Konsumenten → in-flight Requests
     werden gecancelt (AbortController der alten Provider-Instanz)
     → neue Requests firen ohne Token → Server antwortet wieder
     `Unauthenticated` → `authError` → **Loop.**

## Fix

- **apollo-client.ts errorLink**:
  - Entferne das unbedingte `forward(operation)` auf Network-Errors.
    Apollo soll den Error zum Caller propagieren (mit `errorPolicy: 'all'`
    ist das der etablierte UI-Pfad); die Retry-Semantik gehört in einen
    dedizierten Retry-Link, nicht in den Error-Link.
  - Debounce den `authError`-Dispatch pro Operation, damit nicht 20 Queries
    parallel 20 authError-Events auslösen und das Provider-Recreate-Karussell
    starten.

- **AppLayout.tsx `handleAuthError`**:
  - Nicht mehr einen token-losen Apollo-Client bauen. Statt dessen erst
    versuchen, den Token über `keycloak.updateToken(-1)` frisch zu holen;
    fällt der Refresh durch, `keycloak.login()` triggern (echter
    Redirect zu Keycloak, wie bei jedem anderen Ablauf).

## Nicht in Scope

- Reine Retry-Link-Einführung (`@apollo/client/link/retry`) — separater
  Task, wenn wir echte Netzwerk-Instabilität behandeln wollen.
- APQ-Konfiguration (Server-Warnung "Persisted queries are enabled and
  are using an unbounded cache") — separater Task.

## UAT

- Log-out im bestehenden Tab → Loop verschwindet.
- Neuer Reboot-Test: Nach Neustart des Stacks + abgelaufenem Token darf
  der Client **maximal 1 Query fehlschlagen** und wird dann sauber zur
  Keycloak-Login-Seite umgeleitet — kein Loop.
