// backend/services/sniperEngine/honeypotShield.js
const axios = require("axios")
require("dotenv").config()

/**
 * Check if a token is a honeypot using multiple APIs
 * @param {string} tokenAddress - The token contract address
 * @param {string} chain - The blockchain (ethereum, bsc)
 * @returns {Promise<Object>} Honeypot check result
 */
async function isHoneypot(tokenAddress, chain) {
  console.log(`🛡️ Running honeypot check for ${tokenAddress} on ${chain}...`)

  // Default result
  const result = {
    isHoneypot: false,
    buyTax: null,
    sellTax: null,
    details: null,
  }

  try {
    // Try honeypot.is API first
    try {
      const honeypotIsUrl = `https://api.honeypot.is/v2/scan`
      const response = await axios.post(
        honeypotIsUrl,
        {
          chainId: chain === "ethereum" ? 1 : 56, // 1 for ETH, 56 for BSC
          address: tokenAddress,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        },
      )

      if (response.data && response.data.simulationSuccess === false) {
        result.isHoneypot = true
        result.details = response.data.simulationError || "Simulation failed"
        console.log(`🚨 Honeypot detected via honeypot.is: ${result.details}`)
        return result
      }

      if (response.data && response.data.honeypotResult) {
        const honeypotData = response.data.honeypotResult

        // Check if it's a honeypot
        if (honeypotData.isHoneypot) {
          result.isHoneypot = true
          result.details = honeypotData.honeypotReason || "Detected as honeypot"
          console.log(`🚨 Honeypot detected via honeypot.is: ${result.details}`)
          return result
        }

        // Get tax information
        if (honeypotData.buyTax !== undefined) {
          result.buyTax = Number.parseFloat(honeypotData.buyTax) * 100
        }

        if (honeypotData.sellTax !== undefined) {
          result.sellTax = Number.parseFloat(honeypotData.sellTax) * 100
        }

        console.log(`✅ Token passed honeypot.is check. Buy tax: ${result.buyTax}%, Sell tax: ${result.sellTax}%`)
        return result
      }
    } catch (error) {
      console.warn(`⚠️ honeypot.is API check failed: ${error.message}`)
      // Continue to next API
    }

    // Try rugdoc.io API as fallback
    try {
      const rugdocUrl =
        chain === "ethereum"
          ? `https://api.rugdoc.io/honeypot/ethereum.php?address=${tokenAddress}`
          : `https://api.rugdoc.io/honeypot.php?address=${tokenAddress}`

      const response = await axios.get(rugdocUrl, { timeout: 8000 })

      if (response.data && response.data.status) {
        if (response.data.status === "HONEYPOT") {
          result.isHoneypot = true
          result.details = response.data.message || "Detected as honeypot by rugdoc.io"
          console.log(`🚨 Honeypot detected via rugdoc.io: ${result.details}`)
          return result
        }

        if (response.data.status === "OK") {
          console.log(`✅ Token passed rugdoc.io check.`)
          return result
        }
      }
    } catch (error) {
      console.warn(`⚠️ rugdoc.io API check failed: ${error.message}`)
    }

    // If we get here, both APIs failed but we didn't detect a honeypot
    console.log(`⚠️ Honeypot APIs failed, but assuming token is safe.`)
    return result
  } catch (error) {
    console.error(`🔥 Error in honeypot check:`, error)
    // Fail safe - if all checks fail, don't mark as honeypot
    return result
  }
}

module.exports = {
  isHoneypot,
}
