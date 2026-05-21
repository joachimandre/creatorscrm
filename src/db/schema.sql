-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creators table
CREATE TABLE IF NOT EXISTS creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_name TEXT NOT NULL,
  agency_id INTEGER NOT NULL,
  daily_goal REAL DEFAULT 0,
  weekly_goal REAL DEFAULT 0,
  monthly_goal REAL DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE,
  UNIQUE(stage_name, agency_id)
);

-- Daily Earnings table
CREATE TABLE IF NOT EXISTS daily_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  date DATE NOT NULL,
  amount REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  UNIQUE(creator_id, date)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'in_progress', 'review')),
  is_bookmarked BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Brain Dump (Personal notes) table
CREATE TABLE IF NOT EXISTS brain_dump (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_creators_agency_id ON creators(agency_id);
CREATE INDEX IF NOT EXISTS idx_creators_is_active ON creators(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_creator_id ON daily_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_date ON daily_earnings(date);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_bookmarked ON tasks(is_bookmarked);
CREATE INDEX IF NOT EXISTS idx_brain_dump_creator_id ON brain_dump(creator_id);
