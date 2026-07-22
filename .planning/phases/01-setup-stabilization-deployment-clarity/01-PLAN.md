---
phase: 01-setup-stabilization-deployment-clarity
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
  - env.template
  - k8s/README.md
  - k8s/values.yaml
  - .planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md
  - .planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md
autonomous: false
requirements:
  - SETUP-01
  - SETUP-02
  - SETUP-03
  - SETUP-04
  - SETUP-05
user_setup:
  - service: local-tooling
    why: "Automatisierte Verifikation nutzt lokal docker compose, curl, yarn, kubectl und helm."
    env_vars:
      - name: NAMESPACE
        source: "Vom Operator vor K8s-Verifikation setzen"
must_haves:
  truths:
    - "Ein sauberer Clone kann ueber den Supported Path `cp env.template .env` + `docker compose up -d` reproduzierbar gestartet werden (SETUP-01, D-01, D-03)."
    - "Der Supported Path bleibt strikt localhost-first; Traefik/HTTPS wird als optional und nicht erforderlich markiert (SETUP-02, D-02, D-05, D-07)."
    - "Das Mindest-Erfolgskriterium fuer den Compose-Stack ist als eindeutiger Gesamt-Gate operationalisiert: alle gestarteten Compose-Services inklusive optionaler Dienste sind gruen, ohne separate Einzeldienst-Validierung fuer optionale Dienste (SETUP-03, D-04, D-09, D-10, D-11, D-12)."
    - "Kubernetes-Dokumentation enthaelt eine explizite Praereq-Matrix inkl. Ingress/Storage/Netzwerk/Secrets/DNS und optionaler Traefik-Integration (SETUP-04, D-13, D-15)."
    - "Kubernetes-Rollout ist als feste Gate-Reihenfolge Asset-Sync -> Values -> Helm -> Verifikation beschrieben (SETUP-05, D-14, D-16)."
  artifacts:
    - "README.md trennt Supported Path und Optional Path klar und operational."
    - "env.template markiert Mindestvariablen versus optionale Variablen explizit."
    - "k8s/README.md enthaelt Praereq-Matrix und Install/Upgrade-Gates."
    - "k8s/values.yaml Kommentare spiegeln Pflicht-/Optional-Konfigurationen fuer den Rollout."
    - ".planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md mappt Nyquist-relevant alle Task-Verify-Gates auf konkrete Kommandos und Evidence."
    - ".planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md dokumentiert Evidence zu SETUP-01..SETUP-05."
  key_links:
    - "README Supported Path -> compose.yml Laufzeitrealitaet"
    - "README Variablenhinweise -> env.template"
    - "k8s/README Reihenfolge -> scripts/sync-k8s-asset-configmaps.sh und scripts/sync-cube-schema.sh"
    - "K8s Verifikationsgates -> helm status und kubectl Pod-Readiness"
---

<objective>
**As a** Developer und Operator,
**I want to** einen reproduzierbaren localhost-first Setup- und K8s-Rolloutpfad mit klaren Gates,
**so that** ich den Stack ohne versteckte Routing-Annahmen starten, verifizieren und operational erklaeren kann.

Purpose: Phase 1 liefert Operational Clarity statt Infrastruktur-Umbau und implementiert alle gelockten Entscheidungen D-01..D-16 innerhalb SETUP-01..SETUP-05.
Output: Konsistente Setup-Dokumentation in README/env.template und K8s-Rollout-Dokumentation mit nachvollziehbarer Verifikationsspur in 01-VERIFICATION.md sowie Nyquist-Mapping in 01-VALIDATION.md.
</objective>

<execution_context>
@~/.copilot/gsd-core/workflows/execute-plan.md
@~/.copilot/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/01-setup-stabilization-deployment-clarity/01-CONTEXT.md
@.planning/phases/01-setup-stabilization-deployment-clarity/01-RESEARCH.md
@README.md
@compose.yml
@env.template
@k8s/README.md
@k8s/values.yaml
@scripts/sync-k8s-asset-configmaps.sh
@scripts/sync-cube-schema.sh
</context>

<source_audit>
## Multi-Source Coverage Audit

GOAL (ROADMAP Phase 1): Vollstaendig abgedeckt durch Task 1-3.

REQ-Coverage:
- SETUP-01 -> Task 1, Task 2
- SETUP-02 -> Task 1, Task 2
- SETUP-03 -> Task 1, Task 2
- SETUP-04 -> Task 3
- SETUP-05 -> Task 3

RESEARCH-Coverage:
- Fokus auf Doku-/Ablaufklarheit statt Infra-Rewrite -> Task 1-3
- Dual-Path-Narrativ (Supported vs Optional) -> Task 1-2
- Gate-basierte K8s-Reihenfolge -> Task 3

CONTEXT Decision Coverage:
- D-01, D-02, D-03, D-09, D-10, D-11, D-12 -> Task 1
- D-04, D-05, D-06, D-07, D-08 -> Task 2
- D-13, D-14, D-15, D-16 -> Task 3

Result: Keine unplanned items, keine Deferred-Ideen in Scope.
</source_audit>

<tasks>

<task type="tracer" id="T1">
  <name>Task 1 (Tracer): End-to-end Supported Localhost Path mit minimalen Gates</name>
  <files>README.md, env.template, .planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md, .planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md</files>
  <reversibility rating="reversible">Dokumentationsstruktur und Verifikationspfad koennen ohne Datenmigration rueckgaengig angepasst werden.</reversibility>
  <action>Erstelle den produktionsfaehigen Tracer-Slice fuer den gesamten Phase-1-Fluss: in README einen klaren Supported-Path-Abschnitt als offiziellen Default mit exakt `cp env.template .env` und Compose-Start aus Repo-Root (D-01, D-03, SETUP-01), localhost-first ohne Router-/DNS-/TLS-Zwang (D-02, SETUP-02), plus Pflicht-Checks ausschliesslich als Referenz auf bestehende Befehle fuer GraphQL Health und Client-Load (D-09, D-10, SETUP-03). Operationalisiere D-04 eindeutig als Gesamt-Gate: ein kollektiver Compose-Statuscheck muss fuer alle gestarteten Services inklusive optionaler Dienste gruen sein, ohne separate optionale Einzeldienst-Validierung (D-04, D-11). Dokumentiere ausdruecklich, dass fehlgeschlagene Checks keine Stop/Repair-Anleitung in diesem Ablauf enthalten (D-12). Lege 01-VALIDATION.md als Nyquist-Artefakt mit einer expliziten Task->Verify->Evidence-Matrix fuer T1..T3 an; lege parallel 01-VERIFICATION.md mit Evidence-Sektionen fuer SETUP-01..03 an und verlinke die ausgefuehrten Kommandos.</action>
  <verify>
    <automated>test -f .env || cp env.template .env && docker compose --profile ai up -d && TOTAL=$(docker compose --profile ai config --services | wc -l) && RUNNING=$(docker compose --profile ai ps --status running --services | wc -l) && [ "$RUNNING" -eq "$TOTAL" ] && curl -fsS http://localhost:4000/health && curl -fsS http://localhost:3000 &gt;/dev/null</automated>
  </verify>
  <done>README enthaelt den offiziellen Supported Path mit eindeutiger D-04-Gesamtgate-Definition; 01-VALIDATION.md mappt Nyquist-relevant alle Verify-Kommandos auf Task-Evidence; 01-VERIFICATION.md dokumentiert Nachweise fuer SETUP-01..03; Tracer ist lauffaehig und durch die Kommandokette nachweisbar.</done>
</task>

<task type="auto" id="T2" tdd="false">
  <name>Task 2: Default-vs-Optional Pfad und Variablenklarheit ausbauen</name>
  <files>README.md, env.template, .planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md, .planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md</files>
  <reversibility rating="reversible">Textuelle Abgrenzung und Variablenklassifikation sind versionierbar und risikoarm ruecksetzbar.</reversibility>
  <action>Erweitere README und env.template fuer vollstaendige Scope-Abdeckung der Setup-Dokumentation: fuege nach dem Supported Path ein eigenes Optional-Kapitel fuer Traefik/HTTPS-Paritaet ein (D-05) und dokumentiere dort zwingend Prereqs, DNS/Hosts, Zertifikat/TLS und erwartete Hostnames (D-06), inklusive explizitem Guardrail "Nicht erforderlich fuer Supported Path" (D-07). Dokumentiere keine Fehlerfall-Liste fuer den optionalen Pfad (D-08). Stelle sicher, dass der in Task 1 definierte D-04-Gesamtgate in README und 01-VALIDATION.md konsistent referenziert ist (D-04, D-11), und aktualisiere 01-VERIFICATION.md mit klarer Requirement-Zuordnung SETUP-01..03.</action>
  <verify>
    <automated>rg -n "Supported Path|Optional|Traefik|HTTPS|Nicht erforderlich fuer Supported Path|GraphQL Health|Client" README.md && rg -n "BASE_DOMAIN|TRAEFIK_NETWORK|TRAEFIK_CERTRESOLVER|KEYCLOAK_URL|GRAPHQL_URL" env.template</automated>
  </verify>
  <done>README trennt verbindlich Default und Optionalpfad; env.template macht Pflicht-/Optionalannahmen nachvollziehbar; D-04-Gesamtgate ist konsistent ohne Abschwaechung dokumentiert; SETUP-01..03 sind inklusive D-04..D-08 dokumentatorisch vollstaendig abgedeckt.</done>
</task>

<task type="auto" id="T3" tdd="false">
  <name>Task 3: Kubernetes Praereq-Matrix und Gate-basierter Rollout</name>
  <files>k8s/README.md, k8s/values.yaml, .planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md, .planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md</files>
  <precondition>Dokumentationsbasis aus T1/T2 ist fertiggestellt und vom Operator fuer K8s-Ausfuehrung freigegeben; `NAMESPACE`, `HELM_RELEASE`, `GRAPHQL_HEALTH_URL` sind gesetzt; helm und kubectl sind in der Ausfuehrungsumgebung verfuegbar.</precondition>
  <reversibility rating="costly">Rollout-Reihenfolge und Pflichtwerte beeinflussen Betreiberablauf; Rueckbau ist moeglich, erzeugt jedoch Prozess- und Abstimmungskosten.</reversibility>
  <action>Aktualisiere k8s/README.md auf eine explizite Praereq-Matrix fuer Ingress, Storage, Netzwerk, Secrets und DNS (D-13, SETUP-04), mit klarer optionaler Traefik-Integration samt Fallback-/Alternative-Hinweis (D-15). Dokumentiere install/upgrade als feste Gate-Reihenfolge Asset-Sync -> Values-Vorbereitung -> Helm install/upgrade -> Verifikation (D-14, SETUP-05) und nutze nur bestehende Befehle/Skripte (`./scripts/sync-k8s-asset-configmaps.sh`, optional `yarn sync:cube-schema`, `helm install|upgrade`, `helm status`, `kubectl wait`, Endpoint-Check) im Sinne von D-09. Verankere die bisherige Risk-Gate-Intention ohne eigenen Task als verpflichtenden Fast-Gate vor Readiness-Wait: zuerst Prereq-/Dokumentsmoke und Release-Status, erst danach der lange Pod-Ready-Wait. Kopple Verify und Done direkt: Release healthy, Kernendpunkte erreichbar, kritische Pods Ready (D-16). Synchronisiere 01-VALIDATION.md (Task->Verify->Evidence fuer T3) und 01-VERIFICATION.md (Evidence fuer SETUP-04..05).</action>
  <verify>
    <automated>test -n "$NAMESPACE" && test -n "$HELM_RELEASE" && test -n "$GRAPHQL_HEALTH_URL" && bash scripts/sync-k8s-asset-configmaps.sh --help && bash scripts/sync-cube-schema.sh && helm status "$HELM_RELEASE" -n "$NAMESPACE" && rg -n "Prerequisites|Ingress|Storage|Secrets|DNS|Asset|Values|Helm|Verification|Traefik|rollback" k8s/README.md && rg -n "baseDomain|imagePullSecrets|neo4j|keycloak|ingress" k8s/values.yaml</automated>
    <manual>Full runtime gate (post-fast-gate): kubectl wait --for=condition=Ready pod -l app.kubernetes.io/instance="$HELM_RELEASE" -n "$NAMESPACE" --timeout=300s && curl -fsS "$GRAPHQL_HEALTH_URL"</manual>
  </verify>
  <done>K8s-Dokumentation ist vor Ausfuehrung selbsterklaerend, benoetigt keine impliziten Clusterannahmen und bildet SETUP-04/05 inklusive D-13..D-16 ab; derselbe Verify-Lauf belegt `helm status` healthy, Pod-Readiness und Endpoint-Erreichbarkeit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| docs -> operator execution | Unklare oder falsche Anweisungen fuehren direkt zu fehlerhaften Runtime- oder Cluster-Aktionen |
| local host -> docker services | Falsch gesetzte Env-Werte koennen Auth-, Routing- oder Datenbankpfade brechen |
| operator -> kubernetes cluster | Helm/Secret/Ingress-Fehlkonfiguration kann Verfuegbarkeit und Vertraulichkeit beeinflussen |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-01 | Tampering | README default flow | medium | mitigate | Supported Path strikt als localhost-default dokumentieren und Optionalpfad isolieren (Task 1-2). |
| T-01-02 | Spoofing | Optional DNS/Hostnames | medium | mitigate | Optional-Kapitel mit klaren DNS/Hostname-Voraussetzungen und Guardrail "nicht erforderlich" (Task 2). |
| T-01-03 | Denial of Service | K8s rollout order | high | mitigate | Feste Gate-Reihenfolge Asset-Sync -> Values -> Helm -> Verifikation dokumentieren (Task 3). |
| T-01-04 | Information Disclosure | Secrets handling in k8s values/docs | high | mitigate | ExistingSecret-Pfade und Pflicht-Secret-Werte klar hervorheben; keine Klartext-Beispiele in produktiven Defaults (Task 3). |
| T-01-SC | Tampering | package-manager/script execution | low | accept | Keine neuen Pakete; nur bestehende Yarn-/Shell-Befehle und vorhandene Skripte verwenden. |
</threat_model>

<verification>
- Nyquist-Artefakt `.planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md` ist vorhanden und mappt fuer T1, T2 und T3 jeweils Verify-Kommando, erwartetes Signal und Evidence-Ort.
- Requirement-basierter Nachweis in .planning/phases/01-setup-stabilization-deployment-clarity/01-VERIFICATION.md fuer SETUP-01..SETUP-05.
- Compose Smoke Gate: `docker compose --profile ai up -d`, Vollstaendigkeitsvergleich `config --services` vs `ps --status running --services`, `curl -fsS http://localhost:4000/health`, Client auf localhost:3000.
- K8s Dokumentationsgate: Praereq-Matrix + Reihenfolge + Verifikationsschritte muessen in k8s/README.md explizit vorhanden sein.
- Runtime-K8s-Gate (nach bestandenem Fast-Gate): `kubectl wait --for=condition=Ready` und Kernendpunkt-Pruefung via `curl -fsS "$GRAPHQL_HEALTH_URL"`.
</verification>

<success_criteria>
1. SETUP-01..SETUP-05 sind in README/env.template/k8s/README.md/k8s/values.yaml explizit und widerspruchsfrei beschrieben.
2. D-01..D-16 sind nachvollziehbar umgesetzt, ohne Deferred- oder Phase-2-Themen einzufuehren.
3. Ein neuer Contributor kann den Default-Flow ohne DNS-Hacks ausfuehren und weiss eindeutig, was optional ist.
4. Ein Operator kennt vor Helm-Ausfuehrung alle externen Voraussetzungen und die Rollout-Reihenfolge mit Gates.
</success_criteria>

<output>
Create `.planning/phases/01-setup-stabilization-deployment-clarity/01-SUMMARY.md` when done.
Create `.planning/phases/01-setup-stabilization-deployment-clarity/01-VALIDATION.md` during execution and keep it synchronized with all task verify gates.
</output>
