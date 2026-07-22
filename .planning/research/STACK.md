# Technology Stack

**Project:** simpleEAM brownfield milestone - setup stabilization and sovereignty redesign
**Researched:** 2026-07-22
**Scope:** next milestone only
**Overall confidence:** HIGH

## Recommendation Summary

Use the existing architectural core and stabilize operations around it instead of replacing it. Keep Next.js 15, React 19, GraphQL, Neo4j 5.26 LTS, Keycloak 26, and Temporal. Standardize local development on Docker Compose with direct localhost ports as the default path, and treat hostname-based Traefik TLS as an optional parity mode, not the baseline. Standardize Kubernetes documentation on Helm plus ingress-nginx or the cluster's default ingress, with cert-manager used only where the cluster actually owns routable DNS and certificate issuance. For local Kubernetes documentation, prefer kind as the reference environment because its 2026 ingress support is straightforward and reproducible for brownfield validation.

For the sovereignty redesign, do not add a new policy engine or event platform in this milestone. Keep the logic inside the existing GraphQL plus background worker architecture, but consolidate evaluation into one canonical service that performs explicit per-element checks across dependency chains and can be invoked synchronously for detail views and asynchronously for recomputation.

## Recommended Stack

### Core Application Stack

| Technology | Recommended Version | Purpose | Why | Confidence |
|------------|---------------------|---------|-----|------------|
| Next.js | 15.x | Frontend application shell and SSR/RSC runtime | Already in place, aligned with React 19, and still the correct fit for the existing client. Brownfield value comes from stabilizing request-time APIs and runtime config behavior, not from replacing the framework. | HIGH |
| React | 19.x | UI runtime | Required by Next.js 15 and already consistent with the repo direction. No milestone value in changing it. | HIGH |
| Material UI | 7.x | Design system and application UI components | Already adopted and integrated with Next.js App Router. Rework risk is higher than benefit for this milestone. | HIGH |
| Apollo Client | current repo line | GraphQL client | Preserves existing client data access patterns and generated types. A brownfield stabilization milestone should not swap clients. | HIGH |
| GraphQL server on Node.js | current repo line on Node 20 LTS or 22 LTS | API and orchestration boundary | Fits the existing data model and keeps sovereignty evaluation close to domain entities and auth context. | HIGH |
| Neo4j | 5.26 LTS for continuity now; plan later evaluation of 2026.xx separately | EAM graph system of record | The repo is already pinned to 5.26. The next milestone is operational stabilization, so stay on the LTS line instead of mixing a database major/runtime shift into setup and sovereignty work. | HIGH |
| Keycloak | 26.6 patch line | Identity and access management | Already present, current enough, and compatible with reverse proxy deployment. Configuration hygiene matters more than replacement. | HIGH |
| Temporal | current self-hosted OSS line already used by repo | Durable background workflows | Already supports analytics and AI workers. Reuse it for sovereignty recomputation jobs if needed, but do not make it mandatory for request-path evaluation. | MEDIUM |

### Local Runtime Pattern

| Technology | Recommended Version | Purpose | Why | Confidence |
|------------|---------------------|---------|-----|------------|
| Docker Compose | Compose v2 | Default local stack runtime | Best brownfield fit because the repo already provides compose wiring, persistent local volumes, and service-level host ports. Fastest path to reproducible startup. | HIGH |
| Docker Engine | current supported engine | Container runtime | Required by both Compose and kind. Keep one container runtime for both local paths to reduce operator confusion. | HIGH |
| Traefik | optional parity mode only | Local hostname and TLS parity testing | The current Compose file assumes an external Traefik network and DNS-like hostnames. That is too brittle for the default developer path. Keep Traefik only for parity testing and document it as opt-in. | HIGH |
| mkcert | latest stable | Local trusted certificates when hostname-based HTTPS is needed | Safer and simpler for local TLS than ACME automation or public DNS tricks. Appropriate for brownfield developer workstations. | HIGH |
| dnsmasq or hosts file entries | minimal local name resolution only when parity mode is used | Resolve local HTTPS hostnames | Needed only if the team insists on subdomain parity locally. This should not be required for baseline startup. | MEDIUM |

### Kubernetes Delivery Stack

| Technology | Recommended Version | Purpose | Why | Confidence |
|------------|---------------------|---------|-----|------------|
| Helm | 3.10+ | Deployment packaging | Already how the repo ships Kubernetes manifests. Keep it and improve values documentation instead of rewriting into another packaging system. | HIGH |
| kind | 0.32.x | Reference local Kubernetes environment | In 2026, kind has native ingress support through cloud-provider-kind and is the most reproducible local documentation target for Linux developer machines using Docker. | HIGH |
| ingress-nginx or cluster default ingress class | current supported chart or managed install | HTTP ingress controller | The chart already models ingress resources. Document one supported ingress path clearly instead of implying any controller will work the same. | HIGH |
| cert-manager | 1.21.x or cluster-supported current line | Automated certificate management in real clusters | Correct for cluster environments with real DNS or internal PKI. Wrong default for local developer clusters unless the team intentionally boots a local CA workflow. | HIGH |
| SelfSigned plus CA issuer in cert-manager | local cluster only, optional | Local TLS bootstrap for Kubernetes demos | Acceptable for cluster-local TLS testing when the team needs HTTPS semantics in kind, but it is a documentation branch, not the default install path. | MEDIUM |

### Sovereignty Evaluation Stack

| Library or Pattern | Recommended Choice | Purpose | When to Use | Confidence |
|--------------------|-------------------|---------|-------------|------------|
| Canonical domain evaluation service | Single TypeScript service inside server domain layer | Evaluate explicit per-element sovereignty and chain violations | Use for all on-demand reads and recomputation entry points so UI and background workers cannot diverge. | HIGH |
| Graph traversal in application code backed by existing graph queries | Keep in current Node/GraphQL service layer | Resolve dependency chains and compare requirement vs achieved values | Use in this milestone because it minimizes data-model churn and keeps reasoning visible in code review and tests. | HIGH |
| Temporal-triggered recomputation | Optional background refresh only | Rebuild cached impact summaries after edits/imports | Use only for non-blocking recalculation or bulk import aftermath. Do not require Temporal for every detail page render. | MEDIUM |
| Materialized status fields or cache tables | Use only if profiling proves request latency problem | Speed repeated reads of sovereignty impact summaries | Defer until after canonical logic exists and correctness is proven. Premature denormalization will hide brownfield defects. | MEDIUM |

## Operational Approach

### 1. Default local developer mode

The default local mode should be port-first and proxy-optional.

Required behavior:

- `docker compose up -d` must start the core stack without any pre-existing external Traefik network.
- The documented primary URLs must be localhost-based for client, API, Keycloak, Neo4j, Temporal UI, analytics, and Excalidraw.
- The client runtime config must support local direct URLs cleanly instead of assuming `https://<subdomain>.<base-domain>` in all cases.

Rationale:

The current repo exposes host ports for every major service, but the Compose defaults still assume hostname-based HTTPS and an external Traefik network. That mismatch is the main brownfield reliability problem. Operators should not need DNS, ACME, or a separately managed reverse proxy just to boot the platform locally.

Confidence: HIGH

### 2. Optional local parity mode

Keep a second documented mode for production-like hostnames and HTTPS.

Recommended pattern:

- Use Traefik only in an explicit local parity profile.
- Use mkcert-generated certificates or a documented local CA.
- Use a small, explicit hostname set such as `eam.local`, `api.eam.local`, and `auth.eam.local`.
- Keep Keycloak in reverse-proxy edge or re-encrypt mode with trusted forwarded headers, not ad hoc passthrough experiments.

Rationale:

Some auth and cookie behaviors are worth testing with real hostnames and HTTPS. That does not justify making hostname TLS the mandatory day-one path for every developer.

Confidence: HIGH

### 3. Kubernetes documentation baseline

Document one primary cluster path and one local validation path.

Primary documented production-style path:

- Helm chart deployment
- one supported ingress class
- persistent volumes for Neo4j, Keycloak DB, ClickHouse, and CubeStore
- image pull secrets when GHCR images are private
- cert-manager only when DNS and issuer ownership are real

Primary documented local cluster path:

- kind cluster
- ingress enabled
- local image loading or pullable images with non-`latest` tags
- optional self-signed cluster CA only if HTTPS behavior must be exercised

Rationale:

The current chart is already capable, but the docs understate prerequisites and blur local and real-cluster concerns. Brownfield documentation should sharply separate them.

Confidence: HIGH

### 4. Sovereignty redesign execution model

Implement explicit per-element sovereignty checks as a domain rule, not as a UI convention and not as a separate platform.

Recommended flow:

- Business requirement nodes define required sovereignty levels.
- Each dependent application and infrastructure element carries its own explicit achieved values.
- A canonical evaluator walks dependency chains and emits all violations, all missing values, and affected upstream business capabilities.
- The same evaluator is used by detail views, diagram status calculation, imports, and background recomputation.

Rationale:

The concept document already identifies two diverging calculation paths and inherited-value ambiguity. The right stack decision is consolidation and testability, not new infrastructure.

Confidence: HIGH

## Brownfield-Safe Choices

| Area | Recommended Choice | Why It Is Safe | Confidence |
|------|--------------------|----------------|------------|
| Local startup | Default to direct published ports | Uses the repo's existing published ports and avoids hidden network dependencies | HIGH |
| Compose networking | Internal app network plus optional proxy network profile | Prevents hard failure when a developer does not already run a Traefik network | HIGH |
| Keycloak proxying | Reverse proxy with explicit forwarded-header configuration | Matches current Keycloak guidance and current repo settings more safely than ad hoc proxy behavior | HIGH |
| Kubernetes ingress | Require explicit ingress class and DNS/TLS prerequisites in docs | Removes ambiguity that currently causes setup drift between clusters | HIGH |
| Sovereignty logic | Single evaluation implementation and shared tests | Eliminates already-documented divergence between UI and background computation | HIGH |
| Image versioning | Pin images to tested tags, not floating `latest` | Prevents local and cluster drift across rebuilds and pull events | HIGH |

## Retire or Avoid

| Item | Recommendation | Why to Retire or Avoid | Confidence |
|------|----------------|------------------------|------------|
| External Traefik network as a hidden prerequisite for local Compose | Retire as default requirement | It makes local startup fail before the application stack is even tested and is not visible from standard Docker expectations | HIGH |
| Public-DNS-style HTTPS as the only documented local path | Retire as the primary path | It introduces brittle workstation-specific DNS, certificate, and router dependencies | HIGH |
| Floating image tags such as `cubejs/cube:latest`, `cubejs/cubestore:latest`, and Helm `imageTag: latest` | Retire | `latest` breaks reproducibility, especially in kind where pull behavior differs and cached images mask drift | HIGH |
| cert-manager as an unconditional local prerequisite | Avoid | It is appropriate for real cluster certificate automation, not for the fastest stable local startup path | HIGH |
| SelfSigned issuer as a production answer | Avoid | cert-manager treats it as a bootstrap/testing mechanism, not a production trust model | HIGH |
| Separate sovereignty calculation implementations in UI and background code | Retire | Brownfield correctness depends on one source of truth; duplicate evaluators will keep disagreeing | HIGH |
| New external policy engine for this milestone | Avoid | It adds integration and operations cost without solving the immediate inherited-value defect | MEDIUM |
| Kubernetes local docs based on mutable `:latest` images | Avoid | kind defaults and Kubernetes pull semantics make `:latest` especially unreliable for reproducible validation | HIGH |

## Version and Packaging Guidance

### Keep now

- Next.js 15 and React 19
- Neo4j 5.26 LTS for this milestone
- Keycloak 26 patch line
- Helm chart deployment model
- Temporal for background jobs already present in the platform

### Change in this milestone

- Pin all runtime images to explicit tested tags in Compose and Helm values.
- Split local documentation into `baseline localhost` and `optional parity HTTPS` modes.
- Make Traefik and custom hostnames optional rather than assumed.
- Document explicit Kubernetes prerequisites: ingress class, storage class, image pull secret, DNS ownership, and TLS issuer ownership.
- Centralize sovereignty evaluation into one server-side implementation with test coverage.

### Defer

- Neo4j move from 5.26 LTS to 2026 current line
- Gateway API migration
- service mesh or mTLS rollout
- external policy engine adoption
- deeper analytics or event-driven sovereignty materialization

## Installation and Operations Commands

```bash
# Local baseline runtime
cp env.template .env
docker compose up -d

# Optional AI profile
COMPOSE_PROFILES=ai docker compose up -d

# Client development loop
cd client
yarn dev

# Reference local Kubernetes environment
kind create cluster --name simpleeam --wait 60s

# If using locally built images, avoid :latest and load explicit tags
kind load docker-image ghcr.io/example/simpleeam-client:dev-2026-07-22 --name simpleeam
kind load docker-image ghcr.io/example/simpleeam-server:dev-2026-07-22 --name simpleeam

# Deploy chart after syncing asset ConfigMaps
./scripts/sync-k8s-asset-configmaps.sh \
  --namespace nextgen-eam \
  --release nextgen-eam \
  --values k8s/values.yaml

cd k8s
helm upgrade --install nextgen-eam . -f my-values.yaml -n nextgen-eam --create-namespace
```

## Evidence and Rationale Notes

- The repo already exposes localhost ports for the whole stack, which supports a direct local mode today.
- The current Compose file still hardwires runtime URLs and labels around subdomain-based HTTPS and an external Traefik network, which is the brittle part to demote from default status.
- The Helm chart already assumes ingress and optional cert-manager, so the documentation gap is primarily explicit prerequisites and environment separation.
- Keycloak's 2026 reverse proxy guidance still supports the current `xforwarded` pattern, but only when the proxy path is intentionally configured and trusted.
- cert-manager's self-signed issuer remains a bootstrap/testing tool, not a production trust recommendation.
- kind's current guidance makes it a strong reference environment for local Kubernetes ingress testing, and its image loading behavior reinforces the need to avoid `:latest`.
- Neo4j's current docs distinguish the 2026 current line from the 5.26 LTS line. For this brownfield milestone, staying on the existing LTS is the safer operational choice.

## Sources

- Repository state: README.md, k8s/README.md, compose.yml, env.template, eam-konzept.md, .planning/PROJECT.md
- Next.js 15 upgrade guide
- Keycloak reverse proxy guide
- cert-manager documentation and self-signed issuer guidance
- kind quick start and ingress guides
- Neo4j Docker operations manual