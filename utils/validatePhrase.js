const bip39 = require("bip39");

/**
 * ✅ Basic Validation: Checks if the phrase is valid for Solana/Ethereum (12/15/18/21/24 words and checksum correct)
 * @param {string} phrase
 * @returns {boolean} true if valid, false otherwise
 */
function validatePhrase(phrase) {
  if (!phrase || typeof phrase !== "string") return false;

  const words = phrase.trim().split(/\s+/);

  // Check word count
  if (![12, 15, 18, 21, 24].includes(words.length)) return false;

  // Validate with BIP39 checksum
  return bip39.validateMnemonic(phrase);
}

/**
 * ✅ Detailed Validation: Provides full diagnostic info about phrase validity
 * @param {string} phrase
 * @returns {Object} Detailed validation result
 */
function validatePhraseDetailed(phrase) {
  if (!phrase || typeof phrase !== "string") {
    return { valid: false, reason: "Invalid input" };
  }

  const words = phrase.trim().split(/\s+/);

  if (![12, 15, 18, 21, 24].includes(words.length)) {
    return {
      valid: false,
      reason: `Invalid word count: ${words.length}. Must be 12, 15, 18, 21, or 24.`,
      wordCount: words.length,
    };
  }

  // Check if all words exist in BIP39 wordlist
  const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));
  if (invalidWords.length > 0) {
    return {
      valid: false,
      reason: `Invalid words: ${invalidWords.join(", ")}`,
      invalidWords,
      wordCount: words.length,
    };
  }

  // Final checksum validation
  const isValid = bip39.validateMnemonic(phrase);
  return {
    valid: isValid,
    reason: isValid ? "Valid mnemonic phrase." : "Invalid checksum",
    wordCount: words.length,
  };
}

/**
 * ✅ Batch Validation: Validate an array of phrases with full summary stats
 * @param {Array} phrases - Array of phrases
 * @returns {Object} Detailed results + summary
 */
function validatePhrasesBatch(phrases) {
  if (!Array.isArray(phrases)) {
    return {
      details: [],
      summary: { total: 0, valid: 0, invalid: 0 },
    };
  }

  const details = phrases.map(phrase => {
    if (!phrase || typeof phrase !== "string") {
      return { phrase: String(phrase), isValid: false, wordCount: 0 };
    }

    const words = phrase.trim().split(/\s+/);
    const wordCount = words.length;
    const isValid = validatePhrase(phrase);

    return { phrase, isValid, wordCount };
  });

  const valid = details.filter(item => item.isValid).length;
  const invalid = details.length - valid;

  const wordCounts = {};
  details.forEach(item => {
    wordCounts[item.wordCount] = (wordCounts[item.wordCount] || 0) + 1;
  });

  return {
    details,
    summary: {
      total: details.length,
      valid,
      invalid,
      wordCounts,
    },
  };
}

module.exports = {
  validatePhrase,
  validatePhraseDetailed,
  validatePhrasesBatch,
};
