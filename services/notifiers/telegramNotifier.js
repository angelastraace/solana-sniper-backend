// backend/services/notifiers/telegramNotifier.js

require("dotenv").config()
const axios = require("axios")

async function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    const payload = {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "Markdown",
    }

    const res = await axios.post(url, payload)
    console.log("✅ Telegram message sent:", res.data)
    return true
  } catch (error) {
    console.error("🔥 Error sending Telegram message:", error.message)
    return false
  }
}

module.exports = {
  sendTelegramMessage,
}
