#!/bin/bash

# Setup working directory
cd "$(dirname "$0")"

echo "🛠️  Preparing Ace Sniper Backend Setup..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Installing dependencies..."
  npm install
else
  echo "✅ node_modules already exists. Verifying dependencies..."
  npm install
fi

echo "✅ Backend dependencies are ready."

# Ask user if they want to launch server
read -p "🚀 Launch backend server now? (y/n): " launch_now

if [ "$launch_now" == "y" ] || [ "$launch_now" == "Y" ]; then
  echo "🔥 Launching backend server..."
  node server.js
else
  echo "👋 Setup complete. You can manually run: node server.js"
fi
