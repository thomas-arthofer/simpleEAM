# Phase 1: Setup Stabilization & Deployment Clarity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 1-Setup Stabilization & Deployment Clarity
**Areas discussed:** Compose-Standardpfad definieren, Optionale Traefik/HTTPS-Paritaet abgrenzen, Startup-Validierung nach dem Hochfahren, Kubernetes-Praereqs und Rollout-Reihenfolge

---

## Compose-Standardpfad definieren

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: docker compose up -d aus Repo-Root | Nur der kuerzeste localhost-first Pfad; wenige Voraussetzungen, schnell reproduzierbar | ✓ |
| Gefuehrter Pfad mit vorbereitenden Checks | Vorher definierte Prereq-Checks (Ports/.env), dann compose start | |
| Script-basierter Einstieg | Start ueber Wrapper-Script als primaerer Weg statt direktem compose | |

**User's choice:** Minimal: docker compose up -d aus Repo-Root
**Notes:** Default-Pfad soll strikt und direkt aus dem Repo-Root funktionieren.

| Option | Description | Selected |
|--------|-------------|----------|
| Nur localhost + Standard-Ports als Supported Path | Abweichungen (Custom Hostnames/TLS/Proxy) klar als optional kennzeichnen | ✓ |
| Localhost und benutzerdefinierte Hostnames gleichwertig | Mehr Flexibilitaet, aber weniger klare Reproduzierbarkeit | |
| Alles als Varianten eines gleichwertigen Hauptpfads | Eine grosse Anleitung mit Varianten statt klarer Trennung | |

**User's choice:** Nur localhost + Standard-Ports als Supported Path
**Notes:** Supported Path klar von Varianten getrennt.

| Option | Description | Selected |
|--------|-------------|----------|
| .env aus env.template erzeugt und minimal befuellt | Klar reproduzierbar; ohne das scheitern mehrere Services | ✓ |
| Nur Docker/Compose muss installiert sein | Niedrige Huerde, aber hoehere Fehlerrate beim Start | |
| Vollstaendige Konfiguration aller optionalen Services | Sehr strikt, aber fuer Default unnoetig schwergewichtig | |

**User's choice:** .env aus env.template erzeugt und minimal befuellt
**Notes:** Minimales env-Setup ist Pflicht vor Start.

| Option | Description | Selected |
|--------|-------------|----------|
| Client erreichbar + GraphQL Health OK + Neo4j erreichbar | Kernfunktionen erreichbar, ohne optionale Komponenten zu erzwingen | |
| Alle Compose-Services inkl. optionaler Dienste muessen gruen sein | Maximale Vollstaendigkeit, aber anfaelliger fuer lokale Unterschiede | ✓ |
| Nur Client-Seite muss laden | Zu schwach fuer belastbare Runtime-Reproduzierbarkeit | |

**User's choice:** Alle Compose-Services inkl. optionaler Dienste muessen gruen sein
**Notes:** Strenge Abnahme fuer "stack usable".

---

## Optionale Traefik/HTTPS-Paritaet abgrenzen

| Option | Description | Selected |
|--------|-------------|----------|
| Eigenes Optional-Kapitel nach dem Default-Flow | Default bleibt klar zuerst; Paritaet als Add-on mit klarer Kennzeichnung | ✓ |
| Parallel zum Default-Flow als gleichwertiger Einstieg | Mehr Sichtbarkeit, aber hoeheres Risiko fuer Verwechslung | |
| Komplett separater Advanced-Guide | Sehr klar getrennt, aber hoeherer Navigationsaufwand | |

**User's choice:** Eigenes Optional-Kapitel nach dem Default-Flow
**Notes:** Optionalpfad klar getrennt, aber im selben Dokumentfluss.

| Option | Description | Selected |
|--------|-------------|----------|
| Prereqs + DNS/Hosts + Zertifikat/TLS + erwartete Hostnames | Verhindert implizite Annahmen und macht Risiken explizit | ✓ |
| Nur Beispiel-Commands | Schnell, aber zu wenig fuer reproduzierbaren Betrieb | |
| Nur Verweis auf externe Traefik-Doku | Wenig Pflege, aber unzureichend projektspezifisch | |

**User's choice:** Prereqs + DNS/Hosts + Zertifikat/TLS + erwartete Hostnames
**Notes:** Vollstaendige Voraussetzungstransparenz fuer den Optionalpfad.

| Option | Description | Selected |
|--------|-------------|----------|
| Expliziter Warnhinweis ("Nicht erforderlich fuer Supported Path") | Direkt und unmissverstaendlich | ✓ |
| Nur indirekt durch Reihenfolge im Dokument | Weniger streng, anfaelliger fuer Fehlinterpretation | |
| Kein spezieller Hinweis | Zu hohes Risiko, dass Traefik als Pflicht verstanden wird | |

**User's choice:** Expliziter Warnhinweis ("Nicht erforderlich fuer Supported Path")
**Notes:** Guardrail soll explizit und sichtbar sein.

| Option | Description | Selected |
|--------|-------------|----------|
| Eigene Troubleshooting-Tabelle nur fuer optionalen Pfad | Fehlerbilder bleiben vom Default getrennt | |
| In gemeinsame Troubleshooting-Sektion mischen | Zentraler Ort, aber vermischt Pflicht und optional | |
| Keine Fehlerfaelle dokumentieren | Reduziert Umfang, laesst Risiken implizit | ✓ |

**User's choice:** Keine Fehlerfaelle dokumentieren
**Notes:** Optionalpfad soll knapp bleiben.

---

## Startup-Validierung nach dem Hochfahren

| Option | Description | Selected |
|--------|-------------|----------|
| Kompakte Checkliste mit Soll-Ausgaben | Schnell pruefbar, reproduzierbar, gut fuer CI-nahes Denken | |
| Narrativer Walkthrough ohne feste Checkpunkte | Leichter zu lesen, aber weniger verifizierbar | |
| Nur Verweise auf bestehende Befehle | Kein neuer Checklistenaufbau | ✓ |

**User's choice:** Nur Verweise auf bestehende Befehle
**Notes:** Keine neue strukturierte Checkliste gewuenscht.

| Option | Description | Selected |
|--------|-------------|----------|
| Service-Status + GraphQL Health + Client laedt + Neo4j erreichbar | Deckt Laufzeitkern ab; optionale Dienste separat | |
| Nur GraphQL Health und Client laedt | Minimalset fuer Runtime-Check | ✓ |
| Jeder einzelne Service inkl. optionaler Komponenten | Sehr strikt, aber aufwendiger | |

**User's choice:** Nur GraphQL Health und Client laedt
**Notes:** Sehr schlanke Pflichtvalidierung.

| Option | Description | Selected |
|--------|-------------|----------|
| Eigener Abschnitt "optional verifizieren" ausserhalb der Pflichtchecks | Verhindert, dass optional als Pflicht gelesen wird | |
| Gemischt in einer einzigen Checkliste | Kompakt, aber missverstaendlich fuer Supported Path | |
| Gar nicht validieren | Keine optionale Validierung dokumentieren | ✓ |

**User's choice:** Gar nicht validieren
**Notes:** Optionale Services bleiben ausserhalb der Validierungsdoku.

| Option | Description | Selected |
|--------|-------------|----------|
| Sofortige Stop/Repair-Anweisung pro Check | Deterministisch und reproduzierbar | |
| Hinweis "spaeter nochmal versuchen" | Niedrige Reibung, aber wenig hilfreich | |
| Keine Guidance | Kein Error-Playbook im Default-Flow | ✓ |

**User's choice:** Keine Guidance
**Notes:** Failure-Handling wird nicht in den Pflichtablauf aufgenommen.

---

## Kubernetes-Praereqs und Rollout-Reihenfolge

| Option | Description | Selected |
|--------|-------------|----------|
| Explizite Praereq-Matrix (Ingress, Storage, Netzwerk, Secrets, DNS) | Schnell pruefbar vor jedem Install/Upgrade | ✓ |
| Freitext-Abschnitt ohne feste Kategorien | Weniger Pflegeaufwand, aber schlechter vergleichbar | |
| Nur Link auf values.yaml | Zu implizit fuer Operator-Onboarding | |

**User's choice:** Explizite Praereq-Matrix (Ingress, Storage, Netzwerk, Secrets, DNS)
**Notes:** Operatoren sollen Voraussetzungen strukturiert pruefen koennen.

| Option | Description | Selected |
|--------|-------------|----------|
| Schrittfolge mit Gates (Asset-Sync -> Values -> Helm -> Verifikation) | Klare Reihenfolge und Abbruchpunkte | ✓ |
| Nur grobe Reihenfolge ohne Gates | Kuerzer, aber weniger robust | |
| Verweis auf Helm-Standardablauf | Zu generisch fuer projektspezifische Abhaengigkeiten | |

**User's choice:** Schrittfolge mit Gates (Asset-Sync -> Values -> Helm -> Verifikation)
**Notes:** Reihenfolge soll operativ eindeutig sein.

| Option | Description | Selected |
|--------|-------------|----------|
| Als optionale Integration mit klarer Fallback-/Alternative-Notiz | Dokumentiert Abhaengigkeit ohne harte Pflicht fuer jeden Cluster | ✓ |
| Als zwingende Voraussetzung fuer alle Setups | Einfach, aber zu restriktiv | |
| Nicht erwaehnen | Erhoeht Onboarding-Risiko | |

**User's choice:** Als optionale Integration mit klarer Fallback-/Alternative-Notiz
**Notes:** Traefik wird nicht als universelle Pflicht gesetzt.

| Option | Description | Selected |
|--------|-------------|----------|
| Release healthy + Kernendpunkte erreichbar + kritische Pods Ready | Pragmat. Betriebsnachweis | ✓ |
| Nur Helm-Exitcode 0 | Zu schwach fuer reale Betriebsfaehigkeit | |
| Vollstaendiger E2E-Test aller Features | Zu schwergewichtig fuer Setup-Phase | |

**User's choice:** Release healthy + Kernendpunkte erreichbar + kritische Pods Ready
**Notes:** Verifikation soll praxisnah, aber nicht ueberladen sein.

---

## the agent's Discretion

- Keine.

## Deferred Ideas

- Keine; Diskussion blieb im Scope von Phase 1.
