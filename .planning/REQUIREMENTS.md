# Requirements: simpleEAM Brownfield Stabilization and Sovereignty Refactor

**Defined:** 2026-07-22
**Core Value:** Enterprise architecture data and sovereignty assessments must be trustworthy enough that operators can reproduce the platform and explain exactly where architectural obligations are or are not met.

## v1 Requirements

Requirements for this milestone. Each requirement maps to exactly one roadmap phase.

### Setup Stabilization

- [x] **SETUP-01**: Developer can start the baseline Docker Compose stack from a clean repository clone using the documented default path without router-level DNS hacks.
- [x] **SETUP-02**: The documented Docker setup clearly distinguishes the supported default local path from any optional Traefik or HTTPS parity path.
- [x] **SETUP-03**: The Docker setup documentation identifies required environment variables, optional services, and validation steps for confirming that the stack is usable after startup.
- [x] **SETUP-04**: Kubernetes deployment documentation lists required external dependencies and prerequisites, including ingress expectations, storage assumptions, and existing network requirements such as Traefik integration.
- [x] **SETUP-05**: Kubernetes install and upgrade documentation describes the required ordering for asset sync, Helm values preparation, and deployment verification.

### Sovereignty Evaluation

- [x] **SOV-01**: Each relevant application or infrastructure element is evaluated using its own explicit sovereignty achievement attributes instead of inherited achievement values.
- [x] **SOV-02**: The system detects sovereignty violations along dependency chains by comparing higher-level requirements to lower-level achieved values for each sovereignty dimension.
- [x] **SOV-03**: The system classifies missing sovereignty evaluations as a visible gray or unknown state instead of treating them as compliant by default.
- [x] **SOV-04**: The system returns explainable sovereignty findings that identify the violating element, affected dimension, required value, actual value, and chain context.
- [x] **SOV-05**: The sovereignty calculation logic is consistent across backend evaluation, background recomputation, and user-visible diagnostics.

### Sovereignty UX

- [ ] **SUX-01**: When a user opens an element view, the UI shows whether that element's sovereignty rating satisfies the relevant higher-level requirements.
- [ ] **SUX-02**: When sovereignty issues exist, the element view distinguishes whether the current element is the cause of the issue or is affected by an issue lower in the chain.
- [x] **SUX-03**: When a user adds elements to a diagram, the diagram can optionally display sovereignty status markers that reflect the canonical evaluation result.
- [x] **SUX-04**: Diagram sovereignty markers distinguish local violations from downstream impact using separate visual states rather than a single blended status.

## User Stories

- As a developer, I want the documented Docker path to work on a clean machine so I can verify the stack without carrying forward local routing hacks.
- As a platform operator, I want Kubernetes prerequisites and rollout steps documented explicitly so I can prepare the cluster before running Helm commands.
- As an architect, I want sovereignty checks to use explicit per-element evidence so I can trust that the platform is not reporting inherited compliance.
- As an analyst, I want an element detail view to tell me whether the element itself violates a requirement or is only affected by a downstream weakness so I know where to intervene.
- As a diagram user, I want optional sovereignty markers on inserted elements so I can spot architectural breaks directly in the visual context.

## Acceptance Criteria

- The default Docker development path is documented, reproducible, and verified against the current repository setup.
- Any optional Traefik, hostname, or HTTPS parity path is documented as optional rather than as the required default.
- Kubernetes deployment docs include a prerequisite matrix and a verified install or upgrade sequence.
- Sovereignty evaluation no longer depends on inherited achieved values for relevant elements.
- Missing sovereignty values remain visible as missing rather than being converted into compliant scores.
- The same sovereignty evaluation result drives backend outputs, detail views, and diagram markers.
- Element-level sovereignty diagnostics identify both cause and impacted context.

## Definition of Done

- The setup documentation matches the current Docker and Kubernetes implementation paths in the repository.
- The sovereignty semantic contract is implemented consistently enough that the same sample chain yields the same finding across all consuming surfaces.
- Phase-level verification can demonstrate both the setup flow and a sovereignty violation scenario on the supported runtime path.

## v2 Requirements

### Sovereignty Expansion

- **SOVX-01**: The system prioritizes weak components by blast radius, such as how many business capabilities depend on a compromised component.
- **SOVX-02**: The system incorporates business-process sovereignty requirements into the same canonical chain evaluation model.
- **SOVX-03**: The system exposes portfolio-level trend or coverage analytics for sovereignty status over time.
- **SOVX-04**: The system introduces weighted sovereignty scoring only after the unweighted chain semantics are trusted and specified.

## Out of Scope

| Feature                                                                   | Reason                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Replace Docker Compose or Helm with a new platform stack                  | The milestone is about stabilizing and documenting the current operational model, not replatforming it |
| Hide gray sovereignty states until all data is backfilled                 | Visible missing ratings are part of the intended trust model                                           |
| Introduce a new sovereignty data model with broad schema expansion        | Existing requirement and achievement fields are sufficient for the milestone goal                      |
| Deliver portfolio analytics and weighting semantics in the same milestone | These are follow-up capabilities after the canonical chain validator is trusted                        |

## Traceability

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| SETUP-01    | Phase 1 | Complete |
| SETUP-02    | Phase 1 | Complete |
| SETUP-03    | Phase 1 | Complete |
| SETUP-04    | Phase 1 | Complete |
| SETUP-05    | Phase 1 | Complete |
| SOV-01      | Phase 2 | Complete |
| SOV-02      | Phase 2 | Complete |
| SOV-03      | Phase 2 | Complete |
| SOV-04      | Phase 2 | Complete |
| SOV-05      | Phase 2 | Complete |
| SUX-01      | Phase 2 | Pending |
| SUX-02      | Phase 2 | Pending |
| SUX-03      | Phase 2 | Complete |
| SUX-04      | Phase 2 | Complete |

**Coverage:**

- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---

_Requirements defined: 2026-07-22_
_Last updated: 2026-07-22 after initial definition_
