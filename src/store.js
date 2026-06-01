import { create } from 'zustand';
import * as db from './db/index.js';
import {
  supabase,
  fetchUserProfile,
  upsertUserProfile,
  updateUserProfile,
  fetchAllProfiles,
  deleteUserProfile,
} from './lib/supabase.js';

export const useStore = create((set, get) => ({
  // Auth State
  authUser: null,
  userProfile: null,
  userProfiles: [],
  profileError: null,   // set when the profile read is BLOCKED (e.g. RLS), not just missing

  // UI State
  selectedCreatorId: null,
  selectedAgencyId: null,
  currentView: 'dashboard', // dashboard, revenue-master, daily-income, brain-dump
  selectedDate: new Date().toISOString().split('T')[0],
  agencyFilter: null, // null = all, or specific agency id

  // Data State
  agencies: [],
  creators: [],
  tasks: [],
  bookmarkedTasks: [],
  dailyEarnings: {},
  brainDump: [],
  chatters: [],
  subscriberCounts: {}, // creatorId → { latest, prev }
  payrollRecords: [],
  payrollPeriod: {
    periodStart: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
    periodEnd:   `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`,
  },

  // Teams
  teams: [],
  teamMembers: [],
  teamChatters: [],
  teamSchedule: [],
  teamDayNotes: [],

  // Creator Requests
  creatorRequests: [],

  // Timesheet
  timesheetHours: [],
  timesheetSales: [],
  timesheetPeriod: { periodStart: '', periodEnd: '' },
  timesheetHistory: [],

  // UI Actions
  setSelectedCreator: (creatorId) => set({ selectedCreatorId: creatorId }),
  setSelectedAgency: (agencyId) => set({ selectedAgencyId: agencyId }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setAgencyFilter: (agencyId) => set({ agencyFilter: agencyId }),

  // Data Loading
  loadAllData: async () => {
    try {
      const agencies = db.getAllAgencies();
      const allCreators = [];

      // Load creators for each agency
      agencies.forEach(agency => {
        const creators = db.getCreatorsByAgency(agency.id, true); // include inactive
        allCreators.push(...creators);
      });

      const bookmarkedTasks = db.getBookmarkedTasks();
      const chatters = db.getAllChatters();
      const tasks = db.getAllTasksEnriched();

      const teams        = db.getAllTeams();
      const teamMembers  = db.getAllTeamMembers();
      const teamChatters = db.getAllTeamChatters();

      const creatorRequests = db.getAllCreatorRequests();

      set({
        agencies,
        creators: allCreators,
        bookmarkedTasks,
        chatters,
        tasks,
        teams,
        teamMembers,
        teamChatters,
        creatorRequests,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  },

  // Agency operations
  addAgency: (name, notes = '') => {
    try {
      const id = db.createAgency(name, notes);
      const state = get();
      const newAgency = { id, name, notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      set({ agencies: [...(state.agencies || []), newAgency] });
      return id;
    } catch (error) {
      console.error('Error adding agency:', error);
      return null;
    }
  },

  updateAgencyData: (id, name, notes) => {
    db.updateAgency(id, name, notes);
    const state = get();
    set({
      agencies: state.agencies.map(a => a.id === id ? { ...a, name, notes, updated_at: new Date().toISOString() } : a)
    });
  },

  deleteAgencyData: (id) => {
    db.deleteAgency(id);
    const state = get();
    set({
      agencies: state.agencies.filter(a => a.id !== id),
      creators: state.creators.filter(c => c.agency_id !== id)
    });
  },

  // Creator operations
  addCreator: (agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '', commissionRate = 0, driveUrl = '', modelInfoUrl = '') => {
    const id = db.createCreator(agencyId, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, commissionRate, driveUrl, modelInfoUrl);
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
      model_info_url: modelInfoUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const state = get();
    set({ creators: [...state.creators, creator] });
    return id;
  },

  updateCreatorData: (id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate, driveUrl, modelInfoUrl) => {
    db.updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate, driveUrl, modelInfoUrl);
    const state = get();
    set({
      creators: state.creators.map(c =>
        c.id === id
          ? { ...c, stage_name: stageName, daily_goal: dailyGoal, weekly_goal: weeklyGoal, monthly_goal: monthlyGoal, notes, is_active: isActive ? 1 : 0, commission_rate: commissionRate !== undefined ? commissionRate : (c.commission_rate || 0), drive_url: driveUrl !== undefined ? driveUrl : (c.drive_url || ''), model_info_url: modelInfoUrl !== undefined ? modelInfoUrl : (c.model_info_url || ''), updated_at: new Date().toISOString() }
          : c
      )
    });
  },

  deleteCreatorData: (id) => {
    db.deleteCreator(id);
    const state = get();
    set({
      creators: state.creators.filter(c => c.id !== id),
      selectedCreatorId: state.selectedCreatorId === id ? null : state.selectedCreatorId
    });
  },

  // Earnings operations
  addEarning: (creatorId, date, amount, platform = 'onlyfans') => {
    db.addDailyEarning(creatorId, date, amount, platform);
    const state = get();
    const key = `${creatorId}-${date}`;
    set({
      dailyEarnings: { ...state.dailyEarnings, [key]: amount }
    });
  },

  // Task CRUD
  addTask: (agencyId, creatorId, title, description, dueDate, priority, link) => {
    const task = db.createAgencyTask(agencyId, creatorId, title, description, dueDate, priority, link);
    set(state => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  updateTask: (id, updates) => {
    db.updateAgencyTask(id, updates);
    set(state => {
      const updatedTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
      // If marking complete and task is recurring, spawn the next instance
      if (updates.is_completed === 1) {
        const task = state.tasks.find(t => t.id === id);
        if (task && task.recurring_days) {
          const next = db.spawnRecurringTask({ ...task, ...updates });
          if (next) {
            const enriched = { ...next, creator_name: task.creator_name, agency_name: task.agency_name };
            return { tasks: [...updatedTasks, enriched] };
          }
        }
      }
      return { tasks: updatedTasks };
    });
  },

  deleteTask: (id) => {
    db.deleteTask(id);
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      bookmarkedTasks: state.bookmarkedTasks.filter(t => t.id !== id),
    }));
  },

  clearCompletedTasks: (agencyId) => {
    const state = get();
    const toDelete = state.tasks.filter(t => t.is_completed && (!agencyId || t.agency_id === agencyId));
    toDelete.forEach(t => db.deleteTask(t.id));
    set(s => ({ tasks: s.tasks.filter(t => !(t.is_completed && (!agencyId || t.agency_id === agencyId))) }));
  },

  // Task operations
  toggleBookmarkTask: (id, isBookmarked) => {
    db.toggleBookmarkedTask(id, isBookmarked);
    const state = get();
    set({
      bookmarkedTasks: isBookmarked
        ? [...state.bookmarkedTasks, { id, is_bookmarked: 1 }]
        : state.bookmarkedTasks.filter(t => t.id !== id)
    });
  },

  // Chatter operations
  addChatter: (agencyId, name, role = '', notes = '', commissionRate = 0, hourlyRate = 0, driveUrl = '') => {
    const id = db.createChatter(agencyId, name, role, notes, commissionRate, hourlyRate, driveUrl);
    const chatter = { id, agency_id: agencyId, name, role, notes, commission_rate: commissionRate, hourly_rate: hourlyRate, drive_url: driveUrl, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    set(state => ({ chatters: [...state.chatters, chatter] }));
    return id;
  },

  updateChatterData: (id, name, role, notes, commissionRate, hourlyRate, driveUrl) => {
    db.updateChatter(id, name, role, notes, commissionRate, hourlyRate, driveUrl);
    set(state => ({
      chatters: state.chatters.map(c => c.id === id ? { ...c, name, role, notes, commission_rate: commissionRate !== undefined ? commissionRate : (c.commission_rate || 0), hourly_rate: hourlyRate !== undefined ? hourlyRate : (c.hourly_rate || 0), drive_url: driveUrl !== undefined ? driveUrl : (c.drive_url || ''), updated_at: new Date().toISOString() } : c)
    }));
  },

  deleteChatterData: (id) => {
    db.deleteChatter(id);
    set(state => ({ chatters: state.chatters.filter(c => c.id !== id) }));
  },

  logSubscriberCount: (creatorId, date, count, notes) => {
    db.addSubscriberCount(creatorId, date, count, notes);
    const history = db.getSubscriberHistory(creatorId);
    const latest = history.length > 0 ? history[history.length - 1] : null;
    const prev   = history.length >= 2 ? history[history.length - 2] : null;
    set(state => ({
      subscriberCounts: { ...state.subscriberCounts, [creatorId]: { latest, prev } }
    }));
  },

  // Campaign / promo tracker
  addCampaign: (creatorId, name, discountPct, startDate, endDate, notes) =>
    db.addCampaign(creatorId, name, discountPct, startDate, endDate, notes),
  getCampaigns: (creatorId) => db.getCampaigns(creatorId),
  deleteCampaign: (id) => { db.deleteCampaign(id); },

  // Hours tracker for schedule entries
  updateScheduleHours: (teamId, date, shiftIndex, hours) => {
    db.updateScheduleHours(teamId, date, shiftIndex, hours);
    set(state => ({
      teamSchedule: state.teamSchedule.map(s =>
        s.team_id === teamId && s.date === date && s.shift_index === shiftIndex
          ? { ...s, hours_worked: hours }
          : s
      ),
    }));
  },

  // Bulk payroll approve
  bulkApprovePayroll: (agencyId) => {
    const state = get();
    const toApprove = state.payrollRecords.filter(r =>
      r.status === 'pending' && (!agencyId || r.agency_id === agencyId)
    );
    toApprove.forEach(r => db.updatePayrollRecord(r.id, { status: 'approved' }));
    set(s => ({
      payrollRecords: s.payrollRecords.map(r =>
        r.status === 'pending' && (!agencyId || r.agency_id === agencyId)
          ? { ...r, status: 'approved' }
          : r
      ),
    }));
  },

  // Creator notes
  addCreatorNote: (creatorId, note) => {
    const id = db.addCreatorNote(creatorId, note);
    return id;
  },
  getCreatorNotes: (creatorId) => db.getCreatorNotes(creatorId),
  deleteCreatorNote: (noteId) => { db.deleteCreatorNote(noteId); },

  // Creator Requests
  addCreatorRequest: (creatorId, agencyId, fanName, fanId, amountPaid, duration, details, earliestDate, latestDate, submittedBy) => {
    const id = db.createCreatorRequest(creatorId, agencyId, fanName, fanId, amountPaid, duration, details, earliestDate, latestDate, submittedBy);
    const newReq = db.getAllCreatorRequests().find(r => r.id === id);
    if (newReq) set(state => ({ creatorRequests: [newReq, ...state.creatorRequests] }));
    return id;
  },

  updateCreatorRequestStatus: (id, status) => {
    db.updateCreatorRequestStatus(id, status);
    set(state => ({
      creatorRequests: state.creatorRequests.map(r =>
        r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r
      )
    }));
  },

  updateCreatorRequestData: (id, updates) => {
    db.updateCreatorRequest(id, updates);
    set(state => ({
      creatorRequests: state.creatorRequests.map(r =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
      )
    }));
  },

  deleteCreatorRequest: (id) => {
    db.deleteCreatorRequest(id);
    set(state => ({ creatorRequests: state.creatorRequests.filter(r => r.id !== id) }));
  },

  // Brain dump operations
  addBrainDumpNote: (creatorId, content) => {
    const id = db.addBrainDumpNote(creatorId, content);
    const state = get();
    const newNote = { id, creator_id: creatorId, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    set({
      brainDump: [newNote, ...state.brainDump]
    });
    return id;
  },

  // Computed getters
  getActiveCreators: () => {
    const state = get();
    return state.creators.filter(c => c.is_active);
  },

  getInactiveCreators: () => {
    const state = get();
    return state.creators.filter(c => !c.is_active);
  },

  getCreatorsByAgencyId: (agencyId) => {
    const state = get();
    return state.creators.filter(c => c.agency_id === agencyId);
  },

  getSelectedCreator: () => {
    const state = get();
    return state.creators.find(c => c.id === state.selectedCreatorId);
  },

  getCreatorEarningsMonth: (creatorId, year, month) => {
    return db.getEarningsForCreatorMonth(creatorId, year, month);
  },

  getTotalEarningsMonth: (year, month) => {
    const state = get();
    let total = 0;
    state.creators.forEach(creator => {
      const earnings = db.getEarningsForCreatorMonth(creator.id, year, month);
      earnings.forEach(e => {
        total += e.amount;
      });
    });
    return total;
  },

  getAgencyTotalEarningsMonth: (agencyId, year, month) => {
    const state = get();
    const creators = state.creators.filter(c => c.agency_id === agencyId);
    let total = 0;
    creators.forEach(creator => {
      const earnings = db.getEarningsForCreatorMonth(creator.id, year, month);
      earnings.forEach(e => {
        total += e.amount;
      });
    });
    return total;
  },

  // Payroll actions
  setPayrollPeriod: (periodStart, periodEnd) => set({ payrollPeriod: { periodStart, periodEnd } }),

  loadPayrollRecords: (periodStart, periodEnd) => {
    const records = db.getPayrollRecordsForPeriod(periodStart, periodEnd);
    set({ payrollRecords: records });
  },

  generatePayroll: (periodStart, periodEnd) => {
    const state = get();
    state.agencies.forEach(agency => {
      const agencyRevenue = db.getAgencyRevenueForDateRange(agency.id, periodStart, periodEnd);
      // Creators
      const creators = db.getCreatorsByAgency(agency.id, true);
      creators.forEach(creator => {
        const earnings = db.getEarningsForCreatorDateRange(creator.id, periodStart, periodEnd);
        const baseRevenue = earnings.reduce((s, e) => s + e.amount, 0);
        const commissionRate = creator.commission_rate || 0;
        const commissionAmount = baseRevenue * (commissionRate / 100);
        db.upsertPayrollRecord(periodStart, periodEnd, 'creator', creator.id, agency.id, baseRevenue, commissionRate, commissionAmount, 0);
      });
      // Chatters — use timesheet data if available, else fall back to agency revenue
      const chatters = db.getChattersForAgency(agency.id);
      chatters.forEach(chatter => {
        const commissionRate = chatter.commission_rate || 0;
        const hourlyRate = chatter.hourly_rate || 0;
        // Pull hours + sales from timesheet for this period
        const tsHours = db.getTimesheetHoursForPeriod(periodStart, periodEnd, chatter.id);
        const tsSales = db.getTimesheetSalesForPeriod(periodStart, periodEnd, chatter.id);
        const totalHrs = tsHours.reduce((sum, h) => sum + (h.hours_worked || 0), 0);
        const totalRev = tsSales.length > 0
          ? tsSales.reduce((sum, s) => sum + (s.gross_amount || 0), 0)
          : agencyRevenue; // fall back to agency revenue if no timesheet sales logged
        const commissionAmount = totalRev * (commissionRate / 100);
        const record = db.upsertPayrollRecord(periodStart, periodEnd, 'chatter', chatter.id, agency.id, totalRev, commissionRate, commissionAmount, hourlyRate);
        // Inject timesheet hours into the payroll record (only if pending — preserve approved/paid)
        if (record.status === 'pending' && totalHrs > 0) {
          db.updatePayrollRecord(record.id, { hours_worked: totalHrs });
        }
      });
    });
    const records = db.getPayrollRecordsForPeriod(periodStart, periodEnd);
    set({ payrollRecords: records });
  },

  updatePayrollEntry: (id, updates) => {
    const updated = db.updatePayrollRecord(id, updates);
    if (updated) {
      set(state => ({
        payrollRecords: state.payrollRecords.map(r => r.id === id ? { ...updated } : r)
      }));
    }
  },

  deletePayrollEntry: (id) => {
    db.deletePayrollRecord(id);
    set(state => ({ payrollRecords: state.payrollRecords.filter(r => r.id !== id) }));
  },

  deletePayrollPeriod: (periodStart, periodEnd) => {
    db.deletePayrollRecordsForPeriod(periodStart, periodEnd);
    const state = get();
    const isCurrent = state.payrollPeriod.periodStart === periodStart && state.payrollPeriod.periodEnd === periodEnd;
    set({ payrollRecords: isCurrent ? [] : state.payrollRecords });
  },

  // ── Team CRUD ──────────────────────────────────────────────────────────────
  addTeam: (agencyId, name, color, notes, shifts) => {
    const id = db.createTeam(agencyId, name, color, notes, shifts);
    const team = {
      id, agency_id: agencyId, name, color: color || 'accent-cyan', notes: notes || '',
      shifts: shifts || [
        { label: '00:00 - 08:00', color: 'accent-orange' },
        { label: '08:00 - 16:00', color: 'accent-cyan' },
        { label: '16:00 - 00:00', color: 'accent-purple' },
      ],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    set(state => ({ teams: [...state.teams, team] }));
    return id;
  },

  updateTeamData: (id, name, color, notes, shifts) => {
    db.updateTeam(id, name, color, notes, shifts);
    set(state => ({
      teams: state.teams.map(t => t.id === id
        ? { ...t, name, color: color || t.color, notes: notes || '', shifts: shifts || t.shifts, updated_at: new Date().toISOString() }
        : t
      )
    }));
  },

  deleteTeamData: (id) => {
    db.deleteTeam(id);
    set(state => ({
      teams:        state.teams.filter(t => t.id !== id),
      teamMembers:  state.teamMembers.filter(m => m.team_id !== id),
      teamChatters: state.teamChatters.filter(c => c.team_id !== id),
      teamSchedule: state.teamSchedule.filter(s => s.team_id !== id),
      teamDayNotes: state.teamDayNotes.filter(n => n.team_id !== id),
    }));
  },

  // ── Team ↔ Creator ────────────────────────────────────────────────────────
  addCreatorToTeam: (teamId, creatorId) => {
    db.addCreatorToTeam(teamId, creatorId);
    set(state => {
      if (state.teamMembers.find(m => m.team_id === teamId && m.creator_id === creatorId)) return state;
      return { teamMembers: [...state.teamMembers, { team_id: teamId, creator_id: creatorId }] };
    });
  },

  removeCreatorFromTeam: (teamId, creatorId) => {
    db.removeCreatorFromTeam(teamId, creatorId);
    set(state => ({ teamMembers: state.teamMembers.filter(m => !(m.team_id === teamId && m.creator_id === creatorId)) }));
  },

  // ── Team ↔ Chatter ────────────────────────────────────────────────────────
  addChatterToTeam: (teamId, chatterId) => {
    db.addChatterToTeam(teamId, chatterId);
    set(state => {
      if (state.teamChatters.find(c => c.team_id === teamId && c.chatter_id === chatterId)) return state;
      return { teamChatters: [...state.teamChatters, { team_id: teamId, chatter_id: chatterId }] };
    });
  },

  removeChatterFromTeam: (teamId, chatterId) => {
    db.removeChatterFromTeam(teamId, chatterId);
    set(state => ({ teamChatters: state.teamChatters.filter(c => !(c.team_id === teamId && c.chatter_id === chatterId)) }));
  },

  // ── Schedule ──────────────────────────────────────────────────────────────
  loadTeamSchedule: (teamId, dateFrom, dateTo) => {
    const teamSchedule = db.getScheduleForTeam(teamId, dateFrom, dateTo);
    const teamDayNotes = db.getDayNotesForTeam(teamId, dateFrom, dateTo);
    set({ teamSchedule, teamDayNotes });
  },

  setScheduleEntry: (teamId, date, shiftIndex, chatterId, isCover) => {
    db.upsertScheduleEntry(teamId, date, shiftIndex, chatterId, isCover);
    set(state => {
      const filtered = state.teamSchedule.filter(
        s => !(s.team_id === teamId && s.date === date && s.shift_index === shiftIndex)
      );
      return { teamSchedule: [...filtered, { team_id: teamId, date, shift_index: shiftIndex, chatter_id: chatterId, is_cover: isCover ? 1 : 0 }] };
    });
  },

  deleteScheduleEntryAction: (teamId, date, shiftIndex) => {
    db.deleteScheduleEntry(teamId, date, shiftIndex);
    set(state => ({ teamSchedule: state.teamSchedule.filter(s => !(s.team_id === teamId && s.date === date && s.shift_index === shiftIndex)) }));
  },

  copyScheduleWeek: (teamId, fromWeekStart, toWeekStart, viewStart, viewEnd) => {
    const pad = n => String(n).padStart(2, '0');
    const shiftDate = (isoDate, days) => {
      const d = new Date(isoDate + 'T00:00:00');
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const fromEnd = shiftDate(fromWeekStart, 6);
    const sourceEntries = db.getScheduleForTeam(teamId, fromWeekStart, fromEnd);
    const dayDiff = Math.round(
      (new Date(toWeekStart + 'T00:00:00') - new Date(fromWeekStart + 'T00:00:00')) / 86400000
    );
    sourceEntries.forEach(entry => {
      const targetDate = shiftDate(entry.date, dayDiff);
      db.upsertScheduleEntry(teamId, targetDate, entry.shift_index, entry.chatter_id, entry.is_cover === 1);
    });
    const teamSchedule = db.getScheduleForTeam(teamId, viewStart, viewEnd);
    const teamDayNotes = db.getDayNotesForTeam(teamId, viewStart, viewEnd);
    set({ teamSchedule, teamDayNotes });
  },

  setDayNote: (teamId, date, notes) => {
    db.upsertDayNote(teamId, date, notes);
    set(state => {
      const filtered = state.teamDayNotes.filter(n => !(n.team_id === teamId && n.date === date));
      return { teamDayNotes: [...filtered, { team_id: teamId, date, notes }] };
    });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  // Called once on app boot — restores existing session if any
  initAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error } = await fetchUserProfile(session.user.id);
        set({ authUser: session.user, userProfile: profile, profileError: error });
      }
    } catch (e) {
      console.warn('[Auth] initAuth failed:', e.message);
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile, error: profileErr } = await fetchUserProfile(data.user.id);
    set({ authUser: data.user, userProfile: profile, profileError: profileErr });
    return profile;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ authUser: null, userProfile: null, userProfiles: [], profileError: null });
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Supabase returns null user when email confirmation is enabled and the
    // email was already registered (even unconfirmed). Guard against it.
    if (!data?.user) {
      throw new Error('Account already registered or email confirmation is required. Check your inbox or disable email confirmation in Supabase.');
    }

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase();

    let profile = null;
    try {
      profile = await upsertUserProfile({
        id: data.user.id,
        email,
        full_name: fullName || '',
        role: isAdmin ? 'admin' : 'chatter',
        approved: isAdmin ? true : false,
        chatter_id: null,
      });
    } catch (profileErr) {
      console.error('[Auth] Failed to create user profile:', profileErr.message);
      throw new Error('Account created but profile setup failed. Make sure the user_profiles table exists in Supabase (run the setup SQL).');
    }
    set({ authUser: data.user, userProfile: profile, profileError: null });
    return profile;
  },

  // Admin: load all user profiles
  loadUserProfiles: async () => {
    const profiles = await fetchAllProfiles();
    set({ userProfiles: profiles });
  },

  approveUser: async (userId, role, chatterId = null) => {
    await updateUserProfile(userId, { approved: true, role, chatter_id: chatterId });
    const profiles = await fetchAllProfiles();
    set({ userProfiles: profiles });
  },

  rejectUser: async (userId) => {
    await deleteUserProfile(userId);
    const profiles = await fetchAllProfiles();
    set({ userProfiles: profiles });
  },

  updateUserRole: async (userId, role) => {
    await updateUserProfile(userId, { role });
    const profiles = await fetchAllProfiles();
    set({ userProfiles: profiles });
  },

  // ── Timesheet ────────────────────────────────────────────────────────────

  loadTimesheetData: (periodStart, periodEnd, chatterId) => {
    const hours = db.getTimesheetHoursForPeriod(periodStart, periodEnd, chatterId);
    const sales = db.getTimesheetSalesForPeriod(periodStart, periodEnd, chatterId);
    set({ timesheetHours: hours, timesheetSales: sales, timesheetPeriod: { periodStart, periodEnd } });
  },

  loadTimesheetHistory: (chatterId) => {
    const history = db.getTimesheetHistory(chatterId);
    set({ timesheetHistory: history });
  },

  addTimesheetHours: (chatterId, periodStart, periodEnd, date, hours) => {
    const entry = db.createTimesheetHours(chatterId, periodStart, periodEnd, date, hours);
    set(state => {
      // Replace if same id (upsert may have returned existing), otherwise append
      const without = state.timesheetHours.filter(h => h.id !== entry.id);
      return { timesheetHours: [...without, entry] };
    });
  },

  updateTimesheetHours: (id, hours) => {
    db.updateTimesheetHours(id, hours);
    set(state => ({
      timesheetHours: state.timesheetHours.map(h => h.id === id ? { ...h, hours_worked: hours } : h),
    }));
  },

  deleteTimesheetHours: (id) => {
    db.deleteTimesheetHours(id);
    set(state => ({ timesheetHours: state.timesheetHours.filter(h => h.id !== id) }));
  },

  addTimesheetSale: (chatterId, creatorId, periodStart, periodEnd, date, grossAmount, commissionRate, notes) => {
    const entry = db.createTimesheetSale(chatterId, creatorId, periodStart, periodEnd, date, grossAmount, commissionRate, notes);
    set(state => ({ timesheetSales: [...state.timesheetSales, entry] }));
  },

  updateTimesheetSale: (id, updates) => {
    const updated = db.updateTimesheetSale(id, updates);
    if (updated) {
      set(state => ({
        timesheetSales: state.timesheetSales.map(s => s.id === id ? { ...updated } : s),
      }));
    }
  },

  deleteTimesheetSale: (id) => {
    db.deleteTimesheetSale(id);
    set(state => ({ timesheetSales: state.timesheetSales.filter(s => s.id !== id) }));
  },
}));
