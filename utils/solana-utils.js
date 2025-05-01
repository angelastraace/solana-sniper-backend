const { PublicKey } = require("@solana/web3.js");

/**
 * Check if a Solana public key is valid
 * @param {string} address
 * @returns {boolean}
 */
function isValidSolanaAddress(address) {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Normalize a Solana public key
 * @param {string} address
 * @returns {string|null}
 */
function normalizeSolanaAddress(address) {
  try {
    return new PublicKey(address).toBase58();
  } catch (error) {
    return null;
  }
}

module.exports = {
  isValidSolanaAddress,
  normalizeSolanaAddress,
};
