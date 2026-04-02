-- HITL: Human-in-the-Loop Service
-- Supabase Migration: Core Tables

-- Request types
CREATE TYPE hitl_request_type AS ENUM ('approve_reject', 'choose_option', 'free_text', 'rate', 'rank');
CREATE TYPE hitl_request_status AS ENUM ('pending', 'in_review', 'completed', 'expired', 'cancelled');
CREATE TYPE hitl_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE hitl_callback_method AS ENUM ('webhook', 'poll');

-- API Keys table (for agent authentication)
CREATE TABLE hitl_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- first 8 chars for display
  agent_name TEXT, -- friendly name of the agent
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Core requests table
CREATE TABLE hitl_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent context
  api_key_id UUID REFERENCES hitl_api_keys(id),
  agent_name TEXT NOT NULL,
  agent_context TEXT, -- what the agent is doing / why it needs help
  
  -- Request definition
  request_type hitl_request_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT, -- detailed description / context
  payload JSONB DEFAULT '{}', -- flexible structured data
  
  -- For 'choose_option' / 'rank' types
  options JSONB DEFAULT '[]', -- array of {id, label, description}
  
  -- Metadata
  priority hitl_priority DEFAULT 'normal',
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Callback config
  callback_method hitl_callback_method DEFAULT 'poll',
  callback_url TEXT, -- webhook URL for async callback
  
  -- Timing
  timeout_seconds INTEGER DEFAULT 3600, -- 1 hour default
  expires_at TIMESTAMPTZ,
  
  -- Status
  status hitl_request_status DEFAULT 'pending',
  
  -- Human response
  response JSONB, -- flexible: {decision, text, selected_option, rating, ranking, reasoning}
  responded_at TIMESTAMPTZ,
  response_time_ms INTEGER, -- time from creation to response
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Set expires_at automatically if timeout_seconds is set
CREATE OR REPLACE FUNCTION set_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL AND NEW.timeout_seconds IS NOT NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.timeout_seconds || ' seconds')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_expires_at
  BEFORE INSERT ON hitl_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_expires_at();

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
  WHERE status IN ('pending', 'in_review')
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_hitl_requests_status ON hitl_requests(status);
CREATE INDEX idx_hitl_requests_priority ON hitl_requests(priority);
CREATE INDEX idx_hitl_requests_created_at ON hitl_requests(created_at DESC);
CREATE INDEX idx_hitl_requests_api_key ON hitl_requests(api_key_id);
CREATE INDEX idx_hitl_requests_expires ON hitl_requests(expires_at) WHERE status IN ('pending', 'in_review');
CREATE INDEX idx_hitl_requests_tags ON hitl_requests USING GIN(tags);

-- Enable realtime for the requests table
ALTER PUBLICATION supabase_realtime ADD TABLE hitl_requests;

-- RLS (we'll use service role key for API, anon for dashboard with auth)
ALTER TABLE hitl_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_api_keys ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can do everything (you're the only user)
CREATE POLICY "Authenticated users full access on requests"
  ON hitl_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access on api_keys"
  ON hitl_api_keys FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role bypass (for API routes)
CREATE POLICY "Service role full access on requests"
  ON hitl_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on api_keys"
  ON hitl_api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Analytics view
CREATE VIEW hitl_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS last_24h_count,
  AVG(response_time_ms) FILTER (WHERE status = 'completed') AS avg_response_time_ms,
  COUNT(DISTINCT agent_name) AS unique_agents
FROM hitl_requests;
