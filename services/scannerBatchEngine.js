require('dotenv').config();

const { processPhrase } = require('./scannerEngine');
const { updateStats } = require('./statsServer');
const { buildBattleStats } = require('./battleDashboardProcessor');
const notifications = require('./notifiers/notificationService');

// 🧠 Battle Tracker
let livePhrases = [];

/**
 * 📦 Batch process a list of phrases
 * @param {Array<string>} phrases
 * @param {Object} options
 */
async function processPhrasesBatch(phrases, options = {}) {
  if (!Array.isArray(phrases)) {
    throw new Error("Phrases must be an array");
  }

  const batchSize = options.batchSize || 10;  // Default batch size
  const delayBetweenBatches = options.delay || 500; // Delay between batches (ms)

  console.log(`🚀 Starting batch processing of ${phrases.length} phrases...`);
  updateStats({ log: `🚀 Starting batch of ${phrases.length} phrases.` });

  let totalProcessed = 0;
  let fundedWallets = 0;
  const startTime = Date.now();

  for (let i = 0; i < phrases.length; i += batchSize) {
    const batch = phrases.slice(i, i + batchSize);
    console.log(`⏳ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(phrases.length / batchSize)}...`);
    updateStats({ log: `⏳ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(phrases.length / batchSize)}...` });

    const promises = batch.map(async (phrase) => {
      const result = await processPhrase(phrase);
      livePhrases.push(phrase);

      if (result && (result.solanaBalance > 0 || result.ethereumBalance > 0)) {
        fundedWallets++;
      }
    });

    await Promise.all(promises);

    totalProcessed += batch.length;
    updateStats({
      totalProcessed,
      phrasesPerSec: Math.round(totalProcessed / ((Date.now() - startTime) / 1000)),
      walletsFound: fundedWallets,
      battleStats: buildBattleStats(livePhrases)
    });

    // Wait between batches to avoid RPC overload
    if (i + batchSize < phrases.length) {
      console.log(`⏱️ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log(`✅ Batch complete: ${totalProcessed} phrases processed.`);
  updateStats({ log: `✅ Batch complete: ${totalProcessed} phrases processed.` });

  if (fundedWallets > 0) {
    notifications.success(`💰 Batch finished! Funded wallets found: ${fundedWallets}`);
  } else {
    notifications.info(`⚡ Batch finished. No funded wallets found.`);
  }
}

module.exports = {
  processPhrasesBatch
};
