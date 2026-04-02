-- HITL Migration 002: Operating Hours, Effort Tiers, Payments, Queue Management, Demand Voting

-- ═══════════════════════════════════════════════
-- 1. EFFORT TIERS + PRICING
-- ═══════════════════════════════════════════════

CREATE TYPE hitl_effort_tier AS ENUM ('binary', 'choice', 'text');

-- Pricing per effort tier (in USDC, smallest unit = 0.01)
CREATE TABLE hitl_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effort_tier hitl_effort_tier NOT NULL UNIQUE,
  price_usdc NUMERIC(10, 4) NOT NULL,       -- e.g., 0.0500
  description TEXT,
  max_description_chars INTEGER,              -- char limit for request description
  max_response_chars INTEGER,                 -- char limit for free_text responses
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default pricing
INSERT INTO hitl_pricing (effort_tier, price_usdc, description, max_description_chars, max_response_chars) VALUES
  ('binary', 0.0500, 'Approve/reject or 1-5 rating. Fast yes/no decisions.', 500, NULL),
  ('choice', 0.1000, 'Choose from 2-6 options with optional reasoning.', 1000, 280),
  ('text',   0.2500, 'Free-text opinion, taste, or strategic input.', 2000, 1000);

-- Map request_type to effort_tier
-- approve_reject -> binary
-- rate           -> binary
-- choose_option  -> choice
-- rank           -> choice
-- free_text      -> text

-- Add pricing/payment columns to requests
ALTER TABLE hitl_requests ADD COLUMN effort_tier hitl_effort_tier;
ALTER TABLE hitl_requests ADD COLUMN price_usdc NUMERIC(10, 4);
ALTER TABLE hitl_requests ADD COLUMN payment_method TEXT; -- 'x402', 'api_key', 'free_tier'
ALTER TABLE hitl_requests ADD COLUMN payment_tx_hash TEXT; -- on-chain tx hash for x402
ALTER TABLE hitl_requests ADD COLUMN payment_verified BOOLEAN DEFAULT false;

-- Auto-set effort_tier from request_type
CREATE OR REPLACE FUNCTION set_effort_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.effort_tier IS NULL THEN
    NEW.effort_tier := CASE NEW.request_type
      WHEN 'approve_reject' THEN 'binary'::hitl_effort_tier
      WHEN 'rate' THEN 'binary'::hitl_effort_tier
      WHEN 'choose_option' THEN 'choice'::hitl_effort_tier
      WHEN 'rank' THEN 'choice'::hitl_effort_tier
      WHEN 'free_text' THEN 'text'::hitl_effort_tier
    END;
  END IF;
  -- Set price from pricing table
  IF NEW.price_usdc IS NULL THEN
    SELECT price_usdc INTO NEW.price_usdc
    FROM hitl_pricing WHERE effort_tier = NEW.effort_tier AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_effort_tier
  BEFORE INSERT ON hitl_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_effort_tier();


-- ═══════════════════════════════════════════════
-- 2. OPERATING HOURS + QUEUE MANAGEMENT
-- ═══════════════════════════════════════════════

CREATE TABLE hitl_operating_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operating hours (stored in operator's timezone)
  timezone TEXT NOT NULL DEFAULT 'America/Denver',
  
  -- Weekly schedule: JSON array of {day: 0-6, open: "HH:MM", close: "HH:MM", enabled: bool}
  -- 0=Sunday, 1=Monday, etc.
  weekly_schedule JSONB NOT NULL DEFAULT '[
    {"day": 0, "open": "09:00", "close": "17:00", "enabled": false},
    {"day": 1, "open": "07:00", "close": "19:00", "enabled": true},
    {"day": 2, "open": "07:00", "close": "19:00", "enabled": true},
    {"day": 3, "open": "07:00", "close": "19:00", "enabled": true},
    {"day": 4, "open": "07:00", "close": "19:00", "enabled": true},
    {"day": 5, "open": "07:00", "close": "19:00", "enabled": true},
    {"day": 6, "open": "09:00", "close": "15:00", "enabled": true}
  ]'::JSONB,
  
  -- Queue caps (per effort tier)
  max_pending_binary INTEGER DEFAULT 20,
  max_pending_choice INTEGER DEFAULT 10,
  max_pending_text INTEGER DEFAULT 5,
  
  -- Overall daily cap
  max_daily_requests INTEGER DEFAULT 50,
  
  -- Manual override
  force_open BOOLEAN DEFAULT false,   -- override schedule to OPEN
  force_closed BOOLEAN DEFAULT false, -- override schedule to CLOSED
  closed_message TEXT DEFAULT 'The human reviewer is currently offline. Please try again during operating hours.',
  
  -- Response time targets (seconds) per tier
  target_response_binary INTEGER DEFAULT 300,   -- 5 min
  target_response_choice INTEGER DEFAULT 600,   -- 10 min
  target_response_text INTEGER DEFAULT 900,     -- 15 min
  
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default config
INSERT INTO hitl_operating_config (id) VALUES (gen_random_uuid());


-- ═══════════════════════════════════════════════
-- 3. DEMAND VOTING / EXPERTISE SIGNALS
-- ═══════════════════════════════════════════════

-- Categories of expertise agents can vote for
CREATE TABLE hitl_expertise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  vote_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT false,  -- you've enabled this expertise
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial categories (some available, some not yet)
INSERT INTO hitl_expertise_categories (slug, name, description, is_available) VALUES
  ('product-taste', 'Product & design taste', 'UI/UX opinions, design direction, product strategy', true),
  ('content-voice', 'Content & brand voice', 'Tone, messaging, copywriting judgment', true),
  ('outdoor-rec', 'Outdoor recreation', 'Trail conditions, hunting, gear, Montana outdoors', true),
  ('technical-review', 'Technical code review', 'Architecture decisions, code quality, stack choices', false),
  ('data-strategy', 'Data & analytics strategy', 'What to measure, how to interpret, dashboard design', false),
  ('nutrition-fitness', 'Nutrition & fitness', 'Meal planning, workout programming, health optimization', false),
  ('parenting', 'Parenting decisions', 'Baby gear, schedules, pediatric choices', false),
  ('financial', 'Financial planning', 'Budgeting, investment allocation, purchase decisions', false),
  ('hiring', 'Hiring & team building', 'Resume screening, interview questions, culture fit', false),
  ('negotiation', 'Negotiation & deals', 'Pricing, contract terms, vendor selection', false);

-- Individual votes from agents
CREATE TABLE hitl_expertise_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES hitl_expertise_categories(id),
  agent_name TEXT NOT NULL,
  agent_description TEXT,  -- what the agent does / why it needs this
  use_case TEXT,           -- specific use case description
  willingness_to_pay NUMERIC(10, 4), -- how much they'd pay per request
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One vote per agent per category
  UNIQUE(category_id, agent_name)
);

-- Auto-increment vote count
CREATE OR REPLACE FUNCTION update_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hitl_expertise_categories SET vote_count = vote_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hitl_expertise_categories SET vote_count = vote_count - 1 WHERE id = OLD.category_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
  AFTER INSERT OR DELETE ON hitl_expertise_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_count();

-- Agents can also propose NEW categories
CREATE TABLE hitl_expertise_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  proposed_name TEXT NOT NULL,
  proposed_description TEXT,
  use_case TEXT,
  willingness_to_pay NUMERIC(10, 4),
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════
-- 4. UPDATED STATS VIEW
-- ═══════════════════════════════════════════════

DROP VIEW IF EXISTS hitl_stats;
CREATE VIEW hitl_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') AS last_24h_count,
  AVG(response_time_ms) FILTER (WHERE status = 'completed') AS avg_response_time_ms,
  COUNT(DISTINCT agent_name) AS unique_agents,
  SUM(price_usdc) FILTER (WHERE status = 'completed') AS total_revenue_usdc,
  SUM(price_usdc) FILTER (WHERE status = 'completed' AND created_at > now() - INTERVAL '24 hours') AS revenue_24h_usdc,
  COUNT(*) FILTER (WHERE status = 'pending' AND effort_tier = 'binary') AS pending_binary,
  COUNT(*) FILTER (WHERE status = 'pending' AND effort_tier = 'choice') AS pending_choice,
  COUNT(*) FILTER (WHERE status = 'pending' AND effort_tier = 'text') AS pending_text,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours' AND status != 'cancelled') AS daily_request_count
FROM hitl_requests;

-- Queue depth view (for capacity checks)
CREATE VIEW hitl_queue_depth AS
SELECT
  effort_tier,
  COUNT(*) AS pending_count
FROM hitl_requests
WHERE status = 'pending'
GROUP BY effort_tier;


-- ═══════════════════════════════════════════════
-- 5. INDEXES FOR NEW COLUMNS
-- ═══════════════════════════════════════════════

CREATE INDEX idx_hitl_requests_effort_tier ON hitl_requests(effort_tier);
CREATE INDEX idx_hitl_requests_payment ON hitl_requests(payment_method);
CREATE INDEX idx_hitl_expertise_votes_category ON hitl_expertise_votes(category_id);
CREATE INDEX idx_hitl_expertise_categories_slug ON hitl_expertise_categories(slug);

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE hitl_operating_config;
ALTER PUBLICATION supabase_realtime ADD TABLE hitl_expertise_categories;

-- RLS for new tables
ALTER TABLE hitl_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_operating_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_expertise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_expertise_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_expertise_proposals ENABLE ROW LEVEL SECURITY;

-- Service role access for all new tables
CREATE POLICY "Service role full access" ON hitl_pricing FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON hitl_operating_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON hitl_expertise_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON hitl_expertise_votes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON hitl_expertise_proposals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated user access
CREATE POLICY "Auth full access" ON hitl_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON hitl_operating_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON hitl_expertise_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON hitl_expertise_votes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access" ON hitl_expertise_proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
