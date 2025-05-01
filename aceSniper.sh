const { snipeSolanaToken } = require('./solana/solanaSniper');
const { fetchLiveHotTokenMints } = require('./solana/liveFetcher');
const { fetchUltraEarlyMints } = require('./solana/ultraEarlyFetcher');
const { analyzeToken } = require('./solana/tokenAnalyzer');
const { autoTradeToken } = require('./solana/autoTrader');
const { listenPendingTransactions } = require('./ethereum/ethSniper');
// const { listenPendingBscTransactions } = require('./bsc/bscSniper');
require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

let currentGasGwei = 20; // default fallback if Infura fails

async function fetchCurrentGas() {
  try {
    const response = await fetch('https://gas.api.infura.io/v3/f91d975fcb1346969d53dfa4bd87e8fd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: []
      })
    });

    const json = await response.json();
    const gasPriceWei = BigInt(json.result);
    currentGasGwei = Number(gasPriceWei) / 1e9;

    console.log(`[Infura Gas] Current Gas Price: ${currentGasGwei.toFixed(2)} Gwei`);
  } catch (error) {
    console.error(`[Infura Gas] Failed to fetch gas price:`, error.message);
  }
}

async function startSniper() {
  console.log(`[ACE Sniper] Launching ACE Sniper... 🚀`);

  listenPendingTransactions();
  // listenPendingBscTransactions(); // (disabled for now)

  setInterval(async () => {
    console.log(`[ACE Sniper] Fetching targets...`);

    let hotMints = [];
    let ultraEarlyMode = false;

    try {
      // Smart Switch Mode
      hotMints = await fetchUltraEarlyMints(10);

      if (hotMints.length === 0) {
        console.log(`[Smart Switch] No ultra-early pools. Switching to hot trending tokens...`);
        hotMints = await fetchLiveHotTokenMints(10);
      } else {
        console.log(`[Smart Switch] Ultra-early new pools detected!`);
        ultraEarlyMode = true;
      }
    } catch (error) {
      console.error(`[ACE Sniper] Fetch error:`, error.message);
    }

    const amountSol = parseFloat(process.env.SOLANA_SNIPE_AMOUNT_SOL || '0.01');

    // Fetch latest gas (every cycle)
    await fetchCurrentGas();

    if (hotMints.length > 0) {
      console.log(`[ACE Sniper] Preparing ${hotMints.length} Solana snipes...`);

      const sniperPromises = [];

      for (const mintAddress of hotMints) {
        const isGoodToken = await analyzeToken(mintAddress);
        if (isGoodToken) {
          if (ultraEarlyMode) {
            console.log(`[BOOST MODE] 🚀 Boosting gas temporarily for early pool!`);
            sniperPromises.push(autoTradeToken(mintAddress, amountSol, true)); // true = boost
          } else {
            sniperPromises.push(autoTradeToken(mintAddress, amountSol, false)); // normal
          }
        }
      }

      await Promise.all(sniperPromises);

      console.log(`[ACE Sniper] Solana snipes completed. Waiting for next fetch...`);
    } else {
      console.log(`[ACE Sniper] No hot token mints found, waiting for next fetch.`);
    }
  }, 30000); // every 30 seconds
}

startSniper().catch((error) => {
  console.error(`[ACE Sniper] Fatal error during launch:`, error);
});

module.exports = { currentGasGwei };
