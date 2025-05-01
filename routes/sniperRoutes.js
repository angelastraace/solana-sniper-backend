// backend/routes/sniperRoutes.js

const express = require("express")
const router = express.Router()
const {
  toggleChainSniper,
  toggleChainMonitoring,
  updateChainSettings,
  getSettings,
  getActiveState,
  getMonitoringState,
  getStatus,
  sniperRouter,
} = require("../services/sniperEngine/multichainSniper")

// Toggle sniper for a specific chain
router.post("/toggle", async (req, res) => {
  try {
    const { chain, active } = req.body

    if (!chain || typeof active !== "boolean") {
      return res.status(400).json({ error: "Invalid input. Chain and active state are required." })
    }

    const result = toggleChainSniper(chain, active)
    res.json({ active: result })
  } catch (error) {
    console.error("Error in toggle sniper route:", error)
    res.status(500).json({ error: error.message || "Unknown error" })
  }
})

// Toggle monitoring for a specific chain or all chains
router.post("/start-monitoring", async (req, res) => {
  try {
    const { chain, active } = req.body

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Invalid input. Active state is required." })
    }

    const result = toggleChainMonitoring(chain, active)
    res.json({ monitoring: result })
  } catch (error) {
    console.error("Error in start monitoring route:", error)
    res.status(500).json({ error: error.message || "Unknown error" })
  }
})

// Update settings for a specific chain
router.post("/settings", async (req, res) => {
  try {
    const { chain, settings } = req.body

    if (!chain || !settings) {
      return res.status(400).json({ error: "Invalid input. Chain and settings are required." })
    }

    const result = updateChainSettings(chain, settings)
    res.json({ settings: result })
  } catch (error) {
    console.error("Error in update settings route:", error)
    res.status(500).json({ error: error.message || "Unknown error" })
  }
})

// Get current status
router.get("/status", async (req, res) => {
  try {
    const status = getStatus()
    res.json(status)
  } catch (error) {
    console.error("Error in get status route:", error)
    res.status(500).json({ error: error.message || "Unknown error" })
  }
})

// Execute a manual snipe
router.post("/execute", async (req, res) => {
  try {
    const { chain, tokenAddress } = req.body

    if (!chain || !tokenAddress) {
      return res.status(400).json({ error: "Invalid input. Chain and token address are required." })
    }

    const result = await sniperRouter(chain, tokenAddress)
    res.json(result)
  } catch (error) {
    console.error("Error in execute snipe route:", error)
    res.status(500).json({ error: error.message || "Unknown error" })
  }
})

module.exports = router
