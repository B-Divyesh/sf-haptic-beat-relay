-- These short-lived tables stay small enough to scan. Azure Files can confirm
-- a table row before its redundant secondary-index page is durable during an
-- abrupt replica restart. The next expiry scan then fails with
-- SQLITE_CORRUPT_INDEX even though the room row itself is intact. Keep the
-- primary-key indexes, but remove the two optional expiry indexes so each
-- accepted write has one durable representation.
DROP INDEX IF EXISTS rooms_expires_at_idx;
DROP INDEX IF EXISTS rate_limits_window_idx;
