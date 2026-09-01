---
id: 20260901-auth-loop-fix
slug: auth-loop-fix
date: 2026-09-01
status: complete
type: quick
---

# Summary: Auth-Refresh-Loop im Client beheben

## Ergebnis

Der bei abgelaufenem Keycloak-Token entstehende endlose Retry-Loop
(Recent Diagrams, Business Capabilities etc. laden zyklisch, Requests
werden im Network-Tab sofort gecancelt) ist strukturell behoben.
User-seitige Bestätigung: Inkognito-Fenster funktionierte einwandfrei
mit frischem Login → Root Cause war rein Client-State, nicht Server.

Nach dem Fix wird bei einem 401/`Unauthenticated`:

1. **Erst** ein echter Token-Refresh via `keycloak.updateToken(-1)` versucht.
2. Wenn der Refresh scheitert oder kein neuer Token kommt: sofortiger
   `keycloak.login()` (Redirect zur Keycloak-Login-Seite), statt einen
   token-losen Apollo-Client in State zu setzen.
3. Auf reine Netzwerkfehler retryt der Error-Link **nicht** mehr
   unbegrenzt — Errors propagieren zum Caller, `errorPolicy: 'all'`
   liefert das UI-Feedback.

## Root Cause (final)

Zwei Bugs im Client verstärkten sich:

**Bug 1** — [client/src/lib/apollo-client.ts](client/src/lib/apollo-client.ts) `errorLink`:

```ts
if (networkError) {
  …
  // On network errors we can retry
  return forward(operation)   // ❌ unbedingt, kein Limit
}
```

`forward(operation)` im Error-Link bei jedem Netzwerkfehler = tight
infinite retry loop bei anhaltendem Fehler. Retry-Semantik gehört in
`@apollo/client/link/retry` (mit Backoff + Max-Attempts), nicht in den
Error-Link.

**Bug 2** — [client/src/components/layout/AppLayout.tsx](client/src/components/layout/AppLayout.tsx) `handleAuthError`:

```ts
const handleAuthError = () => {
  const unauthenticatedClient = createApolloClient(undefined, graphqlConfig.url)
  setClient(unauthenticatedClient) // ❌ neuer Client ohne Token in State
}
```

Setzt bei `authError` einen neuen Apollo-Client **ohne Token** in
Component-State. Das triggert Re-Render aller `useQuery`-Konsumenten,
deren `<ApolloProvider client={…}>` sich ändert → in-flight Requests
werden gecancelt → neue Requests firen ohne Token → Server → 401 →
`authError` → **Loop.**

Auslöser nach Reboot (Quick-Task 260901-rar): Während der API-Server
via Neo4j-APOC-Perm-Bug down war, ist der Keycloak-Access-Token im
bereits offenen Browser-Tab abgelaufen. Der `onTokenExpired`-Refresh
konnte den toten Server nicht erreichen, ist gescheitert. Als der
Server durch die Neo4j-Reparatur zurückkam, feuerte der Tab seinen
ersten Query mit dem alten Token → 401 → obige Loop.

## Fix

- [client/src/components/layout/AppLayout.tsx](client/src/components/layout/AppLayout.tsx):
  `handleAuthError` versucht jetzt `keycloak.updateToken(-1)` (echter
  Refresh), fällt bei Misserfolg auf `keycloak.login()` zurück, statt
  einen token-losen Client zu erzeugen.

- [client/src/lib/apollo-client.ts](client/src/lib/apollo-client.ts):
  `errorLink`-`forward(operation)`-Fallback auf Netzwerkfehler entfernt.
  `authError`-Dispatch bleibt erhalten (Fix 1 in AppLayout entkoppelt
  ihn vom Loop-Verhalten).

Kommentare am Code verweisen auf diese Quick-Task-ID (260901-alf), damit
niemand die Änderung ohne Kontext rückgängig macht.

## Deploy

- `docker compose build client`
- `docker compose up -d --force-recreate client`
- Client-Container läuft, `https://eam.wien.arthofer.dev/` → 307
  (Next.js Lang-Redirect, healthy).

## Verifikation (UAT)

Empfohlen vom User zu prüfen:

1. Im bestehenden (looping) Tab jetzt reload → sollte einmal 401
   bekommen, dann direkt zur Keycloak-Login-Seite umgeleitet werden,
   nicht mehr loopen.
2. Nach nächstem Host-Reboot: Neo4j-Fix aus 260901-rar hält den API
   automatisch am Leben; falls Tokens dennoch inzwischen ablaufen,
   greift jetzt der Re-Login-Pfad statt des Loops.

## Geänderte Dateien

- `client/src/components/layout/AppLayout.tsx`
- `client/src/lib/apollo-client.ts`
- `.planning/quick/20260901-auth-loop-fix/PLAN.md` (neu)
- `.planning/quick/20260901-auth-loop-fix/SUMMARY.md` (neu)
- `.planning/STATE.md` (Quick-Tasks-Tabelle)

## Follow-ups

- Optional: echtes `@apollo/client/link/retry` mit Backoff einführen,
  falls transiente Netzwerkfehler öfter auftreten.
- Optional: APQ-Konfiguration überprüfen — Server warnt "Persisted
  queries are enabled and are using an unbounded cache".
- Optional: `checkLoginIframe: false` überdenken — verhindert
  Keycloaks aktive Session-Prüfung, was den ganzen abgelaufenen-Token-
  im-offenen-Tab-Fall überhaupt erst schwer erkennbar macht.

## Postscript (2026-09-01): tatsächliche Root Cause war Multi-Tab-Race

Die Two-Bug-Analyse oben war unvollständig. Nach dem Deploy loopte der Tab
weiter. Temporäre Server-Query-Logging + Client-`setSelectedCompanyId`-Trace
haben gezeigt: es war **kein Auth-Loop**, sondern ein
**Cross-Tab-Ping-Pong über `localStorage.selectedCompanyId:v1`** in
`client/src/contexts/CompanyContext.tsx`.

Ablauf (ein zweiter offener Tab derselben App):

1. Tab A schreibt `selectedCompanyId = X` → `localStorage.setItem(...)`.
2. Tab B empfängt `storage`-Event → `setSelectedCompanyIdState(X)`.
3. Tab B's "auto-select / clean invalid selection"-Effect feuert wegen des
   State-Change, entscheidet dass ein anderer Wert "besser" ist (z. B.
   erste verfügbare Company oder null bei transient leerem `companies`-Array)
   → schreibt localStorage neu.
4. Tab A empfängt `storage`-Event, wechselt seinerseits Wert → Loop.

Serverseitig sichtbar als ~150–200 req/s pro Tab, wobei die Queries
zwischen `where={company: eq: 76d4…}` und `vars={}` toggeln.

User-side Fix im Handbetrieb: den zweiten Tab schließen.

Struktureller Fix (nicht in dieser Quick-Task angegangen — separate Task
wenn Multi-Tab-Nutzung wichtig wird): CompanyContext braucht Guards, dass
der `storage`-Event-Pfad NICHT die "auto-select / clean"-Logik retriggert
(z. B. Ref-basierter Suppressor für "der nächste State-Change kommt aus
localStorage-Reconcile, nicht daraus resultierend schreiben") oder ein
Debounce, oder Ausklinken der cross-tab-Sync mit Trust-First-Write-Wins.

## Was aus dem gescheiterten Debug wirklich als Fix bleibt

Die zwei ursprünglichen Änderungen (commit b7816ab) sind trotzdem echte
Bugfixes, auch wenn sie den beobachteten Loop nicht getroffen haben:

- `apollo-client.ts`: kein unbedingtes `forward(operation)` mehr auf
  Netzwerkfehlern (unbegrenzter Retry-Loop bei persistenter Netzwerk-
  Störung — real, wenn auch nicht Ursache dieses konkreten Falls).
- `AppLayout.tsx`: `handleAuthError` erzeugt keinen token-losen Apollo-
  Client mehr in State (löst Cascading-remount aller `useQuery`-Konsumenten
  bei 401 — real, wenn auch hier nicht Ursache).

Als Nachtrag (heutiger Cleanup-Commit) noch der Case-Sensitivity-Bug im
gleichen errorLink:

- `apollo-client.ts`: `.includes('unauthenticated')` matched den vom Server
  gesendeten `"Unauthenticated"` (großes U) case-sensitive nicht. Fix auf
  `.toLowerCase().includes(...)`. Ohne den Fix würde der `authError`-Event
  bei einem echten abgelaufenen Token nie gefeuert und der User bliebe in
  einem inhaltlich leeren UI ohne Re-Login-Redirect stecken.
