// backend/services/battleDashboardProcessor.js

const { validatePhrasesBatch } = require('../utils/validatePhrase');

/**
 * 🏹 Build battle dashboard live stats from an array of phrases
 * @param {Array<string>} phrases
 * @returns {Object} Battle stats summary
 */
function buildBattleStats(phrases) {
  const batch = validatePhrasesBatch(phrases);

  return {
    totalPhrases: batch.summary.total,
    validPhrases: batch.summary.valid,
    invalidPhrases: batch.summary.invalid,
    wordCounts: batch.summary.wordCounts,
    details: batch.details, // optional: full breakdown if you need detailed display
  };
}

module.exports = {
  buildBattleStats,
};
