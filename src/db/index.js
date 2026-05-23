// Cloud-synced database — primary store is Supabase, localStorage is the offline cache
import { supabase } from '../lib/supabase.js';

let db = null;

// Push the current in-memory db to Supabase (called on initDB migration + every write)
async function syncToSupabase() {
  if (!db) return;
  try {
    const { error } = await supabase
      .from('crm_data')
      .upsert({ id: 1, data: db, updated_at: new Date().toISOString() });
    if (error) console.warn('[Supabase] sync error:', error.message);
  } catch (e) {
    console.warn('[Supabase] offline — data saved locally only');
  }
}

export async function initDB() {
  if (db) return db;

  // ── Try Supabase first ────────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('crm_data')
      .select('data')
      .eq('id', 1)
      .single();

    if (!error && data && data.data && Object.keys(data.data).length > 0) {
      // Supabase has data — use it (always the authoritative source)
      db = data.data;
      localStorage.setItem('crm_db', JSON.stringify(db)); // warm the local cache
      runMigrations();
      return db;
    }
  } catch (e) {
    console.warn('[Supabase] unreachable — falling back to localStorage');
  }

  // ── Fall back to localStorage (offline or first-ever launch) ─────────────
  const savedDb = localStorage.getItem('crm_db');

  if (savedDb) {
    db = JSON.parse(savedDb);
  } else {
    db = {
      agencies: [], creators: [], daily_earnings: [], tasks: [],
      brain_dump: [], chatters: [], payroll_records: [], teams: [],
      team_members: [], team_chatters: [], team_schedules: [],
      team_day_notes: [], creator_subscribers: [],
      _nextIds: {
        agencies: 1, creators: 1, daily_earnings: 1, tasks: 1,
        brain_dump: 1, chatters: 1, payroll_records: 1,
        team: 1, team_member: 1, team_chatter: 1,
        team_schedule: 1, team_day_note: 1, creator_subscribers: 1,
      }
    };
  }

  runMigrations();
  saveDB(); // writes localStorage + kicks off Supabase upload (first-time migration)
  return db;
}

// ── All schema migrations in one place ───────────────────────────────────────
function runMigrations() {
  if (!db.chatters) { db.chatters = []; db._nextIds.chatters = 1; }
  db.creators.forEach(c => { if (c.commission_rate === undefined) c.commission_rate = 0; });
  db.chatters.forEach(c => {
    if (c.commission_rate === undefined) c.commission_rate = 0;
    if (c.hourly_rate    === undefined) c.hourly_rate     = 0;
    if (c.drive_url      === undefined) c.drive_url       = '';
  });
  if (!db.payroll_records) { db.payroll_records = []; db._nextIds.payroll_records = 1; }
  db.payroll_records.forEach(r => {
    if (!r.period_start) {
      const lastDay = new Date(r.period_year, r.period_month, 0).getDate();
      r.period_start = `${r.period_year}-${String(r.period_month).padStart(2, '0')}-01`;
      r.period_end   = `${r.period_year}-${String(r.period_month).padStart(2, '0')}-${lastDay}`;
    }
  });
  db.tasks.forEach(t => {
    if (t.agency_id === undefined) {
      const creator = db.creators.find(c => c.id === t.creator_id);
      t.agency_id = creator ? creator.agency_id : null;
    }
    if (t.priority === undefined) t.priority = 'none';
  });
  if (!db.teams)          { db.teams          = []; }
  if (!db.team_members)   { db.team_members   = []; }
  if (!db.team_chatters)  { db.team_chatters  = []; }
  if (!db.team_schedules) { db.team_schedules = []; }
  if (!db.team_day_notes) { db.team_day_notes = []; }
  if (!db._nextIds.team)          db._nextIds.team          = 1;
  if (!db._nextIds.team_member)   db._nextIds.team_member   = 1;
  if (!db._nextIds.team_chatter)  db._nextIds.team_chatter  = 1;
  if (!db._nextIds.team_schedule) db._nextIds.team_schedule = 1;
  if (!db._nextIds.team_day_note) db._nextIds.team_day_note = 1;
  db.creators.forEach(c => { if (c.drive_url === undefined) c.drive_url = ''; });
  if (!db.creator_subscribers) { db.creator_subscribers = []; db._nextIds.creator_subscribers = 1; }
  // creator notes
  if (!db.creator_notes) { db.creator_notes = []; db._nextIds.creator_notes = 1; }
  // recurring tasks
  db.tasks.forEach(t => { if (t.recurring_days === undefined) t.recurring_days = null; });
  // platform tagging on earnings
  db.daily_earnings.forEach(e => { if (e.platform === undefined) e.platform = 'onlyfans'; });
  // campaign / promo tracker
  if (!db.creator_campaigns) { db.creator_campaigns = []; db._nextIds.creator_campaigns = 1; }
  // hours worked per schedule entry
  db.team_schedules.forEach(s => { if (s.hours_worked === undefined) s.hours_worked = null; });
}

export function saveDB() {
  if (!db) return;
  localStorage.setItem('crm_db', JSON.stringify(db)); // instant local save
  syncToSupabase();                                    // background cloud sync
}

export function getDB() {
  return db;
}

function getNextId(table) {
  return db._nextIds[table]++;
}

function now() {
  return new Date().toISOString();
}

// Agencies
export function getAllAgencies() {
  return db.agencies.sort((a, b) => a.name.localeCompare(b.name));
}

export function getAgency(id) {
  return db.agencies.find(a => a.id === id);
}

export function createAgency(name, notes = '') {
  const id = getNextId('agencies');
  const agency = {
    id,
    name,
    notes,
    created_at: now(),
    updated_at: now(),
  };
  db.agencies.push(agency);
  saveDB();
  return id;
}

export function updateAgency(id, name, notes) {
  const agency = db.agencies.find(a => a.id === id);
  if (agency) {
    agency.name = name;
    agency.notes = notes;
    agency.updated_at = now();
    saveDB();
  }
}

export function deleteAgency(id) {
  db.agencies = db.agencies.filter(a => a.id !== id);
  db.creators = db.creators.filter(c => c.agency_id !== id);
  saveDB();
}

// Creators
export function getCreatorsByAgency(agencyId, includeInactive = false) {
  const creators = db.creators.filter(c => c.agency_id === agencyId);
  return includeInactive
    ? creators.sort((a, b) => a.stage_name.localeCompare(b.stage_name))
    : creators.filter(c => c.is_active).sort((a, b) => a.stage_name.localeCompare(b.stage_name));
}

export function getCreator(id) {
  return db.creators.find(c => c.id === id);
}

export function createCreator(agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '', commissionRate = 0, driveUrl = '') {
  const id = getNextId('creators');
  const creator = {
    id,
    agency_id: agencyId,
    stage_name: stageName,
    daily_goal: dailyGoal,
    weekly_goal: weeklyGoal,
    monthly_goal: monthlyGoal,
    is_active: 1,
    notes,
    commission_rate: commissionRate,
    drive_url: driveUrl,
    created_at: now(),
    updated_at: now(),
  };
  db.creators.push(creator);
  saveDB();
  return id;
}

export function updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate, driveUrl) {
  const creator = db.creators.find(c => c.id === id);
  if (creator) {
    creator.stage_name = stageName;
    creator.daily_goal = dailyGoal;
    creator.weekly_goal = weeklyGoal;
    creator.monthly_goal = monthlyGoal;
    creator.notes = notes;
    creator.is_active = isActive ? 1 : 0;
    if (commissionRate !== undefined) creator.commission_rate = commissionRate;
    if (driveUrl !== undefined) creator.drive_url = driveUrl;
    creator.updated_at = now();
    saveDB();
  }
}

export function deleteCreator(id) {
  db.creators = db.creators.filter(c => c.id !== id);
  db.daily_earnings = db.daily_earnings.filter(e => e.creator_id !== id);
  db.tasks = db.tasks.filter(t => t.creator_id !== id);
  saveDB();
}

// Daily Earnings
export function getEarningsForCreator(creatorId, date) {
  return db.daily_earnings.find(e => e.creator_id === creatorId && e.date === date);
}

export function getEarningsForCreatorMonth(creatorId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  return db.daily_earnings
    .filter(e => e.creator_id === creatorId && e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function deleteDailyEarning(creatorId, date) {
  db.daily_earnings = db.daily_earnings.filter(e => !(e.creator_id === creatorId && e.date === date));
  saveDB();
}

export function addDailyEarning(creatorId, date, amount, platform = 'onlyfans') {
  const existing = db.daily_earnings.find(e => e.creator_id === creatorId && e.date === date);
  if (existing) {
    existing.amount = amount;
    existing.platform = platform || existing.platform || 'onlyfans';
    existing.updated_at = now();
  } else {
    db.daily_earnings.push({
      id: getNextId('daily_earnings'),
      creator_id: creatorId,
      date,
      amount,
      platform: platform || 'onlyfans',
      created_at: now(),
      updated_at: now(),
    });
  }
  saveDB();
}

export function getPlatformBreakdown(creatorId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;
  const entries = db.daily_earnings.filter(e => e.creator_id === creatorId && e.date >= startDate && e.date <= endDate);
  const breakdown = {};
  entries.forEach(e => {
    const p = e.platform || 'onlyfans';
    breakdown[p] = (breakdown[p] || 0) + e.amount;
  });
  return breakdown;
}

// Tasks
export function getBookmarkedTasks() {
  return db.tasks
    .filter(t => t.is_bookmarked)
    .map(t => ({
      ...t,
      stage_name: db.creators.find(c => c.id === t.creator_id)?.stage_name || 'General'
    }))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
}

export function getAllTasks() {
  return db.tasks
    .map(t => ({
      ...t,
      stage_name: db.creators.find(c => c.id === t.creator_id)?.stage_name || 'General'
    }))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
}

export function getTasksForCreator(creatorId) {
  return db.tasks
    .filter(t => t.creator_id === creatorId)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
}

export function createTask(creatorId, title, description = '', dueDate = null, status = 'upcoming', link = '') {
  const id = getNextId('tasks');
  const creator = creatorId ? db.creators.find(c => c.id === creatorId) : null;
  const task = {
    id,
    creator_id: creatorId,
    agency_id: creator ? creator.agency_id : null,
    title,
    description,
    due_date: dueDate,
    status,
    priority: 'none',
    is_bookmarked: 0,
    link,
    is_completed: 0,
    created_at: now(),
    updated_at: now(),
  };
  db.tasks.push(task);
  saveDB();
  return id;
}

export function createAgencyTask(agencyId, creatorId, title, description = '', dueDate = null, priority = 'none', link = '') {
  const id = getNextId('tasks');
  const task = {
    id,
    creator_id: creatorId || null,
    agency_id: agencyId,
    title,
    description,
    due_date: dueDate,
    status: 'upcoming',
    priority,
    is_bookmarked: 0,
    link,
    is_completed: 0,
    created_at: now(),
    updated_at: now(),
  };
  db.tasks.push(task);
  saveDB();
  return task;
}

export function updateAgencyTask(id, updates) {
  const task = db.tasks.find(t => t.id === id);
  if (!task) return;
  const fields = ['title', 'description', 'due_date', 'priority', 'link', 'creator_id', 'agency_id', 'is_completed', 'is_bookmarked'];
  fields.forEach(f => { if (updates[f] !== undefined) task[f] = updates[f]; });
  task.updated_at = now();
  saveDB();
}

export function getTasksForAgencySection(agencyId) {
  return db.tasks
    .filter(t => t.agency_id === agencyId)
    .map(t => ({
      ...t,
      creator_name: t.creator_id ? (db.creators.find(c => c.id === t.creator_id)?.stage_name || null) : null,
      agency_name: db.agencies.find(a => a.id === t.agency_id)?.name || null,
    }))
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
}

export function getAllTasksEnriched() {
  return db.tasks.map(t => ({
    ...t,
    creator_name: t.creator_id ? (db.creators.find(c => c.id === t.creator_id)?.stage_name || null) : null,
    agency_name: t.agency_id ? (db.agencies.find(a => a.id === t.agency_id)?.name || null) : null,
  })).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
}

export function updateTask(id, updates) {
  const task = db.tasks.find(t => t.id === id);
  if (task) {
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.dueDate !== undefined) task.due_date = updates.dueDate;
    if (updates.due_date !== undefined) task.due_date = updates.due_date;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.is_bookmarked !== undefined) task.is_bookmarked = updates.is_bookmarked ? 1 : 0;
    if (updates.link !== undefined) task.link = updates.link;
    if (updates.is_completed !== undefined) task.is_completed = updates.is_completed ? 1 : 0;
    task.updated_at = now();
    saveDB();
  }
}

export function toggleTaskCompletion(id, isCompleted) {
  const task = db.tasks.find(t => t.id === id);
  if (task) {
    task.is_completed = isCompleted ? 1 : 0;
    task.updated_at = now();
    saveDB();
  }
}

export function toggleBookmarkedTask(id, isBookmarked) {
  const task = db.tasks.find(t => t.id === id);
  if (task) {
    task.is_bookmarked = isBookmarked ? 1 : 0;
    task.updated_at = now();
    saveDB();
  }
}

export function deleteTask(id) {
  db.tasks = db.tasks.filter(t => t.id !== id);
  saveDB();
}

// Brain Dump
export function getBrainDumpForCreator(creatorId) {
  return db.brain_dump
    .filter(n => n.creator_id === creatorId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addBrainDumpNote(creatorId, content) {
  const id = getNextId('brain_dump');
  const note = {
    id,
    creator_id: creatorId,
    content,
    created_at: now(),
    updated_at: now(),
  };
  db.brain_dump.push(note);
  saveDB();
  return id;
}

export function updateBrainDumpNote(id, content) {
  const note = db.brain_dump.find(n => n.id === id);
  if (note) {
    note.content = content;
    note.updated_at = now();
    saveDB();
  }
}

export function deleteBrainDumpNote(id) {
  db.brain_dump = db.brain_dump.filter(n => n.id !== id);
  saveDB();
}

export function getGeneralBrainDump() {
  return db.brain_dump
    .filter(n => !n.creator_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Chatters
export function getChattersForAgency(agencyId) {
  return db.chatters.filter(c => c.agency_id === agencyId).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllChatters() {
  return db.chatters;
}

export function createChatter(agencyId, name, role = '', notes = '', commissionRate = 0, hourlyRate = 0, driveUrl = '') {
  const id = getNextId('chatters');
  const chatter = {
    id, agency_id: agencyId, name, role, notes,
    commission_rate: commissionRate,
    hourly_rate: hourlyRate,
    drive_url: driveUrl,
    created_at: now(), updated_at: now()
  };
  db.chatters.push(chatter);
  saveDB();
  return id;
}

export function updateChatter(id, name, role, notes, commissionRate, hourlyRate, driveUrl) {
  const c = db.chatters.find(c => c.id === id);
  if (c) {
    c.name = name; c.role = role; c.notes = notes;
    if (commissionRate !== undefined) c.commission_rate = commissionRate;
    if (hourlyRate !== undefined) c.hourly_rate = hourlyRate;
    if (driveUrl !== undefined) c.drive_url = driveUrl;
    c.updated_at = now();
    saveDB();
  }
}

export function deleteChatter(id) {
  db.chatters = db.chatters.filter(c => c.id !== id);
  saveDB();
}

// Agency-level task helpers
export function getTasksForAgency(agencyId) {
  const creatorIds = new Set(db.creators.filter(c => c.agency_id === agencyId).map(c => c.id));
  return db.tasks
    .filter(t => creatorIds.has(t.creator_id))
    .map(t => ({ ...t, stage_name: db.creators.find(c => c.id === t.creator_id)?.stage_name || 'Unknown' }))
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
}

export function addGeneralNote(content) {
  const id = getNextId('brain_dump');
  const note = {
    id,
    creator_id: null,
    content,
    created_at: now(),
    updated_at: now(),
  };
  db.brain_dump.push(note);
  saveDB();
  return id;
}

// Payroll — date-range earnings helpers
export function getAgencyRevenueForDateRange(agencyId, startDate, endDate) {
  const creatorIds = new Set(db.creators.filter(c => c.agency_id === agencyId).map(c => c.id));
  return db.daily_earnings
    .filter(e => creatorIds.has(e.creator_id) && e.date >= startDate && e.date <= endDate)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getEarningsForCreatorDateRange(creatorId, startDate, endDate) {
  return db.daily_earnings.filter(e => e.creator_id === creatorId && e.date >= startDate && e.date <= endDate);
}

// Keep month version for backward compat
export function getAgencyRevenueForMonth(agencyId, year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  return getAgencyRevenueForDateRange(agencyId, startDate, endDate);
}

export function upsertPayrollRecord(periodStart, periodEnd, personType, personId, agencyId, baseRevenue, commissionRate, commissionAmount, hourlyRate) {
  const [yearStr, monthStr] = periodStart.split('-');
  const periodYear = parseInt(yearStr);
  const periodMonth = parseInt(monthStr);

  const existing = db.payroll_records.find(
    r => r.period_start === periodStart && r.period_end === periodEnd &&
         r.person_type === personType && r.person_id === personId
  );
  if (existing) {
    existing.base_revenue = baseRevenue;
    existing.commission_rate = commissionRate;
    existing.hourly_rate = hourlyRate;
    // Preserve user-edited fields if approved/paid
    const preserve = existing.status === 'approved' || existing.status === 'paid';
    existing.commission_amount = existing.base_revenue * (existing.commission_rate / 100);
    existing.hourly_amount = existing.hourly_rate * existing.hours_worked;
    existing.gross_pay = existing.commission_amount + existing.hourly_amount;
    if (!preserve) {
      existing.net_pay = existing.gross_pay - existing.deductions + existing.bonuses;
    } else {
      existing.net_pay = existing.gross_pay - existing.deductions + existing.bonuses;
    }
    existing.updated_at = now();
    saveDB();
    return existing;
  } else {
    const record = {
      id: getNextId('payroll_records'),
      period_start: periodStart,
      period_end: periodEnd,
      period_year: periodYear,
      period_month: periodMonth,
      person_type: personType,
      person_id: personId,
      agency_id: agencyId,
      base_revenue: baseRevenue,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      hourly_rate: hourlyRate,
      hours_worked: 0,
      hourly_amount: 0,
      deductions: 0,
      bonuses: 0,
      gross_pay: commissionAmount,
      net_pay: commissionAmount,
      status: 'pending',
      notes: '',
      created_at: now(),
      updated_at: now(),
    };
    db.payroll_records.push(record);
    saveDB();
    return record;
  }
}

export function updatePayrollRecord(id, updates) {
  const record = db.payroll_records.find(r => r.id === id);
  if (!record) return;
  // All editable fields
  const fields = ['status', 'base_revenue', 'commission_rate', 'hourly_rate', 'hours_worked', 'deductions', 'bonuses', 'notes'];
  fields.forEach(f => { if (updates[f] !== undefined) record[f] = updates[f]; });
  // Recalculate derived fields
  record.commission_amount = record.base_revenue * (record.commission_rate / 100);
  record.hourly_amount = record.hourly_rate * record.hours_worked;
  record.gross_pay = record.commission_amount + record.hourly_amount;
  record.net_pay = record.gross_pay - record.deductions + record.bonuses;
  record.updated_at = now();
  saveDB();
  return record;
}

export function deletePayrollRecord(id) {
  db.payroll_records = db.payroll_records.filter(r => r.id !== id);
  saveDB();
}

export function getPayrollRecordsForPeriod(periodStart, periodEnd) {
  return db.payroll_records.filter(r => r.period_start === periodStart && r.period_end === periodEnd);
}

export function getPayrollHistory(limit = 12) {
  const seen = new Set();
  const periods = [];
  db.payroll_records.forEach(r => {
    const key = `${r.period_start}_${r.period_end}`;
    if (!seen.has(key)) {
      seen.add(key);
      const recs = db.payroll_records.filter(x => x.period_start === r.period_start && x.period_end === r.period_end);
      periods.push({
        period_start: r.period_start,
        period_end: r.period_end,
        period_year: r.period_year,
        period_month: r.period_month,
        key,
        record_count: recs.length,
        total_net_pay: recs.reduce((s, x) => s + x.net_pay, 0),
      });
    }
  });
  return periods.sort((a, b) => b.key.localeCompare(a.key)).slice(0, limit);
}

export function deletePayrollRecordsForPeriod(periodStart, periodEnd) {
  db.payroll_records = db.payroll_records.filter(
    r => !(r.period_start === periodStart && r.period_end === periodEnd)
  );
  saveDB();
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export function getAllTeams() {
  return [...db.teams];
}

export function getTeamsByAgency(agencyId) {
  return db.teams.filter(t => t.agency_id === agencyId).sort((a, b) => a.name.localeCompare(b.name));
}

export function createTeam(agencyId, name, color, notes, shifts) {
  const id = db._nextIds.team++;
  const team = {
    id, agency_id: agencyId, name, color: color || 'accent-cyan',
    notes: notes || '', shifts: shifts || [
      { label: '00:00 - 08:00', color: 'accent-orange' },
      { label: '08:00 - 16:00', color: 'accent-cyan' },
      { label: '16:00 - 00:00', color: 'accent-purple' },
    ],
    created_at: now(), updated_at: now(),
  };
  db.teams.push(team);
  saveDB();
  return id;
}

export function updateTeam(id, name, color, notes, shifts) {
  const t = db.teams.find(t => t.id === id);
  if (t) {
    Object.assign(t, { name, color: color || t.color, notes: notes || '', shifts: shifts || t.shifts, updated_at: now() });
    saveDB();
  }
}

export function deleteTeam(id) {
  db.teams          = db.teams.filter(t => t.id !== id);
  db.team_members   = db.team_members.filter(m => m.team_id !== id);
  db.team_chatters  = db.team_chatters.filter(c => c.team_id !== id);
  db.team_schedules = db.team_schedules.filter(s => s.team_id !== id);
  db.team_day_notes = db.team_day_notes.filter(n => n.team_id !== id);
  saveDB();
}

// ─── Team ↔ Creator ───────────────────────────────────────────────────────────

export function getAllTeamMembers() {
  return [...db.team_members];
}

export function addCreatorToTeam(teamId, creatorId) {
  if (db.team_members.find(m => m.team_id === teamId && m.creator_id === creatorId)) return;
  db.team_members.push({ id: db._nextIds.team_member++, team_id: teamId, creator_id: creatorId });
  saveDB();
}

export function removeCreatorFromTeam(teamId, creatorId) {
  db.team_members = db.team_members.filter(m => !(m.team_id === teamId && m.creator_id === creatorId));
  saveDB();
}

// ─── Team ↔ Chatter ───────────────────────────────────────────────────────────

export function getAllTeamChatters() {
  return [...db.team_chatters];
}

export function addChatterToTeam(teamId, chatterId) {
  if (db.team_chatters.find(c => c.team_id === teamId && c.chatter_id === chatterId)) return;
  db.team_chatters.push({ id: db._nextIds.team_chatter++, team_id: teamId, chatter_id: chatterId });
  saveDB();
}

export function removeChatterFromTeam(teamId, chatterId) {
  db.team_chatters = db.team_chatters.filter(c => !(c.team_id === teamId && c.chatter_id === chatterId));
  saveDB();
}

// ─── Team Schedule ────────────────────────────────────────────────────────────

export function getScheduleForTeam(teamId, dateFrom, dateTo) {
  return db.team_schedules.filter(s => s.team_id === teamId && s.date >= dateFrom && s.date <= dateTo);
}

export function upsertScheduleEntry(teamId, date, shiftIndex, chatterId, isCover, hoursWorked = null) {
  const existing = db.team_schedules.find(
    s => s.team_id === teamId && s.date === date && s.shift_index === shiftIndex
  );
  if (existing) {
    existing.chatter_id = chatterId;
    existing.is_cover = isCover ? 1 : 0;
    if (hoursWorked !== undefined) existing.hours_worked = hoursWorked;
    existing.updated_at = now();
  } else {
    db.team_schedules.push({
      id: db._nextIds.team_schedule++, team_id: teamId, date,
      shift_index: shiftIndex, chatter_id: chatterId, is_cover: isCover ? 1 : 0,
      hours_worked: hoursWorked,
      created_at: now(), updated_at: now(),
    });
  }
  saveDB();
}

export function updateScheduleHours(teamId, date, shiftIndex, hoursWorked) {
  const existing = db.team_schedules.find(
    s => s.team_id === teamId && s.date === date && s.shift_index === shiftIndex
  );
  if (existing) {
    existing.hours_worked = hoursWorked;
    existing.updated_at = now();
    saveDB();
  }
}

export function deleteScheduleEntry(teamId, date, shiftIndex) {
  db.team_schedules = db.team_schedules.filter(
    s => !(s.team_id === teamId && s.date === date && s.shift_index === shiftIndex)
  );
  saveDB();
}

// ─── Team Day Notes ───────────────────────────────────────────────────────────

export function getDayNotesForTeam(teamId, dateFrom, dateTo) {
  return db.team_day_notes.filter(n => n.team_id === teamId && n.date >= dateFrom && n.date <= dateTo);
}

export function upsertDayNote(teamId, date, notes) {
  const existing = db.team_day_notes.find(n => n.team_id === teamId && n.date === date);
  if (existing) {
    existing.notes = notes;
    existing.updated_at = now();
  } else {
    db.team_day_notes.push({
      id: db._nextIds.team_day_note++, team_id: teamId, date, notes,
      created_at: now(), updated_at: now(),
    });
  }
  saveDB();
}

// ─── Subscriber Tracker ───────────────────────────────────────────────────────

export function addSubscriberCount(creatorId, date, count, notes = '') {
  const existing = db.creator_subscribers.find(s => s.creator_id === creatorId && s.date === date);
  if (existing) {
    existing.count = count;
    existing.notes = notes;
    existing.updated_at = now();
  } else {
    db.creator_subscribers.push({
      id: getNextId('creator_subscribers'),
      creator_id: creatorId,
      date,
      count,
      notes,
      created_at: now(),
      updated_at: now(),
    });
  }
  saveDB();
}

export function getSubscriberHistory(creatorId) {
  return db.creator_subscribers
    .filter(s => s.creator_id === creatorId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getLatestSubscriberCount(creatorId) {
  const history = getSubscriberHistory(creatorId);
  return history.length > 0 ? history[history.length - 1] : null;
}

// ─── Earnings by date range ───────────────────────────────────────────────────

export function getEarningsForCreatorRange(creatorId, fromDate, toDate) {
  return db.daily_earnings
    .filter(e => e.creator_id === creatorId && e.date >= fromDate && e.date <= toDate)
    .reduce((sum, e) => sum + e.amount, 0);
}

// ─── Campaign / Promo Tracker ─────────────────────────────────────────────────

export function addCampaign(creatorId, name, discountPct, startDate, endDate, notes = '') {
  const id = getNextId('creator_campaigns');
  db.creator_campaigns.push({
    id, creator_id: creatorId, name,
    discount_pct: discountPct || 0,
    start_date: startDate, end_date: endDate,
    notes, created_at: now(),
  });
  saveDB();
  return id;
}

export function getCampaigns(creatorId) {
  return db.creator_campaigns
    .filter(c => c.creator_id === creatorId)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export function deleteCampaign(id) {
  db.creator_campaigns = db.creator_campaigns.filter(c => c.id !== id);
  saveDB();
}

// ─── Creator Notes ────────────────────────────────────────────────────────────

export function addCreatorNote(creatorId, note) {
  const id = getNextId('creator_notes');
  db.creator_notes.push({ id, creator_id: creatorId, note, created_at: now() });
  saveDB();
  return id;
}

export function getCreatorNotes(creatorId) {
  return db.creator_notes
    .filter(n => n.creator_id === creatorId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function deleteCreatorNote(noteId) {
  db.creator_notes = db.creator_notes.filter(n => n.id !== noteId);
  saveDB();
}

// ─── Recurring Tasks ──────────────────────────────────────────────────────────

export function spawnRecurringTask(task) {
  if (!task.recurring_days || task.recurring_days <= 0) return null;
  const pad = n => String(n).padStart(2, '0');
  const base = task.due_date || new Date().toISOString().split('T')[0];
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + task.recurring_days);
  const nextDue = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const id = getNextId('tasks');
  const newTask = {
    id,
    agency_id:     task.agency_id,
    creator_id:    task.creator_id || null,
    title:         task.title,
    description:   task.description || '',
    due_date:      nextDue,
    priority:      task.priority || 'none',
    link:          task.link || '',
    is_completed:  0,
    is_bookmarked: 0,
    recurring_days: task.recurring_days,
    created_at:    now(),
    updated_at:    now(),
  };
  db.tasks.push(newTask);
  saveDB();
  return newTask;
}

// ─── Creator display order (UI pref — local only, not synced to cloud) ────────
export function getCreatorOrder() {
  try {
    const s = localStorage.getItem('creator_order');
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}
export function saveCreatorOrder(agencyId, orderedIds) {
  try {
    const all = getCreatorOrder();
    all[String(agencyId)] = orderedIds;
    localStorage.setItem('creator_order', JSON.stringify(all));
  } catch {}
}
