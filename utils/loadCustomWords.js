// backend/utils/loadCustomWords.js

const fs = require('fs');
const path = require('path');

/**
 * Load all words from /backend/wordlists folder
 * Returns array of unique words
 */
function loadCustomWords(folderPath = './backend/wordlists') {
  let words = [];

  try {
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
      const content = fs.readFileSync(path.join(folderPath, file), 'utf8');
      const fileWords = content.split(/\r?\n/).map(w => w.trim()).filter(Boolean);
      words = words.concat(fileWords);
    });

    // Remove duplicates
    const uniqueWords = [...new Set(words)];
    console.log(`✅ Loaded ${uniqueWords.length} custom words from ${folderPath}`);
    return uniqueWords;
  } catch (error) {
    console.error('⚠️ Error loading custom wordlists:', error.message);
    return [];
  }
}

module.exports = loadCustomWords;
