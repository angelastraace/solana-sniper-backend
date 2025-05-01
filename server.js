// backend/server.js

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
const path = require('path');

// Serve frontend (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Also serve frontend assets (JS, CSS)
app.use(express.static(path.join(__dirname, '../frontend')));


let sniperActive = false;

// Start Sniper
app.post('/api/start-sniper', (req, res) => {
  sniperActive = true;
  console.log('[ACE Sniper] 🟢 Sniper Activated');
  // You can call your sniper starter function here if needed
  res.json({ success: true });
});

// Stop Sniper
app.post('/api/stop-sniper', (req, res) => {
  sniperActive = false;
  console.log('[ACE Sniper] 🔴 Sniper Deactivated');
  // You can stop sniper logic here if needed
  res.json({ success: true });
});

// Get Status
app.get('/api/status', (req, res) => {
  res.json({ sniperActive });
});

// Start Express server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[ACE Sniper] Backend API listening at http://localhost:${PORT}`);
});
