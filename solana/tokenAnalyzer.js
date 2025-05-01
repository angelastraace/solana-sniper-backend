// /backend/solana/tokenAnalyzer.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
const PRICE_URL = 'https://public-api.birdeye.so/defi/price';

const MIN_LIQUIDITY_SOL = 1000;   // Minimum liquidity (in SOL)
const MIN_PRICE_SOL = 0.0001;     // Minimum token price (in SOL)

async function analyzeToken(mintAddress) {
  try {
    const url = `${PRICE_URL}?address=${mintAddress}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': BIRDEYE_API_KEY,
        'x-chain': 'solana',
      }
    });

    const json = await response.json();

    if (!json.data) {
      console.log(`[Analyzer] No data for token: ${mintAddress}`);
      return false;
    }

    const liquidity = json.data.liquidity / 1e9; // Liquidity is in lamports
    const priceInNative = json.data.priceInNative;

    console.log(`[Analyzer] Token ${mintAddress} — Liquidity: ${liquidity} SOL, Price: ${priceInNative} SOL`);

    if (liquidity < MIN_LIQUIDITY_SOL) {
      console.log(`[Analyzer] Skipping token ${mintAddress}: Low liquidity (${liquidity} SOL) ❌`);
      return false;
    }

    if (priceInNative < MIN_PRICE_SOL) {
      console.log(`[Analyzer] Skipping token ${mintAddress}: Low price (${priceInNative} SOL) ❌`);
      return false;
    }

    return true; // Good token ✅
  } catch (error) {
    console.error(`[Analyzer] Error analyzing token ${mintAddress}:`, error.message);
    return false;
  }
}

module.exports = { analyzeToken };
