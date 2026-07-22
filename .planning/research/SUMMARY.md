# Project Research Summary

**Project:** simpleEAM
**Domain:** Brownfield enterprise architecture management with sovereignty traceability
**Researched:** 2026-07-22
**Confidence:** HIGH

## Executive Summary

simpleEAM is a brownfield EAM platform built around a Neo4j-backed GraphQL domain, a Next.js 15 frontend, Keycloak-based identity, and supporting workflow services. The research converges on a conservative milestone strategy: keep the current platform stack, stabilize how it is started and documented, and fix sovereignty semantics at the evaluation boundary rather than through a wider platform rewrite. Experts would treat this as a trust-restoration milestone, not a transformation milestone.

The recommended approach is to deliver the next milestone in two tightly ordered phases. First, make Docker Compose and Kubernetes setup reproducible from a clean environment by removing hidden local assumptions from the default path and documenting explicit cluster prerequisites. Second, replace inherited sovereignty achievement logic with one backend-owned chain validator that evaluates explicit per-element values, exposes missing evidence as a first-class state, and returns normalized diagnostics for detail views and diagram markers. This sequencing matters because the sovereignty redesign cannot be verified or demonstrated reliably on top of a brittle runtime contract.

The main risks are already clear from the research. For setup, the failure mode is shipping documentation without actually fixing clean-room startup assumptions around Traefik, hostnames, TLS, and brownfield cluster prerequisites. For sovereignty, the failure mode is removing inheritance in one surface while leaving divergent calculation paths, hidden fallbacks, or marker-only UX elsewhere. The mitigation is the same in both areas: establish one supported contract, validate it from a clean baseline, and route every consuming surface through the same canonical behavior.

## Key Findings

### Recommended Stack

The research strongly supports keeping the existing stack for this milestone. Next.js 15, React 19, Material UI 7, Apollo Client, the current Node-based GraphQL service, Neo4j 5.26 LTS, Keycloak 26, Helm, and the existing Temporal footprint are all appropriate to the brownfield scope. The operational gain comes from standardizing runtime contracts and pinning versions, not from replacing core technologies.

For local operations, Docker Compose with direct localhost ports should become the baseline path, while Traefik plus hostname-based TLS should be demoted to an optional parity profile. For Kubernetes, Helm remains the correct delivery mechanism, but docs must explicitly declare ingress, storage, DNS, TLS, asset sync, and image-tag prerequisites. For sovereignty, the recommended stack decision is architectural rather than infrastructural: introduce one canonical TypeScript evaluation service inside the existing server boundary and reuse it synchronously for detail reads and optionally asynchronously for recomputation.

**Core technologies:**

- Next.js 15 and React 19: frontend shell and runtime compatibility already aligned with the existing client.
- Material UI 7 and Apollo Client: preserve current UI and GraphQL access patterns to minimize brownfield churn.
- GraphQL server on Node.js: keeps sovereignty evaluation close to auth context and domain entities.
- Neo4j 5.26 LTS: safest continuity choice for this milestone while setup and semantics are being stabilized.
- Keycloak 26: retain current identity approach and focus on reverse-proxy correctness instead of replacement.
- Docker Compose v2: best default local runtime because the repository already exposes host ports and service wiring.
- Helm plus ingress-nginx or cluster-default ingress: correct Kubernetes packaging path if prerequisites are made explicit.
- Canonical backend sovereignty analysis service: single source of truth for chain evaluation and diagnostics.

### Expected Features

The milestone feature set is narrow by design. Table stakes are the capabilities required to make sovereignty traceability defensible: explicit per-element achieved ratings with no inherited fallback, chain validation from business requirement to technical foundation, explainable finding records, missing-assessment visibility, element-level diagnostics, and a reproducible runtime path that lets teams verify the feature in Docker and Kubernetes.

The strongest in-scope differentiators are still EAM-native, but they must remain consumers of the same canonical findings model. Dual-status diagram markers and full finding lists are useful in this milestone because they improve remediation workflow without expanding the core semantics. Analytics, weighting models, business-process expansion beyond the agreed contract, and broader governance dashboards should remain deferred until the trust reset is complete.

**Must have (table stakes):**

- Explicit per-element sovereignty assessment with no inherited achieved fallback.
- Chain validation from business requirement through dependent applications and infrastructure.
- Explainable findings that name the violating element, dimension, expected value, actual value, and path.
- Missing assessment and stale evidence visibility as a first-class gray or unknown state.
- Element detail diagnostics for local cause and downstream or upstream impact.
- Reproducible Docker and Kubernetes verification path for the feature.

**Should have (competitive):**

- Dual-status diagram markers that distinguish self-caused issues from downstream impact.
- Full finding lists instead of only worst-score summaries.

**Defer (v2+):**

- Blast-radius prioritization and portfolio analytics.
- Weight-based sovereignty scoring semantics.
- Broader business-process expansion beyond the agreed milestone contract.
- Historical trend reporting and executive dashboards.

### Architecture Approach

The research is explicit that sovereignty evaluation should move out of the client and become a backend-owned analysis capability. Storage already exists for the needed requirement, achieved, and evidence fields; the problem is duplicated and diverging evaluation logic. The correct architecture is one server-side analysis boundary backed by a repository or traversal adapter, additive GraphQL analysis queries, and thin client consumers for detail views, diagram markers, and rollups. Setup stabilization should remain a separate deployment-contract track over the same service topology rather than leaking environment workarounds into domain logic.

**Major components:**

1. Graph model storage: persists requirements, achieved ratings, evidence, and dependency relationships without inheritance semantics.
2. Sovereignty analysis service: traverses dependency chains, compares required versus explicit achieved values, classifies statuses, and emits canonical findings.
3. Repository or traversal adapter: encapsulates graph loading so chain semantics stay testable and do not leak into UI or resolver glue.
4. GraphQL sovereignty API: exposes normalized analysis, marker, and impact DTOs additively alongside existing CRUD.
5. Detail and diagram UI consumers: render canonical payloads without recomputing scores or inheriting values locally.
6. Deployment profile contract: defines verified Compose and Kubernetes startup assumptions, prerequisites, and validation steps.

### Critical Pitfalls

1. **Docs-only setup stabilization**: avoid by validating fresh-clone startup, login, API access, and at least one persistence path from a clean environment.
2. **Hidden local hostname, TLS, and reverse-proxy assumptions**: avoid by making localhost-first the default and moving Traefik parity into an explicit optional profile.
3. **Implicit Kubernetes prerequisites and rollout order**: avoid by publishing ingress, storage, DNS, TLS, pull-secret, and asset-sync requirements with install and upgrade checklists.
4. **Partial inheritance removal**: avoid by routing all sovereignty surfaces through one canonical evaluator and deleting or quarantining old inheritance helpers.
5. **Silent fallback scoring for missing values**: avoid by treating gray or missing as a first-class diagnostic state, not a numeric default.
6. **Markers without explanations**: avoid by making diagnostics the primary deliverable and marker rendering only a projection of canonical findings.
7. **Undefined chain semantics**: avoid by freezing traversal rules, cycle handling, scope boundaries, and deferred semantics before implementation.

## Implications for Roadmap

Based on the combined research and the milestone intent, the roadmap should stay with the two intended phases rather than introducing extra milestone slices. The important adjustment is to make each phase internally opinionated and gated by behavioral verification, because both tracks are brownfield trust repairs.

### Phase 1: Setup Stabilization for Docker and Kubernetes

**Rationale:** This must come first because every later feature demonstration, regression check, and stakeholder validation depends on a reproducible runtime contract.
**Delivers:** A supported localhost-first Docker Compose path, an optional Traefik parity profile, pinned runtime image tags, explicit Kubernetes prerequisite documentation, install and upgrade checklists, and clean-state plus dirty-state validation guidance.
**Addresses:** Reproducible local and cluster validation from the feature research.
**Uses:** Existing Compose, Helm, Keycloak, Neo4j, and service topology without a platform swap.
**Avoids:** Docs-only stabilization, hidden proxy assumptions, brownfield cluster prerequisite drift, and stale state masking defects.
**Planning note:** This phase is operationally well-understood and should not need a deep research-phase. It needs disciplined repository validation and documentation execution.

### Phase 2: Sovereignty Refactor to Explicit Chain Validation with UI Diagnostics

**Rationale:** This phase depends on a stable runtime and should start only after the team can reproduce auth, graph, and UI flows consistently.
**Delivers:** A semantic contract for sovereignty traversal, one backend-owned canonical evaluator, additive GraphQL analysis queries, explicit missing-value handling, migration inventory for newly gray elements, element detail diagnostics, and diagram markers that consume the same analysis payload.
**Addresses:** Explicit per-element assessment, chain validation, explainable findings, missing-state visibility, and UI diagnostics from the feature research.
**Uses:** The current GraphQL and Neo4j data model, existing client surfaces, and optional Temporal recomputation only where asynchronous refresh is needed.
**Implements:** The recommended backend analysis boundary and deployment-independent diagnostic contract from the architecture research.
**Avoids:** Partial inheritance removal, silent fallback scoring, marker-first delivery without explanations, undefined chain semantics, and divergent UI versus background logic.
**Planning note:** This phase should use a research-phase during planning because traversal semantics, migration blast radius, and legacy field reconciliation need deliberate specification before implementation tasks are broken down.

### Phase Ordering Rationale

- Setup stabilization is a hard dependency because sovereignty correctness cannot be validated on an unreliable local or cluster bootstrap path.
- The two phases map cleanly to the two problem classes in the research: deployment-contract repair first, domain-trust repair second.
- Keeping the milestone to these two phases reduces blast radius and aligns with the brownfield recommendation to preserve stack and data model continuity.
- Within Phase 2, the correct internal sequence is semantic contract, canonical evaluator, migration inventory, detail diagnostics, then diagram markers.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2:** Chain traversal semantics, cycle handling, multi-parent behavior, business-process scope, and legacy score-field treatment need explicit planning-time decisions.

Phases with standard patterns (skip research-phase):

- **Phase 1:** Compose and Helm stabilization are implementation-heavy but based on established repository and platform patterns rather than open-ended domain research.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                   |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Strong repository evidence and mature official guidance support the conservative keep-and-stabilize recommendation.                                     |
| Features     | MEDIUM     | Feature direction is clear from repository context and concept notes, but some prioritization is milestone-specific rather than externally benchmarked. |
| Architecture | HIGH       | The duplicated client-side logic and needed backend consolidation are directly evidenced by current repository structure and concept analysis.          |
| Pitfalls     | HIGH       | Risks are concrete, brownfield-specific, and repeatedly reinforced across runtime and sovereignty research.                                             |

**Overall confidence:** HIGH

### Gaps to Address

- Exact local default mode acceptance criteria still need to be made concrete in planning, including which optional services are excluded from base success.
- Kubernetes operator documentation needs an explicit prerequisite matrix tied to the current chart and rollout order.
- Phase 2 needs a frozen semantic contract for chain traversal, unsupported edge cases, and legacy score-field behavior before implementation starts.
- The team should quantify the migration blast radius by inventorying how many entities currently depend on inherited or missing values.

## Sources

### Primary (HIGH confidence)

- Repository sources: .planning/PROJECT.md, eam-konzept.md, compose.yml, env.template, README.md, k8s/README.md, server/src/graphql/schema.graphql, client/src/graphql/sovereigntyDetail.ts, client/src/components/sovereignty/utils.ts
- Current platform guidance referenced in research: Next.js 15 upgrade guidance, Keycloak reverse proxy guidance, cert-manager guidance, kind local cluster guidance, Neo4j Docker operations guidance

### Secondary (MEDIUM confidence)

- .planning/codebase/ARCHITECTURE.md and .planning/codebase/CONCERNS.md for existing brownfield risk framing
- ai-server/temporal/sovereignty/activities.ts and related runtime wiring for current recomputation patterns

---

_Research completed: 2026-07-22_
_Ready for roadmap: yes_
