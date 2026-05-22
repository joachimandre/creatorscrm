// Simple JSON-based database using localStorage
let db = null;

export async function initDB() {
  if (db) return db;

  const savedDb = localStorage.getItem('crm_db');

  if (savedDb) {
    db = JSON.parse(savedDb);
    // Migrations
    if (!db.chatters) { db.chatters = []; db._nextIds.chatters = 1; }
    // Payroll migrations
    let payrollDirty = false;
    db.creators.forEach(c => { if (c.commission_rate === undefined) { c.commission_rate = 0; payrollDirty = true; } });
    db.chatters.forEach(c => {
      if (c.commission_rate === undefined) { c.commission_rate = 0; payrollDirty = true; }
      if (c.hourly_rate === undefined) { c.hourly_rate = 0; payrollDirty = true; }
    });
    if (!db.payroll_records) { db.payroll_records = []; db._nextIds.payroll_records = 1; payrollDirty = true; }
    // Migrate period_year/month → period_start/period_end
    db.payroll_records.forEach(r => {
      if (!r.period_start) {
        const lastDay = new Date(r.period_year, r.period_month, 0).getDate();
        r.period_start = `${r.period_year}-${String(r.period_month).padStart(2, '0')}-01`;
        r.period_end   = `${r.period_year}-${String(r.period_month).padStart(2, '0')}-${lastDay}`;
        payrollDirty = true;
      }
    });
    if (payrollDirty) saveDB();
    // Add agency_id + priority to existing tasks
    let dirty = false;
    db.tasks.forEach(t => {
      if (t.agency_id === undefined) {
        const creator = db.creators.find(c => c.id === t.creator_id);
        t.agency_id = creator ? creator.agency_id : null;
        dirty = true;
      }
      if (t.priority === undefined) { t.priority = 'none'; dirty = true; }
    });
    if (dirty) saveDB();
  } else {
    db = {
      agencies: [],
      creators: [],
      daily_earnings: [],
      tasks: [],
      brain_dump: [],
      chatters: [],
      payroll_records: [],
      _nextIds: {
        agencies: 1,
        creators: 1,
        daily_earnings: 1,
        tasks: 1,
        brain_dump: 1,
        chatters: 1,
        payroll_records: 1,
      }
    };
    saveDB();
  }

  return db;
}

export function saveDB() {
  if (!db) return;
  localStorage.setItem('crm_db', JSON.stringify(db));
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

export function createCreator(agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '', commissionRate = 0) {
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
    created_at: now(),
    updated_at: now(),
  };
  db.creators.push(creator);
  saveDB();
  return id;
}

export function updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate) {
  const creator = db.creators.find(c => c.id === id);
  if (creator) {
    creator.stage_name = stageName;
    creator.daily_goal = dailyGoal;
    creator.weekly_goal = weeklyGoal;
    creator.monthly_goal = monthlyGoal;
    creator.notes = notes;
    creator.is_active = isActive ? 1 : 0;
    if (commissionRate !== undefined) creator.commission_rate = commissionRate;
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

export function addDailyEarning(creatorId, date, amount) {
  const existing = db.daily_earnings.find(e => e.creator_id === creatorId && e.date === date);
  if (existing) {
    existing.amount = amount;
    existing.updated_at = now();
  } else {
    db.daily_earnings.push({
      id: getNextId('daily_earnings'),
      creator_id: creatorId,
      date,
      amount,
      created_at: now(),
      updated_at: now(),
    });
  }
  saveDB();
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

export function createChatter(agencyId, name, role = '', notes = '', commissionRate = 0, hourlyRate = 0) {
  const id = getNextId('chatters');
  const chatter = {
    id, agency_id: agencyId, name, role, notes,
    commission_rate: commissionRate,
    hourly_rate: hourlyRate,
    created_at: now(), updated_at: now()
  };
  db.chatters.push(chatter);
  saveDB();
  return id;
}

export function updateChatter(id, name, role, notes, commissionRate, hourlyRate) {
  const c = db.chatters.find(c => c.id === id);
  if (c) {
    c.name = name; c.role = role; c.notes = notes;
    if (commissionRate !== undefined) c.commission_rate = commissionRate;
    if (hourlyRate !== undefined) c.hourly_rate = hourlyRate;
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
      periods.push({
        period_start: r.period_start,
        period_end: r.period_end,
        period_year: r.period_year,
        period_month: r.period_month,
        key,
      });
    }
  });
  return periods.sort((a, b) => b.key.localeCompare(a.key)).slice(0, limit);
}
