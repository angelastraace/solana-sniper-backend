// backend/tests/test-notifications.js

require("dotenv").config()
const notifications = require("../services/notifiers/notificationService")

async function testNotifications() {
  console.log("🧪 Testing notification system...")

  try {
    // Test info notification
    console.log("Testing INFO notification...")
    await notifications.info("This is a test INFO notification")

    // Test success notification
    console.log("Testing SUCCESS notification...")
    await notifications.success("This is a test SUCCESS notification")

    // Test warning notification
    console.log("Testing WARNING notification...")
    await notifications.warning("This is a test WARNING notification")

    // Test error notification
    console.log("Testing ERROR notification...")
    await notifications.error("This is a test ERROR notification")

    // Test critical notification
    console.log("Testing CRITICAL notification...")
    await notifications.critical("This is a test CRITICAL notification")

    // Test funded wallet notification
    console.log("Testing FUNDED WALLET notification...")
    await notifications.notifyFundedWallet(
      "ethereum",
      "0x1234567890abcdef1234567890abcdef12345678",
      1.5,
      "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12",
    )

    console.log("✅ All notification tests completed!")
  } catch (error) {
    console.error("❌ Error testing notifications:", error)
  }
}

// Run the tests
testNotifications()
