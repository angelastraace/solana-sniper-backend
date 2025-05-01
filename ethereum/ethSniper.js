const { ethers } = require('ethers');
require('dotenv').config();

// ✅ Load the Ethereum WebSocket provider from .env
const provider = new ethers.providers.WebSocketProvider(process.env.INFURA_ETH_RPC_URL);

// Example function to listen to pending transactions
async function listenPendingTransactions() {
  console.log(`[ACE Sniper] Listening to pending transactions on Ethereum...`);

  provider.on('pending', async (txHash) => {
    try {
      // Small throttle delay to avoid overload (optional)
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay

      const tx = await provider.getTransaction(txHash);
      if (tx) {
        // Simple example: log tx details (filtering can be added)
        console.log(`[ACE Sniper] Potential target tx found! Hash: ${tx.hash}`);
      }
    } catch (error) {
      console.error(`[ACE Sniper] Error processing pending tx:`, error);
    }
  });

  provider._websocket.on('error', (err) => {
    console.error(`[ACE Sniper] WebSocket error:`, err.message);
  });

  provider._websocket.on('close', (code, reason) => {
    console.error(`[ACE Sniper] WebSocket closed:`, code, reason.toString());
    console.log(`[ACE Sniper] Attempting to reconnect in 3 seconds...`);
    setTimeout(listenPendingTransactions, 3000); // Auto-reconnect after 3 seconds
  });
}

module.exports = { listenPendingTransactions };
