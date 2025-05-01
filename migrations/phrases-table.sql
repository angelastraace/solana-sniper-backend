-- Create phrases table
CREATE TABLE IF NOT EXISTS phrases (
  id BIGSERIAL PRIMARY KEY,
  phrase TEXT NOT NULL,
  wordlist TEXT NOT NULL,
  scanned BOOLEAN DEFAULT false,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scanned_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_phrases_wordlist ON phrases(wordlist);
CREATE INDEX IF NOT EXISTS idx_phrases_scanned ON phrases(scanned);
CREATE INDEX IF NOT EXISTS idx_phrases_created_at ON phrases(created_at);
CREATE INDEX IF NOT EXISTS idx_phrases_last_scanned_at ON phrases(last_scanned_at);

-- Create a function to increment a value
CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN x + 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON phrases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for wordlist statistics
CREATE OR REPLACE VIEW wordlist_stats AS
SELECT 
  wordlist,
  COUNT(*) as total_phrases,
  SUM(CASE WHEN scanned THEN 1 ELSE 0 END) as scanned_phrases,
  AVG(scan_count) as avg_scan_count,
  MAX(last_scanned_at) as last_scanned_at
FROM phrases
GROUP BY wordlist;

-- Create a function to get phrases for scanning
CREATE OR REPLACE FUNCTION get_phrases_for_scanning(
  p_limit INTEGER DEFAULT 1000,
  p_wordlist TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  phrase TEXT,
  wordlist TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.phrase, p.wordlist
  FROM phrases p
  WHERE p.scanned = false
    AND (p_wordlist IS NULL OR p.wordlist = p_wordlist)
  ORDER BY p.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a function to mark phrases as scanned
CREATE OR REPLACE FUNCTION mark_phrases_as_scanned(
  p_ids BIGINT[]
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE phrases
  SET 
    scanned = true,
    scan_count = scan_count + 1,
    last_scanned_at = NOW()
  WHERE id = ANY(p_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
