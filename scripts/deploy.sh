#!/bin/bash

# =============================================================================
# Campaign Hub — Deploy to Raspberry Pi
# =============================================================================
# Run this from your Mac after pushing changes to git.
# It SSHes into the Pi, pulls the latest code, rebuilds, and restarts.
#
# Usage:
#   ./scripts/deploy.sh              # Uses default host "pi" from SSH config
#   ./scripts/deploy.sh pi@192.168.1.42   # Use explicit address
#
# Prerequisites:
#   - SSH key-based auth set up (so no password prompt)
#   - The Pi has already been set up with scripts/pi-setup.sh
# =============================================================================

# The SSH host to connect to. Defaults to "pi" (which uses your ~/.ssh/config).
# Override by passing an argument: ./scripts/deploy.sh pi@192.168.1.42
PI_HOST="${1:-pi}"

# Where Campaign Hub lives on the Pi
REMOTE_DIR="campaign-hub"

echo "================================================"
echo "  Deploying Campaign Hub to $PI_HOST"
echo "================================================"
echo ""

# Step 1: Make sure we can connect
echo "[1/4] Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 "$PI_HOST" "echo 'Connected!'" 2>/dev/null; then
    echo ""
    echo "ERROR: Can't connect to $PI_HOST"
    echo "Check that:"
    echo "  - The Pi is powered on and connected to your network"
    echo "  - SSH is enabled on the Pi"
    echo "  - You have SSH key auth set up (ssh-copy-id $PI_HOST)"
    echo "  - If using 'pi' shortcut, your ~/.ssh/config has a 'Host pi' entry"
    exit 1
fi

# Step 2: Pull latest code, install dependencies, and build
echo "[2/4] Pulling code and building on Pi..."
ssh "$PI_HOST" "cd ~/$REMOTE_DIR && \
    echo '  Pulling latest code...' && \
    git pull && \
    echo '  Installing dependencies...' && \
    npm install --omit=dev && \
    echo '  Building production bundle...' && \
    npm run build"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed on the Pi. Check the output above."
    exit 1
fi

# Step 3: Restart the services
echo "[3/4] Restarting services..."
ssh "$PI_HOST" "sudo systemctl restart campaignhub && \
    sudo systemctl restart campaignhub-tunnel"

# Step 4: Verify and show status
echo "[4/4] Checking status..."
sleep 3  # Give the server and tunnel a moment to start

ssh "$PI_HOST" "
    echo ''
    echo '--- Server Status ---'
    systemctl is-active campaignhub
    echo ''
    echo '--- Tunnel Status ---'
    systemctl is-active campaignhub-tunnel
    echo ''
    # Show the tunnel URL if available
    if [ -f ~/$REMOTE_DIR/.tunnel-url ]; then
        echo '--- Tunnel URL ---'
        cat ~/$REMOTE_DIR/.tunnel-url
    else
        echo '(Tunnel URL not yet available — check in a few seconds with: ssh $PI_HOST \"cat ~/$REMOTE_DIR/.tunnel-url\")'
    fi
"

echo ""
echo "================================================"
echo "  Deploy complete!"
echo "================================================"
