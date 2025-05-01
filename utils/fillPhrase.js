// backend/utils/fillPhrase.js

const bip39 = require("bip39")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

// Load official BIP39 wordlist
const officialWords = bip39.wordlists.english

// Cache for custom wordlists
let cachedCustomWords = null

/**
 * Load custom wordlists from a directory
 * @param {string} folderPath - Path to folder containing wordlist files
 * @returns {Array<string>} Array of unique words
 */
function loadCustomWordlist(folderPath) {
  // Return cached words if available
  if (cachedCustomWords) {
    return cachedCustomWords
  }

  let words = []

  try {
    // Check if directory exists
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ Wordlist folder not found: ${folderPath}`)
      return []
    }

    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      if (file.endsWith(".txt")) {
        try {
          const content = fs.readFileSync(path.join(folderPath, file), "utf8")
          const fileWords = content
            .split(/\r?\n/)
            .map((w) => w.trim())
            .filter(Boolean)

          words = words.concat(fileWords)
          console.log(`📝 Loaded ${fileWords.length} words from ${file}`)
        } catch (error) {
          console.error(`Error loading wordlist file ${file}:`, error)
        }
      }
    }

    // Remove duplicates
    cachedCustomWords = [...new Set(words)]
    console.log(`📚 Total unique custom words: ${cachedCustomWords.length}`)

    return cachedCustomWords
  } catch (error) {
    console.error("Error loading custom wordlists:", error)
    return []
  }
}

/**
 * Fill a phrase to a valid BIP39 mnemonic
 * @param {string} phrase - Original phrase to fill
 * @param {Array<string>} customWords - Custom words to use for filling
 * @param {number} targetLength - Target length (12, 15, 18, 21, 24)
 * @returns {string} Filled phrase
 */
function fillPhrase(phrase, customWords = [], targetLength = 12) {
  if (!phrase || typeof phrase !== "string") return null

  // Clean and split the phrase
  const words = phrase.trim().toLowerCase().split(/\s+/)

  // Already at target length
  if ([12, 15, 18, 21, 24].includes(words.length)) {
    return phrase
  }

  // Ensure we have valid target length
  if (![12, 15, 18, 21, 24].includes(targetLength)) {
    targetLength = 12 // Default to 12 words
  }

  // Hybrid mode: customWords + officialWords
  const hybridWords = [...new Set([...customWords, ...officialWords])]

  // Fill with random words until we reach target length
  while (words.length < targetLength) {
    const randomWord = hybridWords[Math.floor(Math.random() * hybridWords.length)]
    words.push(randomWord)
  }

  return words.join(" ")
}

/**
 * Create a valid BIP39 seed phrase
 * @param {string} phrase - Original phrase to use as base
 * @param {Array<string>} customWords - Custom words to use for filling
 * @param {number} targetLength - Target length (12, 15, 18, 21, 24)
 * @param {Object} options - Additional options
 * @returns {Object} Result object with success flag and phrase
 */
function createValidSeedPhrase(phrase, customWords = [], targetLength = 12, options = {}) {
  const maxAttempts = options.maxAttempts || 100

  // Clean and split the phrase
  let baseWords = phrase.trim().toLowerCase().split(/\s+/)

  // If already valid, return as is
  if (bip39.validateMnemonic(phrase)) {
    return { success: true, phrase, isOriginalValid: true }
  }

  // Ensure target length is valid
  if (![12, 15, 18, 21, 24].includes(targetLength)) {
    targetLength = 12
  }

  // If phrase is too long, truncate it
  if (baseWords.length > targetLength) {
    baseWords = baseWords.slice(0, targetLength)
  }

  // Hybrid wordlist
  const hybridWords = [...new Set([...customWords, ...officialWords])]

  // Try to create a valid phrase
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Start with the base words
    const candidateWords = [...baseWords]

    // Fill remaining slots with random words
    while (candidateWords.length < targetLength) {
      // Prefer BIP39 words for better validity chance
      const wordSource = Math.random() < 0.8 ? officialWords : hybridWords
      const randomWord = wordSource[Math.floor(Math.random() * wordSource.length)]
      candidateWords.push(randomWord)
    }

    // Replace non-BIP39 words with valid ones
    for (let i = 0; i < candidateWords.length; i++) {
      if (!officialWords.includes(candidateWords[i])) {
        candidateWords[i] = officialWords[Math.floor(Math.random() * officialWords.length)]
      }
    }

    // Check if we have a valid phrase
    const candidatePhrase = candidateWords.join(" ")
    if (bip39.validateMnemonic(candidatePhrase)) {
      return {
        success: true,
        phrase: candidatePhrase,
        isOriginalValid: false,
        attempts: attempt + 1,
      }
    }
  }

  // Failed to create valid phrase
  return {
    success: false,
    phrase: null,
    isOriginalValid: false,
    attempts: maxAttempts,
  }
}

/**
 * Generate a completely random valid BIP39 mnemonic
 * @param {number} strength - Entropy strength (128, 160, 192, 224, 256)
 * @returns {string} Valid BIP39 mnemonic
 */
function generateRandomMnemonic(strength = 128) {
  return bip39.generateMnemonic(strength)
}

module.exports = {
  fillPhrase,
  loadCustomWordlist,
  createValidSeedPhrase,
  generateRandomMnemonic,
}
