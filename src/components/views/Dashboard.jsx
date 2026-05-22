import { useState, useMemo } from 'react';
import { useStore } from '../../store.js';
import {
  TrendingUp, Users, CheckCircle2, AlertCircle, Clock, Plus, Trash2,
  DollarSign, Target, BarChart3, Building2, X, ChevronRight
} from 'lucide-react';
import AgencyRevenueChart from '../charts/AgencyRevenueChart.jsx';
import CreatorGoalProgress from '../charts/CreatorGoalProgress.jsx';
import * as db from '../../db/index.js';

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = '#00d9ff', pulse }) => (
  <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg relative overflow-hidden group hover:border-white/15 transition-all">
    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 60%)` }} />
    <div className="flex items-start justify-between relative">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-sm">{label}</p>
        <p className="text-3xl font-black text-text-primary">{value}</p>
        {sub && <p className="text-xs text-text-tertiary mt-xs">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}>
        <Icon size={20} style={{ color }} className={pulse ? 'animate-pulse' : ''} />
      </div>
    </div>
  </div>
);

// ─── Task pill ─────────────────────────────────────────────────────────────────
const TaskPill = ({ task, color }) => (
  <div className="flex items-center gap-sm px-md py-sm bg-white/5 border border-white/8 rounded-lg hover:bg-white/8 transition-colors">
    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-text-primary truncate">{task.title}</p>
      {task.stage_name && <p className="text-xs text-text-tertiary">{task.stage_name}</p>}
    </div>
    {task.due_date && (
      <span className="text-xs text-text-tertiary flex-shrink-0">{task.due_date.slice(5)}</span>
    )}
  </div>
);

// ─── Add Agency modal ──────────────────────────────────────────────────────────
const AddAgencyModal = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const handle = () => { if (name.trim()) { onAdd(name.trim()); onClose(); } };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-secondary border border-accent-cyan/30 rounded-2xl p-xl shadow-2xl w-full max-w-sm mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-lg">New Agency</h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handle(); if (e.key === 'Escape') onClose(); }}
          placeholder="Agency name..."
          autoFocus
          className="w-full bg-bg-primary/50 border border-white/15 rounded-xl px-lg py-md text-text-primary text-sm focus:outline-none focus:border-accent-cyan/60 transition-all mb-lg"
        />
        <div className="flex gap-md justify-end">
          <button onClick={onClose} className="px-lg py-sm border border-white/10 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handle} disabled={!name.trim()} className="px-lg py-sm bg-gradient-to-r from-accent-cyan to-accent-blue text-bg-primary font-semibold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-30">Create</button>
        </div>
      </div>
    </div>
  );
};

// ─── Agency dashboard panel ────────────────────────────────────────────────────
const AgencyPanel = ({ agency, accentColor, creators, chatters, allEarnings, tasks }) => {
  const [taskTab, setTaskTab] = useState('todo');
  const today = new Date().toISOString().split('T')[0];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const activeCreators = creators.filter(c => c.is_active);

  const monthlyRevenue = useMemo(() => {
    return activeCreators.reduce((sum, c) => {
      return sum + (allEarnings[c.id] || []).reduce((s, e) => s + e.amount, 0);
    }, 0);
  }, [activeCreators, allEarnings]);

  const totalMonthlyGoal = activeCreators.reduce((sum, c) => sum + (c.monthly_goal || 0), 0);
  const goalPct = totalMonthlyGoal > 0 ? Math.min((monthlyRevenue / totalMonthlyGoal) * 100, 100) : 0;

  const agencyChatters = chatters.filter(c => c.agency_id === agency.id);

  // Task breakdown
  const todoTasks = tasks.filter(t => !t.is_completed && (!t.due_date || t.due_date > today));
  const pendingTasks = tasks.filter(t => !t.is_completed && t.due_date === today);
  const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < today);
  const doneTasks = tasks.filter(t => t.is_completed);

  const tabTasks = taskTab === 'todo' ? todoTasks : taskTab === 'pending' ? pendingTasks : taskTab === 'overdue' ? overdueTasks : doneTasks;
  const tabColor = taskTab === 'todo' ? '#00d9ff' : taskTab === 'pending' ? '#ff6b35' : taskTab === 'overdue' ? '#ff006e' : '#00ff88';

  return (
    <div className="space-y-lg animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard icon={DollarSign} label="Monthly Revenue" value={`$${monthlyRevenue.toFixed(0)}`} sub={`of $${totalMonthlyGoal.toFixed(0)} goal`} color={accentColor} />
        <StatCard icon={Target} label="Goal Progress" value={`${goalPct.toFixed(0)}%`} sub={goalPct >= 100 ? 'Goal met! 🎉' : `$${(totalMonthlyGoal - monthlyRevenue).toFixed(0)} remaining`} color={goalPct >= 100 ? '#00ff88' : goalPct >= 80 ? '#ff6b35' : '#ff006e'} />
        <StatCard icon={Users} label="Active Creators" value={activeCreators.length} sub={`${agencyChatters.length} chatters`} color={accentColor} />
        <StatCard icon={CheckCircle2} label="Tasks" value={`${doneTasks.length}/${tasks.length}`} sub={`${overdueTasks.length} overdue`} color={overdueTasks.length > 0 ? '#ff006e' : '#00ff88'} pulse={overdueTasks.length > 0} />
      </div>

      {/* Charts + Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* Revenue chart — takes 2 cols */}
        <div className="xl:col-span-2 space-y-lg">
          <AgencyRevenueChart agencyId={agency.id} agencyName={agency.name} />
          <CreatorGoalProgress agencyId={agency.id} agencyName={agency.name} />
        </div>

        {/* Tasks panel */}
        <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg flex flex-col">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-md">Tasks</h3>

          {/* Tabs */}
          <div className="flex gap-xs mb-md flex-wrap">
            {[
              { key: 'todo', label: 'To-do', count: todoTasks.length, color: '#00d9ff' },
              { key: 'pending', label: 'Due Today', count: pendingTasks.length, color: '#ff6b35' },
              { key: 'overdue', label: 'Overdue', count: overdueTasks.length, color: '#ff006e' },
              { key: 'done', label: 'Done', count: doneTasks.length, color: '#00ff88' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setTaskTab(tab.key)}
                className={`flex items-center gap-xs px-sm py-xs rounded-lg text-xs font-semibold transition-all border ${
                  taskTab === tab.key ? 'text-bg-primary border-transparent' : 'bg-white/5 border-white/8 text-text-tertiary hover:text-text-primary'
                }`}
                style={taskTab === tab.key ? { background: tab.color, borderColor: tab.color } : {}}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1 rounded-full text-xs ${taskTab === tab.key ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="flex-1 space-y-xs overflow-y-auto max-h-64">
            {tabTasks.length === 0 ? (
              <div className="text-center py-lg text-text-tertiary text-sm">
                {taskTab === 'done' ? 'No completed tasks yet' :
                 taskTab === 'overdue' ? '✓ No overdue tasks' :
                 taskTab === 'pending' ? 'Nothing due today' : 'All clear!'}
              </div>
            ) : (
              tabTasks.slice(0, 10).map(task => (
                <TaskPill key={task.id} task={task} color={tabColor} />
              ))
            )}
            {tabTasks.length > 10 && (
              <p className="text-xs text-text-tertiary text-center pt-sm">+{tabTasks.length - 10} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Overview (all agencies) panel ────────────────────────────────────────────
const OverviewPanel = ({ agencies, creators, allEarnings, chatters, tasks }) => {
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < today);
  const doneTasks = tasks.filter(t => t.is_completed);
  const activeCreators = creators.filter(c => c.is_active);

  const totalRevenue = activeCreators.reduce((sum, c) => {
    return sum + (allEarnings[c.id] || []).reduce((s, e) => s + e.amount, 0);
  }, 0);

  return (
    <div className="space-y-lg animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard icon={DollarSign} label="Total Revenue (Mo)" value={`$${totalRevenue.toFixed(0)}`} sub={`across ${agencies.length} agencies`} color="#00d9ff" />
        <StatCard icon={Building2} label="Agencies" value={agencies.length} sub={`${activeCreators.length} active creators`} color="#9d4edd" />
        <StatCard icon={Users} label="Team Size" value={chatters.length} sub="chatters total" color="#ff6b35" />
        <StatCard icon={AlertCircle} label="Overdue Tasks" value={overdueTasks.length} sub={`${doneTasks.length} completed`} color={overdueTasks.length > 0 ? '#ff006e' : '#00ff88'} pulse={overdueTasks.length > 0} />
      </div>

      {/* Per-agency mini cards */}
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Agency Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        {agencies.map((agency, idx) => {
          const color = AGENCY_COLORS[idx % AGENCY_COLORS.length];
          const agCreators = creators.filter(c => c.agency_id === agency.id && c.is_active);
          const rev = agCreators.reduce((sum, c) => sum + (allEarnings[c.id] || []).reduce((s, e) => s + e.amount, 0), 0);
          const goal = agCreators.reduce((sum, c) => sum + (c.monthly_goal || 0), 0);
          const pct = goal > 0 ? Math.min((rev / goal) * 100, 100) : 0;
          const agChatters = chatters.filter(c => c.agency_id === agency.id);
          const agTasks = db.getTasksForAgency(agency.id);
          const agOverdue = agTasks.filter(t => !t.is_completed && t.due_date && t.due_date < today).length;
          const last3 = Array.from({ length: 3 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (2 - i));
            const ds = d.toISOString().split('T')[0];
            return agCreators.reduce((s, c) => { const e = db.getEarningsForCreator(c.id, ds); return s + (e?.amount || 0); }, 0);
          });
          const maxSpark = Math.max(...last3, 1);
          return (
            <div key={agency.id} className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg hover:border-white/15 transition-all overflow-hidden relative group"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 60%)` }} />
              <div className="flex items-start justify-between mb-md relative">
                <div>
                  <h4 className="font-bold text-text-primary">{agency.name}</h4>
                  <p className="text-xs text-text-tertiary">{agCreators.length} creators · {agChatters.length} chatters</p>
                </div>
                {agOverdue > 0 && (
                  <span className="text-xs px-sm py-xs rounded-full bg-accent-pink/15 text-accent-pink border border-accent-pink/30">
                    {agOverdue} overdue
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold relative" style={{ color }}>${rev.toFixed(0)}</p>
              {goal > 0 && (
                <div className="mt-sm relative">
                  <div className="flex items-center justify-between text-xs text-text-tertiary mb-xs">
                    <span>Monthly goal</span><span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: pct >= 100 ? '#00ff88' : pct >= 80 ? '#ff6b35' : color }} />
                  </div>
                </div>
              )}
              {last3.some(v => v > 0) && (
                <div className="mt-sm relative">
                  <p className="text-[10px] text-text-tertiary/40 mb-xs">Last 3 days</p>
                  <div className="flex items-end gap-1 h-5">
                    {last3.map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm transition-all"
                        style={{ height: `${Math.max(15, (v / maxSpark) * 100)}%`, backgroundColor: color, opacity: 0.3 + i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const chatters = useStore(state => state.chatters);
  const addAgency = useStore(state => state.addAgency);
  const deleteAgencyData = useStore(state => state.deleteAgencyData);

  const [selectedAgency, setSelectedAgency] = useState(null); // null = overview
  const [showAddAgency, setShowAddAgency] = useState(false);
  const [confirmDeleteAgency, setConfirmDeleteAgency] = useState(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Load all earnings once
  const allEarnings = useMemo(() => {
    const map = {};
    creators.forEach(c => {
      map[c.id] = db.getEarningsForCreatorMonth(c.id, currentYear, currentMonth);
    });
    return map;
  }, [creators, currentMonth, currentYear]);

  // Get all tasks with creator name enrichment
  const allTasks = useMemo(() => db.getAllTasks(), [creators]);

  const agencyTasks = useMemo(() => {
    if (!selectedAgency) return allTasks;
    return db.getTasksForAgency(selectedAgency);
  }, [selectedAgency, creators]);

  const agencyCreators = useMemo(() => {
    if (!selectedAgency) return creators;
    return creators.filter(c => c.agency_id === selectedAgency);
  }, [selectedAgency, creators]);

  const selectedAgencyObj = agencies.find(a => a.id === selectedAgency);

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg flex-wrap gap-md">
        <div className="flex items-center gap-md">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent">Dashboard</h1>
          {selectedAgencyObj && (
            <ChevronRight size={20} className="text-text-tertiary" />
          )}
          {selectedAgencyObj && (
            <span className="text-xl font-semibold" style={{ color: AGENCY_COLORS[agencies.findIndex(a => a.id === selectedAgency) % AGENCY_COLORS.length] }}>
              {selectedAgencyObj.name}
            </span>
          )}
        </div>

        {/* Delete agency button when one is selected */}
        {selectedAgencyObj && (
          <button
            onClick={() => setConfirmDeleteAgency(selectedAgencyObj)}
            className="flex items-center gap-xs px-md py-xs text-xs text-text-tertiary hover:text-accent-pink border border-white/10 hover:border-accent-pink/30 rounded-lg transition-all"
          >
            <Trash2 size={12} /> Remove Agency
          </button>
        )}
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap mb-xl">
        <button
          onClick={() => setSelectedAgency(null)}
          className={`px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
            selectedAgency === null
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-blue/20 border-accent-cyan/40 text-accent-cyan'
              : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/8'
          }`}
        >
          Overview
        </button>

        {agencies.map((agency, idx) => {
          const color = AGENCY_COLORS[idx % AGENCY_COLORS.length];
          const isActive = selectedAgency === agency.id;
          return (
            <button
              key={agency.id}
              onClick={() => setSelectedAgency(agency.id)}
              className={`px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                isActive ? 'text-bg-primary border-transparent shadow-lg' : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/8'
              }`}
              style={isActive ? { background: color, borderColor: color } : {}}
            >
              {agency.name}
            </button>
          );
        })}

        <button
          onClick={() => setShowAddAgency(true)}
          className="flex items-center gap-xs px-md py-sm rounded-xl text-sm border border-dashed border-white/20 text-text-tertiary hover:text-accent-cyan hover:border-accent-cyan/40 transition-all"
        >
          <Plus size={14} /> Add Agency
        </button>
      </div>

      {/* Main content */}
      {agencies.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-white/10 rounded-2xl">
          <Building2 size={48} className="mx-auto text-text-tertiary/30 mb-lg" />
          <h2 className="text-xl font-semibold text-text-primary mb-sm">No agencies yet</h2>
          <p className="text-text-secondary mb-lg">Create your first agency to get started</p>
          <button onClick={() => setShowAddAgency(true)}
            className="inline-flex items-center gap-sm px-xl py-md bg-gradient-to-r from-accent-cyan to-accent-blue text-bg-primary font-semibold rounded-xl hover:opacity-90 transition-all">
            <Plus size={18} /> Create Agency
          </button>
        </div>
      ) : selectedAgency ? (
        <AgencyPanel
          agency={selectedAgencyObj}
          accentColor={AGENCY_COLORS[agencies.findIndex(a => a.id === selectedAgency) % AGENCY_COLORS.length]}
          creators={agencyCreators}
          chatters={chatters}
          allEarnings={allEarnings}
          tasks={agencyTasks}
        />
      ) : (
        <OverviewPanel
          agencies={agencies}
          creators={creators}
          allEarnings={allEarnings}
          chatters={chatters}
          tasks={allTasks}
        />
      )}

      {/* Add Agency modal */}
      {showAddAgency && (
        <AddAgencyModal
          onClose={() => setShowAddAgency(false)}
          onAdd={(name) => { addAgency(name); }}
        />
      )}

      {/* Delete Agency confirmation */}
      {confirmDeleteAgency && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDeleteAgency(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-2xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Agency?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              Permanently delete <span className="text-accent-pink font-semibold">"{confirmDeleteAgency.name}"</span>?
              This will also remove all its creators and their earnings.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDeleteAgency(null)} className="px-lg py-sm border border-white/10 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={() => {
                deleteAgencyData(confirmDeleteAgency.id);
                setSelectedAgency(null);
                setConfirmDeleteAgency(null);
              }} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-xl text-sm transition-colors">Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
