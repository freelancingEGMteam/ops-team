CREATE TABLE IF NOT EXISTS mention_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS mention_notifications_user_created_idx
  ON mention_notifications(user_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS mention_notifications_unique_idx
  ON mention_notifications(user_id, comment_id);
