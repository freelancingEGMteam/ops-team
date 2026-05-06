-- Migration: 0006_time_entries
-- Description: Shared time tracker entries for the organization

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  start_date INTEGER,
  task TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  channel TEXT CHECK(channel IN ('BIV', 'EGM')),
  delivery_date INTEGER,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Done')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS time_entries_start_date_idx ON time_entries(start_date);
CREATE INDEX IF NOT EXISTS time_entries_user_idx ON time_entries(user_id);
