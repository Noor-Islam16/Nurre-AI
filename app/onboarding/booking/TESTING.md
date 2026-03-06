# Booking Flow Manual Validation

## Preparation
- Ensure `HASH_PEPPER` is set and Phase 1 database migrations applied.
- Seed at least one coach (use Phase 0 SQL script if needed).
- Sign in with a standard user account.

## Steps
1. Visit `/onboarding/booking`.
2. Select 2 professionals from the picker.
3. Click `Generate claim code`.
   - Expect toast/card showing generated code and expiry.
   - `events` table should contain `booking_started` with `{ professionalsRequested: 2 }`.
4. Book the first professional in the Calendly embed.
   - Expect `/api/coaching/booked` to mark `has_booked_coaching` true.
   - `events` table should contain `booking_returned`.
5. Book the second professional (navigate using the chip buttons) and confirm success.
   - After final booking, you should land on `/onboarding/success?code=...`.
   - Claim code should match the calendar invite description.
6. From dashboard, surface the booking reminder card (requires wiring `has_booked_coaching`).

## Verification Queries
```sql
select created_at, type, data
from events
where user_id = '<USER_ID>'
  and type in ('booking_started', 'booking_returned')
order by created_at desc;
```

Confirm `claim_codes` entry has `allowed_uses = 2`, `uses_count` increments with each redemption attempt.
