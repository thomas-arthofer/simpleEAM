#!/usr/bin/env bash
# Setzt das Passwort fuer den Realm-User "admin" im Realm nextgen-eam.
#
# Hintergrund: auth/src/realm-export.json legt den User "admin" mit der
# Realm-Rolle "admin" an, aber OHNE credentials-Array. Ohne diesen Schritt
# existiert der User, kann sich aber nicht einloggen.
#
# Nicht zu verwechseln mit KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD - das ist
# der Master-Realm-Bootstrap-Admin fuer die Admin-Console.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# .env NICHT sourcen: Werte wie BRAND_NAME_LONG enthalten unquotete
# Leerzeichen und wuerden von bash als Kommando interpretiert.
env_get() { grep -E "^${1}=" .env | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//' | xargs; }

KEYCLOAK_ADMIN="$(env_get KEYCLOAK_ADMIN)"
KEYCLOAK_ADMIN_PASSWORD="$(env_get KEYCLOAK_ADMIN_PASSWORD)"
KEYCLOAK_REALM="$(env_get KEYCLOAK_REALM)"

NEW_PASSWORD="${1:-}"
if [[ -z "$NEW_PASSWORD" ]]; then
  read -rsp "Neues Passwort fuer Realm-User 'admin' in '${KEYCLOAK_REALM}': " NEW_PASSWORD
  echo
fi

KC="docker compose exec -T keycloak /opt/keycloak/bin/kcadm.sh"

echo "==> Authentifiziere gegen Master-Realm"
$KC config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}"

echo "==> Setze Passwort fuer admin@${KEYCLOAK_REALM}"
$KC set-password \
  -r "${KEYCLOAK_REALM}" \
  --username admin \
  --new-password "${NEW_PASSWORD}"

echo
echo "Fertig. Login: https://eam.example.com  ->  Benutzer 'admin'"
