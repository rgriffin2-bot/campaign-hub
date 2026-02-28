#!/bin/bash

# =============================================================================
# Campaign Hub — First-Time Raspberry Pi Setup
# =============================================================================
# Run this ONCE on the Pi to install all dependencies and configure
# Campaign Hub to run as an always-on server.
#
# This script should be run ON the Pi itself (after SSH'ing in),
# or remotely via: ssh pi "bash -s" < scripts/pi-setup.sh
#
# What it does:
#   1. Installs Node.js 20 (if not already installed)
#   2. Installs cloudflared (Cloudflare Tunnel client)
#   3. Clones the repo (or updates if already cloned)
#   4. Installs npm dependencies
#   5. Creates a template .env file (you'll need to edit this)
#   6. Builds the production bundle
#   7. Installs and enables systemd services (auto-start on boot)
#
# After running this script:
#   1. Edit ~/.campaign-hub/.env with your passwords and API key
#   2. Start the services: sudo systemctl start campaignhub campaignhub-tunnel
#   3. Check status: sudo systemctl status campaignhub
# =============================================================================

set -e  # Stop on any error

# ---- Configuration ----
# Change this to your actual git repo URL
REPO_URL="REPLACE_WITH_YOUR_GIT_REPO_URL"
INSTALL_DIR="$HOME/campaign-hub"

echo "================================================"
echo "  Campaign Hub — Raspberry Pi Setup"
echo "================================================"
echo ""

# ---- Check repo URL ----
if [ "$REPO_URL" = "REPLACE_WITH_YOUR_GIT_REPO_URL" ]; then
    echo "ERROR: You need to edit this script first!"
    echo "Open scripts/pi-setup.sh and set REPO_URL to your git repo URL."
    echo ""
    echo "Example:"
    echo '  REPO_URL="https://github.com/yourusername/campaign-hub.git"'
    echo ""
    exit 1
fi

# ---- Step 1: System updates ----
echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ---- Step 2: Install Node.js 20 via nvm ----
# We use nvm (Node Version Manager) because NodeSource doesn't support 32-bit ARM (armhf).
# nvm installs Node in ~/.nvm/ and manages versions per-user.
if command -v node &> /dev/null && [[ $(node --version | cut -d. -f1 | tr -d 'v') -ge 18 ]]; then
    echo "[2/7] Node.js $(node --version) already installed — skipping"
else
    echo "[2/7] Installing Node.js 20 via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    # Load nvm into this shell session
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    echo "  Installed Node.js $(node --version)"
fi

# ---- Step 3: Install cloudflared ----
if command -v cloudflared &> /dev/null; then
    echo "[3/7] cloudflared already installed — skipping"
else
    echo "[3/7] Installing cloudflared (Cloudflare Tunnel client)..."
    # Detect architecture for the right download (armhf for 32-bit, arm64 for 64-bit)
    ARCH=$(dpkg --print-architecture)
    if [ "$ARCH" = "armhf" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb"
    else
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb"
    fi
    curl -L "$CF_URL" -o /tmp/cloudflared.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    echo "  Installed cloudflared $(cloudflared --version)"
fi

# ---- Step 4: Clone or update the repo ----
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "[4/7] Repo already cloned — pulling latest..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "[4/7] Cloning repo..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# ---- Step 5: Install dependencies ----
echo "[5/7] Installing npm dependencies (this may take a few minutes)..."
npm install --omit=dev

# ---- Step 6: Create .env template ----
if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo "[6/7] Creating .env template..."
    cat > "$INSTALL_DIR/.env" << 'ENVFILE'
# =============================================================================
# Campaign Hub — Production Environment
# =============================================================================
# IMPORTANT: Edit this file with your actual values!

# Server
PORT=3001
NODE_ENV=production

# Campaigns Directory
CAMPAIGNS_DIR=./campaigns

# Authentication — SET THESE to enable password protection
DM_PASSWORD=CHANGE_ME
PLAYER_PASSWORD=CHANGE_ME

# Anthropic Claude API (for NPC generation) — optional
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Rate Limiting (5000 supports ~5 players polling every 1s)
RATE_LIMIT_MAX=5000
ENVFILE

    echo ""
    echo "  *** IMPORTANT: Edit $INSTALL_DIR/.env with your passwords and API key ***"
    echo "  Run: nano $INSTALL_DIR/.env"
    echo ""
else
    echo "[6/7] .env already exists — skipping (won't overwrite your settings)"
fi

# ---- Step 7: Build ----
echo "[7/7] Building production bundle..."
npm run build

# ---- Install systemd services ----
echo ""
echo "Installing systemd services..."

# Copy service files to systemd
sudo cp "$INSTALL_DIR/deploy/campaignhub.service" /etc/systemd/system/
sudo cp "$INSTALL_DIR/deploy/campaignhub-tunnel.service" /etc/systemd/system/

# Reload systemd so it picks up the new files
sudo systemctl daemon-reload

# Enable auto-start on boot (but don't start yet — .env needs editing first)
sudo systemctl enable campaignhub
sudo systemctl enable campaignhub-tunnel

# ---- Create campaigns directory if needed ----
mkdir -p "$INSTALL_DIR/campaigns"
# Create .gitkeep if the directory is empty
[ -z "$(ls -A "$INSTALL_DIR/campaigns" 2>/dev/null)" ] && touch "$INSTALL_DIR/campaigns/.gitkeep"

echo ""
echo "================================================"
echo "  Setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Edit your .env file:"
echo "       nano $INSTALL_DIR/.env"
echo "     Set DM_PASSWORD, PLAYER_PASSWORD, and optionally ANTHROPIC_API_KEY"
echo ""
echo "  2. If you have existing campaign data, copy it to:"
echo "       $INSTALL_DIR/campaigns/"
echo ""
echo "  3. Start the services:"
echo "       sudo systemctl start campaignhub"
echo "       sudo systemctl start campaignhub-tunnel"
echo ""
echo "  4. Check that everything is running:"
echo "       sudo systemctl status campaignhub"
echo "       cat $INSTALL_DIR/.tunnel-url    # player URL (may take ~10s to appear)"
echo ""
echo "  5. From your Mac, visit:"
echo "       http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "The server will now start automatically on boot."
echo "To deploy updates, run from your Mac:"
echo "  ./scripts/deploy.sh"
echo ""
