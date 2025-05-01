-- Create table for storing sniper transaction logs
CREATE TABLE IF NOT EXISTS sniper_transactions (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20) NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol VARCHAR(20),
  token_name TEXT,
  amount DECIMAL,
  input_amount DECIMAL,
  price DECIMAL,
  tx_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE,
  error TEXT,
  explorer_url TEXT,
  honeypot_details JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_chain ON sniper_transactions(chain);
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_success ON sniper_transactions(success);
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_timestamp ON sniper_transactions(timestamp);

-- Add comment to table
COMMENT ON TABLE sniper_transactions IS 'Stores transaction logs for the multi-chain sniper';
