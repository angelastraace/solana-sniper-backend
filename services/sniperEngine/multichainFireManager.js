// backend/services/sniperEngine/multichainFireManager.js
const { executeEthereumBuy } = require("./ethereumSniper")
const { executeBSCBuy } = require("./bscSniper")
const { executeSolanaBuy } = require("./solanaSniper")
const { sniperAlert } = require("../alertService")

// Chain status and settings
const chainStatus = {
  solana: {
    active: false,
    monitoring: false,
    settings: {
      buyAmount: 0.1,
      slippage: 3,
      gasMultiplier: 1.2,
      antiHoneypot: true,
      verifiedOnly: true,
      maxSellTax: 15,
    },
  },
  ethereum: {
    active: false,
    monitoring: false,
    settings: {
      buyAmount: 0.05,
      slippage: 3,
      gasMultiplier: 1.5,
      antiHoneypot: true,
      verifiedOnly: true,
      maxSellTax: 15,
    },
  },
  bsc: {
    active: false,
    monitoring: false,
    settings: {
      buyAmount: 0.1,
      slippage: 5,
      gasMultiplier: 1.2,
      antiHoneypot: true,
      verifiedOnly: false,
      maxSellTax: 20,
    },
  },
}

// Battle statistics
let battleStats = {
  totalAttempts: 0,
  successfulBuys: 0,
  honeypotBlocked: 0,
  chains: {
    solana: { attempts: 0, successful: 0, blocked: 0 },
    ethereum: { attempts: 0, successful: 0, blocked: 0 },
    bsc: { attempts: 0, successful: 0, blocked: 0 },
  },
}

/**
 * Get the current status of all chains
 * @returns {Object} Current chain status
 */
function getChainStatus() {
  return {
    chains: chainStatus,
    globalMonitoring: Object.values(chainStatus).some((chain) => chain.monitoring),
    stats: battleStats,
  }
}

/**
 * Toggle a specific chain on/off
 * @param {string} chain - Chain name (solana, ethereum, bsc)
 * @param {boolean} active - Whether to activate or deactivate
 * @returns {Object} Updated chain status
 */
function toggleChain(chain, active) {
  if (!chainStatus[chain]) {
    throw new Error(`Invalid chain: ${chain}`)
  }

  chainStatus[chain].active = !!active

  // Log the change
  console.log(`🔄 Chain ${chain} ${active ? "ACTIVATED" : "DEACTIVATED"}`)

  // Send alert
  sniperAlert(`🔄 *Chain Status Changed*\n\n*${chain.toUpperCase()}*: ${active ? "🟢 ACTIVATED" : "🔴 DEACTIVATED"}`)

  return { success: true, chain, active: chainStatus[chain].active }
}

/**
 * Toggle monitoring for all chains
 * @param {boolean} active - Whether to activate or deactivate monitoring
 * @returns {Object} Updated monitoring status
 */
function toggleMonitoring(active) {
  // Update monitoring status for all chains
  Object.keys(chainStatus).forEach((chain) => {
    chainStatus[chain].monitoring = !!active
  })

  // Log the change
  console.log(`🔄 Global monitoring ${active ? "ACTIVATED" : "DEACTIVATED"}`)

  // Send alert
  sniperAlert(`🔄 *Global Monitoring*: ${active ? "🟢 ACTIVATED" : "🔴 DEACTIVATED"}`)

  return {
    success: true,
    monitoring: active,
    chains: Object.keys(chainStatus).reduce((acc, chain) => {
      acc[chain] = chainStatus[chain].monitoring
      return acc
    }, {}),
  }
}

/**
 * Update settings for a specific chain
 * @param {string} chain - Chain name (solana, ethereum, bsc)
 * @param {Object} settings - New settings
 * @returns {Object} Updated chain settings
 */
function updateChainSettings(chain, settings) {
  if (!chainStatus[chain]) {
    throw new Error(`Invalid chain: ${chain}`)
  }

  // Update settings
  chainStatus[chain].settings = {
    ...chainStatus[chain].settings,
    ...settings,
  }

  // Log the change
  console.log(`⚙️ Updated settings for ${chain}:`, chainStatus[chain].settings)

  return {
    success: true,
    chain,
    settings: chainStatus[chain].settings,
  }
}

/**
 * Execute a manual snipe on a specific chain
 * @param {string} chain - Chain name (solana, ethereum, bsc)
 * @param {string} tokenAddress - Token address to snipe
 * @returns {Promise<Object>} Result of the snipe
 */
async function executeManualSnipe(chain, tokenAddress) {
  if (!chainStatus[chain]) {
    throw new Error(`Invalid chain: ${chain}`)
  }

  // Log the attempt
  console.log(`🎯 Manual snipe initiated for ${tokenAddress} on ${chain}`)

  // Update statistics
  battleStats.totalAttempts++
  battleStats.chains[chain].attempts++

  // Execute the snipe based on chain
  let result
  try {
    switch (chain) {
      case "ethereum":
        result = await executeEthereumBuy(tokenAddress, chainStatus[chain].settings)
        break
      case "bsc":
        result = await executeBSCBuy(tokenAddress, chainStatus[chain].settings)
        break
      case "solana":
        result = await executeSolanaBuy(tokenAddress, chainStatus[chain].settings)
        break
      default:
        throw new Error(`Unsupported chain: ${chain}`)
    }

    // Update statistics based on result
    if (result.success) {
      battleStats.successfulBuys++
      battleStats.chains[chain].successful++
    } else if (result.honeypotDetails && result.honeypotDetails.isHoneypot) {
      battleStats.honeypotBlocked++
      battleStats.chains[chain].blocked++
    }

    return result
  } catch (error) {
    console.error(`Error in manual snipe:`, error)
    throw error
  }
}

/**
 * Get battle statistics
 * @returns {Object} Current battle statistics
 */
function getStats() {
  return battleStats
}

/**
 * Reset battle statistics
 */
function resetStats() {
  battleStats = {
    totalAttempts: 0,
    successfulBuys: 0,
    honeypotBlocked: 0,
    chains: {
      solana: { attempts: 0, successful: 0, blocked: 0 },
      ethereum: { attempts: 0, successful: 0, blocked: 0 },
      bsc: { attempts: 0, successful: 0, blocked: 0 },
    },
  }

  console.log("🔄 Battle statistics reset")
  return { success: true }
}

module.exports = {
  getChainStatus,
  toggleChain,
  toggleMonitoring,
  updateChainSettings,
  executeManualSnipe,
  getStats,
  resetStats,
}
