// backend/services/fundingScanner.js

const { ethers } = require("ethers")
const { Connection, PublicKey } = require("@solana/web3.js")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// RPC URLs
const ETH_RPC_URL = process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo"
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"

// Providers
let ethProvider
let solanaConnection

// Initialize providers
function initProviders() {
  if (!ethProvider) {
    ethProvider = new ethers.providers.JsonRpcProvider(ETH_RPC_URL)
  }

  if (!solanaConnection) {
    solanaConnection = new Connection(SOLANA_RPC_URL)
  }
}

/**
 * Check if Ethereum wallet has funds
 * @param {string} address - Ethereum address
 * @returns {Promise<{address: string, balance: string, hasFunds: boolean}>}
 */
async function checkEthereumWallet(address) {
  try {
    initProviders()

    const balance = await ethProvider.getBalance(address)
    const balanceInEth = ethers.utils.formatEther(balance)
    const hasFunds = !balance.isZero()

    return {
      type: "ethereum",
      address,
      balance: balanceInEth,
      hasFunds,
    }
  } catch (error) {
    console.error(`Error checking Ethereum wallet ${address}: ${error.message}`)
    return {
      type: "ethereum",
      address,
      balance: "0",
      hasFunds: false,
      error: error.message,
    }
  }
}

/**
 * Check if Solana wallet has funds
 * @param {string} address - Solana address
 * @returns {Promise<{address: string, balance: string, hasFunds: boolean}>}
 */
async function checkSolanaWallet(address) {
  try {
    initProviders()

    const publicKey = new PublicKey(address)
    const balance = await solanaConnection.getBalance(publicKey)
    const balanceInSol = balance / 1e9 // Convert lamports to SOL
    const hasFunds = balance > 0

    return {
      type: "solana",
      address,
      balance: balanceInSol.toString(),
      hasFunds,
    }
  } catch (error) {
    console.error(`Error checking Solana wallet ${address}: ${error.message}`)
    return {
      type: "solana",
      address,
      balance: "0",
      hasFunds: false,
      error: error.message,
    }
  }
}

/**
 * Check if wallets have funds
 * @param {Array<{type: string, address: string}>} wallets - Array of wallets to check
 * @returns {Promise<Array<{type: string, address: string, balance: string, hasFunds: boolean}>>}
 */
async function checkWalletFunding(wallets) {
  const results = []

  for (const wallet of wallets) {
    if (wallet.type === "ethereum") {
      results.push(await checkEthereumWallet(wallet.address))
    } else if (wallet.type === "solana") {
      results.push(await checkSolanaWallet(wallet.address))
    }
  }

  return results
}

// Export functions
module.exports = {
  checkWalletFunding,
  checkEthereumWallet,
  checkSolanaWallet,
}
