const bip39 = require('bip39');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const { derivePath } = require('ed25519-hd-key');

const MNEMONIC = "your twelve word secret phrase here"; // <-- Replace this

async function generateSolanaKey() {
  const seed = await bip39.mnemonicToSeed(MNEMONIC);
  const derivationPath = "m/44'/501'/0'/0'"; // Solana's standard derivation path
  const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  console.log('Private key array:');
  console.log(JSON.stringify(Array.from(keypair.secretKey)));
}

generateSolanaKey();
