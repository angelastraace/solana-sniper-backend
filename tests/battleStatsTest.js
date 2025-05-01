// backend/test/battleStatsTest.js

const { buildBattleStats } = require('../services/battleDashboardProcessor');

const livePhrases = [
  "gravity choice drill blur region harvest medal erupt cycle frog scene endless",
  "march0320",
  "abandon ability able about above absent absorb abstract absurd abuse access accident"
];

const stats = buildBattleStats(livePhrases);

console.log('🏹 Battle Stats:', stats);
