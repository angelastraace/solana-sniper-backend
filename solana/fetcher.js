const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// DEXTools Hot Pairs URL for Solana
const HOT_PAIRS_URL = 'https://api.dexscreener.com/latest/dex/pairs/solana';

async function fetchHotTokenMints(limit = 50) {
  try {
    console.log(`[Fetcher] Fetching live hot pairs from DEXTools...`);

    const response = await fetch(HOT_PAIRS_URL);
    const json = await response.json();

    if (!json.pairs || json.pairs.length === 0) {
      console.error(`[Fetcher] No hot pairs found.`);
      return [];
    }

    // Extract token mints
    const mints = json.pairs.slice(0, limit).map(pair => {
      if (pair.baseToken.address) {
        return pair.baseToken.address; // The real Token Mint
      }
      return null;
    }).filter(Boolean); // Remove nulls

    console.log(`[Fetcher] Found ${mints.length} hot token mints!`);
    return mints;

  } catch (error) {
    console.error(`[Fetcher] Error fetching hot pairs:`, error.message);
    return [];
  }
}

module.exports = { fetchHotTokenMints };
