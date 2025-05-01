const express = require("express")
const router = express.Router()
const fundingController = require("../controllers/fundingController")

// Start the funding scanner
router.post("/start", fundingController.startScanner)

// Stop the funding scanner
router.post("/stop", fundingController.stopScanner)

// Get the status of the funding scanner
router.get("/status", fundingController.getStatus)

module.exports = router
