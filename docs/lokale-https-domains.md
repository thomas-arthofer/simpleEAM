# Lokale HTTPS-Domains und Zertifikatswarnungen

Das lokale Testbett läuft hinter Traefik mit einem selbstsignierten Wildcard-Zertifikat für
`*.${BASE_DOMAIN}` (Standard: `example.com`, siehe `local/make-local-ca.sh`).

Chrome akzeptiert dieses Zertifikat **pro Origin**. Ein Klick auf `eam.example.com` reicht
nicht — jede Subdomain, die der Browser direkt kontaktiert (auch per XHR oder WebSocket),
braucht eine eigene Ausnahme.

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
