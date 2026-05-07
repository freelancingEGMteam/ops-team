-- Migration: 0007_time_tracker_members
-- Description: Share list for the organization Time Tracker view

CREATE TABLE IF NOT EXISTS time_tracker_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS time_tracker_members_user_idx
  ON time_tracker_members(user_id);
