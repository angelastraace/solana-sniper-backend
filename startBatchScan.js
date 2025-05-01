// /backend/startBatchScan.js

require('dotenv').config(); // Load your .env variables

const { processPhrasesBatch } = require('./services/scannerBatchEngine');

// Example list of phrases (replace this with real phrases or load dynamically)
const phrases = [
  "gravity choice drill blur region harvest medal erupt cycle frog scene endless",
  "march0320",
  "abandon ability able about above absent absorb abstract absurd abuse access accident"
];

// Start Batch
processPhrasesBatch(phrases, { batchSize: 5, delay: 500 });
