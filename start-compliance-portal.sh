#!/bin/bash

echo "================================================"
echo "Starting Hand Assessment Compliance Portal"
echo "================================================"

# Kill any existing processes on port 5000
pkill -f "tsx.*server/index.ts" || true
pkill -f "vite.*" || true

# Wait for processes to stop
sleep 2

# Navigate to compliance portal directory
cd hand-assessment-compliance-portal

echo "Starting compliance portal server..."
echo "Access the portal at: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo "================================================"

# Start both server and client
npm run dev