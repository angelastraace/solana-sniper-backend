#!/bin/bash

echo "🚀 Launching Ace Battle Station Commander... 🔥"

# Start backend sniper engine
echo "🛡️ Starting Backend Services..."
cd backend
npm install
npx nodemon server.js &

# Wait a few seconds for backend to stabilize
sleep 5

# Start frontend battle dashboard
echo "🎯 Launching Frontend Battle Dashboard..."
cd ../frontend
npm install
npm run dev &

# Wait a few seconds
sleep 5

# Open browser to Battle Dashboard
echo "🌐 Opening Dashboard in browser..."
open http://localhost:3000

echo "✅ BATTLE STATION ONLINE. DOMINATE!"
