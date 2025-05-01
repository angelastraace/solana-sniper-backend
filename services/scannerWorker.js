// backend/services/scannerWorker.js

const { workerData, parentPort } = require('worker_threads');
const { processPhrase } = require('./scannerEngine');

async function run() {
  const { phrases, workerId } = workerData;

  for (let phrase of phrases) {
    const result = await processPhrase(phrase);

    // If funded wallet found
    if (result && result.hasFunds) {
      parentPort.postMessage({
        type: 'fundedWallet',
        chain: result.solanaBalance > 0 ? 'solana' : 'ethereum',
        address: result.solanaBalance > 0 ? result.solanaWallet : result.ethereumWallet,
        balance: result.solanaBalance > 0 ? result.solanaBalance : result.ethereumBalance,
        workerId,
      });
    }
  }

  parentPort.postMessage(`✅ Worker ${workerId} finished.`);
}

run();
