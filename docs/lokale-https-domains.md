# Lokale HTTPS-Domains und Zertifikatswarnungen

Das lokale Testbett läuft hinter Traefik mit einem selbstsignierten Wildcard-Zertifikat für
`*.${BASE_DOMAIN}` (Standard: `example.com`, siehe `local/make-local-ca.sh`).

Chrome akzeptiert dieses Zertifikat **pro Origin**. Ein Klick auf `eam.example.com` reicht
nicht — jede Subdomain, die der Browser direkt kontaktiert (auch per XHR oder WebSocket),
braucht eine eigene Ausnahme.

## Checkliste: alle Domains einmal öffnen

Bevor du `eam.example.com` regulär benutzt, öffne **jede** dieser URLs einmal in einem neuen
Tab und bestätige dort die Zertifikatswarnung (siehe [Vorgehen in Chrome](#vorgehen-in-chrome)).
Erst danach funktionieren Login **und** die Datenabrufe der UI:

1. `https://auth.example.com` — Keycloak (nötig für den Login-Redirect)
2. `https://eam.example.com` — Next.js Client (Haupt-UI)
3. `https://api.example.com` — GraphQL-API, wird von der UI per XHR/`fetch` aufgerufen
4. `https://room.example.com` — Excalidraw-Collab-WebSocket
5. `https://neo4j.example.com` — nur falls du den Neo4j Browser direkt nutzt
6. `https://temporal.example.com` — nur falls du die Temporal-UI direkt nutzt

Jede dieser Domains nutzt dasselbe Wildcard-Zertifikat — die Ausnahme ist trotzdem **pro
Origin** einzeln nötig, weil Chrome sie pro Origin und nicht pro Zertifikat merkt.

## Betroffene Domains

Die Hosts stammen aus den Traefik-Routern in `compose.yml` und den `*_SUBDOMAIN`-Variablen
in `.env`:

| Domain                   | Dienst                          | Ausnahme nötig                       |
| ------------------------ | -------------------------------- | ------------------------------------ |
| `eam.example.com`        | Next.js Client (Haupt-UI)       | ja                                   |
| `auth.example.com`       | Keycloak (Login-Redirect)       | ja                                   |
| `api.example.com`        | GraphQL / Analytics             | ja (XHR)                             |
| `room.example.com`       | Excalidraw-Collab-WebSocket     | ja (WS)                              |
| `neo4j.example.com`      | Neo4j Browser                   | nur bei Nutzung der Admin-UI         |
| `temporal.example.com`   | Temporal UI                     | nur bei Nutzung der Admin-UI         |

Weicht `BASE_DOMAIN` oder eine `*_SUBDOMAIN` in deiner `.env` vom Standard ab, gelten die
entsprechend gebildeten Hostnamen.

## Vorgehen in Chrome

Auf Corporate-Devices lässt sich die lokale Root-CA in der Regel nicht in den Truststore
importieren. Deshalb: Ausnahme manuell bestätigen.

1. Vor der ersten Nutzung jede der oben genannten Domains **einzeln im Browser öffnen**,
   mindestens `eam`, `auth`, `api`, `room`.
2. Auf der Warnseite: *Erweitert* → *Weiter zu … (unsicher)*.
   Erscheint der Link nicht (z. B. bei HSTS), auf der Warnseite `thisisunsafe` tippen.
3. Erst danach `eam.example.com` regulär nutzen.

**Wichtig:** Ohne vorherige Ausnahme für `api` und `room` schlagen die Requests still fehl —
die UI lädt, aber Daten bleiben leer und die Excalidraw-Collaboration verbindet sich nicht.
Die Fehler sind nur in der Browser-Konsole sichtbar.

Die Ausnahmen gelten pro Browserprofil und gehen beim Löschen der Browserdaten verloren.

## Troubleshooting: Login klappt, aber GraphQL-Requests schlagen fehl

**Symptom:** Der Keycloak-Login über `eam.example.com`/`auth.example.com` funktioniert, die
Browser-Konsole zeigt aber wiederholt:

```
api.example.com/graphql:1  Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID
```

**Ursache:** Die Zertifikats-Ausnahme wurde bisher nur für `eam`/`auth` bestätigt (z. B. beim
Login-Redirect), nicht aber für `api.example.com` — genau das im Abschnitt oben beschriebene
Per-Origin-Verhalten von Chrome. Die UI lädt normal, alle GraphQL-Aufrufe im Hintergrund
schlagen aber still fehl, sodass Daten leer bleiben.

**Fix:** Öffne `https://api.example.com/graphql` (oder einfach `https://api.example.com`) in
einem neuen Tab und bestätige die Warnung wie oben beschrieben (*Erweitert* → *Weiter zu …*,
oder `thisisunsafe` tippen, falls kein Link erscheint). Danach die Client-Seite neu laden.
Falls Excalidraw-Collaboration oder andere Realtime-Features ebenfalls nicht funktionieren,
wiederhole denselben Schritt für `room.example.com`.

**Nachhaltiger Fix (empfohlen):** Statt die Ausnahme pro Origin manuell zu bestätigen, die
lokale Root-CA (`local/certs/rootCA.pem`) einmalig in den Betriebssystem- bzw.
Browser-Zertifikatsspeicher importieren (siehe README, Abschnitt "Optional Path"). Danach
vertraut der Browser allen sechs Subdomains automatisch, ohne Per-Origin-Klicks.
