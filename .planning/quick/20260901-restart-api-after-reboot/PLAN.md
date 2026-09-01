---
id: 20260901-restart-api-after-reboot
slug: restart-api-after-reboot
date: 2026-09-01
status: in-progress
type: quick
---

# Quick Task: API-Stack nach Reboot vollständig neu starten

## Problem

Nach einem Host-Reboot ist der GraphQL-API-Container (`server`, Port 4000) nicht
wieder hochgekommen. Ursache laut `docker compose logs server`:

- Neo4j war beim Start von `server` noch nicht bereit
  (`ECONNREFUSED 172.19.0.7:7687`).
- `server` hat 5 Retries versucht, aufgegeben und ist mit
  `Critical error: Could not establish Neo4j connection.` beendet worden.
- Neo4j ist inzwischen wieder oben (Uptime < 10 s zum Zeitpunkt der Diagnose),
  aber `server` hat sich nicht selbst neu gestartet.

## Aktueller Zustand (vor Fix)

- `docker compose ps` zeigt `server` als frisch neugestartet, tatsächlich aber
  crash-loop / down (`curl http://localhost:4000/health` → connection reset).
- `ai-server` (Port 4001) läuft und antwortet mit 200.
- Neo4j läuft (seit wenigen Sekunden).

## Vorgehen

1. `docker compose up -d --force-recreate server client` — recreated den
   GraphQL-Server und Client sauber, jetzt wo Neo4j erreichbar ist.
2. Warten bis `server` healthy ist (Retry-Schleife auf `/health`).
3. Health-Checks: GraphQL `:4000/health`, Client `:3000`, AI-Server `:4001/health`.
4. Ergebnis in `SUMMARY.md` + STATE.md Quick-Tasks-Tabelle festhalten.

## Nicht in Scope

- Root-Cause-Fix (z. B. depends_on-condition/healthcheck-Tuning, damit `server`
  bei Reboot automatisch auf Neo4j wartet) — separater Task, siehe Follow-ups.

## Follow-ups

- Healthcheck/`depends_on: condition: service_healthy` für Neo4j → server prüfen,
  damit dieser Fall nach zukünftigen Reboots automatisch abgefangen wird.
