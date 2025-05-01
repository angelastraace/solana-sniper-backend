// backend/services/statsWebSocket.js

const WebSocket = require("ws")
const os = require("os")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Configuration
const WS_STATS_PORT = process.env.WS_STATS_PORT ? Number.parseInt(process.env.WS_STATS_PORT) : 3001

// WebSocket server
let wss = null

// Statistics state
let stats = {
  phrasesPerSec: 0,
  walletsFound: 0,
  cpuUsage: 0,
  ramUsage: 0,
  totalProcessed: 0,
  validPhrases: 0,
  filledPhrases: 0,
  activeWorkers: 0,
  gpuEnabled: process.env.USE_GPU_DERIVATION === "true",
  startTime: null,
}

// Log entries
let logs = []
const MAX_LOGS = 100

/**
 * Initialize the WebSocket server for statistics
 */
function initWebSocketServer() {
  if (wss) {
    console.log("WebSocket server already running")
    return
  }

  wss = new WebSocket.Server({ port: WS_STATS_PORT })

  console.log(`📊 Stats WebSocket server started on port ${WS_STATS_PORT}`)

  wss.on("connection", (ws) => {
    console.log("Client connected to stats WebSocket")

    // Send initial stats
    ws.send(
      JSON.stringify({
        ...stats,
        logs: logs.slice(0, 20), // Send last 20 logs on connect
      }),
    )

    ws.on("error", (error) => {
      console.error("WebSocket error:", error)
    })

    ws.on("close", () => {
      console.log("Client disconnected from stats WebSocket")
    })
  })

  // Start system stats monitoring
  startSystemMonitoring()
}

/**
 * Monitor system resources (CPU, RAM)
 */
function startSystemMonitoring() {
  setInterval(() => {
    // Calculate CPU usage (simple approximation)
    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type]
      }
      totalIdle += cpu.times.idle
    })

    const idle = totalIdle / cpus.length
    const total = totalTick / cpus.length
    const cpuUsage = 100 - (idle / total) * 100

    // Calculate RAM usage
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const ramUsage = ((totalMem - freeMem) / totalMem) * 100

    // Update stats
    stats.cpuUsage = Math.round(cpuUsage)
    stats.ramUsage = Math.round(ramUsage)

    // Calculate phrases per second
    if (stats.startTime) {
      const elapsedSec = (Date.now() - stats.startTime) / 1000
      if (elapsedSec > 0) {
        stats.phrasesPerSec = Math.round(stats.totalProcessed / elapsedSec)
      }
    }

    // Broadcast stats to all clients
    broadcastStats()
  }, 1000)
}

/**
 * Broadcast current stats to all connected clients
 */
function broadcastStats() {
  if (!wss) return

  const clients = wss.clients
  if (clients.size === 0) return

  const message = JSON.stringify({
    ...stats,
    log: logs.length > 0 ? logs[0] : "",
  })

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

/**
 * Update scanner statistics
 * @param {Object} newStats - New statistics to update
 */
function updateScannerStats(newStats) {
  // Update stats
  Object.assign(stats, newStats)

  // Initialize start time if not set
  if (newStats.totalProcessed > 0 && !stats.startTime) {
    stats.startTime = Date.now()
  }

  // Broadcast updated stats
  broadcastStats()
}

/**
 * Add a log entry
 * @param {string} message - Log message
 */
function addLogEntry(message) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${message}`

  // Add to beginning of logs array
  logs.unshift(logEntry)

  // Limit log size
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(0, MAX_LOGS)
  }

  // Broadcast updated stats with new log
  broadcastStats()
}

/**
 * Reset statistics
 */
function resetStats() {
  stats = {
    phrasesPerSec: 0,
    walletsFound: 0,
    cpuUsage: stats.cpuUsage,
    ramUsage: stats.ramUsage,
    totalProcessed: 0,
    validPhrases: 0,
    filledPhrases: 0,
    activeWorkers: 0,
    gpuEnabled: process.env.USE_GPU_DERIVATION === "true",
    startTime: null,
  }

  logs = []

  // Broadcast reset stats
  broadcastStats()
}

module.exports = {
  initWebSocketServer,
  updateScannerStats,
  addLogEntry,
  resetStats,
}
