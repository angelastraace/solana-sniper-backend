// backend/services/phraseUploader.js

const fs = require('fs');
const path = require('path');
const { validatePhrasesBatch } = require('../utils/validatePhrase');

/**
 * Reads uploaded phrase files and batch validates
 * @param {string} filePath
 * @returns {Array<string>} Validated phrases
 */
function uploadAndValidatePhrases(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const phrases = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const batchResult = validatePhrasesBatch(phrases);
    console.log("📦 Upload batch summary:", batchResult.summary);

    const validPhrases = batchResult.details.filter(item => item.isValid).map(item => item.phrase);
    return validPhrases;
  } catch (error) {
    console.error('🔥 Failed to upload/validate phrases:', error);
    return [];
  }
}

module.exports = {
  uploadAndValidatePhrases
};
