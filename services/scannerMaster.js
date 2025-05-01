const { processPhrasesBatch } = require('./scannerEngine');
// No more: const { initWebSocketServer } = require('./websocketServer');

async function startBattleScan() {
  console.log(`🚀 Detected ${require('os').cpus().length} CPU cores. Launching scanning workers!`);
  
  // Call the batch processor (you can load phrases here)
  const phrases = []; // <- Load your phrase list
  await processPhrasesBatch(phrases, { batchSize: 5, delay: 1000 });
}

startBattleScan();
