const { Connection, Keypair, Transaction, PublicKey } = require('@solana/web3.js');
const { fastSendTransaction } = require('./fastSender');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
const signer = Keypair.fromSecretKey(secretKey);

const AUTOSELL_PROFIT_PERCENT = parseFloat(process.env.AUTOSELL_PROFIT_PERCENT || '50'); // Default 50%
const RUG_SELL_PERCENT = parseFloat(process.env.RUG_SELL_PERCENT || '30'); // Default 30% loss threshold

async function autoTradeToken(targetMintAddress, amountSol) {
  try {
    console.log(`[AutoTrader] Initiating trade for token: ${targetMintAddress}`);

    const amountLamports = amountSol * 1e9; // SOL to lamports

    // STEP 1: Perform Swap (BUY)
    const routeResponse = await fetch('https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=' + targetMintAddress + '&amount=' + amountLamports.toFixed(0) + '&slippageBps=500');
    const { data: routes } = await routeResponse.json();
    if (!routes || routes.length === 0) {
      console.error(`[AutoTrader] No swap routes found.`);
      return;
    }

    const bestRoute = routes[0];

    const swapTxResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: bestRoute,
        userPublicKey: signer.publicKey.toString(),
        wrapUnwrapSOL: true,
        feeAccount: null,
      }),
    });

    const swapTxData = await swapTxResponse.json();
    const swapTransaction = Transaction.from(Buffer.from(swapTxData.swapTransaction, 'base64'));

    swapTransaction.feePayer = signer.publicKey;
    swapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    await swapTransaction.partialSign(signer);

    const buySignature = await fastSendTransaction(connection, swapTransaction, signer);
    console.log(`[AutoTrader] Swap executed! Buy tx signature: ${buySignature}`);

    // STEP 2: Monitor Price for Auto-Sell or Rug Detection
    console.log(`[AutoTrader] Monitoring price for auto-sell and rug detection...`);

    const buyPrice = bestRoute.outAmount / amountLamports; // Approximate entry price
    const profitTarget = AUTOSELL_PROFIT_PERCENT / 100; // 50% = 0.5
    const rugLimit = 1 - (RUG_SELL_PERCENT / 100); // 30% loss = 0.7

    let attempts = 0;
    let sold = false;

    while (!sold && attempts < 30) { // Monitor for ~30 tries
      await new Promise(resolve => setTimeout(resolve, 5000)); // Every 5 seconds

      try {
        const priceResp = await fetch(`https://public-api.birdeye.so/public/price?address=${targetMintAddress}`);
        const priceData = await priceResp.json();
        const currentPrice = priceData.data?.value || 0;

        if (currentPrice === 0) {
          console.warn(`[AutoTrader] Warning: Could not fetch current price.`);
          attempts++;
          continue;
        }

        console.log(`[AutoTrader] Current price: ${currentPrice.toFixed(9)} vs Buy target: ${buyPrice.toFixed(9)}`);

        // ✅ Auto-Sell at profit
        if (currentPrice >= buyPrice * (1 + profitTarget)) {
          console.log(`[AutoTrader] 🎯 Profit target hit! Selling now!`);
          // TODO: Trigger normal sell transaction
          sold = true;
          break;
        }

        // ✅ Rug Detection
        if (currentPrice <= buyPrice * rugLimit) {
          console.log('\x1b[41m%s\x1b[0m', `[AutoTrader] ⚠️ RUG DETECTED! Price crashed below -${RUG_SELL_PERCENT}%! Emergency selling!`);
          // TODO: Trigger emergency sell transaction
          sold = true;
          break;
        }

      } catch (err) {
        console.error(`[AutoTrader] Error fetching price:`, err.message);
      }

      attempts++;
    }

    if (!sold) {
      console.log(`[AutoTrader] Monitoring ended. No sell triggered.`);
    }

  } catch (error) {
    console.error(`[AutoTrader] Fatal error in autoTradeToken:`, error);
  }
}

module.exports = { autoTradeToken };
