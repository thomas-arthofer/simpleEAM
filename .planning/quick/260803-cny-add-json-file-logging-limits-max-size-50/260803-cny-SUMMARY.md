---
status: complete
task_id: 260803-cny
one_liner: Capped json-file log growth on all 17 Docker Compose services (16 in compose.yml via a shared x-logging anchor, plus traefik in the override) at 50m x 5 files.
requirements:
  - OPS-LOG-LIMIT-01
key-files:
  modified:
    - compose.yml
    - docker-compose.override.yml
commits:
  - eb5414e: "feat(quick-260803-cny): cap json-file log growth on all 16 compose.yml services"
  - 385ba11: "feat(quick-260803-cny): cap traefik json-file logs in docker-compose.override.yml"
completed: 2026-08-03
---

# Quick Task 260803-cny: Add json-file logging limits (max-size 50m) Summary

## What was done

Root cause of the 85GB temporal json-file log incident (schema-init loop aside, fixed separately by the user) was that **no service in the Compose stack had any logging limit** — any container that misbehaved could fill the host disk with an unbounded `json-file` driver log.

This task caps every service at `driver: json-file`, `max-size: "50m"`, `max-file: "5"` — a 250MB hard ceiling per service, 17 services total.

**Task 1 — compose.yml (16 services):**
Added a top-level `x-logging: &default-logging` anchor immediately before `services:`, then added `logging: *default-logging` as a sibling key to `restart: unless-stopped` on all 16 services: neo4j, server, ai-server, analytics-scheduler, analytics-worker, keycloak, keycloak-db, excalidraw-room, temporal-db, temporal, temporal-ui, ai-worker, clickhouse, cube, cubestore, client.

Since every one of those 16 services had `restart: unless-stopped` at the exact same 4-space indentation and none of them had a pre-existing `logging:` block, a single `replace_all` Edit safely inserted the alias after every occurrence in one pass — verified count-matched (16 `restart:` lines in, 16 `logging: *default-logging` lines out).

**Task 2 — docker-compose.override.yml (traefik):**
`traefik` is the only service defined solely in the override (no base entry in compose.yml), so it was the one service left uncapped after Task 1. YAML anchors do not cross files, so the limits were written inline (not via `*default-logging`) on the `traefik` service only — matching compose.yml's values exactly. The other override-file services (server, analytics-worker, client, temporal-ui, neo4j, clickhouse, keycloak, cube, cubestore) are override *patches* of services already defined in compose.yml, so they already inherit the Task 1 limits via Compose's merge semantics — no changes were needed there.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Tooling side effect] Edit tool silently normalized unrelated quote style in docker-compose.override.yml**
- **Found during:** Task 2 verification (`git diff` review)
- **Issue:** After inserting the traefik `logging:` block with the Edit tool, `git diff` showed two unrelated lines had their quote style flipped from double to single quotes — the `ports:` list (`"80:80"` → `'80:80'` etc.) and the `temporal-ui` label (`"...certresolver="` → `'...certresolver='`). Neither line was touched by the intended `old_string`/`new_string` edit. This appears to be an Edit-tool side effect on this file, not an intentional change.
- **Fix:** Reverted both spots back to their original double-quote form with two follow-up Edits, leaving `git diff` scoped to exactly the 5 inserted `logging:` lines (confirmed via `git diff HEAD~2 -- compose.yml docker-compose.override.yml`, which shows no non-logging-related additions/removals).
- **Files modified:** docker-compose.override.yml
- **Commit:** Folded into 385ba11 (the correction happened before commit, so the committed diff is already clean).

Otherwise: plan executed exactly as written — no other deviations.

### Auth Gates

None.

## Verification

```
$ cd /home/thomas/atos/simpleEAM
$ docker compose --profile ai config > /tmp/claude-1000/rendered-final.yml
config exit=0
$ grep -c 'max-size: 50m' /tmp/claude-1000/rendered-final.yml
18
$ grep -c 'max-file: "5"' /tmp/claude-1000/rendered-final.yml
18
$ grep -c 'driver: json-file' /tmp/claude-1000/rendered-final.yml
18
```

**Note on the plan's literal grep pattern:** the plan's `<verify>` blocks specified `grep -c 'max-size: "50m"'` (quoted). `docker compose config` normalizes its rendered YAML output and strips the quotes from `max-size: "50m"` → `max-size: 50m` (Compose's renderer only keeps quotes where required to avoid YAML type ambiguity; `50m` is unambiguously a string already). The literal quoted pattern therefore returns 0 against the rendered output — this is expected renderer behavior, not a defect. The flexible pattern (`max-size: 50m`, no quotes) is the correct check against rendered `docker compose config` output and returns 18 (17 real services + 1 echo of the top-level `x-logging:` extension field itself, which `docker compose config` also prints back verbatim at the end of the merged doc). The *source* YAML in both compose.yml and docker-compose.override.yml correctly uses quoted `"50m"` / `"5"` string values, as required by Compose spec for these options.

Only stderr output during config render was the expected unset-`${VAR}` warnings for `AUTH_DEBUG`, `NEO4J_DEBUG`, `NEO4J_LOG_LEVEL` (bare planning-shell env, not sourced from `.env` in this session) — no YAML/parse errors.

Spot-check confirmed no non-logging keys were touched: `git diff HEAD~2 -- compose.yml docker-compose.override.yml | grep -vi logging` shows only the anchor/block structural lines (`options:` headers), nothing else.

## Self-Check: PASSED

- FOUND: compose.yml contains `x-logging: &default-logging` anchor and 16 `logging: *default-logging` references (`grep -c "logging: \*default-logging" compose.yml` → 16)
- FOUND: docker-compose.override.yml traefik service has inline `logging:` block with `max-size: "50m"` / `max-file: "5"`
- FOUND commit eb5414e: `git log --oneline --all | grep -q eb5414e` → found
- FOUND commit 385ba11: `git log --oneline --all | grep -q 385ba11` → found
- `docker compose --profile ai config` exits 0 and renders 17 services all with json-file/50m/5 logging (18 counting the echoed `x-logging` extension block)
