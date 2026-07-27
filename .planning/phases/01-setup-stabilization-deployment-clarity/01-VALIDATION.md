# Phase 1 Validation Matrix

**Phase:** 01 Setup Stabilization and Deployment Clarity
**Created:** 2026-07-22
**Purpose:** Nyquist validation mapping for all planned tasks and gates.

## Task to Verify Mapping

| Task | Requirement Coverage | Verify Command(s) | Expected Signal | Evidence Location |
| --- | --- | --- | --- | --- |
| T1 Tracer | SETUP-01, SETUP-02, SETUP-03 | `test -f .env || cp env.template .env` ; `docker compose --profile ai up -d --remove-orphans` ; `TOTAL=$(docker compose --profile ai config --services | wc -l)` ; `RUNNING=$(docker compose --profile ai ps --status running --services | wc -l)` ; `[ "$RUNNING" -eq "$TOTAL" ]` ; `curl -fsS http://localhost:4000/health` ; `curl -fsS http://localhost:3000 > /dev/null` | All started services are running; GraphQL health is reachable; client responds | 01-VERIFICATION.md section SETUP-01..03 |
| T2 Docs split and env clarity | SETUP-01, SETUP-02, SETUP-03 | Preferred: `rg -n "Supported Path|Optional|Traefik|HTTPS|Nicht erforderlich fuer Supported Path|GraphQL Health|Client" README.md` ; fallback: `grep -nE "Supported Path|Optional|Traefik|HTTPS|Nicht erforderlich fuer Supported Path|GraphQL Health|Client" README.md` ; Preferred: `rg -n "BASE_DOMAIN|TRAEFIK_NETWORK|TRAEFIK_CERTRESOLVER|KEYCLOAK_URL|GRAPHQL_URL" env.template` ; fallback: `grep -nE "BASE_DOMAIN|TRAEFIK_NETWORK|TRAEFIK_CERTRESOLVER|KEYCLOAK_URL|GRAPHQL_URL" env.template` | Required structure and variables are explicitly documented | 01-VERIFICATION.md section SETUP-01..03 |
| T3 K8s prereq and rollout gates | SETUP-04, SETUP-05 | Automated fast gate: `test -n "$NAMESPACE" && test -n "$HELM_RELEASE" && test -n "$GRAPHQL_HEALTH_URL"` ; `bash scripts/sync-k8s-asset-configmaps.sh --help` ; `bash scripts/sync-cube-schema.sh` ; `helm status "$HELM_RELEASE" -n "$NAMESPACE"` ; Preferred: `rg -n "Prerequisite Matrix|Ingress|Storage|Secrets|DNS|Asset|Values|Helm|Verification|Traefik|rollout" k8s/README.md` ; fallback: `grep -nE "Prerequisite Matrix|Ingress|Storage|Secrets|DNS|Asset|Values|Helm|Verification|Traefik|rollout" k8s/README.md` ; Preferred: `rg -n "baseDomain|imagePullSecrets|neo4j|keycloak|ingress" k8s/values.yaml` ; fallback: `grep -nE "baseDomain|imagePullSecrets|neo4j|keycloak|ingress" k8s/values.yaml` ; Manual full runtime gate: `kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance="$HELM_RELEASE" -n "$NAMESPACE" --timeout=300s` ; `curl -fsS "$GRAPHQL_HEALTH_URL"` | Fast gate passes within short feedback loop; full runtime gate confirms pods ready and endpoint reachable | 01-VERIFICATION.md section SETUP-04..05 |

## Nyquist Gate Notes

- Validation artifact exists and is phase-scoped.
- Every planned task has an explicit verify path.
- Runtime checks and documentation checks are both represented.
- T3 uses a mandatory fast pre-check gate before the long `kubectl wait` readiness gate.

## Constraints

- Yarn-only policy remains in effect for package manager commands.
- If `helm` or `kubectl` are unavailable locally, T3 runtime checks are blocked and must be captured as blocker evidence.

## VALIDATION READY
