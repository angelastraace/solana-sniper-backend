-- Create scan_results table
CREATE TABLE IF NOT EXISTS scan_results (
  id SERIAL PRIMARY KEY,
  scan_id TEXT NOT NULL UNIQUE,
  total_processed INTEGER NOT NULL DEFAULT 0,
  total_valid INTEGER NOT NULL DEFAULT 0,
  total_filled INTEGER NOT NULL DEFAULT 0,
  total_funded INTEGER NOT NULL DEFAULT 0,
  time_seconds FLOAT NOT NULL DEFAULT 0,
  rate FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  funded_wallets JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on scan_id
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);

-- Create index on completed_at
CREATE INDEX IF NOT EXISTS idx_scan_results_completed_at ON scan_results(completed_at);
