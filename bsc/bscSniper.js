const { ethers } = require('ethers');
require('dotenv').config();

// Connect to BSC WebSocket provider
const provider = new ethers.providers.WebSocketProvider(process.env.BSC_WSS_URL);
const wallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, provider);

// PancakeSwap Router Address (from .env)
const PANCAKESWAP_ROUTER_ADDRESS = process.env.PANCAKESWAP_ROUTER_ADDRESS.toLowerCase();

function listenPendingBscTransactions() {
  console.log(`[ACE Sniper] Listening to pending transactions on BSC...`);

  provider.on('pending', async (txHash) => {
    try {
      // ⚡ Add 50ms throttle to avoid overloading free RPC
      await new Promise(resolve => setTimeout(resolve, 50));

      const tx = await provider.getTransaction(txHash);

      if (tx && tx.to) {
        // Check if it's targeting PancakeSwap Router
        if (tx.to.toLowerCase() === PANCAKESWAP_ROUTER_ADDRESS) {
          console.log(`[ACE Sniper] Potential PancakeSwap tx found! Hash: ${txHash}`);
          
          // 🔥 (Future Pro move: insert auto-snipe logic here)
        }
      }
    } catch (error) {
      console.error(`[ACE Sniper] Error reading pending BSC tx: ${error.message}`);
    }
  });
}

module.exports = { listenPendingBscTransactions };
