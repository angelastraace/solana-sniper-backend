// backend/routes/scanner.js

const express = require("express")
const router = express.Router()
const { scanFromArray } = require("../services/scannerMaster")
const { createClient } = require("@supabase/supabase-js")
const multer = require("multer")
const fs = require("fs")
const path = require("path")

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
})

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

/**
 * @route POST /api/scanner/scan
 * @desc Scan a single phrase
 */
router.post("/scan", async (req, res) => {
  try {
    const { phrase } = req.body

    if (!phrase) {
      return res.status(400).json({ success: false, error: "Phrase is required" })
    }

    const results = await scanFromArray([phrase], { numWorkers: 1 })

    return res.json(results)
  } catch (error) {
    console.error("Error scanning phrase:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/scanner/batch
 * @desc Scan multiple phrases
 */
router.post("/batch", async (req, res) => {
  try {
    const { phrases, numWorkers, batchSize } = req.body

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({ success: false, error: "Phrases array is required" })
    }

    // Limit batch size for API requests
    const maxBatchSize = 1000
    if (phrases.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        error: `Batch size exceeds limit. Maximum is ${maxBatchSize} phrases.`,
      })
    }

    const options = {
      numWorkers: numWorkers || undefined,
      batchSize: batchSize || undefined,
    }

    const results = await scanFromArray(phrases, options)

    return res.json(results)
  } catch (error) {
    console.error("Error scanning batch:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route POST /api/scanner/upload
 * @desc Upload and scan phrases from a file
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" })
    }

    // Read file content
    const filePath = req.file.path
    const fileContent = fs.readFileSync(filePath, "utf8")
    const phrases = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // Clean up uploaded file
    fs.unlinkSync(filePath)

    if (phrases.length === 0) {
      return res.status(400).json({ success: false, error: "File contains no valid phrases" })
    }

    // Limit batch size for API requests
    const maxBatchSize = 5000
    if (phrases.length > maxBatchSize) {
      return res.status(400).json({
        success: false,
        error: `File contains too many phrases. Maximum is ${maxBatchSize}.`,
      })
    }

    const options = {
      numWorkers: req.body.numWorkers ? Number.parseInt(req.body.numWorkers) : undefined,
      batchSize: req.body.batchSize ? Number.parseInt(req.body.batchSize) : undefined,
    }

    // Start scanning in the background
    const scanId = Date.now().toString()

    // Send immediate response
    res.json({
      success: true,
      message: "File uploaded and scanning started",
      scanId,
      phraseCount: phrases.length,
    })

    // Perform scan in background
    scanFromArray(phrases, options)
      .then(async (results) => {
        // Save scan results to database
        if (results.success) {
          try {
            await supabase.from("scan_results").insert({
              scan_id: scanId,
              total_processed: results.totalProcessed,
              total_valid: results.totalValid,
              total_filled: results.totalFilled,
              total_funded: results.totalFunded,
              time_seconds: results.timeSeconds,
              rate: results.rate,
              completed_at: new Date().toISOString(),
              status: "completed",
              funded_wallets: results.results,
            })
          } catch (error) {
            console.error("Error saving scan results:", error)
          }
        }
      })
      .catch((error) => {
        console.error("Background scan error:", error)
        // Update scan status to failed
        supabase.from("scan_results").insert({
          scan_id: scanId,
          status: "failed",
          error: error.message,
          completed_at: new Date().toISOString(),
        })
      })
  } catch (error) {
    console.error("Error processing file upload:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/scanner/wallet-hits
 * @desc Get wallet hits with optional filtering
 */
router.get("/wallet-hits", async (req, res) => {
  try {
    const { chain, minBalance, limit, offset } = req.query

    let query = supabase.from("wallet_hits").select("*")

    // Apply filters
    if (chain === "solana") {
      query = query.not("sol_balance", "is", null)
    } else if (chain === "ethereum") {
      query = query.not("token_balances", "is", null)
    }

    if (minBalance) {
      if (chain === "solana") {
        query = query.gte("sol_balance", Number.parseFloat(minBalance))
      }
      // For Ethereum we'd need more complex filtering on the JSON token_balances
    }

    // Apply pagination
    if (limit) {
      query = query.limit(Number.parseInt(limit))
    } else {
      query = query.limit(100) // Default limit
    }

    if (offset) {
      query = query.offset(Number.parseInt(offset))
    }

    // Order by found_at descending (newest first)
    query = query.order("found_at", { ascending: false })

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return res.json({
      success: true,
      data,
      count,
      limit: limit ? Number.parseInt(limit) : 100,
      offset: offset ? Number.parseInt(offset) : 0,
    })
  } catch (error) {
    console.error("Error fetching wallet hits:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @route GET /api/scanner/status/:scanId
 * @desc Get status of a background scan
 */
router.get("/status/:scanId", async (req, res) => {
  try {
    const { scanId } = req.params

    const { data, error } = await supabase.from("scan_results").select("*").eq("scan_id", scanId).single()

    if (error) {
      if (error.code === "PGRST116") {
        return res.json({
          success: true,
          status: "pending",
          message: "Scan is still in progress",
        })
      }
      throw error
    }

    return res.json({
      success: true,
      status: data.status,
      data,
    })
  } catch (error) {
    console.error("Error fetching scan status:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
