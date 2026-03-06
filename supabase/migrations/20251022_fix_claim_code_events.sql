-- Migration: 20251022_fix_claim_code_events.sql
-- Purpose: Fix claim code event logging per M5 Phase 5 requirements
-- Changes:
--   1. Add 'claim_code_limit_reached' event when user hits 3-coach limit
--   2. Fix 'claim_code_redeemed' event data format: { coachId, userId } (camelCase)
-- Status: COMPLETED
-- Date: 2025-10-22

CREATE OR REPLACE FUNCTION redeem_claim_code(p_coach_id uuid, p_code_hash text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_uses int;
  v_allowed int;
  v_newlink int := 0;
BEGIN
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
    -- Log event before throwing error (M5 Phase 5 requirement)
    INSERT INTO events (user_id, type, data)
    VALUES (v_user_id, 'claim_code_limit_reached', jsonb_build_object('coachId', p_coach_id, 'userId', v_user_id))
    ON CONFLICT DO NOTHING;

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

  -- Log successful redemption with proper format (M5 Phase 5 requirement: camelCase, include both IDs)
  INSERT INTO events (user_id, type, data)
  VALUES (v_user_id, 'claim_code_redeemed', jsonb_build_object('coachId', p_coach_id, 'userId', v_user_id))
  ON CONFLICT DO NOTHING;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant remains the same
GRANT EXECUTE ON FUNCTION redeem_claim_code(uuid, text) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration ok: redeem_claim_code updated with proper event logging.';
END $$;
