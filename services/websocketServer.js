// backend/services/websocketServer.js

require('dotenv').config();
const WebSocket = require('ws');
const os = require('os');

let wss;
let stats = {
  phrasesPerSec: 0,
  walletsFound: 0,
  cpuUsage: 0,
  ramUsage: 0,
  log: 'Starting Battle...',
};

function initWebSocketServer() {
  const port = parseInt(process.env.WS_STATS_PORT) || 3002;
  wss = new WebSocket.Server({ port });

  console.log(`🛰️ WebSocket server started at ws://localhost:${port}`);

  setInterval(() => {
    const cpus = os.cpus();
    const cpuLoad = cpus.reduce((acc, cpu) => {
      const { idle, user, sys, nice, irq } = cpu.times;
      return acc + (1 - idle / (user + nice + sys + idle + irq));
    }, 0) / cpus.length;
    const ramLoad = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

    stats.cpuUsage = Math.round(cpuLoad * 100);
    stats.ramUsage = Math.round(ramLoad);

    broadcastStats();
  }, 1000);
}

function broadcastStats() {
  if (!wss) return;
  const data = JSON.stringify(stats);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function updateStats(newStats) {
  stats = { ...stats, ...newStats };
}

module.exports = {
  initWebSocketServer,
  updateStats,
};
