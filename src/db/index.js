import initSqlJs from 'sql.js';

let db = null;
let SQL = null;

export async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  // Try to load from localStorage
  const savedDb = localStorage.getItem('crm_db');

  if (savedDb) {
    const buffer = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    // Initialize schema
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS agencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS creators (
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
      )`,
      `CREATE TABLE IF NOT EXISTS daily_earnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        date DATE NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
        UNIQUE(creator_id, date)
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
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
      )`,
      `CREATE TABLE IF NOT EXISTS brain_dump (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_creators_agency_id ON creators(agency_id)`,
      `CREATE INDEX IF NOT EXISTS idx_creators_is_active ON creators(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_daily_earnings_creator_id ON daily_earnings(creator_id)`,
      `CREATE INDEX IF NOT EXISTS idx_daily_earnings_date ON daily_earnings(date)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_is_bookmarked ON tasks(is_bookmarked)`,
      `CREATE INDEX IF NOT EXISTS idx_brain_dump_creator_id ON brain_dump(creator_id)`,
    ];

    schemaStatements.forEach(stmt => {
      try {
        db.run(stmt);
      } catch (e) {
        console.log('Schema statement already exists:', e.message);
      }
    });

    saveDB();
  }

  return db;
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Array.from(data);
  localStorage.setItem('crm_db', JSON.stringify(buffer));
}

export function getDB() {
  return db;
}

// Query helpers
export function queryAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function execute(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDB();
}

export function getLastInsertRowId() {
  const result = queryOne('SELECT last_insert_rowid() as id');
  return result?.id || null;
}

// Specific queries
export function getAllAgencies() {
  return queryAll('SELECT * FROM agencies ORDER BY name');
}

export function getAgency(id) {
  return queryOne('SELECT * FROM agencies WHERE id = ?', [id]);
}

export function createAgency(name, notes = '') {
  execute('INSERT INTO agencies (name, notes) VALUES (?, ?)', [name, notes]);
  return getLastInsertRowId();
}

export function updateAgency(id, name, notes) {
  execute(
    'UPDATE agencies SET name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, notes, id]
  );
}

export function deleteAgency(id) {
  execute('DELETE FROM agencies WHERE id = ?', [id]);
}

export function getCreatorsByAgency(agencyId, includeInactive = false) {
  const query = includeInactive
    ? 'SELECT * FROM creators WHERE agency_id = ? ORDER BY stage_name'
    : 'SELECT * FROM creators WHERE agency_id = ? AND is_active = 1 ORDER BY stage_name';
  return queryAll(query, [agencyId]);
}

export function getCreator(id) {
  return queryOne('SELECT * FROM creators WHERE id = ?', [id]);
}

export function createCreator(agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '') {
  execute(
    'INSERT INTO creators (agency_id, stage_name, daily_goal, weekly_goal, monthly_goal, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [agencyId, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes]
  );
  return getLastInsertRowId();
}

export function updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive) {
  execute(
    'UPDATE creators SET stage_name = ?, daily_goal = ?, weekly_goal = ?, monthly_goal = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive ? 1 : 0, id]
  );
}

export function getEarningsForCreator(creatorId, date) {
  return queryOne('SELECT * FROM daily_earnings WHERE creator_id = ? AND date = ?', [creatorId, date]);
}

export function getEarningsForCreatorMonth(creatorId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  return queryAll(
    'SELECT * FROM daily_earnings WHERE creator_id = ? AND date BETWEEN ? AND ? ORDER BY date',
    [creatorId, startDate, endDate]
  );
}

export function addDailyEarning(creatorId, date, amount) {
  execute(
    'INSERT OR REPLACE INTO daily_earnings (creator_id, date, amount) VALUES (?, ?, ?)',
    [creatorId, date, amount]
  );
}

export function getBookmarkedTasks() {
  return queryAll(
    'SELECT t.*, c.stage_name FROM tasks t LEFT JOIN creators c ON t.creator_id = c.id WHERE t.is_bookmarked = 1 ORDER BY t.due_date ASC'
  );
}

export function getAllTasks() {
  return queryAll(
    'SELECT t.*, c.stage_name FROM tasks t LEFT JOIN creators c ON t.creator_id = c.id ORDER BY t.due_date ASC'
  );
}

export function getTasksForCreator(creatorId) {
  return queryAll(
    'SELECT * FROM tasks WHERE creator_id = ? ORDER BY due_date ASC',
    [creatorId]
  );
}

export function createTask(creatorId, title, description = '', dueDate = null, status = 'upcoming') {
  execute(
    'INSERT INTO tasks (creator_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
    [creatorId, title, description, dueDate, status]
  );
  return getLastInsertRowId();
}

export function updateTask(id, title, description, dueDate, status, isBookmarked) {
  execute(
    'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ?, is_bookmarked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, description, dueDate, status, isBookmarked ? 1 : 0, id]
  );
}

export function toggleBookmarkedTask(id, isBookmarked) {
  execute('UPDATE tasks SET is_bookmarked = ? WHERE id = ?', [isBookmarked ? 1 : 0, id]);
}

export function deleteTask(id) {
  execute('DELETE FROM tasks WHERE id = ?', [id]);
}

export function getBrainDumpForCreator(creatorId) {
  return queryAll('SELECT * FROM brain_dump WHERE creator_id = ? ORDER BY created_at DESC', [creatorId]);
}

export function addBrainDumpNote(creatorId, content) {
  execute('INSERT INTO brain_dump (creator_id, content) VALUES (?, ?)', [creatorId, content]);
  return getLastInsertRowId();
}

export function updateBrainDumpNote(id, content) {
  execute('UPDATE brain_dump SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, id]);
}

export function deleteBrainDumpNote(id) {
  execute('DELETE FROM brain_dump WHERE id = ?', [id]);
}

export function getGeneralBrainDump() {
  return queryAll('SELECT * FROM brain_dump WHERE creator_id IS NULL ORDER BY created_at DESC');
}

export function addGeneralNote(content) {
  execute('INSERT INTO brain_dump (content) VALUES (?)', [content]);
  return getLastInsertRowId();
}
