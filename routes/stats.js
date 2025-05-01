const express = require("express")
const router = express.Router()
const statsServer = require("../services/statsServer")

// Reset stats
router.post("/reset", (req, res) => {
  try {
    statsServer.resetStats()
    res.json({ success: true, message: "Stats reset successfully" })
  } catch (error) {
    console.error("Error resetting stats:", error)
    res.status(500).json({ success: false, error: "Failed to reset stats" })
  }
})

module.exports = router
