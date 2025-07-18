#!/bin/bash

echo "Starting Hand Assessment Compliance Portal..."
echo "================================"

# Navigate to compliance portal directory
cd hand-assessment-compliance-portal

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting development server..."
npm run dev