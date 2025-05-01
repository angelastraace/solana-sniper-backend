// backend/services/walletDerivation.js

const fetch = require("node-fetch")
const bip39 = require("bip39")
const { ethers } = require("ethers")
const { Keypair } = require("@solana/web3.js")
const { deriveSolanaKeypair } = require("../utils/solana-utils")

// Configuration
const GPU_DERIVATION_URL = process.env.GPU_DERIVATION_URL || "http://localhost:3030/derive"
const USE_GPU_DERIVATION = process.env.USE_GPU_DERIVATION === "true"

/**
 * Derive wallets from a seed phrase using GPU acceleration if available
 * @param {string} phrase - The seed phrase
 * @param {Object} options - Options for derivation
 * @returns {Promise<Array>} Array of derived wallets
 */
async function deriveWallets(phrase, options = {}) {
  try {
    // Validate the phrase first
    if (!bip39.validateMnemonic(phrase)) {
      throw new Error("Invalid mnemonic phrase")
    }

    // Try GPU derivation first if enabled
    if (USE_GPU_DERIVATION) {
      try {
        const wallets = await deriveWalletsGPU(phrase, options)
        return wallets
      } catch (gpuError) {
        console.warn(`GPU derivation failed, falling back to CPU: ${gpuError.message}`)
        // Fall back to CPU derivation
      }
    }

    // CPU derivation (fallback)
    return deriveWalletsCPU(phrase, options)
  } catch (error) {
    console.error(`Error deriving wallets: ${error.message}`)
    throw error
  }
}

/**
 * Derive wallets using GPU acceleration
 * @param {string} phrase - The seed phrase
 * @param {Object} options - Options for derivation
 * @returns {Promise<Array>} Array of derived wallets
 */
async function deriveWalletsGPU(phrase, options = {}) {
  try {
    const batchId = options.batchId || null

    const response = await fetch(GPU_DERIVATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phrase,
        batch_id: batchId,
      }),
      timeout: 5000, // 5 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GPU derivation service error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`GPU derivation error: ${data.error}`)
    }

    // Transform the response to match our expected format
    return data.wallets.map((wallet) => ({
      type: wallet.wallet_type,
      address: wallet.address,
      derivationPath: wallet.derivation_path,
      balance: 0, // Balance will be checked separately
      hasFunds: false,
    }))
  } catch (error) {
    console.error(`GPU derivation error: ${error.message}`)
    throw error
  }
}

/**
 * Derive wallets using CPU (fallback method)
 * @param {string} phrase - The seed phrase
 * @param {Object} options - Options for derivation
 * @returns {Promise<Array>} Array of derived wallets
 */
async function deriveWalletsCPU(phrase, options = {}) {
  try {
    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(phrase)

    // Derive Ethereum wallet
    const hdNode = ethers.utils.HDNode.fromSeed(seed)
    const ethWallet = hdNode.derivePath("m/44'/60'/0'/0/0")

    // Derive Solana wallet
    const solanaKeypair = deriveSolanaKeypair(seed)

    // Return wallet information
    return [
      {
        type: "ethereum",
        address: ethWallet.address,
        derivationPath: "m/44'/60'/0'/0/0",
        balance: 0,
        hasFunds: false,
      },
      {
        type: "solana",
        address: solanaKeypair.publicKey.toString(),
        derivationPath: "m/44'/501'/0'/0'",
        balance: 0,
        hasFunds: false,
      },
    ]
  } catch (error) {
    console.error(`CPU derivation error: ${error.message}`)
    throw error
  }
}

/**
 * Batch derive multiple phrases at once
 * @param {Array<string>} phrases - Array of seed phrases
 * @param {Object} options - Options for derivation
 * @returns {Promise<Array>} Array of derived wallets for each phrase
 */
async function deriveWalletsBatch(phrases, options = {}) {
  // For now, just process sequentially
  // In the future, this could be optimized to use batch GPU processing
  const results = []

  for (let i = 0; i < phrases.length; i++) {
    try {
      const wallets = await deriveWallets(phrases[i], {
        ...options,
        batchId: i,
      })
      results.push({
        phrase: phrases[i],
        wallets,
        error: null,
      })
    } catch (error) {
      results.push({
        phrase: phrases[i],
        wallets: [],
        error: error.message,
      })
    }
  }

  return results
}

module.exports = {
  deriveWallets,
  deriveWalletsBatch,
}
