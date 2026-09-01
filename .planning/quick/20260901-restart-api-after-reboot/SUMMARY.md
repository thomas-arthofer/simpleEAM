---
id: 20260901-restart-api-after-reboot
slug: restart-api-after-reboot
date: 2026-09-01
status: complete
type: quick
---

# Summary: API-Stack nach Reboot vollständig neu starten

## Ergebnis

API-Stack ist wieder komplett hochgefahren:

| Endpoint             | Status |
| -------------------- | ------ |
| GraphQL `:4000/health` | 200    |
| AI-server `:4001/health` | 200 |
| Client `:3000`       | 307 (Next.js Lang-Redirect, healthy) |
| Neo4j `:7474`        | 200    |

## Root Cause

Der eigentliche Blocker war **nicht** nur "der API-Container ist ausgefallen",
sondern **Neo4j selbst crash-loopte** nach dem Reboot mit
`ZipException: Some jar procedure files (apoc.jar) are invalid`.

Ursache: Der Neo4j-Entrypoint in `compose.yml` kopiert
`/var/lib/neo4j/labs/apoc-*.jar` als `root:root` mit Mode `0700` in den
Bind-Mount `./db/plugins/apoc.jar`. Der Neo4j-Prozess läuft aber als
`uid 7474 (neo4j)` und kann eine `700`-Datei mit root-Owner nicht lesen.
Java surfaced den Permission-Denied beim jar-scan als "invalid zip".

Vor dem Reboot lief Neo4j noch mit den alten (irgendwann historisch korrekt
gesetzten) Datei-Rechten — der Reboot hat den Entrypoint erneut ausgeführt
(`find … -delete && cp`), womit die Datei mit den falschen Rechten neu
angelegt wurde.

Folgeschaden: `server` (GraphQL, `startServer` in
`server/dist/index.js:42`) hat 5x `ECONNREFUSED 172.19.0.7:7687` geretryt
und mit `Critical error: Could not establish Neo4j connection.`
aufgegeben. Ohne Selbst-Restart-Loop blieb der API-Container down.

## Fix

**Permanent** — Entrypoint in [compose.yml](compose.yml) erweitert:

```yaml
    command:
      - |
        …
        cp "$$APJAR" /plugins/apoc.jar
        # entrypoint runs as root; neo4j process runs as uid 7474 and must be able
        # to read the jar, otherwise Java surfaces the perm error as
        # "ZipException: apoc.jar invalid" and the DB crash-loops on boot.
        chmod 0644 /plugins/apoc.jar
        exec /startup/docker-entrypoint.sh neo4j
```

**Angewandt** durch:

- `docker compose up -d --force-recreate neo4j` — neuer Entrypoint läuft,
  `apoc.jar` bekommt `0644`.
- `docker compose up -d --force-recreate server client` — GraphQL-API +
  Client verbinden sich sauber gegen den nun laufenden Neo4j.

Verifiziert: `db/plugins/apoc.jar` jetzt `-rw-r--r-- 1 root root`, Neo4j
Bolt akzeptiert Queries, GraphQL `/health` → 200.

## Geänderte Dateien

- `compose.yml` (neo4j-Service, +3 Zeilen chmod im Entrypoint)
- `.planning/quick/20260901-restart-api-after-reboot/PLAN.md` (neu)
- `.planning/quick/20260901-restart-api-after-reboot/SUMMARY.md` (neu)
- `.planning/STATE.md` (Quick-Tasks-Tabelle)

## Follow-ups

- Optional: `healthcheck` auf Neo4j definieren + `depends_on:
  condition: service_healthy` für `server`/`ai-server`, damit die API bei
  einem zukünftigen Kaltstart nicht mehr die 5-Retry-Grenze gegen ein
  noch nicht bereites Neo4j fährt. Nicht in dieser Quick Task gemacht,
  weil Neo4j selbst nun stabil in <10 s bootet und der eigentliche
  Fehler (jar-perms) behoben ist.
- Optional: `db/plugins/` in `.gitignore` prüfen (der Bind-Mount wird
  bei jedem Start neu befüllt, sollte nicht getrackt sein).
