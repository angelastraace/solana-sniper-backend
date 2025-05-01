#!/usr/bin/env node

// backend/cli/scan.js

const { scanFromFile, scanFromArray } = require("../services/scannerMaster")
const fs = require("fs")
const path = require("path")
const readline = require("readline")

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  numWorkers: undefined,
  batchSize: undefined,
  outputFile: undefined,
  verbose: false,
}

let inputFile = null
let phrases = null

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  if (arg.startsWith("--")) {
    // Option
    if (arg.startsWith("--workers=")) {
      options.numWorkers = Number.parseInt(arg.split("=")[1])
    } else if (arg.startsWith("--batch=")) {
      options.batchSize = Number.parseInt(arg.split("=")[1])
    } else if (arg.startsWith("--output=")) {
      options.outputFile = arg.split("=")[1]
    } else if (arg === "--verbose") {
      options.verbose = true
    } else if (arg === "--help") {
      showHelp()
      process.exit(0)
    }
  } else {
    // Input file
    inputFile = arg
  }
}

// Show help if no input provided
if (!inputFile && !process.stdin.isTTY) {
  // Check if we're receiving piped input
  phrases = []
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on("line", (line) => {
    if (line.trim()) {
      phrases.push(line.trim())
    }
  })

  rl.on("close", () => {
    if (phrases.length === 0) {
      showHelp()
      process.exit(1)
    }

    console.log(`📝 Received ${phrases.length} phrases from stdin`)
    startScan()
  })
} else if (!inputFile) {
  showHelp()
  process.exit(1)
} else {
  startScan()
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
🔍 ACE SNIPER - Multithreaded Phrase Scanner

Usage:
  node scan.js <phrases_file> [options]
  cat phrases.txt | node scan.js [options]

Options:
  --workers=N      Number of worker threads (default: number of CPU cores)
  --batch=N        Phrases per batch (default: 1000)
  --output=FILE    Save results to file
  --verbose        Show detailed progress
  --help           Show this help

Examples:
  node scan.js ./phrases.txt --workers=4 --batch=500
  node scan.js ./phrases.txt --output=results.json
  cat phrases.txt | node scan.js --workers=8
  `)
}

/**
 * Start the scanning process
 */
async function startScan() {
  try {
    console.log("🚀 Starting ACE SNIPER in BEAST MODE...")

    let results
    if (phrases) {
      results = await scanFromArray(phrases, options)
    } else {
      results = await scanFromFile(inputFile, options)
    }

    // Handle results
    if (results.success) {
      console.log(`
✅ Scan completed successfully!
📊 Summary:
  - Processed: ${results.totalProcessed} phrases
  - Valid: ${results.totalValid}
  - Filled: ${results.totalFilled}
  - Funded: ${results.totalFunded}
  - Time: ${results.timeSeconds.toFixed(2)} seconds
  - Rate: ${results.rate.toFixed(2)} phrases/second
      `)

      // Save results if requested
      if (options.outputFile) {
        fs.writeFileSync(options.outputFile, JSON.stringify(results, null, 2))
        console.log(`💾 Results saved to ${options.outputFile}`)
      }

      // Display funded wallets
      if (results.results && results.results.length > 0) {
        console.log("💰 FUNDED WALLETS FOUND:")
        results.results.forEach((result, index) => {
          console.log(`
[${index + 1}] Phrase: ${result.processedPhrase}
    Solana: ${result.solanaWallet || "N/A"} (${result.solanaBalance} SOL)
    Ethereum: ${result.ethereumWallet || "N/A"} (${result.ethereumBalance} ETH)
          `)
        })
      }
    } else {
      console.error("❌ Scan failed:", results.error)
      process.exit(1)
    }
  } catch (error) {
    console.error("❌ Error during scan:", error)
    process.exit(1)
  }
}
