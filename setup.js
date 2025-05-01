#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m",
  },

  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m",
  },
}

// Helper functions
function log(message, type = "info") {
  const prefix = {
    info: `${colors.fg.blue}[INFO]${colors.reset}`,
    success: `${colors.fg.green}[SUCCESS]${colors.reset}`,
    warning: `${colors.fg.yellow}[WARNING]${colors.reset}`,
    error: `${colors.fg.red}[ERROR]${colors.reset}`,
  }

  console.log(`${prefix[type]} ${message}`)
}

function checkDependencies() {
  log("Checking dependencies...")

  try {
    // Check if npm is installed
    execSync("npm --version", { stdio: "ignore" })
    log("npm is installed", "success")

    // Check if node is installed
    const nodeVersion = execSync("node --version").toString().trim()
    log(`Node.js ${nodeVersion} is installed`, "success")

    // Check if required node version is met
    const versionNumber = nodeVersion.replace("v", "").split(".").map(Number)
    if (versionNumber[0] < 18) {
      log(`Node.js version 18 or higher is required. You have ${nodeVersion}`, "error")
      process.exit(1)
    }
  } catch (error) {
    log("Failed to check dependencies. Make sure npm and Node.js are installed.", "error")
    process.exit(1)
  }
}

function installDependencies() {
  log("Installing dependencies...")

  try {
    execSync("npm install", { stdio: "inherit" })
    log("Dependencies installed successfully", "success")
  } catch (error) {
    log("Failed to install dependencies", "error")
    process.exit(1)
  }
}

function createEnvFile(answers) {
  log("Creating .env file...")

  const envContent = `PORT=${answers.port}
FRONTEND_URL=${answers.frontendUrl}
NEXT_PUBLIC_SUPABASE_URL=${answers.supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${answers.supabaseKey}
`

  try {
    fs.writeFileSync(path.join(__dirname, ".env"), envContent)
    log(".env file created successfully", "success")
  } catch (error) {
    log("Failed to create .env file", "error")
    console.error(error)
    process.exit(1)
  }
}

function startServer() {
  log("Starting server...")

  try {
    execSync("npm run dev", { stdio: "inherit" })
  } catch (error) {
    log("Failed to start server", "error")
    process.exit(1)
  }
}

// Main setup function
async function setup() {
  console.log(`
${colors.fg.cyan}${colors.bright}=================================================
           ACE Scanner Backend Setup
=================================================${colors.reset}

This script will help you set up the ACE Scanner backend service.
It will:
1. Check dependencies
2. Install required packages
3. Create a .env file
4. Start the server

`)

  // Check dependencies
  checkDependencies()

  // Ask questions
  const answers = {}

  const questions = [
    {
      name: "port",
      message: "Which port should the backend run on?",
      default: "3001",
    },
    {
      name: "frontendUrl",
      message: "What is the URL of your frontend?",
      default: "http://localhost:3000",
    },
    {
      name: "supabaseUrl",
      message: "What is your Supabase URL?",
      default: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    },
    {
      name: "supabaseKey",
      message: "What is your Supabase anon key?",
      default: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  ]

  for (const question of questions) {
    answers[question.name] = await new Promise((resolve) => {
      rl.question(`${colors.fg.yellow}${question.message}${colors.reset} (${question.default}): `, (answer) => {
        resolve(answer || question.default)
      })
    })
  }

  // Create .env file
  createEnvFile(answers)

  // Install dependencies
  installDependencies()

  // Ask if user wants to start the server
  const startNow = await new Promise((resolve) => {
    rl.question(`${colors.fg.yellow}Do you want to start the server now?${colors.reset} (Y/n): `, (answer) => {
      resolve(answer.toLowerCase() !== "n")
    })
  })

  rl.close()

  if (startNow) {
    startServer()
  } else {
    log('Setup completed. You can start the server with "npm run dev"', "success")
  }
}

// Run setup
setup()
