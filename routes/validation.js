// backend/routes/validation.js
const express = require("express")
const router = express.Router()
const { validatePhrase, validatePhrasesBatch, validatePhraseDetailed } = require("../utils/validatePhrase")
const { createValidSeedPhrase, generateVariations, filterValidBIP39Words } = require("../utils/fillPhrase")

/**
 * Validate a single phrase
 * POST /api/validation/phrase
 */
router.post("/phrase", (req, res) => {
  try {
    const { phrase } = req.body

    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide a phrase string.",
      })
    }

    const isValid = validatePhrase(phrase)
    const wordCount = phrase.trim().split(/\s+/).length

    return res.json({
      success: true,
      isValid,
      wordCount,
    })
  } catch (error) {
    console.error("Error validating phrase:", error)
    return res.status(500).json({
      success: false,
      error: "Server error validating phrase",
    })
  }
})

/**
 * Validate multiple phrases in batch
 * POST /api/validation/phrases/batch
 */
router.post("/phrases/batch", (req, res) => {
  try {
    const { phrases } = req.body

    if (!Array.isArray(phrases)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide an array of phrases.",
      })
    }

    const results = validatePhrasesBatch(phrases)

    return res.json({
      success: true,
      results: results.details,
      summary: results.summary,
    })
  } catch (error) {
    console.error("Error validating phrases batch:", error)
    return res.status(500).json({
      success: false,
      error: "Server error validating phrases batch",
    })
  }
})

/**
 * Get detailed validation for a phrase
 * POST /api/validation/phrase/detailed
 */
router.post("/phrase/detailed", (req, res) => {
  try {
    const { phrase } = req.body

    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide a phrase string.",
      })
    }

    const result = validatePhraseDetailed(phrase)

    return res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Error validating phrase with details:", error)
    return res.status(500).json({
      success: false,
      error: "Server error validating phrase with details",
    })
  }
})

/**
 * Fill a phrase to create a valid seed phrase
 * POST /api/validation/phrase/fill
 */
router.post("/phrase/fill", (req, res) => {
  try {
    const { phrase, customWords = [], targetLength = 12, options = {} } = req.body

    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide a phrase string.",
      })
    }

    const result = createValidSeedPhrase(phrase, customWords, targetLength, options)

    return res.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Error filling phrase:", error)
    return res.status(500).json({
      success: false,
      error: "Server error filling phrase",
    })
  }
})

/**
 * Generate variations of a phrase
 * POST /api/validation/phrase/variations
 */
router.post("/phrase/variations", (req, res) => {
  try {
    const { phrase, customWords = [], count = 5, targetLength = 12 } = req.body

    if (!phrase || typeof phrase !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide a phrase string.",
      })
    }

    const variations = generateVariations(phrase, customWords, count, targetLength)

    return res.json({
      success: true,
      count: variations.length,
      variations,
    })
  } catch (error) {
    console.error("Error generating phrase variations:", error)
    return res.status(500).json({
      success: false,
      error: "Server error generating phrase variations",
    })
  }
})

/**
 * Filter valid BIP39 words from an array
 * POST /api/validation/words/filter
 */
router.post("/words/filter", (req, res) => {
  try {
    const { words } = req.body

    if (!Array.isArray(words)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input. Please provide an array of words.",
      })
    }

    const validWords = filterValidBIP39Words(words)

    return res.json({
      success: true,
      total: words.length,
      valid: validWords.length,
      validWords,
    })
  } catch (error) {
    console.error("Error filtering valid BIP39 words:", error)
    return res.status(500).json({
      success: false,
      error: "Server error filtering valid BIP39 words",
    })
  }
})

module.exports = router
