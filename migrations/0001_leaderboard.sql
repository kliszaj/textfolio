-- The typing test's leaderboard (worker/api.ts).

-- Each test handed out: its words are rebuilt from the seed when a run comes
-- back, and a test can only be scored once.
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  seed INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  -- A daily-salted hash of the visitor's IP, for rate limits only.
  ip_hash TEXT NOT NULL
);
CREATE INDEX tests_ip ON tests (ip_hash, created_at);
CREATE INDEX tests_created ON tests (created_at);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  wpm INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  raw INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL
);
CREATE INDEX scores_board ON scores (duration, wpm DESC, accuracy DESC, created_at);
CREATE INDEX scores_ip ON scores (ip_hash, created_at);
