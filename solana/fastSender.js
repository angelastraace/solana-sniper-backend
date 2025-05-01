const { sendAndConfirmRawTransaction } = require('@solana/web3.js');

async function fastSendTransaction(connection, transaction, signer) {
  // Part 1: Sign the transaction
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = signer.publicKey;
  await transaction.partialSign(signer);

  // Part 2: Serialize and send raw transaction
  const rawTransaction = transaction.serialize();
  
  const signature = await connection.sendRawTransaction(
    rawTransaction,
    {
      skipPreflight: true, // VERY IMPORTANT
      preflightCommitment: "confirmed" // You can set "processed" for even faster but riskier
    }
  );
  
  return signature;
}

module.exports = { fastSendTransaction };
