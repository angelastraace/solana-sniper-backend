// /backend/solana/liveFetcher.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY; // Read from .env
const HOT_TOKENS_URL = 'https://public-api.birdeye.so/defi/tokenlist?sort_by=created_at';

async function fetchLiveHotTokenMints(limit = 10) {
  try {
    console.log(`[Live Fetcher] Trying Birdeye Public API...`);

    const response = await fetch(HOT_TOKENS_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': BIRDEYE_API_KEY,
        'x-chain': 'solana',
      }
    });

    const json = await response.json();

    if (!json.data || json.data.length === 0) {
      console.log(`[Live Fetcher] No hot tokens returned from Birdeye.`);
      return [];
    }

    const hotMints = json.data.slice(0, limit).map(token => token.address).filter(Boolean);

    console.log(`[Live Fetcher] Found ${hotMints.length} hot tokens from Birdeye.`);

    return hotMints;

  } catch (error) {
    console.error(`[Live Fetcher] Birdeye Fetcher Error:`, error.message);
    return [];
  }
}

module.exports = { fetchLiveHotTokenMints };
