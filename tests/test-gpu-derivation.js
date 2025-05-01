// backend/tests/test-gpu-derivation.js

const { deriveWallets } = require("../services/walletDerivation")

// Test phrases
const TEST_PHRASES = [
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  "legal winner thank year wave sausage worth useful legal winner thank yellow",
  "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
]

// Set environment variable to force GPU derivation
process.env.USE_GPU_DERIVATION = "true"

async function runTest() {
  console.log("🧪 Testing GPU Derivation Service")
  console.log("================================")

  for (const phrase of TEST_PHRASES) {
    console.log(`\nTesting phrase: "${phrase.substring(0, 20)}..."`)

    try {
      console.time("Derivation time")
      const wallets = await deriveWallets(phrase)
      console.timeEnd("Derivation time")

      console.log("Derived wallets:")
      wallets.forEach((wallet) => {
        console.log(`- ${wallet.type}: ${wallet.address} (${wallet.derivationPath})`)
      })
    } catch (error) {
      console.error(`❌ Error: ${error.message}`)
    }
  }
}

runTest().catch(console.error)
