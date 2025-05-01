// backend/services/statsServer.js

const WebSocket = require('ws');
const zlib = require('zlib');
require('dotenv').config();

const port = process.env.WS_STATS_PORT || 3002;
const wss = new WebSocket.Server({ port });

let stats = {
  phrasesPerSec: 0,
  walletsFound: 0,
  solanaPhrases: 0,
  ethereumPhrases: 0,
  bscPhrases: 0,
  cpuUsage: 0,
  ramUsage: 0,
  log: 'Starting scanner...',
};

function updateSystemStats() {
  const os = require('os');
  const cpus = os.cpus();
  const cpuLoad = cpus.reduce((acc, cpu) => {
    const times = cpu.times;
    return acc + (1 - times.idle / (times.user + times.nice + times.sys + times.idle + times.irq));
  }, 0) / cpus.length;
  const ramLoad = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  stats.cpuUsage = Math.round(cpuLoad * 100);
  stats.ramUsage = Math.round(ramLoad);
}

function broadcastStats() {
  const compressed = zlib.deflateSync(Buffer.from(JSON.stringify(stats)));
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(compressed);
    }
  });
}

setInterval(() => {
  updateSystemStats();
  broadcastStats();
}, 1000);

function updateStats(partialStats) {
  stats = { ...stats, ...partialStats };
}

console.log(`🚀 Ultra WebSocket server with compression on ws://localhost:${port}`);

module.exports = {
  updateStats,
};
