const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ✅ NEW Birdeye V2 API URL
const HOT_TOKENS_URL = 'https://public-api.birdeye.so/v1/token/list?sort_by=created_at&order=desc&limit=10';

async function fetchFromBirdeye(limit = 10) {
  try {
    const response = await fetch(HOT_TOKENS_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': process.env.BIRDEYE_API_KEY // ✅ Your .env API key
      }
    });

    const json = await response.json();

    if (!json.data || json.data.length === 0) {
      console.error(`[Birdeye Fetcher] No tokens found.`);
      return [];
    }

    const mints = json.data.slice(0, limit).map(token => {
      if (token.address) {
        return token.address;
      }
      return null;
    }).filter(Boolean);

    return mints;
  } catch (error) {
    console.error(`[Birdeye Fetcher] Error:`, error.message);
    return [];
  }
}

module.exports = { fetchFromBirdeye };
