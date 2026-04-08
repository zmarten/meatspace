-- MeatSpace: Flesh-in-the-Loop Service
-- Supabase Migration: MVP Schema

CREATE TYPE hitl_request_status AS ENUM ('pending', 'completed', 'expired');
CREATE TYPE hitl_content_type AS ENUM ('text', 'markdown', 'html', 'image');

-- API Keys (for agent Bearer token auth)
CREATE TABLE hitl_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Core requests table
CREATE TABLE hitl_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent info
  agent_name TEXT NOT NULL,
  title TEXT NOT NULL,

  -- Content for human review
  content TEXT,
  content_type hitl_content_type DEFAULT 'text',

  -- 2-4 choices as JSONB array of {id, label}
  choices JSONB NOT NULL DEFAULT '[]',

  -- Webhook callback
  callback_url TEXT,

  -- Arbitrary metadata passed through to webhook
  metadata JSONB DEFAULT '{}',

  -- Status
  status hitl_request_status DEFAULT 'pending',

  -- Human response
  selected TEXT,
  responded_at TIMESTAMPTZ,

  -- Timing
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON hitl_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-expire old requests
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void AS $$
BEGIN
  UPDATE hitl_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_hitl_requests_status ON hitl_requests(status);
CREATE INDEX idx_hitl_requests_created_at ON hitl_requests(created_at DESC);
CREATE INDEX idx_hitl_requests_expires ON hitl_requests(expires_at) WHERE status = 'pending';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hitl_requests;

-- RLS
ALTER TABLE hitl_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on requests"
  ON hitl_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on api_keys"
  ON hitl_api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);
