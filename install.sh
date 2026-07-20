#!/data/data/com.termux/files/usr/bin/bash
# ==========================================================================
# install.sh — sets up the portfolio server on Termux (Android)
# ==========================================================================

set -e

echo ""
echo "▸ Foster Portfolio — Termux Install"
echo "────────────────────────────────────"

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Installing via pkg..."
  pkg install -y nodejs
fi

echo "Node version: $(node -v)"
echo ""

cd "$(dirname "$0")/server"

echo "▸ Installing dependencies..."
npm install

if [ ! -f ".env" ]; then
  echo ""
  echo "▸ Creating server/.env from .env.example"
  cp .env.example .env
  echo "  → Edit server/.env with your Resend API key (recommended) or SMTP credentials before running the contact form."
fi

echo ""
echo "✓ Install complete."
echo ""
echo "To start the server:"
echo "  cd server && node server.js"
echo ""
echo "Then open http://localhost:3000 in your browser."
echo ""
