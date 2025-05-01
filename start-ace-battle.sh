#!/bin/bash

echo "🛡️ Launching ACE Sniper Battle Station Commander..."

# Kill any old processes using 3003
echo "⚡ Checking and freeing port 3003..."
kill -9 $(lsof -t -i :3003) 2>/dev/null

# Wait 1 second
sleep 1

# Start Stats Server first
echo "🛠️ Starting WebSocket Stats Server..."
node services/statsServer.js &
STATS_PID=$!

# Wait 2 seconds for stats server to fully initialize
sleep 2

# Start Scanner Master next
echo "🛠️ Starting Battle Scanner Master..."
node services/scannerMaster.js &

# Optional: Automatically attach both processes
wait
