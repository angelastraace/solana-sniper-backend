require("dotenv").config()
const axios = require("axios")

/**
 * Send alert to Telegram
 * @param {string} message - Message to send
 */
async function sendTelegram(message) {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log("⚠️ Telegram credentials not configured. Skipping Telegram alert.")
      return
    }

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    })
    console.log("✅ Telegram alert sent successfully")
  } catch (error) {
    console.error("⚠️ Telegram alert failed:", error.message)
  }
}

/**
 * Send success alert for successful token purchase
 * @param {object} data - Transaction data
 */
async function successAlert(data) {
  const { chain, token, symbol, name, amount, inputAmount, txId, explorerUrl, retryAttempted, slippage } = data

  const retryText = retryAttempted ? `\n🔄 *Auto-retry was successful* with ${slippage}% slippage!` : ""

  const message =
    `✅ *Successful ${chain.toUpperCase()} Buy*\n\n` +
    `🪙 Token: ${name} (${symbol})\n` +
    `💰 Amount: ${amount.toFixed(4)} ${symbol}\n` +
    `💲 Spent: ${inputAmount} ${chain === "solana" ? "SOL" : chain === "ethereum" ? "ETH" : "BNB"}\n` +
    `🔗 [View Transaction](${explorerUrl})${retryText}\n\n` +
    `Contract: \`${token}\``

  await sendTelegram(message)
}

/**
 * Send honeypot alert for detected honeypot
 * @param {object} data - Honeypot data
 */
async function honeypotAlert(data) {
  const { chain, token, error } = data

  const message =
    `🛑 *HONEYPOT DETECTED on ${chain.toUpperCase()}*\n\n` +
    `⚠️ ${error}\n\n` +
    `Contract: \`${token}\`\n\n` +
    `✅ *Your funds were protected!*`

  await sendTelegram(message)
}

/**
 * Send error alert for failed transactions
 * @param {object} data - Error data
 */
async function errorAlert(data) {
  const { chain, token, error } = data

  const message =
    `⚠️ *Transaction Failed on ${chain.toUpperCase()}*\n\n` + `❌ Error: ${error}\n\n` + `Contract: \`${token}\``

  await sendTelegram(message)
}

module.exports = {
  successAlert,
  honeypotAlert,
  errorAlert,
}
