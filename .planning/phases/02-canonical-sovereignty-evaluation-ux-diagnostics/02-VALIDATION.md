---
phase: 02
slug: canonical-sovereignty-evaluation-ux-diagnostics
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + ts-jest 29.1.1 (server) |
| **Config file** | none — Wave 0 installs (`server/jest.config.js`) |
| **Quick run command** | `cd server && yarn test -- --testPathPattern=sovereignty` |
| **Full suite command** | `cd server && yarn test` |
| **Estimated runtime** | ~10 seconds |

Client and `ai-server` have no test runner configured at all. This phase's automated verification is scoped to the `server/src/sovereignty/` module (pure TypeScript, no React/Excalidraw rendering assertions); UI/diagram behavior is verified manually per the phase's `UI hint: yes` designation via `/gsd-verify-work`.

---

## Sampling Rate

- **After every task commit:** Run `cd server && yarn test -- --testPathPattern=sovereignty`
- **After every plan wave:** Run `cd server && yarn test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green, plus manual UI walkthrough of detail view + diagram markers
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | TBD | 0 | Wave 0 | — | N/A | scaffold | `test -f server/jest.config.js` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SOV-01 | — | Element with no achieved fields is never treated as compliant via inheritance | unit | `yarn test -- evaluator.test.ts -t "no inheritance"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SOV-02 | — | Required HIGH vs. achieved LOW on a dependency produces a RED finding naming the exact node | unit | `yarn test -- evaluator.test.ts -t "chain violation"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SOV-03 | — | Entity with zero `sovereigntyAch*` fields set produces GREY, not GREEN-by-default | unit | `yarn test -- evaluator.test.ts -t "grey"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SOV-04 | — | A `Finding` includes violating element id, dimension, required value, actual value, chain path | unit | `yarn test -- evaluator.test.ts -t "finding shape"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SOV-05 | — | Same fixture chain yields identical findings whether invoked via GraphQL resolver path or Temporal-style direct module call | unit/integration | `yarn test -- evaluator.parity.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | D-01 | — | Multi-parent infrastructure with one violating parent produces exactly one finding naming that parent, not a "worst of" synthetic value | unit | `yarn test -- evaluator.test.ts -t "multi-parent"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | D-02 | — | Composite application: container's own GREY status is never hidden even when components have values | unit | `yarn test -- evaluator.test.ts -t "composite container"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | D-03 | — | A cyclic parentInfrastructure/components graph terminates traversal without throwing or infinite-looping | unit | `yarn test -- evaluator.cycles.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SUX-02/D-05 | — | A BusinessCapability with a RED finding below it gets ring-only marker, never a fill marker | unit | `yarn test -- markers.test.ts -t "capability ring only"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SUX-03/SUX-04 | — | Diagram marker rendering distinguishes local vs. downstream impact | manual | conversational UAT via `/gsd-verify-work` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs and wave numbers to be finalized by the planner.*

---

## Wave 0 Requirements

- [ ] `server/jest.config.js` — ts-jest preset, `testMatch` covering `src/sovereignty/__tests__/**/*.test.ts`; no config exists today.
- [ ] `server/src/sovereignty/__tests__/fixtures.ts` — freeze the `eam-konzept.md` §3 worked example (Billing capability / VM-web-03) plus multi-parent and composite-app fixtures as reusable test data.
- [ ] Confirm whether `client/` needs a lightweight test runner addition for the deletion of `client/src/components/sovereignty/utils.ts` (D-07) — verify via search during planning whether any client tests reference it before deleting.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Element detail view shows cause-vs-affected distinction | SUX-01 | React UI rendering not covered by server-only Jest scope | Open element detail view for a known chain-violation fixture; confirm cause element and affected element are visually distinguishable |
| Diagram markers show ring-only vs. fill markers for local vs. downstream impact | SUX-02, SUX-03, SUX-04 | Excalidraw canvas rendering not covered by server-only Jest scope | Enable diagram markers; place a BusinessCapability and a downstream-affected element on canvas; confirm marker shape/style differs per D-05 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
