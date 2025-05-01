const { Connection, Keypair, Transaction, PublicKey } = require('@solana/web3.js');
const { fastSendTransaction } = require('./fastSender');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
const signer = Keypair.fromSecretKey(secretKey);

async function snipeSolanaToken(targetMintAddress, amountSol) {
  try {
    console.log(`[ACE Sniper] Starting real Solana token snipe for token: ${targetMintAddress}`);

    const amountLamports = amountSol * 1e9; // Convert SOL to lamports

    // Step 1: Get swap route from Jupiter Aggregator
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${targetMintAddress}&amount=${amountLamports.toFixed(0)}&slippageBps=500`;

    const routeResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const routes = await routeResponse.json();
    if (!routes || !routes.data || routes.data.length === 0) {
      console.error('[ACE Sniper] No swap routes found.');
      return;
    }

    const bestRoute = routes.data[0];

    // Step 2: Get swap transaction from Jupiter
    const swapTxResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: bestRoute,
        userPublicKey: signer.publicKey.toString(),
        wrapUnwrapSOL: true,
        feeAccount: null
      }),
    });

    const swapTxData = await swapTxResponse.json();
    const swapTransaction = Transaction.from(Buffer.from(swapTxData.swapTransaction, 'base64'));

    // Step 3: Setup transaction before sending
    swapTransaction.feePayer = signer.publicKey;
    swapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    await swapTransaction.partialSign(signer);

    // Step 4: Try sending with retry logic
    let maxRetries = 3;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ACE Sniper] Sending swap transaction (Attempt ${attempt})...`);
        const signature = await fastSendTransaction(connection, swapTransaction, signer);
        console.log(`[ACE Sniper] Swap transaction sent! Signature: ${signature}`);

        // Confirm tx manually
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
          throw new Error('Transaction failed after sending');
        }

        console.log(`[ACE Sniper] Transaction confirmed successfully ✅`);
        success = true;
        break; // Break loop if success
      } catch (error) {
        console.error(`[ACE Sniper] Error on attempt ${attempt}: ${error.message}`);
        if (attempt < maxRetries) {
          console.log(`[ACE Sniper] Retrying with fresh blockhash...`);
          swapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          await swapTransaction.partialSign(signer); // re-sign with fresh blockhash
        } else {
          console.error(`[ACE Sniper] Max retries reached. Failed to complete swap ❌`);
        }
      }
    }
    
  } catch (error) {
    console.error(`[ACE Sniper] Error during real token snipe:`, error);
  }
}

module.exports = { snipeSolanaToken };
