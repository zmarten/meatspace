-- Enable pg_cron extension (requires Supabase dashboard to enable first)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Run expire_old_requests() every minute to clean up expired HITL requests
SELECT cron.schedule(
  'expire-hitl-requests',
  '* * * * *',
  'SELECT expire_old_requests()'
);
