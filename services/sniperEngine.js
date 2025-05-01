// backend/services/sniperEngine.js
const { sendTelegramAlert } = require('./telegramNotifier');

// inside if (wallet found) block:
await sendTelegramAlert(`💰 *FUNDED WALLET DETECTED*\nChain: Solana\nAddress: \`${solanaWallet}\`\nBalance: ${solanaBalance} SOL`);

const {
  toggleChainSniper,
  updateChainSettings,
  getSettings,
  getActiveState,
  sniperRouter,
} = require("./sniperEngine/multichainSniper")

// Mempool monitoring for Solana
const { Connection } = require("@solana/web3.js")
const { getConnection } = require("./sniperEngine/solanaSniper")

// Mempool monitoring for Ethereum
const { ethers } = require("ethers")
const { getProvider: getEthProvider } = require("./sniperEngine/ethereumSniper")

// Track active monitoring
const monitoringActive = {
  solana: false,
  ethereum: false,
  bsc: false,
}

/**
 * Start monitoring Solana mempool for new token launches
 */
function startSolanaMonitoring() {
  if (monitoringActive.solana) return

  try {
    const connection = getConnection()
    console.log(`🎯 Starting Solana mempool monitoring...`)

    // Subscribe to program logs
    const subscriptionId = connection.onLogs(
      "all", // Subscribe to all logs
      async (logs) => {
        try {
          // Check if logs contain token initialization
          if (logs.logs && logs.logs.some((log) => log.includes("initialize") && log.includes("mint"))) {
            console.log(`💥 Potential new Solana token detected!`)

            // Extract token mint address (simplified)
            const mintAddress = logs.signature // This is a simplification

            // Route to sniper
            await sniperRouter("solana", mintAddress)
          }
        } catch (error) {
          console.error("Error processing Solana logs:", error)
        }
      },
    )

    monitoringActive.solana = true
    console.log(`✅ Solana monitoring active`)

    return subscriptionId
  } catch (error) {
    console.error(`🔥 Error starting Solana monitoring:`, error)
    return null
  }
}

/**
 * Start monitoring Ethereum mempool for new token launches
 */
function startEthereumMonitoring() {
  if (monitoringActive.ethereum) return

  try {
    const provider = getEthProvider()
    console.log(`🎯 Starting Ethereum mempool monitoring...`)

    // Listen for pending transactions
    provider.on("pending", async (txHash) => {
      try {
        const tx = await provider.getTransaction(txHash)

        // Skip if transaction not found or has no data
        if (!tx || !tx.data) return

        // Check if transaction is a token deployment
        // This is a simplified check - in reality, you'd look for ERC20 contract creation
        if (tx.data.includes("0x60806040") && !tx.to) {
          console.log(`💥 Potential new Ethereum token detected!`)

          // Wait for transaction to be mined to get contract address
          const receipt = await tx.wait()
          if (receipt && receipt.contractAddress) {
            // Route to sniper
            await sniperRouter("ethereum", receipt.contractAddress)
          }
        }
      } catch (error) {
        // Ignore errors for transactions that can't be fetched
      }
    })

    monitoringActive.ethereum = true
    console.log(`✅ Ethereum monitoring active`)

    return true
  } catch (error) {
    console.error(`🔥 Error starting Ethereum monitoring:`, error)
    return false
  }
}

/**
 * Start monitoring BSC mempool for new token launches
 */
function startBSCMonitoring() {
  // Similar to Ethereum monitoring but with BSC provider
  console.log(`🎯 BSC monitoring not implemented yet`)
  return false
}

/**
 * Start monitoring for all chains or a specific chain
 * @param {string} chain - Optional chain to start monitoring for
 * @returns {object} Status of monitoring for each chain
 */
function startMonitoring(chain = null) {
  if (chain) {
    switch (chain) {
      case "solana":
        startSolanaMonitoring()
        break
      case "ethereum":
        startEthereumMonitoring()
        break
      case "bsc":
        startBSCMonitoring()
        break
      default:
        console.error(`Unknown chain: ${chain}`)
    }
  } else {
    // Start monitoring for all chains
    startSolanaMonitoring()
    startEthereumMonitoring()
    startBSCMonitoring()
  }

  return { ...monitoringActive }
}

/**
 * Get current status of the sniper engine
 * @returns {object} Current status
 */
function getStatus() {
  return {
    monitoring: { ...monitoringActive },
    active: getActiveState(),
    settings: getSettings(),
  }
}

// Initialize monitoring on startup
startMonitoring()

module.exports = {
  toggleSniper: toggleChainSniper,
  updateSettings: updateChainSettings,
  getStatus,
  startMonitoring,
}
