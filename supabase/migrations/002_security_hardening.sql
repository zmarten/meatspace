ALTER TABLE hitl_requests
  ADD COLUMN review_token_hash TEXT;

CREATE INDEX idx_hitl_requests_review_token_hash
  ON hitl_requests(review_token_hash);

UPDATE hitl_requests
SET status = 'expired',
    updated_at = now()
WHERE status = 'pending';
