# simpleEAM Brownfield Stabilization and Sovereignty Refactor

## What This Is

This project evolves the existing simpleEAM platform, a Neo4j- and GraphQL-backed Enterprise Architecture Management system with a Next.js frontend, analytics runtime, and optional AI services. The current milestone focuses on making local Docker and Kubernetes setup reproducible from the repository state and on turning the sovereignty module from inherited scores into explicit, chain-checked evidence of where sovereignty requirements break.

## Core Value

Enterprise architecture data and sovereignty assessments must be trustworthy enough that operators can reproduce the platform and explain exactly where architectural obligations are or are not met.

## Requirements

### Validated

- ✓ Users can model and manage enterprise architecture entities and relationships across business, application, and infrastructure domains — existing
- ✓ Users can visualize architecture elements in interactive diagrams and navigate dependencies across the model — existing
- ✓ Users can authenticate through Keycloak-backed access control and use a localized web application — existing
- ✓ Operators can run the platform as a multi-service stack spanning client, GraphQL API, Neo4j, analytics services, and optional AI services — existing
- ✓ The data model already stores sovereignty requirements and achieved ratings on relevant architecture elements — existing
- ✓ Stabilize development setup so Docker Compose can start the stack without extra ad hoc development hacks and ideally without router-level DNS workarounds for required HTTPS hostnames — Phase 1/01.1
- ✓ Document Kubernetes deployment prerequisites clearly, including external dependencies such as the existing Traefik network and other cluster assumptions not obvious from the current docs — Phase 1
- ✓ Replace sovereignty value inheritance with explicit per-element ratings and evaluate violations along the dependency chain from business requirement to technical foundation, including parent/child requirement-chain consistency (YELLOW) and a three-valued GREEN/YELLOW/GREY self-status — Phase 2/02.3/03
- ✓ Surface sovereignty fit and violations when opening an element detail view, so users can see whether that element's own rating satisfies higher-level requirements — Phase 2
- ✓ Expose optional sovereignty status markers automatically for diagram elements so filled/ring-style status cues can appear directly in diagrams when elements are added, including live drag-repositioning and lifecycle-safe auto-add/cleanup — Phase 2/02.1/02.2

### Active

- [ ] Extend the chain-based sovereignty hierarchy evaluation beyond the currently-tested BusinessCapability → Application → Infrastructure chain to other EA element types/relationships, if applicable (Phase 4).

### Out of Scope

- Full deployment-platform redesign — this milestone should stabilize and document the existing Docker and Kubernetes approaches rather than replace them with a new operations model.
- Broad EAM feature expansion outside setup stabilization and sovereignty traceability — the current milestone is targeted at trust, diagnosability, and operator usability.
- Fully eliminating all grey sovereignty states at rollout — exposing missing ratings is intentional and should not be hidden by new fallback logic.

## Context

The repository is a brownfield multi-service system with a Next.js client in `client/`, a GraphQL and analytics API in `server/`, an optional AI runtime in `ai-server/`, analytics workers in `analytics/runtime/`, and deployment assets in `compose.yml` and `k8s/`. The current Docker setup is Traefik- and hostname-oriented, which makes local startup brittle when DNS or HTTPS routing assumptions are not already in place. Kubernetes deployment also depends on external cluster primitives such as ingress and persistent storage, and the user specifically called out undocumented assumptions like an existing Traefik network.

The sovereignty model is already present in the GraphQL schema and import/export surfaces, but the next milestone changes its meaning. Instead of inherited sovereignty values making unevaluated children appear compliant, each application or infrastructure element must carry its own accountable rating. The system should then compare those ratings along dependency chains, report every break, distinguish missing ratings from actual violations, and make both element-level cause and upstream impact visible in detail views and diagrams.

The concept in `eam-konzept.md` is the source document for the sovereignty redesign. It also identifies existing weaknesses that should shape planning: duplicate calculation logic between UI and background computation, an unused requirement weight field, and business-process requirements that are currently not part of the evaluation flow.

## Constraints

- **Brownfield**: Changes must fit the current service split and existing data model — the user expects no unnecessary data model expansion for the sovereignty redesign.
- **Deployment**: Docker and Kubernetes behavior must be verified against the live repository configuration, not against outdated README assumptions.
- **Evidence Model**: Sovereignty assessments must prefer explicit evidence and visible gaps over inherited defaults because hidden fallback values defeat the purpose of traceable compliance.
- **UI Consistency**: Sovereignty diagnostics must work in existing element views and diagram workflows without breaking established modeling interactions.
- **Package Manager**: Yarn-only repository — all verification and follow-up commands must use Yarn rather than npm.

## Key Decisions

| Decision                                                                                                                                                                                                                         | Rationale                                                                                                                                                                        | Outcome                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Plan this milestone as two ordered phases                                                                                                                                                                                        | The user explicitly prioritized setup stabilization before sovereignty refactoring                                                                                               | — Pending                   |
| Treat setup stabilization as behavior plus documentation work                                                                                                                                                                    | The repo docs are outdated, but success also requires the actual Docker path to become reproducible without manual hacks                                                         | — Pending                   |
| Implement sovereignty as explicit per-element ratings with chain-based violation checks                                                                                                                                          | Inherited ratings make missing assessments look compliant and prevent trustworthy diagnostics                                                                                    | — Pending                   |
| Include UI and diagram diagnostics in the sovereignty phase                                                                                                                                                                      | The user wants both element-detail visibility and optional diagram markers, not backend-only logic changes                                                                       | Shipped — Phase 2/02.1/02.2 |
| Thread a `hasRealComparison`/`comparedCapabilityIds` signal end-to-end so `analyzeBusinessCapability`'s own selfStatus and `projectMarkers()`'s diagram marker selfStatus are computed from the same data and can never disagree | A hardcoded `selfStatus: 'GREY'` in `analyzeBusinessCapability` meant the `/sovereignty` detail page and diagram markers could show contradicting colors for the same capability | Shipped — Phase 03          |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-08-07 after Phase 03 (milestone v1.0 fully validated — all Active requirements shipped)_
