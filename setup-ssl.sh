#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-ssl.sh
# Generates a self-signed SSL certificate for local HTTPS.
# Required for iPhone PWA install + Web Push over LAN.
# ─────────────────────────────────────────────────────────────────────────────

set -e

SSL_DIR="ssl"
mkdir -p "$SSL_DIR"

# Get Mac's LAN IP automatically
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "192.168.1.100")
echo "Detected LAN IP: $LAN_IP"

# Generate self-signed cert valid for 365 days, including the LAN IP as SAN
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -days 365 \
  -subj "/CN=PWA Local Dev" \
  -addext "subjectAltName=IP:$LAN_IP,IP:127.0.0.1,DNS:localhost"

echo ""
echo "✅ SSL certificate generated in ./$SSL_DIR/"
echo ""
echo "Next steps:"
echo "  1. On your iPhone: open https://$LAN_IP:4200 in Safari"
echo "     → You'll see a 'Not secure' warning (self-signed)"
echo "     → Tap 'Advanced' → 'Proceed to $LAN_IP (unsafe)'"
echo ""
echo "  2. To trust the cert on iPhone (recommended for PWA):"
echo "     → Open https://$LAN_IP:4200/ssl/cert.pem in Safari on iPhone"
echo "     → Download and install the profile"
echo "     → Settings > General > VPN & Device Management > trust it"
echo "     → Settings > General > About > Certificate Trust Settings > enable it"
echo ""
echo "  3. Start the Angular app with SSL:"
echo "     npm run start:ssl"
echo ""
echo "  4. Update the push-server base URL if needed in push-notification.service.ts:"
echo "     export const PUSH_SERVER_URL = 'http://$LAN_IP:3000';"
echo ""
