#!/bin/bash

# Campaign Hub - Stop Script
# This script stops any running development servers

echo "Stopping Campaign Hub servers..."

lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Servers stopped."
