-- watch-for-first-call.sql
-- Run via Supabase SQL editor in project wymeocgffkrtveozdhec
-- The first row returned with an agent_name NOT in the internal-testing list
-- is the win condition: a real external agent called ask_human.

-- Internal-testing agent names we created during development.
-- Update this list if you make additional test calls under new names.
WITH internal_agents AS (
  SELECT unnest(ARRAY[
    'test-agent',
    'safe-agent',
    'curl-test',
    'my-agent',
    'content-writer',
    'content-writer-agent',
    'design-agent',
    'research-agent',
    'safe-autonomous-agent',
    'vanilla-agent',
    'librechat',
    'trail-scout'
  ]) AS name
)
SELECT
  id,
  agent_name,
  title,
  LEFT(content, 80) AS content_preview,
  status,
  created_at,
  responded_at,
  selected_option,
  request_ip
FROM hitl_requests
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND agent_name NOT IN (SELECT name FROM internal_agents)
ORDER BY created_at DESC
LIMIT 20;
