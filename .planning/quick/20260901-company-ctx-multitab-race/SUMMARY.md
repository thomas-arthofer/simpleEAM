---
id: 20260901-company-ctx-multitab-race
slug: company-ctx-multitab-race
date: 2026-09-01
status: complete
type: quick
---

# Summary: CompanyContext Multi-Tab-Race strukturell abschalten

## Ergebnis

Der cross-tab-`storage`-Event-Ping-Pong über
`localStorage.selectedCompanyId:v1` in
[client/src/contexts/CompanyContext.tsx](client/src/contexts/CompanyContext.tsx)
ist strukturell nicht mehr möglich. Zwei offene Tabs derselben App
loopen sich nicht mehr gegenseitig zu ~150–200 req/s pro Tab tot.

## Fix (Option A, chirurgisch)

`localStorage.setItem` / `localStorage.removeItem` aus **allen** auto-select-
Branches im "sensible preselection"-Effekt entfernt. Persistenz nach
`localStorage.selectedCompanyId:v1` erfolgt nur noch aus dem public
`setSelectedCompanyId(id: string)`-Setter — dem einzigen User-facing
Aufrufpunkt (Dropdown-Klick).

Betroffene Branches (alle localStorage-Aufrufe entfernt):

- "no companies available" → nur noch `setSelectedCompanyIdState(null)`,
  kein `localStorage.removeItem` mehr.
- "single company auto-select" → nur noch `setSelectedCompanyIdState(id)`,
  kein `localStorage.setItem` mehr.
- "no selection, pick first" → dito.
- "invalid selection, switch to first" → dito.

Cross-Tab-Sync bei User-Aktion bleibt intakt: `setSelectedCompanyId(id)`
schreibt weiterhin localStorage → anderer Tab bekommt `storage`-Event →
`setSelectedCompanyIdState(newId)` → im auto-select-Effekt gilt
`hasSelection=true` → return early, kein weiterer Schreibvorgang.

## Warum das den Loop bricht

Der Loop brauchte, dass **beide Tabs** in ihrem auto-select-Effekt
localStorage schreiben. Sobald nur noch User-Aktionen schreiben, ist
das System stabil:

- Tab A refetcht seine Companies, ist transient leer → clear State
  (lokal), **kein** localStorage-Write → Tab B bekommt keinen
  storage-Event → keine Kettenreaktion.
- Wenn Tab A's `companies` wieder populiert ist, pickt Tab A's Effect
  die erste verfügbare Company (lokal), **kein** localStorage-Write.
  Tab B pickt parallel dieselbe erste Company (Determinismus über
  `companies[0]`).

## Trade-off

- Auto-Select ist jetzt reine Session-Local-Semantik. Wenn ein User
  in Tab A frisch bootet und System-getrieben die erste Company
  bekommt (kein Dropdown-Klick), sieht Tab B davon nichts. In der
  Praxis irrelevant, weil beide Tabs deterministisch dieselbe
  Company picken.
- "Invalid selectedCompanyId aus vorheriger Session" wird nicht mehr
  aus localStorage weggeräumt. Beim nächsten Boot triggert der
  invalid-selection-Zweig einmalig eine Warnung und picked wieder
  die erste verfügbare. Kosmetisch, nicht funktional.

## Geänderte Dateien

- `client/src/contexts/CompanyContext.tsx`
- `.planning/quick/20260901-company-ctx-multitab-race/PLAN.md` (neu)
- `.planning/quick/20260901-company-ctx-multitab-race/SUMMARY.md` (neu)
- `.planning/STATE.md` (Quick-Tasks-Tabelle)

## Deploy

- `docker compose build client`
- `docker compose up -d --force-recreate client`
- Rauchtest verifiziert: nur noch **eine** `localStorage.setItem`-
  Stelle im deployed Container-Source-Bundle, und die liegt im public
  `setSelectedCompanyId(id)`-Setter (Zeile 185), außerhalb des auto-
  select-Effekts.

## UAT

Empfehlung an User:

1. Zwei Tabs von `https://eam.wien.arthofer.dev/de` öffnen.
2. Beobachten (DevTools Network in beiden Tabs): keine ~150 req/s
   Storm. Queries kommen normal, ohne Cancellation-Spam.
3. In Tab A eine andere Company aus dem Dropdown wählen → Tab B soll
   auf die gleiche Company wechseln (Cross-Tab-Sync für User-Aktion
   bleibt intakt).
4. Beobachten: Tab B refetcht dann seinen Query-Set einmal (erwartet,
   weil `selectedCompanyId` sich geändert hat), aber KEIN Loop.

## Follow-ups

- Optional: Ref-basierter Guard, damit der auto-select-Effekt bei
  Storage-Event-triggerten State-Changes zusätzlich früh returned
  (Belt-and-suspenders, falls jemand localStorage-Writes wieder in
  den Effekt einbaut).
- Optional: gleicher `useState`+`localStorage`+`storage`-Event-Muster
  in `lens-settings.ts` prüfen (`SELECTED_LENS_EVENT`), ob der auch
  eine Multi-Tab-Race hat.
