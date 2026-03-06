-- Migration: 20250120_update_redeem_claim_code_check_coach.sql
-- Purpose: Harden redeem_claim_code to require the caller to be the coach (auth.uid())
--          and ensure the coach exists in `coaches`.
-- Status: COMPLETED
-- Executed: 2025-01-20

CREATE OR REPLACE FUNCTION redeem_claim_code(p_coach_id uuid, p_code_hash text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_uses int;
  v_allowed int;
  v_newlink int := 0;
BEGIN
  -- Require that the caller is the coach and exists in coaches
  IF p_coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = p_coach_id) THEN
    RAISE EXCEPTION 'not_a_coach';
  END IF;

  -- Validate active code: not invalidated, not expired, not consumed
  SELECT user_id, uses_count, allowed_uses
  INTO v_user_id, v_uses, v_allowed
  FROM claim_codes
  WHERE code_hash = p_code_hash
    AND invalidated_at IS NULL
    AND consumed_at IS NULL
    AND expires_at > TIMEZONE('utc', NOW())
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired code';
  END IF;

  -- Lock the code row to ensure consistent multi-use increments under concurrency
  PERFORM 1 FROM claim_codes WHERE code_hash = p_code_hash FOR UPDATE;

  -- Re-check limits under lock
  SELECT uses_count, allowed_uses INTO v_uses, v_allowed
  FROM claim_codes WHERE code_hash = p_code_hash;

  IF v_uses >= v_allowed THEN
    RAISE EXCEPTION 'invalid or expired code'; -- already consumed
  END IF;

  -- Enforce per-user max of 3 linked coaches
  IF (
    SELECT COUNT(DISTINCT coach_id) FROM coach_clients WHERE user_id = v_user_id
  ) >= 3 THEN
    RAISE EXCEPTION 'coach_limit_reached';
  END IF;

  -- Link coach to user (idempotent)
  INSERT INTO coach_clients (coach_id, user_id)
  VALUES (p_coach_id, v_user_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_newlink = ROW_COUNT; -- 1 if inserted, 0 if already linked

  -- Update claim code counters
  UPDATE claim_codes
     SET used_at = COALESCE(used_at, TIMEZONE('utc', NOW())),
         used_by_coach_id = COALESCE(used_by_coach_id, p_coach_id),
         uses_count = uses_count + v_newlink,
         consumed_at = CASE WHEN uses_count + v_newlink >= allowed_uses THEN TIMEZONE('utc', NOW()) ELSE consumed_at END
   WHERE code_hash = p_code_hash;

  -- Log
  INSERT INTO events (user_id, type, data)
  VALUES (v_user_id, 'claim_code_redeemed', jsonb_build_object('coach_id', p_coach_id))
  ON CONFLICT DO NOTHING;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION redeem_claim_code(uuid, text) TO authenticated;

DO $$
BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'redeem_claim_code';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration failed: redeem_claim_code not created';
  END IF;
  RAISE NOTICE 'Migration ok: redeem_claim_code updated with coach checks.';
END $$;

