-- Multi-key API authentication
-- Allow multiple API keys so different users/agents can submit review requests.

-- Extend api_keys table with owner info and usage tracking
ALTER TABLE hitl_api_keys
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Link requests to the key that created them (nullable for legacy requests)
ALTER TABLE hitl_requests
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES hitl_api_keys(id);

CREATE INDEX IF NOT EXISTS idx_hitl_requests_api_key_id
  ON hitl_requests(api_key_id);
