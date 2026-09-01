---
id: 20260901-company-ctx-multitab-race
slug: company-ctx-multitab-race
date: 2026-09-01
status: in-progress
type: quick
---

# Quick Task: CompanyContext Multi-Tab-Race strukturell abschalten

## Problem

Zwei offene Tabs derselben App loopen sich gegenseitig zu ~150–200 req/s
pro Tab tot, weil `CompanyContext` `localStorage.selectedCompanyId:v1`
über den `storage`-Event synchronisiert und derselbe Effect, der den
State bei Storage-Change setzt, auch bei jedem transient-empty
`companies`-Zustand `localStorage.removeItem`/`setItem` aufruft.

Detaillierter Ablauf (siehe auch quick task 260901-alf Postscript):

1. Tab A refetcht `GET_PERSON_BY_EMAIL` / `GET_COMPANIES`. Für einen
   Moment ist `companies=[]` und `loading=false`.
2. Tab A auto-select-Effect trifft den "no companies available"-Zweig,
   ruft `localStorage.removeItem(STORAGE_KEY)`.
3. Tab B empfängt `storage`-Event mit `newValue=null`,
   `setSelectedCompanyIdState(null)`.
4. Tab B's auto-select-Effect feuert wegen State-Change,
   `selectedCompanyId=null` und `companies` ist bei Tab B populiert →
   "no selection"-Zweig picks first company, ruft
   `localStorage.setItem(STORAGE_KEY, X)`.
5. Tab A empfängt `storage`-Event mit `newValue=X`,
   `setSelectedCompanyIdState(X)`.
6. Tab A auto-select-Effect feuert, refetcht wieder ihre companies
   Query → ist wieder transient leer → GOTO 2.

## Fix (Option A, chirurgisch)

`localStorage.setItem` / `localStorage.removeItem` aus dem auto-select-
Effekt komplett entfernen. Persistenz zu localStorage nur noch aus dem
public `setSelectedCompanyId(id)` — dem einzigen User-facing Setter
(User-Klick im Dropdown). Auto-Select bleibt lokal pro Tab.

Konsequenzen:

- Cross-Tab-Sync bei User-Aktionen (Dropdown-Wechsel) bleibt intakt:
  `setSelectedCompanyId(id)` schreibt weiterhin localStorage → anderer
  Tab bekommt storage-Event → setState → Effect greift nicht ins
  localStorage ein, weil `hasSelection=true` → return early.
- Cross-Tab-Sync bei Auto-Select (System-getrieben) fällt weg. Wenn
  Tab A frisch bootet und sich die erste verfügbare Company auto-
  auswählt, informiert es Tab B darüber nicht. Tab B pickt sich
  parallel selber die erste verfügbare Company. Beide landen bei
  demselben Ergebnis (deterministisch, weil `companies[0]` derselbe
  ist) → keine sichtbare Divergenz.
- "Invalid selected id" (Company gelöscht seit letzter Session)
  wird nicht mehr in localStorage weggeräumt — beim nächsten Boot
  fällt die invalid-selection-Auto-Select-Logik wieder rein und
  wählt konsistent die erste verfügbare. Verlust: einmalige log-
  Warnung pro Session statt einmalig. Akzeptabel.

## Nicht in Scope

- Ref-basierter "just-reconciled-from-storage"-Guard (komplexer,
  subtile Race bei React-Batching).
- Kompletter Wegfall der Cross-Tab-Sync (User-Erwartung: wenn ich in
  einem Tab Company wechsle, soll der andere Tab mitziehen).
- Debouncing / Version-Counter auf localStorage-Writes.

## UAT

1. Zwei Tabs derselben App öffnen (`eam.wien.arthofer.dev/de`).
2. Beobachten (im `docker compose logs server` mit temporärem
   Query-Logger oder in DevTools Network): keine ~150 req/s Storm mehr.
3. In Tab A eine andere Company aus dem Dropdown wählen → Tab B soll
   auf die gleiche Company wechseln (Cross-Tab-Sync für User-Aktionen
   bleibt intakt).
4. Refetch triggern (z. B. Mutation), keine Reboots des ganzen
   Query-Sets in beiden Tabs.
