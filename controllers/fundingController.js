const fundingScanner = require("../services/fundingScanner")

let isRunning = false

const startScanner = async (req, res) => {
  try {
    if (isRunning) {
      return res.status(400).json({ success: false, message: "Funding scanner is already running" })
    }

    await fundingScanner.startFundingMonitor()
    isRunning = true

    return res.json({
      success: true,
      message: "Funding scanner started successfully",
      status: { isRunning },
    })
  } catch (error) {
    console.error("Error starting funding scanner:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to start funding scanner",
      error: error.message,
    })
  }
}

const stopScanner = async (req, res) => {
  try {
    if (!isRunning) {
      return res.status(400).json({ success: false, message: "Funding scanner is not running" })
    }

    await fundingScanner.stopFundingMonitor()
    isRunning = false

    return res.json({
      success: true,
      message: "Funding scanner stopped successfully",
      status: { isRunning },
    })
  } catch (error) {
    console.error("Error stopping funding scanner:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to stop funding scanner",
      error: error.message,
    })
  }
}

const getStatus = (req, res) => {
  return res.json({
    success: true,
    status: {
      isRunning,
      // Add any other status information you want to expose
    },
  })
}

module.exports = {
  startScanner,
  stopScanner,
  getStatus,
}
