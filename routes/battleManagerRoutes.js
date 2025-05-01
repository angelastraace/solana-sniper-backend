// backend/routes/battleManagerRoutes.js
const express = require("express")
const router = express.Router()
const {
  getChainStatus,
  toggleChain,
  toggleMonitoring,
  updateChainSettings,
  executeManualSnipe,
  getStats,
  resetStats,
} = require("../services/sniperEngine/multichainFireManager")

// Get status of all chains
router.get("/status", (req, res) => {
  try {
    const status = getChainStatus()
    res.json(status)
  } catch (error) {
    console.error("Error getting chain status:", error)
    res.status(500).json({ error: "Failed to get chain status" })
  }
})

// Toggle a specific chain on/off
router.post("/toggle-chain", (req, res) => {
  try {
    const { chain, active } = req.body

    if (!chain || active === undefined) {
      return res.status(400).json({ error: "Missing required parameters: chain and active" })
    }

    const result = toggleChain(chain, active)
    res.json(result)
  } catch (error) {
    console.error("Error toggling chain:", error)
    res.status(500).json({ error: "Failed to toggle chain" })
  }
})

// Toggle monitoring for all chains
router.post("/toggle-monitoring", (req, res) => {
  try {
    const { active } = req.body

    if (active === undefined) {
      return res.status(400).json({ error: "Missing required parameter: active" })
    }

    const result = toggleMonitoring(active)
    res.json(result)
  } catch (error) {
    console.error("Error toggling monitoring:", error)
    res.status(500).json({ error: "Failed to toggle monitoring" })
  }
})

// Update settings for a specific chain
router.post("/update-settings", (req, res) => {
  try {
    const { chain, settings } = req.body

    if (!chain || !settings) {
      return res.status(400).json({ error: "Missing required parameters: chain and settings" })
    }

    const result = updateChainSettings(chain, settings)
    res.json(result)
  } catch (error) {
    console.error("Error updating chain settings:", error)
    res.status(500).json({ error: "Failed to update chain settings" })
  }
})

// Execute a manual snipe
router.post("/execute-snipe", (req, res) => {
  try {
    const { chain, tokenAddress } = req.body

    if (!chain || !tokenAddress) {
      return res.status(400).json({ error: "Missing required parameters: chain and tokenAddress" })
    }

    // Execute snipe asynchronously and return immediately
    executeManualSnipe(chain, tokenAddress)
      .then((result) => {
        console.log(`Manual snipe result for ${tokenAddress} on ${chain}:`, result)
      })
      .catch((error) => {
        console.error(`Error in manual snipe for ${tokenAddress} on ${chain}:`, error)
      })

    res.json({
      success: true,
      message: `Manual snipe initiated for ${tokenAddress} on ${chain}`,
    })
  } catch (error) {
    console.error("Error executing manual snipe:", error)
    res.status(500).json({ error: "Failed to execute manual snipe" })
  }
})

// Get battle statistics
router.get("/stats", (req, res) => {
  try {
    const stats = getStats()
    res.json(stats)
  } catch (error) {
    console.error("Error getting battle stats:", error)
    res.status(500).json({ error: "Failed to get battle stats" })
  }
})

// Reset battle statistics
router.post("/reset-stats", (req, res) => {
  try {
    resetStats()
    res.json({ success: true, message: "Battle statistics reset successfully" })
  } catch (error) {
    console.error("Error resetting battle stats:", error)
    res.status(500).json({ error: "Failed to reset battle stats" })
  }
})

module.exports = router
