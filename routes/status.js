const express = require("express")
const router = express.Router()
const os = require("os")
const { createClient } = require("@supabase/supabase-js")

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Format uptime to human-readable format
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  let result = ""
  if (days > 0) result += `${days}d `
  if (hours > 0) result += `${hours}h `
  if (minutes > 0) result += `${minutes}m `
  result += `${secs}s`

  return result
}

// Get status information
router.get("/", async (req, res) => {
  try {
    // Check database connection
    const startTime = Date.now()
    const { data, error } = await supabase.from("phrases").select("id").limit(1)
    const dbResponseTime = Date.now() - startTime

    // Get system information
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const cpus = os.cpus().length

    // Get server information
    const uptime = process.uptime()
    const nodeVersion = process.version
    const platform = os.platform()
    const arch = os.arch()

    res.json({
      server: {
        status: "running",
        version: process.env.npm_package_version || "1.0.0",
        nodeVersion,
        uptime: formatUptime(uptime),
      },
      database: {
        connected: !error,
        responseTime: `${dbResponseTime}ms`,
        error: error ? error.message : null,
      },
      system: {
        platform,
        arch,
        cpus,
        totalMemory: formatBytes(totalMemory),
        freeMemory: formatBytes(freeMemory),
        memoryUsage: `${Math.round(((totalMemory - freeMemory) / totalMemory) * 100)}%`,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting status:", error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
