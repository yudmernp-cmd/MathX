CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, origin TEXT NOT NULL CHECK(origin IN ('real','original')),
  paper INTEGER NOT NULL CHECK(paper IN (1,2)), theme TEXT NOT NULL, topic TEXT NOT NULL,
  level TEXT NOT NULL, marks INTEGER NOT NULL CHECK(marks>0),
  similarity TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL,
  UNIQUE(paper,fingerprint)
);
CREATE INDEX IF NOT EXISTS filter_items ON items(paper,origin,theme,topic,level);
CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, data BLOB NOT NULL);
