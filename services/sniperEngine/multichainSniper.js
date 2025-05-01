// backend/services/sniperEngine/multichainSniper.js

const { executeSolanaBuy } = require("./solanaSniper")
const { executeEthereumBuy } = require("./ethereumSniper")
const { executeBSCBuy } = require("./bscSniper")
const { notifySuccess, notifyError } = require("../notifiers/notificationService")
const { createClient } = require("@supabase/supabase-js")
require("dotenv").config()

// Initialize Supabase client for transaction logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Default settings for each chain
const defaultSettings = {
  solana: {
    buyAmount: 0.2,
    slippage: 3,
    verifiedOnly: true,
    antiHoneypot: true,
    gasMultiplier: 1.0,
    maxSellTax: 10, // Maximum acceptable sell tax percentage
  },
  ethereum: {
    buyAmount: 0.1,
    slippage: 3,
    verifiedOnly: true,
    antiHoneypot: true,
    gasMultiplier: 1.5,
    maxSellTax: 10, // Maximum acceptable sell tax percentage
  },
  bsc: {
    buyAmount: 0.5,
    slippage: 5,
    verifiedOnly: true,
    antiHoneypot: true,
    gasMultiplier: 1.2,
    maxSellTax: 15, // Maximum acceptable sell tax percentage
  },
}

// Active state for each chain
const activeChains = {
  solana: false,
  ethereum: false,
  bsc: false,
}

// Monitoring state for each chain
const monitoringChains = {
  solana: false,
  ethereum: false,
  bsc: false,
}

// Current settings for each chain
const chainSettings = { ...defaultSettings }

// Battle stats
const battleStats = {
  totalAttempts: {
    solana: 0,
    ethereum: 0,
    bsc: 0,
  },
  successfulBuys: {
    solana: 0,
    ethereum: 0,
    bsc: 0,
  },
  honeypotBlocked: {
    solana: 0,
    ethereum: 0,
    bsc: 0,
  },
  lastUpdated: Date.now(),
}

/**
 * Log transaction to Supabase
 * @param {string} chain - Chain name
 * @param {object} transaction - Transaction details
 * @returns {Promise<void>}
 */
async function logTransaction(chain, transaction) {
  try {
    const { data, error } = await supabase.from("sniper_transactions").insert([
      {
        chain,
        token_address: transaction.token,
        token_symbol: transaction.symbol || "UNKNOWN",
        token_name: transaction.name || "Unknown Token",
        amount: transaction.amount || 0,
        input_amount: transaction.inputAmount || 0,
        price: transaction.price || 0,
        tx_id: transaction.txId || null,
        timestamp: new Date(transaction.timestamp).toISOString(),
        success: transaction.success,
        error: transaction.error || null,
        explorer_url: transaction.explorerUrl || null,
        honeypot_details: transaction.honeypotDetails || null,
      },
    ])

    if (error) {
      console.error(`Error logging transaction to Supabase:`, error)
    } else {
      console.log(`✅ Transaction logged to Supabase`)
    }
  } catch (error) {
    console.error(`Error logging transaction:`, error)
  }
}

/**
 * Toggle sniper for a specific chain
 * @param {string} chain - Chain name (solana, ethereum, bsc)
 * @param {boolean} state - Active state
 * @returns {object} Current state of all chains
 */
function toggleChainSniper(chain, state) {
  if (chain in activeChains) {
    activeChains[chain] = state
    console.log(`🎯 ${chain.toUpperCase()} sniper ${state ? "activated 🟢" : "deactivated 🔴"}`)

    // Notify about state change
    if (state) {
      notifySuccess(`${chain.toUpperCase()} Sniper Activated`, `Ready to snipe new tokens on ${chain.toUpperCase()}`)
    }
  } else {
    console.error(`Unknown chain: ${chain}`)
  }

  return { ...activeChains }
}

/**
 * Toggle monitoring for a specific chain
 * @param {string} chain - Chain name (solana, ethereum, bsc)
 * @param {boolean} state - Monitoring state
 * @returns {object} Current state of all monitoring
 */
function toggleChainMonitoring(chain, state) {
  if (chain) {
    if (chain in monitoringChains) {
      monitoringChains[chain] = state
      console.log(`👁️ ${chain.toUpperCase()} monitoring ${state ? "started 🟢" : "stopped 🔴"}`)
    } else {
      console.error(`Unknown chain: ${chain}`)
    }
  } else {
    // Toggle all chains
    Object.keys(monitoringChains).forEach((c) => {
      monitoringChains[c] = state
    })
    console.log(`👁️ All chain monitoring ${state ? "started 🟢" : "stopped 🔴"}`)
  }

  return { ...monitoringChains }
}

/**
 * Update settings for a specific chain
 * @param {string} chain - Chain name
 * @param {object} settings - New settings
 * @returns {object} Updated settings for the chain
 */
function updateChainSettings(chain, settings) {
  if (chain in chainSettings) {
    chainSettings[chain] = {
      ...chainSettings[chain],
      ...settings,
    }
    console.log(`⚙️ Updated settings for ${chain.toUpperCase()}:`, chainSettings[chain])
    return { ...chainSettings[chain] }
  } else {
    console.error(`Unknown chain: ${chain}`)
    return null
  }
}

/**
 * Get current settings for all chains or a specific chain
 * @param {string} chain - Optional chain name
 * @returns {object} Current settings
 */
function getSettings(chain = null) {
  if (chain) {
    return chain in chainSettings ? { ...chainSettings[chain] } : null
  }
  return { ...chainSettings }
}

/**
 * Get current active state for all chains or a specific chain
 * @param {string} chain - Optional chain name
 * @returns {object} Current active state
 */
function getActiveState(chain = null) {
  if (chain) {
    return chain in activeChains ? activeChains[chain] : null
  }
  return { ...activeChains }
}

/**
 * Get current monitoring state for all chains or a specific chain
 * @param {string} chain - Optional chain name
 * @returns {object} Current monitoring state
 */
function getMonitoringState(chain = null) {
  if (chain) {
    return chain in monitoringChains ? monitoringChains[chain] : null
  }
  return { ...monitoringChains }
}

/**
 * Get battle statistics
 * @returns {object} Battle statistics
 */
function getBattleStats() {
  return { ...battleStats, lastUpdated: Date.now() }
}

/**
 * Reset battle statistics
 * @param {string} chain - Optional chain name to reset stats for
 * @returns {object} Updated battle statistics
 */
function resetBattleStats(chain = null) {
  if (chain) {
    if (chain in battleStats.totalAttempts) {
      battleStats.totalAttempts[chain] = 0
      battleStats.successfulBuys[chain] = 0
      battleStats.honeypotBlocked[chain] = 0
    }
  } else {
    // Reset all stats
    Object.keys(battleStats.totalAttempts).forEach((c) => {
      battleStats.totalAttempts[c] = 0
      battleStats.successfulBuys[c] = 0
      battleStats.honeypotBlocked[c] = 0
    })
  }

  battleStats.lastUpdated = Date.now()
  return { ...battleStats }
}

/**
 * Get current status of the sniper
 * @returns {object} Current status
 */
function getStatus() {
  return {
    active: { ...activeChains },
    monitoring: { ...monitoringChains },
    settings: { ...chainSettings },
    stats: getBattleStats(),
  }
}

/**
 * Route sniper execution to the appropriate chain handler
 * @param {string} chain - Chain name
 * @param {string} tokenAddress - Token address/mint to buy
 * @returns {Promise<object>} Result of the buy operation
 */
async function sniperRouter(chain, tokenAddress) {
  if (!(chain in activeChains)) {
    console.error(`🔥 Unsupported chain: ${chain}`)
    return { success: false, error: "Unsupported chain" }
  }

  if (!activeChains[chain]) {
    console.log(`⏸️ Sniper for ${chain} is paused.`)
    return { success: false, error: "Sniper is paused" }
  }

  const settings = chainSettings[chain]
  console.log(`🎯 Routing snipe request to ${chain.toUpperCase()} handler`)

  // Update battle stats
  battleStats.totalAttempts[chain]++
  battleStats.lastUpdated = Date.now()

  try {
    let result

    switch (chain) {
      case "solana":
        result = await executeSolanaBuy(tokenAddress, settings)
        break
      case "ethereum":
        result = await executeEthereumBuy(tokenAddress, settings)
        break
      case "bsc":
        result = await executeBSCBuy(tokenAddress, settings)
        break
      default:
        throw new Error(`Unsupported chain: ${chain}`)
    }

    // Log transaction to Supabase
    await logTransaction(chain, result)

    if (result.success) {
      // Update battle stats for successful buy
      battleStats.successfulBuys[chain]++

      notifySuccess(
        `${chain.toUpperCase()} Token Sniped!`,
        `Successfully bought ${result.amount} ${result.symbol || "token"}`,
      )
    } else {
      // Check if it was blocked by honeypot shield
      if (result.error && result.error.includes("Honeypot detected")) {
        battleStats.honeypotBlocked[chain]++
        console.log(`🛡️ Honeypot Shield blocked a dangerous token on ${chain}`)
      }

      notifyError(`${chain.toUpperCase()} Snipe Failed`, result.error || "Unknown error")
    }

    return result
  } catch (error) {
    console.error(`🔥 Error in ${chain} sniper:`, error)

    // Log failed transaction
    await logTransaction(chain, {
      success: false,
      error: error.message || "Unknown error",
      token: tokenAddress,
      timestamp: Date.now(),
    })

    notifyError(`${chain.toUpperCase()} Sniper Error`, error.message || "Unknown error")
    return { success: false, error: error.message || "Unknown error" }
  }
}

module.exports = {
  toggleChainSniper,
  toggleChainMonitoring,
  updateChainSettings,
  getSettings,
  getActiveState,
  getMonitoringState,
  getStatus,
  sniperRouter,
  getBattleStats,
  resetBattleStats,
}
