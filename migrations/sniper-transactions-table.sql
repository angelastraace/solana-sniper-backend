-- Create the sniper_transactions table
CREATE TABLE IF NOT EXISTS sniper_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  token_name TEXT,
  amount NUMERIC,
  input_amount NUMERIC,
  price NUMERIC,
  tx_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_chain ON sniper_transactions(chain);
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_token_address ON sniper_transactions(token_address);
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_timestamp ON sniper_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_sniper_transactions_success ON sniper_transactions(success);

-- Add RLS policies
ALTER TABLE sniper_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow full access to authenticated users" 
  ON sniper_transactions 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for service role
CREATE POLICY "Allow full access to service role" 
  ON sniper_transactions 
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
