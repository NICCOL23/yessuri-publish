# Integration and deployment

- Independent source regression: 7 checks PASS (original 57 samples and 19 fields unchanged; 3 new samples; generated sources agree).
- Local browser fixtures PASS: desktop 20 equal cards in 10x2; three locksmith search results; guide; registration and administrator 20-field picker, selection/reopen/custom preservation; mobile overflow; no page errors.
- Isolated PostgreSQL migration: 7 checks PASS.
- Existing public-profile UI/API, registration field validation, board validation PASS.
- Production Supabase migration 202611020001 applied alone using isolated staging populated from remote migration history. No old migrations replayed.
- board-api deployed with generated 20-field taxonomy. No technician API source or operating rows changed.
- Real phone/PWA device testing and new production application submission were not performed.
- Rollback: revert this frontend commit and redeploy previous board-api if needed; keep expanded DB constraint to preserve any new locksmith records. Never delete operating records to roll back.
