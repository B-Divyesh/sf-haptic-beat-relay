CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY NOT NULL,
    host_token TEXT NOT NULL,
    companion_token TEXT,
    expires_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rooms_expires_at_idx ON rooms (expires_at_ms);

CREATE TABLE IF NOT EXISTS rate_limits (
    client TEXT PRIMARY KEY NOT NULL,
    window_started_ms INTEGER NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count >= 0)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_started_ms);
