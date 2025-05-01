// backend/services/sniperEngine/bscSniper.js

const { ethers } = require("ethers")
const fetch = require("cross-fetch")
const { isHoneypot } = require("./honeypotShield")
const { successAlert, honeypotAlert, errorAlert } = require("../alertService")
require("dotenv").config()

// Load ABIs
const PancakeSwapRouterABI = require("./abis/PancakeSwapRouter.json")
const ERC20_ABI = require("./abis/ERC20.json")

// Constants
const PANCAKESWAP_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E" // PancakeSwap V2 Router
const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" // WBNB on BSC

// Initialize BSC provider
const getProvider = () => {
  const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/"
  return new ethers.providers.JsonRpcProvider(rpcUrl)
}

// Get wallet from private key
const getWallet = () => {
  const privateKey = process.env.MASTER_PRIVATE_KEY
  if (!privateKey) {
    throw new Error("MASTER_PRIVATE_KEY environment variable is not set")
  }

  const provider = getProvider()
  return new ethers.Wallet(privateKey, provider)
}

// Get destination wallet
const getDestinationWallet = () => {
  return process.env.DESTINATION_WALLET || process.env.DESTINATION_WALLET_ETH || ""
}

/**
 * Get boosted gas price based on current network conditions
 * @param {object} settings - Sniper settings
 * @returns {Promise<BigNumber>} Boosted gas price
 */
async function getBoostedGasPrice(settings) {
  try {
    const provider = getProvider()
    const currentGasPrice = await provider.getGasPrice()

    // Default boost is 20% if not specified in settings
    const boostPercent = settings.gasBoostPercent || 20

    // Apply the boost
    const boostedGasPrice = currentGasPrice.mul(100 + boostPercent).div(100)

    console.log(`⛽ Current gas price: ${ethers.utils.formatUnits(currentGasPrice, "gwei")} gwei`)
    console.log(`🚀 Boosted gas price: ${ethers.utils.formatUnits(boostedGasPrice, "gwei")} gwei (+${boostPercent}%)`)

    return boostedGasPrice
  } catch (error) {
    console.error(`Error getting boosted gas price: ${error.message}`)
    // Fallback to using the gas multiplier if there's an error
    const provider = getProvider()
    const gasPrice = await provider.getGasPrice()
    return gasPrice.mul(Math.floor((settings.gasMultiplier || 1.2) * 100)).div(100)
  }
}

/**
 * Check if token creator is verified
 * @param {string} tokenAddress - Token contract address
 * @param {object} settings - Sniper settings
 * @returns {Promise<boolean>} True if creator is verified or check is disabled
 */
async function checkVerifiedCreator(tokenAddress, settings) {
  if (!settings.verifiedOnly) {
    return true // Skip check if verifiedOnly is disabled
  }

  try {
    // Check if token is verified on BSCScan
    const bscscanApiKey = process.env.BSCSCAN_API_KEY || ""
    const url = `https://api.bscscan.com/api?module=contract&action=getabi&address=${tokenAddress}&apikey=${bscscanApiKey}`

    const response = await fetch(url)
    const data = await response.json()

    // If the ABI is available, the contract is verified
    const isVerified = data.status === "1" && data.result !== "Contract source code not verified"

    console.log(`✅ Creator verification ${isVerified ? "passed" : "failed"} for ${tokenAddress}`)
    return isVerified
  } catch (error) {
    console.error(`🔥 Error in creator verification:`, error)
    return false
  }
}

/**
 * Get token metadata
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<object>} Token metadata
 */
async function getTokenMetadata(tokenAddress) {
  try {
    const provider = getProvider()
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ])

    return {
      name,
      symbol,
      decimals,
    }
  } catch (error) {
    console.error(`Error fetching token metadata:`, error)
    return {
      name: "Unknown Token",
      symbol: "UNKNOWN",
      decimals: 18,
    }
  }
}

/**
 * Check if error is related to slippage
 * @param {Error} error - The error object
 * @returns {boolean} True if error is slippage-related
 */
function isSlippageError(error) {
  const errorMsg = error.message.toLowerCase()
  return (
    errorMsg.includes("insufficient_output_amount") ||
    errorMsg.includes("slippage") ||
    errorMsg.includes("price impact too high") ||
    errorMsg.includes("execution reverted") ||
    errorMsg.includes("transaction underpriced") ||
    errorMsg.includes("price movement")
  )
}

/**
 * Execute a buy for a BSC token using PancakeSwap
 * @param {string} tokenAddress - Token contract address
 * @param {object} settings - Sniper settings
 * @returns {Promise<object>} Result of the buy operation
 */
async function executeBSCBuy(tokenAddress, settings) {
  console.log(`🚀 Executing BSC buy for token: ${tokenAddress}`)
  console.log(`⚙️ Settings:`, settings)

  try {
    // Check if token passes safety checks
    const isVerified = await checkVerifiedCreator(tokenAddress, settings)
    if (!isVerified && settings.verifiedOnly) {
      const result = {
        success: false,
        error: "Token creator not verified",
        token: tokenAddress,
        chain: "bsc",
        timestamp: Date.now(),
      }

      // Send honeypot alert
      await honeypotAlert(result)

      return result
    }

    // Enhanced honeypot check using Honeypot Shield
    if (settings.antiHoneypot) {
      const honeypotCheck = await isHoneypot(tokenAddress, "bsc")
      if (honeypotCheck.isHoneypot) {
        const result = {
          success: false,
          error: `Honeypot detected! ${honeypotCheck.details}`,
          token: tokenAddress,
          chain: "bsc",
          timestamp: Date.now(),
          honeypotDetails: honeypotCheck,
        }

        // Send honeypot alert
        await honeypotAlert(result)

        return result
      }

      // Check for high sell tax
      if (honeypotCheck.sellTax && honeypotCheck.sellTax > 15) {
        console.warn(`⚠️ High sell tax detected: ${honeypotCheck.sellTax}%`)
        if (settings.maxSellTax && honeypotCheck.sellTax > settings.maxSellTax) {
          const result = {
            success: false,
            error: `Sell tax too high: ${honeypotCheck.sellTax}% (max: ${settings.maxSellTax}%)`,
            token: tokenAddress,
            chain: "bsc",
            timestamp: Date.now(),
            honeypotDetails: honeypotCheck,
          }

          // Send honeypot alert
          await honeypotAlert(result)

          return result
        }
      }
    }

    // Get token metadata
    const metadata = await getTokenMetadata(tokenAddress)

    // Setup wallet and router
    const wallet = getWallet()
    const provider = getProvider()
    const router = new ethers.Contract(PANCAKESWAP_ROUTER_ADDRESS, PancakeSwapRouterABI, wallet)

    // Check wallet balance
    const bnbBalance = await provider.getBalance(wallet.address)
    const bnbBalanceInBNB = ethers.utils.formatEther(bnbBalance)

    // Convert BNB amount to wei
    const amountInBnb = settings.buyAmount || 0.1
    const amountInWei = ethers.utils.parseEther(amountInBnb.toString())

    // Ensure we have enough balance
    if (Number.parseFloat(bnbBalanceInBNB) < amountInBnb + 0.01) {
      return {
        success: false,
        error: `Insufficient BNB balance. Have ${bnbBalanceInBNB} BNB, need ${(amountInBnb + 0.01).toFixed(4)} BNB`,
        token: tokenAddress,
        chain: "bsc",
        timestamp: Date.now(),
      }
    }

    // Setup swap parameters
    const path = [WBNB_ADDRESS, tokenAddress]
    const to = process.env.DESTINATION_WALLET || wallet.address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now

    // Get dynamically boosted gas price
    const adjustedGasPrice = await getBoostedGasPrice(settings)

    // Initial slippage
    const initialSlippage = settings.slippage || 3
    console.log(`🔄 Initial slippage: ${initialSlippage}%`)

    // Calculate minimum amount out based on slippage
    let amountOutMin = 0
    try {
      const amounts = await router.getAmountsOut(amountInWei, path)
      const amountOut = amounts[1]
      amountOutMin = amountOut.mul(100 - initialSlippage).div(100)
      console.log(`💰 Expected output: ${ethers.utils.formatUnits(amountOut, metadata.decimals)} ${metadata.symbol}`)
      console.log(`🔍 Minimum output: ${ethers.utils.formatUnits(amountOutMin, metadata.decimals)} ${metadata.symbol}`)
    } catch (error) {
      console.warn(`Could not calculate amountOutMin: ${error.message}`)
      // Continue with amountOutMin = 0 (accept any amount out)
    }

    // Execute the swap with retry logic
    let receipt
    let txHash
    let retryAttempted = false

    try {
      // First attempt with initial slippage
      console.log(`🔄 Executing swap with ${initialSlippage}% slippage...`)
      const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, path, to, deadline, {
        value: amountInWei,
        gasPrice: adjustedGasPrice,
        gasLimit: 500000, // Adjust as needed
      })

      console.log(`📝 Transaction sent: ${tx.hash}`)
      txHash = tx.hash

      // Wait for transaction to be mined
      receipt = await tx.wait()
      console.log(`💰 Successfully bought ${tokenAddress} with ${amountInBnb} BNB`)
      console.log(`📝 Transaction confirmed: ${receipt.transactionHash}`)
    } catch (error) {
      console.error(`🔥 Initial buy failed:`, error.message)

      // Check if error is related to slippage
      if (isSlippageError(error)) {
        console.log(`🔁 Retrying with increased slippage...`)
        retryAttempted = true

        // Calculate retry slippage (double the initial)
        const retrySlippage = initialSlippage * 2
        console.log(`🔄 Retry slippage: ${retrySlippage}%`)

        try {
          // Recalculate minimum amount out with increased slippage
          let retryAmountOutMin = 0
          try {
            const amounts = await router.getAmountsOut(amountInWei, path)
            const amountOut = amounts[1]
            retryAmountOutMin = amountOut.mul(100 - retrySlippage).div(100)
            console.log(
              `🔍 Retry minimum output: ${ethers.utils.formatUnits(retryAmountOutMin, metadata.decimals)} ${metadata.symbol}`,
            )
          } catch (error) {
            console.warn(`Could not calculate retry amountOutMin: ${error.message}`)
            // Continue with retryAmountOutMin = 0 (accept any amount out)
          }

          // Execute retry with increased slippage
          const retryTx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
            retryAmountOutMin,
            path,
            to,
            deadline,
            {
              value: amountInWei,
              gasPrice: adjustedGasPrice.mul(110).div(100), // Increase gas price by 10% for retry
              gasLimit: 600000, // Increase gas limit for retry
            },
          )

          console.log(`📝 RETRY transaction sent: ${retryTx.hash}`)
          txHash = retryTx.hash

          // Wait for retry transaction to be mined
          receipt = await retryTx.wait()
          console.log(`💰 RETRY successful! Bought ${tokenAddress} with ${amountInBnb} BNB`)
          console.log(`📝 RETRY transaction confirmed: ${receipt.transactionHash}`)
        } catch (retryError) {
          console.error(`🔥 Retry also failed:`, retryError.message)

          // Send error alert
          await errorAlert({
            chain: "bsc",
            token: tokenAddress,
            error: `Both initial (${initialSlippage}%) and retry (${retrySlippage}%) attempts failed: ${retryError.message}`,
            timestamp: Date.now(),
          })

          return {
            success: false,
            error: `Both initial and retry attempts failed: ${retryError.message}`,
            token: tokenAddress,
            chain: "bsc",
            timestamp: Date.now(),
            initialSlippage,
            retrySlippage,
            retryAttempted: true,
          }
        }
      } else {
        // Non-slippage related error
        await errorAlert({
          chain: "bsc",
          token: tokenAddress,
          error: `Transaction failed: ${error.message}`,
          timestamp: Date.now(),
        })

        return {
          success: false,
          error: `Transaction failed: ${error.message}`,
          token: tokenAddress,
          chain: "bsc",
          timestamp: Date.now(),
        }
      }
    }

    // If we got here, either the initial transaction or the retry was successful
    // Get token balance after swap
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const balance = await tokenContract.balanceOf(to)
    const balanceFormatted = ethers.utils.formatUnits(balance, metadata.decimals)

    const result = {
      success: true,
      txId: receipt.transactionHash,
      amount: Number.parseFloat(balanceFormatted),
      inputAmount: amountInBnb,
      token: tokenAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      price: amountInBnb / Number.parseFloat(balanceFormatted),
      timestamp: Date.now(),
      explorerUrl: `https://bscscan.com/tx/${receipt.transactionHash}`,
      chain: "bsc",
      retryAttempted,
      slippage: retryAttempted ? initialSlippage * 2 : initialSlippage,
    }

    // Send success alert
    await successAlert(result)

    return result
  } catch (error) {
    console.error(`🔥 Error in BSC buy:`, error)
    return {
      success: false,
      error: error.message || "Unknown error in BSC buy",
      token: tokenAddress,
      chain: "bsc",
      timestamp: Date.now(),
    }
  }
}

module.exports = {
  executeBSCBuy,
  getProvider,
  getWallet,
  getDestinationWallet,
}
