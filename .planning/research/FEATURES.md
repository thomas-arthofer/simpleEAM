# Feature Landscape

**Domain:** Sovereignty traceability in a brownfield enterprise architecture platform
**Researched:** 2026-07-22
**Scope:** Next milestone only: setup stabilization as an enabling dependency, plus sovereignty redesign from inherited values to explicit chain validation

## Milestone framing

This milestone should deliver trustworthy sovereignty traceability, not a broader scoring or governance rewrite. The repository already has sovereignty requirement fields, achieved fields, evidence fields, a dedicated sovereignty UI, and a background recomputation workflow. The current gap is trust: inherited values can make unevaluated elements look compliant, company-level aggregate scores hide the failing element, and duplicated calculation paths risk contradictory answers.

For this milestone, table-stakes features are the ones required to make sovereignty findings defensible and usable in day-to-day architecture work. Differentiators are the EAM-specific capabilities that make the feature more actionable inside diagrams and dependency views, but should still reuse the same validation core.

## Table Stakes

Features users will reasonably expect once the platform claims sovereignty traceability. Missing any of these keeps the feature in the "interesting demo" category instead of the "operationally trustworthy" category.

| Capability | Why Expected | Complexity | Dependencies | Target | Notes |
|---------|--------------|------------|--------------|--------|-------|
| Explicit per-element sovereignty assessment with no inherited achieved fallback | Traceability is not credible if unassessed applications or infrastructure inherit a parent value and appear compliant | Medium | Existing achieved fields in schema and forms; migration away from inheritance logic | This milestone | Core semantic change. Missing values must stay visible instead of being auto-filled |
| Chain validation from business requirement to technical foundation | Users need the system to compare required vs achieved maturity across the actual dependency path, not as a flat average or company score | High | Stable traversal rules across capability, application, AI component, infrastructure, supplier, and related relations | This milestone | The validator should identify each break in the chain and the affected dimension |
| Explainable finding record per violation | A result must name the violating element, dimension, required value, actual value, and why the finding is red, yellow, gray, or green | High | Canonical finding model shared by background recomputation and UI | This milestone | Replace opaque score-only output with accountable findings |
| Missing assessment and stale evidence visibility | In compliance-facing workflows, "unknown" is different from "good" and must be visible as gray or similar neutral status | Medium | Existing evidence and last assessment fields; validation status rules | This milestone | This includes showing when an element has no rating or outdated evidence |
| Element detail diagnostics | Opening an element should show both local fit and downstream or upstream impact so the user can move from symptom to cause | Medium | Explainable finding model; existing detail dialogs and sovereignty UI | This milestone | This is the main user-facing diagnostic surface requested in the milestone |
| Reproducible local and cluster validation path for sovereignty behavior | If Docker and Kubernetes setup are unstable or under-documented, the feature cannot be reliably verified, demonstrated, or supported | Medium | Compose startup stabilization; Kubernetes prerequisite documentation | This milestone | This is an enabling capability rather than domain logic, but it belongs in the milestone because it directly affects trust in the feature |

## Differentiators

These features make the sovereignty capability stand out inside an EAM product. They are useful, but they should be built only on top of the table-stakes validation model.

| Feature | Value Proposition | Complexity | Dependencies | Target | Notes |
|---------|-------------------|------------|--------------|--------|-------|
| Dual-status diagram markers for cause vs affected state | Architects can see at a glance whether an element is itself the cause of a sovereignty break or only affected by one lower in the chain | Medium | Explainable finding model; diagram rendering hooks; stable UI status semantics | This milestone | The fill-versus-ring concept from the milestone is a strong EAM-native differentiator |
| Full finding list instead of only the worst score | Remediation becomes plannable because teams see all breaks in one pass instead of fixing them one at a time as they surface | High | Chain validator that returns all failures, not just min or max aggregates | This milestone | Important for operator efficiency and aligns with the concept document |
| Blast-radius prioritization for weak components | Teams can fix the component that compromises the most capabilities first, which improves investment and remediation planning | High | Canonical findings plus downstream impact aggregation | Later | Valuable, but not required before the core validator is trusted |
| Inline evidence and rationale drill-down | Reviewers can inspect the text or evidence behind a rating without leaving the diagnostic context | Medium | Existing rationale and evidence fields; detail view design | Later | Good follow-up once the validation model is stable |
| Business-process requirements folded into the same traceability view | Extends sovereignty reasoning beyond capabilities into process-driven obligations already modeled in the schema | High | Clarified traversal semantics for business processes; unified validation logic | Later | The concept document flags this as currently missing and worth addressing after the core redesign |
| Portfolio-level trend and coverage analytics | Helps leadership see adoption, gray-state reduction, and recurring bottlenecks over time | Medium | Stable findings model; historical storage or snapshots | Later | Not needed to make single-chain diagnostics trustworthy |

## Anti-Features

These are the wrong directions for this milestone. They either recreate the current problem, expand scope without increasing trust, or hide the work that the redesign is supposed to expose.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Inherited or defaulted achieved sovereignty values | Recreates false compliance and makes assessment gaps invisible | Keep achieved values explicit per element and show missing states openly |
| Aggregate score as the primary user output | A single number does not tell users which element failed or what to fix | Make explainable findings the primary output and keep aggregates secondary |
| Suppressing gray or missing states for a cleaner dashboard | Hides the actual maturity of the data and defeats auditability | Treat gray as a first-class state that triggers assessment work |
| Separate calculation rules in background jobs and UI code | Produces contradictory answers and destroys user trust | Centralize chain validation semantics and reuse them across surfaces |
| Premature weighting-model rollout using sovereigntyReqWeight | The field exists, but semantics are not part of the milestone and would add argument without improving traceability | Ignore weighting for now and deliver deterministic unweighted chain checks |
| Schema redesign or major data-model expansion | The repository already stores the needed requirement and achieved fields | Reuse the current model and change evaluation semantics first |
| Blocking release on complete data backfill | The redesign is meant to expose missing ratings, not wait until all gray states disappear | Ship with visible gray states and prioritize backfill on critical chains |
| Replacing current deployment approach instead of stabilizing it | A new platform path would delay the milestone and obscure whether the existing system is actually reproducible | Stabilize Docker Compose, document Kubernetes prerequisites, and validate the feature there |

## Feature Dependencies

```text
Stable local Docker startup + documented Kubernetes prerequisites
  -> reliable sovereignty verification and demos

Explicit per-element achieved ratings
  -> chain validation

Chain validation
  -> explainable findings

Explainable findings
  -> element detail diagnostics
  -> diagram status markers
  -> later blast-radius analytics

Single canonical validation path
  -> consistent UI, background recomputation, and supportability
```

## MVP Recommendation

Prioritize in this order:
1. Explicit per-element achieved ratings with no inherited fallback
2. Canonical chain validator that returns explainable findings per failing dimension
3. Element detail diagnostics that show cause, affected path, and missing-state handling
4. Setup stabilization and deployment documentation so the feature can be reproduced and verified locally and on Kubernetes
5. Diagram markers that reuse the same finding model

Defer:
- Blast-radius portfolio analytics: useful once the base finding model is stable
- Weight-based scoring: not needed for defensible traceability in this milestone
- Business-process integration: important follow-up, but it widens traversal semantics
- Trend reporting and executive dashboards: valuable later, but not part of the trust reset

## Sources

Repository sources used for this milestone-focused research:
- .planning/PROJECT.md
- eam-konzept.md
- README.md
- k8s/README.md
- server/src/graphql/schema.graphql
- client/src/app/[lang]/sovereignty/page.tsx
- ai-server/temporal/sovereignty/activities.ts

Confidence: MEDIUM
Reason: Strong repository-local evidence for current behavior and milestone intent; external web validation was unavailable in this environment because the configured Brave search provider was not set up.
