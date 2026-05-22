import { create } from 'zustand';
import * as db from './db/index.js';

export const useStore = create((set, get) => ({
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

      set({
        agencies,
        creators: allCreators,
        bookmarkedTasks,
        chatters,
        tasks,
        teams,
        teamMembers,
        teamChatters,
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
  addCreator: (agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '', commissionRate = 0, driveUrl = '') => {
    const id = db.createCreator(agencyId, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, commissionRate, driveUrl);
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const state = get();
    set({ creators: [...state.creators, creator] });
    return id;
  },

  updateCreatorData: (id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate, driveUrl) => {
    db.updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate, driveUrl);
    const state = get();
    set({
      creators: state.creators.map(c =>
        c.id === id
          ? { ...c, stage_name: stageName, daily_goal: dailyGoal, weekly_goal: weeklyGoal, monthly_goal: monthlyGoal, notes, is_active: isActive ? 1 : 0, commission_rate: commissionRate !== undefined ? commissionRate : (c.commission_rate || 0), drive_url: driveUrl !== undefined ? driveUrl : (c.drive_url || ''), updated_at: new Date().toISOString() }
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
  addEarning: (creatorId, date, amount) => {
    db.addDailyEarning(creatorId, date, amount);
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
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)
    }));
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
      // Chatters
      const chatters = db.getChattersForAgency(agency.id);
      chatters.forEach(chatter => {
        const commissionRate = chatter.commission_rate || 0;
        const hourlyRate = chatter.hourly_rate || 0;
        const commissionAmount = agencyRevenue * (commissionRate / 100);
        db.upsertPayrollRecord(periodStart, periodEnd, 'chatter', chatter.id, agency.id, agencyRevenue, commissionRate, commissionAmount, hourlyRate);
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

  setDayNote: (teamId, date, notes) => {
    db.upsertDayNote(teamId, date, notes);
    set(state => {
      const filtered = state.teamDayNotes.filter(n => !(n.team_id === teamId && n.date === date));
      return { teamDayNotes: [...filtered, { team_id: teamId, date, notes }] };
    });
  },
}));
