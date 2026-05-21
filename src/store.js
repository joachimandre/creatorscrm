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

      set({
        agencies,
        creators: allCreators,
        bookmarkedTasks,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  },

  // Agency operations
  addAgency: (name, notes = '') => {
    const id = db.createAgency(name, notes);
    const state = get();
    set({ agencies: [...state.agencies, { id, name, notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] });
    return id;
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
  addCreator: (agencyId, stageName, dailyGoal = 0, weeklyGoal = 0, monthlyGoal = 0, notes = '') => {
    const id = db.createCreator(agencyId, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes);
    const creator = {
      id,
      agency_id: agencyId,
      stage_name: stageName,
      daily_goal: dailyGoal,
      weekly_goal: weeklyGoal,
      monthly_goal: monthlyGoal,
      is_active: 1,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const state = get();
    set({ creators: [...state.creators, creator] });
    return id;
  },

  updateCreatorData: (id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive) => {
    db.updateCreator(id, stageName, dailyGoal, weeklyGoal, monthlyGoal, notes, isActive);
    const state = get();
    set({
      creators: state.creators.map(c =>
        c.id === id
          ? { ...c, stage_name: stageName, daily_goal: dailyGoal, weekly_goal: weeklyGoal, monthly_goal: monthlyGoal, notes, is_active: isActive ? 1 : 0, updated_at: new Date().toISOString() }
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
}));
