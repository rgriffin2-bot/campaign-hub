#!/bin/bash

# Campaign Hub - Start Script
# This script starts the development servers and opens the browser

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting Campaign Hub..."
echo "Server: http://localhost:3001"
echo "Client: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Open browser after a short delay (in background)
(sleep 3 && open http://localhost:5173) &

# Start the dev servers
npm run dev
