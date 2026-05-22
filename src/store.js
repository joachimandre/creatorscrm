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
  payrollRecords: [],
  payrollPeriod: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, half: 'first' },

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

      set({
        agencies,
        creators: allCreators,
        bookmarkedTasks,
        chatters,
        tasks,
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
  addCreator: (agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '', commissionRate = 0) => {
    const id = db.createCreator(agencyId, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, commissionRate);
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const state = get();
    set({ creators: [...state.creators, creator] });
    return id;
  },

  updateCreatorData: (id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate) => {
    db.updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive, commissionRate);
    const state = get();
    set({
      creators: state.creators.map(c =>
        c.id === id
          ? { ...c, stage_name: stageName, daily_goal: dailyGoal, weekly_goal: weeklyGoal, monthly_goal: monthlyGoal, notes, is_active: isActive ? 1 : 0, commission_rate: commissionRate !== undefined ? commissionRate : (c.commission_rate || 0), updated_at: new Date().toISOString() }
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
  addChatter: (agencyId, name, role = '', notes = '', commissionRate = 0, hourlyRate = 0) => {
    const id = db.createChatter(agencyId, name, role, notes, commissionRate, hourlyRate);
    const chatter = { id, agency_id: agencyId, name, role, notes, commission_rate: commissionRate, hourly_rate: hourlyRate, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    set(state => ({ chatters: [...state.chatters, chatter] }));
    return id;
  },

  updateChatterData: (id, name, role, notes, commissionRate, hourlyRate) => {
    db.updateChatter(id, name, role, notes, commissionRate, hourlyRate);
    set(state => ({
      chatters: state.chatters.map(c => c.id === id ? { ...c, name, role, notes, commission_rate: commissionRate !== undefined ? commissionRate : (c.commission_rate || 0), hourly_rate: hourlyRate !== undefined ? hourlyRate : (c.hourly_rate || 0), updated_at: new Date().toISOString() } : c)
    }));
  },

  deleteChatterData: (id) => {
    db.deleteChatter(id);
    set(state => ({ chatters: state.chatters.filter(c => c.id !== id) }));
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
  setPayrollPeriod: (year, month, half) => set({ payrollPeriod: { year, month, half } }),

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
}));
