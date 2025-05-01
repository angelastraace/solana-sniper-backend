const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const HOT_PAIRS_URL = 'https://api.dexscreener.com/latest/dex/pairs/solana';

async function fetchFromDexTools(limit = 10) {
  try {
    const response = await fetch(HOT_PAIRS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      }
    });

    const json = await response.json();

    if (!json.pairs || json.pairs.length === 0) return [];

    const mints = json.pairs.slice(0, limit).map(pair => {
      if (pair.baseToken && pair.baseToken.address) {
        return pair.baseToken.address;
      }
      return null;
    }).filter(Boolean);

    return mints;
  } catch (error) {
    console.error(`[DexTools Fetcher] Error:`, error.message);
    return [];
  }
}

module.exports = { fetchFromDexTools };
