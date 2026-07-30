---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-07-30T11:39:49.927Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 2 | unrun-verify | ai-server/temporal/sovereignty/workflow.ts |  | Plan 02-04 human-check not run: trigger sovereigntyScoreWorkflow against a live Temporal worker + seeded company and confirm CALCULATING -> IDLE transition with scores matching a manual sovereigntyCompanyRollup query | open |  | 2026-07-30T11:39:49.927Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "2",
    "file": "ai-server/temporal/sovereignty/workflow.ts",
    "line": null,
    "description": "Plan 02-04 human-check not run: trigger sovereigntyScoreWorkflow against a live Temporal worker + seeded company and confirm CALCULATING -> IDLE transition with scores matching a manual sovereigntyCompanyRollup query",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-30T11:39:49.927Z",
    "resolved_at": null
  }
]
````
