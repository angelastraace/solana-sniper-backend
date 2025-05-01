const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Simulated SolanaFM fallback (optional improve later)
const HOT_TOKENS_URL = 'https://api.solana.fm/v0/markets';

async function fetchFromSolanaFM(limit = 10) {
  try {
    const response = await fetch(HOT_TOKENS_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      }
    });

    const json = await response.json();

    if (!json.data || json.data.length === 0) return [];

    const mints = json.data.slice(0, limit).map(token => {
      if (token.address) {
        return token.address;
      }
      return null;
    }).filter(Boolean);

    return mints;
  } catch (error) {
    console.error(`[SolanaFM Fetcher] Error:`, error.message);
    return [];
  }
}

module.exports = { fetchFromSolanaFM };
