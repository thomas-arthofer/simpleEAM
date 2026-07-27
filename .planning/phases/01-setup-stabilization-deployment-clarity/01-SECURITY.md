---
phase: 01
slug: setup-stabilization-deployment-clarity
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-27
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| docs -> operator execution | Unclear or incorrect instructions lead directly to faulty runtime or cluster actions | Operational commands, config values |
| local host -> docker services | Incorrectly set env values can break auth, routing, or database paths | Environment variables, service config |
| operator -> kubernetes cluster | Helm/Secret/Ingress misconfiguration can affect availability and confidentiality | Secrets, ingress config, cluster manifests |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering | README default flow | medium | mitigate | README.md documents a strict localhost-first "Supported Path" with the optional Traefik/HTTPS path clearly isolated in its own section | closed |
| T-01-02 | Spoofing | Optional DNS/Hostnames | medium | mitigate | README.md "Optional Path" chapter states explicit DNS/hostname prerequisites plus a "not required" guardrail | closed |
| T-01-03 | Denial of Service | K8s rollout order | high | mitigate | k8s/README.md documents a fixed gate order (Asset-Sync -> Values -> Helm -> Verification) preventing out-of-order rollout | closed |
| T-01-04 | Information Disclosure | Secrets handling in k8s values/docs | high | mitigate | k8s/values.yaml uses `existingSecret*` references throughout (Keycloak, Postgres, AI stack, SearXNG) with no plaintext secret defaults; mandatory vs. optional fields (`imagePullSecrets`, `tls`) are commented explicitly | closed |
| T-01-SC | Tampering | package-manager/script execution | low | accept | No new packages introduced; only existing Yarn/shell commands and existing scripts are used | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01-SC | T-01-SC | Low-severity tampering risk via package/script execution; no new packages or scripts introduced in this phase, only pre-existing Yarn/shell commands reused | Recorded in 01-PLAN.md threat model (disposition: accept) | 2026-07-27 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-27 | 5 | 5 | 0 | gsd-secure-phase (L1 grep-depth, register authored at plan time, short-circuit per ASVS level 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-27
