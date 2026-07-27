# Phase 1 Verification Evidence

**Phase:** 01 Setup Stabilization and Deployment Clarity
**Plan:** 01
**Date:** 2026-07-27

## Requirement Evidence

### SETUP-01 - Reproducible supported startup path

Status: PASS

Evidence:
- Supported path documented in README with explicit commands:
  - `cp env.template .env`
  - `docker compose up -d`
- Runtime verification command executed:
  - `docker compose --profile ai up -d --remove-orphans`
  - `TOTAL=$(docker compose --profile ai config --services | wc -l)`
  - `RUNNING=$(docker compose --profile ai ps --status running --services | wc -l)`
- Result: `T1_VERIFY_PASS TOTAL=16 RUNNING=16`

Notes:
- Initial run exposed an external network prerequisite (`traefik`), resolved in environment defaults and reflected in docs.

### SETUP-02 - Localhost-first default, optional Traefik/HTTPS path

Status: PASS

Evidence:
- README contains explicit split:
  - Supported Path as official default
  - Optional Path for Traefik/HTTPS parity
  - Guardrail text: `Nicht erforderlich fuer Supported Path`
- Keyword verification command executed:
  - `grep -nE "Supported Path|Optional|Traefik|HTTPS|Nicht erforderlich fuer Supported Path|GraphQL Health|Client" README.md`
- Output includes all required markers.

### SETUP-03 - Minimum success gate operationalized

Status: PASS

Evidence:
- README defines a single overall compose gate (all started services must be running, including optional ones if started).
- Runtime checks executed:
  - Service count parity: `TOTAL=16`, `RUNNING=16`
  - GraphQL health endpoint reachable:
    - `curl -i http://localhost:4000/health` returned `HTTP/1.1 200 OK`
  - Client endpoint reachable:
    - `curl -I http://localhost:3000` returned `HTTP/1.1 307 Temporary Redirect` to locale route.

### SETUP-04 - Kubernetes prerequisite matrix

Status: PASS (documentation), BLOCKED (runtime tooling)

Evidence:
- `k8s/README.md` now includes explicit `Prerequisite Matrix (before Helm)` covering:
  - Ingress
  - Storage
  - Network
  - Secrets
  - DNS
  - Optional Traefik/HTTPS integration and fallback note
- Documentation verification command executed:
  - `grep -nE "Prerequisite Matrix|Ingress|Storage|Secrets|DNS|Asset|Values|Helm|Verification|Traefik|rollout" k8s/README.md`

Runtime blocker:
- `helm` binary is not available in this environment (`helm: command not found`).

### SETUP-05 - Gate-based Kubernetes rollout order

Status: PASS (documentation), PARTIAL (runtime execution)

Evidence:
- `k8s/README.md` documents fixed order:
  1. Asset sync
  2. Values preparation
  3. Helm install/upgrade
  4. Verification (fast gate before readiness wait)
- `k8s/values.yaml` comments now clarify mandatory vs optional rollout configuration (baseDomain, imagePullSecrets, ingress TLS, secret handling).
- Fast-gate prechecks executed:
  - `bash scripts/sync-k8s-asset-configmaps.sh --help` (PASS)
  - `bash scripts/sync-cube-schema.sh` (PASS)

Runtime blocker:
- `helm status "$HELM_RELEASE" -n "$NAMESPACE"` could not run due missing helm binary.
- Full runtime gate (`kubectl wait` + endpoint check) was not executed because the fast gate cannot complete without helm.

## Command Log Summary

- PASS: compose service-count gate with profile ai (`16/16`)
- PASS: GraphQL health and client reachability after service stabilization
- PASS: README/env.template marker checks
- PASS: K8s docs/values marker checks
- BLOCKED: Helm-dependent K8s runtime checks (helm missing)

## Verification Verdict

- Requirements with complete evidence: SETUP-01, SETUP-02, SETUP-03
- Requirements with documented evidence but runtime-tooling blocker: SETUP-04, SETUP-05
- Overall: Phase documentation deliverables implemented; full K8s runtime verification pending environment readiness (`helm`, and then `kubectl` runtime gate).
