-- The WebSocket channel is intentionally process-local, but a reconnect must
-- not lose the round that the relay already accepted. Keep only the current,
-- short-lived round snapshot with its parent room on durable SQLite. Beat
-- frames remain transient because they are not needed to resume a score.
CREATE TABLE IF NOT EXISTS relay_round_state (
    code TEXT PRIMARY KEY NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 0),
    is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
    bpm INTEGER,
    duration_seconds INTEGER,
    score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    tap_count INTEGER NOT NULL DEFAULT 0 CHECK (tap_count >= 0),
    score_acknowledged INTEGER NOT NULL DEFAULT 0 CHECK (score_acknowledged IN (0, 1)),
    updated_at_ms INTEGER NOT NULL
);
