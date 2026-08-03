---
phase: quick-260803-cny
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - compose.yml
  - docker-compose.override.yml
autonomous: true
requirements:
  - OPS-LOG-LIMIT-01
user_setup: []

must_haves:
  truths:
    - "No container can grow an unbounded json-file log; every service caps at max-size 50m x max-file 5 (250MB hard ceiling per service)."
    - "docker compose config renders the merged stack without YAML errors and every service shows json-file logging with max-size 50m and max-file 5."
  artifacts:
    - "compose.yml with a single reusable x-logging anchor applied to all 16 services."
    - "docker-compose.override.yml traefik service carrying the same logging limits (only service defined solely in override)."
  key_links:
    - "The &default-logging anchor must be defined before services: so every *default-logging alias resolves within compose.yml."
    - "YAML anchors do NOT cross files — traefik in override.yml needs its own inline logging block, not the compose.yml alias."
---

<objective>
Cap container log growth for the entire Docker Compose stack so no container can ever fill the host disk again (root cause of the 85GB temporal json-file log incident).

Purpose: The temporal container grew an 85GB json-file log because there were NO logging limits on any service. This plan addresses that second fault: apply `driver: json-file` with `max-size: "50m"` and `max-file: "5"` (250MB ceiling per service) to every service. The temporal schema-init loop is fixed separately by the user and is out of scope here.

Output: compose.yml with a shared `x-logging` anchor referenced by all 16 services, plus the same limits on the `traefik` service in docker-compose.override.yml (the only service defined solely in the override).
</objective>

<execution_context>
@/home/thomas/atos/simpleEAM/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@/home/thomas/atos/simpleEAM/compose.yml
@/home/thomas/atos/simpleEAM/docker-compose.override.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Define x-logging anchor and apply to all 16 services in compose.yml</name>
  <files>compose.yml</files>
  <action>
Add a top-level extension field defining a reusable logging anchor immediately BEFORE the existing `services:` key (top of file), so the anchor is defined before any alias resolves it. Use extension key `x-logging` with anchor name `default-logging`, driver `json-file`, and options `max-size: "50m"` and `max-file: "5"` (quote both option values — Compose expects strings).

Then add a `logging: *default-logging` block to EACH of the 16 services in compose.yml. The complete service list to cover: neo4j, server, ai-server, analytics-scheduler, analytics-worker, keycloak, keycloak-db, excalidraw-room, temporal-db, temporal, temporal-ui, ai-worker, clickhouse, cube, cubestore, client.

Place each `logging: *default-logging` as a sibling key under the service (same indentation as `restart:` / `networks:`), for example directly after the service's `restart: unless-stopped` line. Do NOT modify any other key (ports, environment, volumes, labels, healthcheck, depends_on, profiles) on any service. None of these 16 services currently defines a `logging:` block, so there is nothing to normalize — this is pure addition.

Do NOT place fenced code inside this action; write the anchor and aliases directly into compose.yml with the Edit tool.
  </action>
  <verify>
    <automated>cd /home/thomas/atos/simpleEAM && docker compose --profile ai config > /tmp/claude-1000/rendered-base.yml 2>/tmp/claude-1000/compose-warn.txt; echo "exit=$?"; grep -c 'max-size: "50m"' /tmp/claude-1000/rendered-base.yml</automated>
  </verify>
  <done>`docker compose --profile ai config` exits 0 (YAML well-formed; unset-env warnings are acceptable and expected), and the rendered output shows the json-file logging block with max-size 50m on all 16 services (grep count of `max-size: "50m"` is 16 when the override traefik is not yet done, 17 after Task 2). The `--profile ai` flag ensures the profiled ai-server and ai-worker services are included in the render.</done>
</task>

<task type="auto">
  <name>Task 2: Apply the same logging limits to the traefik service in docker-compose.override.yml</name>
  <files>docker-compose.override.yml</files>
  <action>
`traefik` is the ONLY service defined solely in docker-compose.override.yml (it has no base definition in compose.yml), so its logs are otherwise uncapped. Add a `logging:` block to the `traefik` service (sibling of `image:` / `restart:` / `ports:`).

YAML anchors do NOT cross files, so the `*default-logging` alias from compose.yml is NOT available here. Write the logging block inline for traefik: driver `json-file`, options `max-size: "50m"` and `max-file: "5"` (matching compose.yml exactly).

Do NOT add logging blocks to the other services in this file (server, analytics-worker, client, temporal-ui, neo4j, clickhouse, keycloak, cube, cubestore) — those are override PATCHES of services already defined in compose.yml, which already inherit the limits from Task 1 via merge. Touching them here would duplicate config for no benefit. Only traefik needs the inline block.
  </action>
  <verify>
    <automated>cd /home/thomas/atos/simpleEAM && docker compose --profile ai config > /tmp/claude-1000/rendered-merged.yml 2>/dev/null; echo "exit=$?"; grep -c 'max-size: "50m"' /tmp/claude-1000/rendered-merged.yml</automated>
  </verify>
  <done>`docker compose --profile ai config` (which auto-merges compose.yml + docker-compose.override.yml) exits 0 and the grep count of `max-size: "50m"` is 17 (16 base services + traefik). The merged traefik service renders a json-file logging block with max-size 50m and max-file 5.</done>
</task>

</tasks>

<verification>
Full-stack YAML and logging-coverage check:

```
cd /home/thomas/atos/simpleEAM
docker compose --profile ai config > /tmp/claude-1000/rendered-final.yml
echo "config exit=$?"
grep -c 'max-size: "50m"' /tmp/claude-1000/rendered-final.yml   # expect 17
grep -c 'max-file: "5"'   /tmp/claude-1000/rendered-final.yml   # expect 17
grep -c 'driver: json-file' /tmp/claude-1000/rendered-final.yml # expect 17
```

- `docker compose config` renders the merged stack with no YAML/parse errors (unset ${VAR} warnings on stderr are expected in a bare planning shell and do NOT indicate failure).
- All 17 services (16 in compose.yml + traefik in override) show the json-file driver with max-size 50m and max-file 5.
- No non-logging keys were changed on any service (spot-check the diff: only `x-logging` anchor + `logging:` blocks added).
</verification>

<success_criteria>
- Every service in the merged Compose stack caps container logs at 50m x 5 files (250MB per service ceiling); no service can produce an unbounded json-file log.
- compose.yml uses a single `x-logging: &default-logging` anchor referenced by all 16 services (DRY — one place to change limits later).
- docker-compose.override.yml traefik carries an inline logging block with identical limits.
- `docker compose --profile ai config` exits 0 and renders logging on all 17 services.
- Scope respected: no other service config (ports, env, volumes, labels, healthchecks, mem_limit) modified.
</success_criteria>

<output>
Create `.planning/quick/260803-cny-add-json-file-logging-limits-max-size-50/260803-cny-SUMMARY.md` when done.
</output>
