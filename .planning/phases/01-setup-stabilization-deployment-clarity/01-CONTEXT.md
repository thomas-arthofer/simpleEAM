# Phase 1: Setup Stabilization & Deployment Clarity - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Diese Phase liefert einen klar unterstützten, reproduzierbaren localhost-first Setup-Pfad fuer Docker Compose sowie eine eindeutig strukturierte Kubernetes-Voraussetzungs- und Rollout-Dokumentation mit expliziten Abhaengigkeiten und Verifikationsschritten.

</domain>

<decisions>
## Implementation Decisions

### Compose-Standardpfad definieren
- **D-01:** Offiziell unterstuetzter Default-Startpfad ist minimal: `docker compose up -d` aus dem Repo-Root.
- **D-02:** Supported Path wird strikt auf localhost + Standard-Ports begrenzt; Custom Hostnames/TLS/Proxy werden als optional gekennzeichnet.
- **D-03:** Verpflichtende Voraussetzung vor dem Start: `.env` aus `env.template` erzeugen und minimal befuellen.
- **D-04:** Mindest-Erfolgskriterium fuer "stack usable": alle Compose-Services inklusive optionaler Dienste muessen gruen sein.

### Optionale Traefik/HTTPS-Paritaet abgrenzen
- **D-05:** Traefik/HTTPS-Paritaet wird als eigenes Optional-Kapitel nach dem Default-Flow dokumentiert.
- **D-06:** Das optionale Kapitel enthaelt zwingend: Prereqs, DNS/Hosts, Zertifikat/TLS und erwartete Hostnames.
- **D-07:** Expliziter Guardrail-Hinweis: "Nicht erforderlich fuer Supported Path".
- **D-08:** Fuer den optionalen Paritaetspfad werden keine Fehlerfaelle dokumentiert.

### Startup-Validierung nach dem Hochfahren
- **D-09:** Pflicht-Checks werden als Verweise auf bestehende Befehle dokumentiert (keine eigene Soll-Ausgaben-Checkliste).
- **D-10:** Kern-Checks im Default sind auf "GraphQL Health" und "Client laedt" begrenzt.
- **D-11:** Optionale Services werden in der Validierung nicht separat dokumentiert oder verifiziert.
- **D-12:** Bei fehlgeschlagenen Pflicht-Checks wird keine konkrete Stop/Repair-Guidance in den Ablauf aufgenommen.

### Kubernetes-Praereqs und Rollout-Reihenfolge
- **D-13:** Kubernetes-Voraussetzungen werden als explizite Praereq-Matrix dokumentiert (Ingress, Storage, Netzwerk, Secrets, DNS).
- **D-14:** Rollout wird als Schrittfolge mit Gates dokumentiert: Asset-Sync -> Values -> Helm -> Verifikation.
- **D-15:** Externe Traefik-Abhaengigkeit wird als optionale Integration mit klarer Fallback-/Alternative-Notiz dokumentiert.
- **D-16:** Mindest-Verifikation nach Helm: Release healthy + Kernendpunkte erreichbar + kritische Pods Ready.

### the agent's Discretion
- Keine expliziten "you decide"-Bereiche festgelegt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and Requirement Boundaries
- `.planning/ROADMAP.md` — Defines Phase 1 goal, success criteria, and ordering constraints.
- `.planning/REQUIREMENTS.md` — Source of SETUP-01..SETUP-05 requirement expectations.
- `.planning/PROJECT.md` — Project-level constraints and trust/reproducibility intent.
- `.planning/STATE.md` — Current phase state and scope continuity.

### Local Runtime Path
- `compose.yml` — Actual service topology, optional service boundaries, and runtime wiring.
- `env.template` — Required and optional environment variables used by stack startup.
- `README.md` — Existing setup narrative that must be aligned to supported path decisions.

### Kubernetes Deployment Path
- `k8s/README.md` — Kubernetes install/upgrade flow and prerequisites baseline.
- `k8s/values.yaml` — Effective deployment assumptions and external dependency knobs.
- `scripts/sync-k8s-asset-configmaps.sh` — Asset sync prerequisite before deployment.
- `scripts/sync-cube-schema.sh` — Cube schema sync dependency before chart packaging/use.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `compose.yml`: Existing multi-service wiring can be reused as the single source for default startup verification.
- `env.template`: Canonical variable inventory for documenting mandatory vs optional inputs.
- `k8s/README.md` + `k8s/values.yaml`: Existing k8s deployment surfaces already expose ingress/storage/network assumptions.
- `scripts/sync-k8s-asset-configmaps.sh` and `scripts/sync-cube-schema.sh`: Ready-made pre-deploy orchestration hooks for rollout ordering.

### Established Patterns
- Yarn-only workflow is enforced repository-wide (`package.json`, `prevent-npm.sh`, `use-yarn.sh`), so setup docs must exclusively use Yarn-based commands where package manager commands appear.
- Service decomposition is explicit across compose and Helm artifacts; docs should preserve this split and avoid implicit coupling.
- Health/readiness checks are endpoint-oriented in runtime services, enabling clear post-start verification gates.

### Integration Points
- Setup guidance should align root-level docs with actual Compose and env assets.
- Kubernetes flow documentation must align script-based asset sync with Helm values preparation and release verification.
- Optional Traefik/HTTPS parity path must reference deployment assets without overriding the localhost-first default path.

</code_context>

<specifics>
## Specific Ideas

- Fokus auf reproduzierbaren localhost-first Standardpfad.
- Optionale Traefik/HTTPS-Paritaet klar separat und nicht als Pflicht.
- Kubernetes-Dokumentation mit operationaler Reihenfolge und klaren Prereq-Gates.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Setup Stabilization & Deployment Clarity*
*Context gathered: 2026-07-22*
