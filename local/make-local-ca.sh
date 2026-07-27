#!/usr/bin/env bash
# Erzeugt eine lokale CA + Wildcard-Zertifikat fuer *.example.com.
# Nur fuer das lokale Testbett. Idempotent: vorhandene Dateien werden nicht ueberschrieben.
set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/certs"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

if [[ -f rootCA.pem && -f wildcard.crt && -f wildcard.key ]]; then
  echo "Zertifikate existieren bereits in $CERT_DIR - nichts zu tun."
  echo "Zum Neuerzeugen: rm -rf $CERT_DIR"
  exit 0
fi

echo "==> Erzeuge lokale Root-CA"
openssl genrsa -out rootCA.key 4096
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 \
  -out rootCA.pem \
  -subj "/CN=simpleEAM Local Dev CA/O=simpleEAM Local"

echo "==> Erzeuge Wildcard-Key + CSR"
openssl genrsa -out wildcard.key 2048

cat > wildcard.cnf <<'EOF'
[req]
distinguished_name = dn
req_extensions     = v3_req
prompt             = no

[dn]
CN = *.example.com

[v3_req]
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @alt_names

[alt_names]
DNS.1 = example.com
DNS.2 = *.example.com
EOF

openssl req -new -key wildcard.key -out wildcard.csr -config wildcard.cnf

echo "==> Signiere Wildcard-Zertifikat mit der lokalen CA"
openssl x509 -req -in wildcard.csr \
  -CA rootCA.pem -CAkey rootCA.key -CAcreateserial \
  -out wildcard.crt -days 825 -sha256 \
  -extensions v3_req -extfile wildcard.cnf

chmod 644 rootCA.pem wildcard.crt
chmod 600 rootCA.key wildcard.key

echo
echo "Fertig. Dateien in $CERT_DIR:"
ls -1 rootCA.pem wildcard.crt wildcard.key
echo
echo "NAECHSTER SCHRITT: rootCA.pem auf jedem zugreifenden Geraet importieren."
echo "  Linux : sudo cp rootCA.pem /usr/local/share/ca-certificates/simpleeam-local.crt && sudo update-ca-certificates"
echo "  Firefox/Chrome: manuell unter Einstellungen -> Zertifikate -> Behoerden importieren"
echo "  (Firefox nutzt einen EIGENEN Trust-Store, der System-Import reicht dort NICHT)"
