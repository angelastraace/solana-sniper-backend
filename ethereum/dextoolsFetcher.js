// /backend/solana/ultraEarlyFetcher.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

// NOTE: This endpoint lists very recent pools!
const NEW_POOLS_URL = 'https://public-api.birdeye.so/defi/poollist?sort_by=created_at&order=desc&limit=10';

async function fetchUltraEarlyMints(limit = 10) {
  try {
    console.log(`[UltraEarly Fetcher] Fetching brand new pools from Birdeye...`);

    const response = await fetch(NEW_POOLS_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': BIRDEYE_API_KEY,
        'x-chain': 'solana',
      }
    });

    const json = await response.json();

    if (!json.data || json.data.length === 0) {
      console.log(`[UltraEarly Fetcher] No new pools returned.`);
      return [];
    }

    // Pick output mint from new pools
    const mints = json.data.slice(0, limit).map(pool => pool.outputMint).filter(Boolean);

    console.log(`[UltraEarly Fetcher] Found ${mints.length} new pool tokens!`);

    return mints;
  } catch (error) {
    console.error(`[UltraEarly Fetcher] Error fetching new pools:`, error.message);
    return [];
  }
}

module.exports = { fetchUltraEarlyMints };
