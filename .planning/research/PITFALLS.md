# Milestone Pitfalls

**Focus:** next milestone only
**Researched:** 2026-07-22

This document covers the two planned phases for the next brownfield milestone:

- Phase 1: development setup stabilization for local Docker and Kubernetes deployment documentation
- Phase 2: sovereignty module redesign from inherited values to explicit per-element chain validation with visible diagnostic markers

The main roadmap risk is sequencing. If Phase 1 ships as documentation without clean-room runtime validation, local ops will stay brittle. If Phase 2 ships UI markers before semantics, migration, and diagnostic evidence are stable, the system will produce visible but untrusted sovereignty results.

## Critical Pitfalls

### Pitfall 1: Treating local setup stabilization as a docs-only phase
**What goes wrong:** The roadmap updates README text, but does not change or verify the actual startup path from a fresh clone.
**Why it happens:** The current stack already starts for maintainers who have the right Traefik network, hostnames, certificates, and cached state, so the gap is easy to misread as a documentation problem.
**Consequences:** New contributors still need ad hoc fixes, auth redirects fail, and every later milestone inherits unstable local reproduction.
**Warning signs:**
- Fresh setup requires manual `/etc/hosts`, local DNS, or reverse-proxy changes not captured in the repo.
- `docker compose up` starts containers, but login, GraphQL, or branding routes still fail.
- Docs are updated without a recorded clean-room validation checklist.
**Prevention:**
- Make Phase 1 acceptance criteria behavior-based: fresh clone, env file, compose up, login, client, API, and at least one persistence path must work end to end.
- Validate from a machine or container that does not already have the expected Traefik network and DNS state.
- Record a supported local mode explicitly: either hostname-and-TLS mode with prerequisites, or a localhost-first mode with reduced assumptions.
**Phase:** Phase 1

### Pitfall 2: Leaving hidden hostname, TLS, and reverse-proxy assumptions in the "stable" local path
**What goes wrong:** The repo claims local startup is stabilized, but core URLs still assume externally routed HTTPS hostnames and an existing Traefik network.
**Why it happens:** Compose and env defaults are optimized for shared ingress-style deployments, not clean local development.
**Consequences:** Keycloak redirect URIs, client API calls, and Excalidraw or Temporal links fail in ways that look like application bugs instead of environment bugs.
**Warning signs:**
- Core env values still point to `https://<subdomain>.<base-domain>` for Keycloak, GraphQL, analytics, and rooms.
- Services are attached to an external Traefik network that is not created by the repo.
- The local setup still depends on certificate resolver settings that do not exist on developer machines.
**Prevention:**
- In Phase 1, inventory every externally resolved URL and classify it as required for local, optional for local, or cluster-only.
- Remove or gate cluster-only assumptions from the default local path.
- Add explicit preflight checks for missing Docker networks, hostnames, ingress dependencies, and TLS expectations.
**Phase:** Phase 1

### Pitfall 3: Documenting Kubernetes installation without declaring brownfield cluster prerequisites and upgrade order
**What goes wrong:** The Helm docs describe install commands, but omit external dependencies and order-sensitive steps that matter in an existing cluster.
**Why it happens:** Brownfield assumptions such as ingress class, storage class, image pull policy, asset ConfigMaps, and existing secrets live outside the chart and are easy to treat as platform defaults.
**Consequences:** Installs succeed partially, upgrades drift, or release payloads appear healthy while runtime assets or auth bootstrap are broken.
**Warning signs:**
- A successful `helm install` still leaves Keycloak bootstrap, branding, or analytics runtime unusable.
- Teams skip `sync-k8s-asset-configmaps.sh` because it is documented as a step but not enforced as part of the rollout sequence.
- Operators ask which ingress controller, namespace policy, secret strategy, or persistent volume assumptions are mandatory.
**Prevention:**
- Phase 1 should publish a prerequisite matrix for Kubernetes: ingress, storage, DNS, TLS, pull secrets, runtime asset sync, and optional AI or analytics services.
- Split docs into fresh install, brownfield upgrade, and troubleshooting paths.
- Add a release checklist that enforces asset sync before install or upgrade.
**Phase:** Phase 1

### Pitfall 4: Ignoring stateful residue during local and cluster validation
**What goes wrong:** A rollout appears to work only because old Neo4j, Keycloak, or PVC state masks defects in bootstrap, migrations, or auth setup.
**Why it happens:** Brownfield systems often validate against a long-lived developer environment instead of a resettable baseline.
**Consequences:** The first new contributor or clean namespace sees failures that maintainers cannot reproduce quickly.
**Warning signs:**
- Problems disappear after reusing old volumes or reusing an existing realm.
- There is no documented reset procedure for Docker volumes, local databases, or namespace-scoped persistent state.
- Auth and seed data behavior differ between first install and subsequent restarts.
**Prevention:**
- Phase 1 should require two validation modes: dirty-state upgrade and clean-state bootstrap.
- Document exactly which volumes, PVCs, ConfigMaps, and secrets can be reused and which must be recreated.
- Add troubleshooting guidance for stale Keycloak realm data, stale asset ConfigMaps, and persisted graph data.
**Phase:** Phase 1

### Pitfall 5: Removing inheritance in one sovereignty calculation path while old logic still survives elsewhere
**What goes wrong:** The UI, background computation, imports, and exports do not agree because only one implementation path stops inheriting or averaging values.
**Why it happens:** The current concept already identifies duplicate and diverging sovereignty calculations, and one client utility still resolves inherited infrastructure values directly.
**Consequences:** Users see conflicting results for the same element, which destroys trust in the redesign faster than an obvious bug would.
**Warning signs:**
- Element detail, batch recalculation, exports, or diagram markers disagree on severity or affected elements.
- A supposedly explicit per-element model still fills empty achieved values from parent infrastructure or container components.
- Different surfaces disagree on whether missing values are gray, low, or ignored.
**Prevention:**
- Start Phase 2 by choosing one canonical sovereignty evaluation service or module and route every surface through it.
- Delete or quarantine inheritance helpers as part of the refactor instead of leaving them callable.
- Add fixture-based parity tests across UI-facing and backend-facing entry points before adding markers.
**Phase:** Phase 2

### Pitfall 6: Replacing inheritance with silent fallback scoring instead of true missing-value diagnostics
**What goes wrong:** Missing achieved values still collapse into numeric defaults, averages, or worst-case shortcuts, so gray evidence gaps remain hidden behind computed scores.
**Why it happens:** Brownfield scoring code often treats null as a low score for convenience, but the new milestone requires null to remain visible and accountable.
**Consequences:** The system appears deterministic while still making up evidence, which defeats the stated goal of traceable sovereignty.
**Warning signs:**
- Empty achieved fields still render as a number rather than a missing assessment.
- Rollup calculations convert null to `NONE`, `LOW`, or a numeric minimum without exposing missing evidence.
- Teams talk about improving the score instead of explaining the exact missing or violating chain step.
**Prevention:**
- Define gray as a first-class outcome in Phase 2 acceptance criteria.
- Model diagnostics as typed findings such as `missing-rating`, `chain-violation`, and `unscoped-requirement`, not just a numeric delta.
- Refuse any implementation that cannot distinguish "no rating" from "rated low" at every layer.
**Phase:** Phase 2

### Pitfall 7: Underestimating the brownfield data migration blast radius when inheritance is removed
**What goes wrong:** The rollout turns large parts of the estate gray or inconsistent at once, but the roadmap has no migration, communication, or prioritization plan.
**Why it happens:** The code change is small compared with the organizational work of explicit per-element ownership and backfill.
**Consequences:** Stakeholders perceive the redesign as a regression, teams start asking for hidden fallback logic again, and the milestone loses political support.
**Warning signs:**
- There is no estimate of how many applications or infrastructure elements currently rely on inherited values.
- No owner is assigned for backfilling application and infrastructure ratings.
- The rollout plan assumes all missing ratings can be fixed after release without changing user expectations.
**Prevention:**
- Phase 2 must begin with an inventory query and migration dashboard: how many elements have explicit ratings, how many become gray, and which critical chains are affected.
- Roll out first on prioritized business-critical chains instead of the full estate at once.
- Prepare release notes and UI copy that explain why more gray is a correctness improvement, not data loss.
**Phase:** Phase 2

### Pitfall 8: Shipping diagnostic markers before shipping diagnostic explanations
**What goes wrong:** Diagrams and detail views show red, yellow, or gray markers, but users cannot tell which dependency, dimension, or upstream requirement caused them.
**Why it happens:** Marker rendering is tempting because it is visible, while root-cause explanation requires stable diagnostic payloads and navigation.
**Consequences:** Users mistrust the markers, ignore them, or create manual workarounds outside the product.
**Warning signs:**
- The marker color is available before the underlying finding list, path explanation, and affected business capability list.
- Support questions ask "why is this red?" and the answer requires developer inspection.
- Different views expose different counts or labels for the same finding.
**Prevention:**
- In Phase 2, make the diagnostic payload the primary deliverable and marker rendering a consumer of that payload.
- Require every marker state to resolve to a human-readable explanation with element, dimension, required value, actual value, and broken path.
- Add drilldown from diagram symptom to element detail cause.
**Phase:** Phase 2

### Pitfall 9: Failing to define chain traversal semantics before implementation
**What goes wrong:** The team starts coding chain validation before deciding path rules for multi-hop dependencies, container applications, multiple hosting targets, cycles, and business-process requirements.
**Why it happens:** The current model already contains composite applications, infrastructure parent relationships, and requirements that are not uniformly evaluated today.
**Consequences:** Later "bug fixes" are actually semantic rewrites, invalidating early test data and user interpretation.
**Warning signs:**
- Developers debate whether to pick one parent, the worst parent, all parents, or only explicit hosting edges after code is already merged.
- Business-process requirements and weight fields remain in the schema but outside the new evaluation contract.
- The roadmap treats "chain validation" as one task instead of a rules definition plus implementation plus migration.
**Prevention:**
- Put a semantic contract at the start of Phase 2: path selection, cycle handling, requirement scope, unsupported cases, and output states.
- Decide explicitly whether business-process requirements and weighting are in scope now or intentionally deferred.
- Freeze fixture examples from the concept document and use them as acceptance tests.
**Phase:** Phase 2

### Pitfall 10: Adding markers and recalculation to fragile brownfield surfaces without performance and test gates
**What goes wrong:** Detail views, diagrams, imports, or background recalculation become slower or inconsistent because diagnostics are recomputed ad hoc in large client files and untested runtime paths.
**Why it happens:** The repo already has thin automated coverage in the affected areas, and diagram and import code are fragile high-change surfaces.
**Consequences:** The milestone lands with intermittent UI lag, stale markers, or regression risk that blocks follow-on work.
**Warning signs:**
- Marker computation runs inside multiple client components with duplicated fetches or local graph walks.
- No targeted tests exist for chain evaluation, diagram marker mapping, or migration edge cases.
- Teams postpone test work until after the refactor because the UI appears to render.
**Prevention:**
- Keep Phase 2 scoped to a narrow diagnostic core plus a small number of consumers.
- Add focused tests for chain traversal, null handling, cycle defense, and marker state mapping before broader UI rollout.
- Measure one representative large diagram or dependency chain before and after the change.
**Phase:** Phase 2

## Moderate Pitfalls

### Pitfall 1: Mixing optional AI or analytics runtime concerns into the core local setup definition
**What goes wrong:** Core setup stabilization gets blocked by optional services, or docs fail to distinguish mandatory from profile-based components.
**Warning signs:**
- Contributors cannot tell whether AI, Temporal UI, analytics refresh, or room collaboration are required for base development.
- A local "success" checklist includes optional profiles by default.
**Prevention:**
- Define a minimum viable local stack in Phase 1 and document optional profiles separately.
**Phase:** Phase 1

### Pitfall 2: Treating yellow findings as a permanent substitute for requirement capture
**What goes wrong:** Yellow diagnostics become a comfort state, so business requirements are never added and the redesign stalls below real compliance value.
**Warning signs:**
- Dashboards emphasize yellow counts without a plan to convert them into explicit business requirements or resolved architecture gaps.
- Teams postpone ownership decisions for business capability requirements.
**Prevention:**
- In Phase 2, require a follow-up capture plan for the first critical capabilities and report yellow-to-red transitions as expected maturation, not regressions.
**Phase:** Phase 2

## Minor Pitfalls

### Pitfall 1: Using rollout language that implies the redesign is a scoring improvement instead of an evidence-model change
**What goes wrong:** Stakeholders expect better numbers, but the milestone intentionally reveals missing evidence and broken chains.
**Warning signs:**
- Release notes promise "improved sovereignty scores" instead of diagnosable findings.
- Users are surprised by more gray or more visible issues after rollout.
**Prevention:**
- Use roadmap and release language that centers evidence, accountability, and traceability.
**Phase:** Phase 2

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Local Docker stabilization | Hidden Traefik, DNS, and TLS assumptions remain in the default path | Validate a clean-room startup and define one supported local mode |
| Local auth flow | Keycloak URLs and redirect hosts drift from the chosen local mode | Test login and callback behavior as part of setup acceptance |
| Kubernetes documentation | Brownfield prerequisites and asset sync order stay implicit | Publish a prerequisite matrix and install/upgrade checklist |
| Brownfield state handling | Old volumes and secrets hide broken bootstrap behavior | Validate both clean bootstrap and upgrade-from-existing-state |
| Sovereignty semantics | Inheritance removal is partial and old helpers survive | Centralize evaluation and remove inheritance helpers |
| Missing-value handling | Null ratings collapse into numeric defaults | Treat gray as a first-class diagnostic state |
| Data migration | Large parts of the estate turn gray without preparation | Inventory impacted elements and stage rollout by critical chains |
| Diagnostics UI | Colors ship before explanations and drilldown | Make marker rendering consume a stable diagnostic payload |
| Chain traversal | Multi-parent, composite, and cycle rules are undefined | Freeze traversal semantics before implementation |
| Brownfield rollout trust | Users see conflicting results across surfaces | Add parity tests and use one canonical evaluation contract |

## Roadmap Guardrails

1. Phase 1 should end only after reproducible validation from a clean environment and from a dirty upgrade environment.
2. Phase 1 should separate local Docker guidance from Kubernetes operator guidance instead of blending them into one install story.
3. Phase 2 should sequence work as: semantic contract, canonical evaluator, migration inventory, detail diagnostics, then diagram markers.
4. Phase 2 should treat gray-state visibility as a success condition, not as rollout noise to suppress.
5. Both phases should include narrow executable verification because the affected repo surfaces currently have weak automated coverage.

## Sources

- `.planning/PROJECT.md`
- `eam-konzept.md`
- `README.md`
- `k8s/README.md`
- `.planning/codebase/CONCERNS.md`
- `compose.yml`
- `env.template`
- `client/src/components/sovereignty/utils.ts`