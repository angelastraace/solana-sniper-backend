#!/bin/bash
# 🧠 ACE SNIPER FULL BATTLE LAUNCHER 🚀

# Move to backend folder
cd "$(dirname "$0")"

echo "🛠️ Starting WebSocket Stats Server..."
# Start statsServer in background
node services/statsServer.js &

sleep 2

echo "🛠️ Starting Battle Scanner Master..."
# Start scannerMaster normally
node services/scannerMaster.js
