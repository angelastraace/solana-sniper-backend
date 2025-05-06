// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const supabase = require('./supabaseClient'); // <- assumes you created this file
const app = express();

const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const AUTH_HEADER = process.env.RPC_AUTH_TOKEN || '';

app.use(express.json());

/**
 * Health check route
 */
app.get('/ping', (_, res) => {
  res.status(200).send('pong');
});

/**
 * Solana RPC Proxy
 */
app.post('/solana/rpc', async (req, res) => {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_HEADER && { 'Authorization': AUTH_HEADER })
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('RPC Proxy Error:', err);
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
});

/**
 * Example: Get recent Solana snipes from Supabase
 */
app.get('/snipes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('snipes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Supabase Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch snipes', details: err.message });
  }
});

// Local dev (Vercel ignores this)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
