// backend/services/sniperEngine/ethereumSniper.js

const { ethers } = require("ethers")
const fetch = require("cross-fetch")
const { isHoneypot } = require("./honeypotShield")
const { successAlert, honeypotAlert, errorAlert } = require("../alertService")
require("dotenv").config()

// Load ABIs
const UniswapV2RouterABI = require("./abis/UniswapV2Router02.json")
const ERC20_ABI = require("./abis/ERC20.json")

// Constants
const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" // Uniswap V2 Router
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // WETH on Ethereum mainnet

// Initialize Ethereum provider
const getProvider = () => {
  const rpcUrl = process.env.ETH_RPC_URL
  if (!rpcUrl) {
    throw new Error("ETH_RPC_URL environment variable is not set")
  }
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
  const address = process.env.DESTINATION_WALLET_ETH
  if (!address) {
    throw new Error("DESTINATION_WALLET_ETH environment variable is not set")
  }
  return address
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
    return gasPrice.mul(Math.floor(settings.gasMultiplier * 100)).div(100)
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
    // Check if token is verified on Etherscan
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY || ""
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${tokenAddress}&apikey=${etherscanApiKey}`

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
 * Execute a buy for an Ethereum token using Uniswap V2
 * @param {string} tokenAddress - Token contract address
 * @param {object} settings - Sniper settings
 * @returns {Promise<object>} Result of the buy operation
 */
async function executeEthereumBuy(tokenAddress, settings) {
  console.log(`🚀 Executing ETHEREUM buy for token: ${tokenAddress}`)
  console.log(`⚙️ Settings:`, settings)

  try {
    // Check if token passes safety checks
    const isVerified = await checkVerifiedCreator(tokenAddress, settings)
    if (!isVerified && settings.verifiedOnly) {
      const result = {
        success: false,
        error: "Token creator not verified",
        token: tokenAddress,
        chain: "ethereum",
        timestamp: Date.now(),
      }

      // Send honeypot alert
      await honeypotAlert(result)

      return result
    }

    // Enhanced honeypot check using Honeypot Shield
    if (settings.antiHoneypot) {
      const honeypotCheck = await isHoneypot(tokenAddress, "ethereum")
      if (honeypotCheck.isHoneypot) {
        const result = {
          success: false,
          error: `Honeypot detected! ${honeypotCheck.details}`,
          token: tokenAddress,
          chain: "ethereum",
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
            chain: "ethereum",
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
    const router = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UniswapV2RouterABI, wallet)

    // Convert ETH amount to wei
    const amountInEth = settings.buyAmount
    const amountInWei = ethers.utils.parseEther(amountInEth.toString())

    // Check wallet balance
    const balance = await wallet.provider.getBalance(wallet.address)
    const ethBalance = ethers.utils.formatEther(balance)

    if (Number.parseFloat(ethBalance) < amountInEth + 0.01) {
      return {
        success: false,
        error: `Insufficient ETH balance. Have ${ethBalance} ETH, need ${amountInEth + 0.01} ETH`,
        token: tokenAddress,
        chain: "ethereum",
        timestamp: Date.now(),
      }
    }

    // Setup swap parameters
    const path = [WETH_ADDRESS, tokenAddress]
    const to = wallet.address
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
      console.log(`💰 Successfully bought ${tokenAddress} with ${amountInEth} ETH`)
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
          console.log(`💰 RETRY successful! Bought ${tokenAddress} with ${amountInEth} ETH`)
          console.log(`📝 RETRY transaction confirmed: ${receipt.transactionHash}`)
        } catch (retryError) {
          console.error(`🔥 Retry also failed:`, retryError.message)

          // Send error alert
          await errorAlert({
            chain: "ethereum",
            token: tokenAddress,
            error: `Both initial (${initialSlippage}%) and retry (${retrySlippage}%) attempts failed: ${retryError.message}`,
            timestamp: Date.now(),
          })

          return {
            success: false,
            error: `Both initial and retry attempts failed: ${retryError.message}`,
            token: tokenAddress,
            chain: "ethereum",
            timestamp: Date.now(),
            initialSlippage,
            retrySlippage,
            retryAttempted: true,
          }
        }
      } else {
        // Non-slippage related error
        await errorAlert({
          chain: "ethereum",
          token: tokenAddress,
          error: `Transaction failed: ${error.message}`,
          timestamp: Date.now(),
        })

        return {
          success: false,
          error: `Transaction failed: ${error.message}`,
          token: tokenAddress,
          chain: "ethereum",
          timestamp: Date.now(),
        }
      }
    }

    // If we got here, either the initial transaction or the retry was successful
    // Get token balance after swap
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.provider)
    const tokenBalance = await tokenContract.balanceOf(wallet.address)
    const balanceFormatted = ethers.utils.formatUnits(tokenBalance, metadata.decimals)

    const result = {
      success: true,
      txId: receipt.transactionHash,
      amount: Number.parseFloat(balanceFormatted),
      inputAmount: amountInEth,
      token: tokenAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      price: amountInEth / Number.parseFloat(balanceFormatted),
      timestamp: Date.now(),
      explorerUrl: `https://etherscan.io/tx/${receipt.transactionHash}`,
      chain: "ethereum",
      retryAttempted,
      slippage: retryAttempted ? initialSlippage * 2 : initialSlippage,
    }

    // Send success alert
    await successAlert(result)

    return result
  } catch (error) {
    console.error(`🔥 Error in Ethereum buy:`, error)
    return {
      success: false,
      error: error.message || "Unknown error in Ethereum buy",
      token: tokenAddress,
      chain: "ethereum",
      timestamp: Date.now(),
    }
  }
}

module.exports = {
  executeEthereumBuy,
  getProvider,
  getWallet,
  getDestinationWallet,
}
