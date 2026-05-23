import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { BarChart3, Copy, ChevronDown, Plus, Trash2, Pencil } from 'lucide-react';
import Card from '../Card';
import AgencyRevenueChart from '../charts/AgencyRevenueChart.jsx';
import CreatorGoalProgress from '../charts/CreatorGoalProgress.jsx';
import * as db from '../../db/index.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Agency accent colors cycling through each one
const AGENCY_ACCENTS = [
  { border: 'border-l-accent-cyan',   avatar: 'from-cyan-500/40 to-cyan-700/40',   text: '#00d9ff' },
  { border: 'border-l-accent-purple', avatar: 'from-purple-500/40 to-purple-800/40', text: '#9d4edd' },
  { border: 'border-l-accent-orange', avatar: 'from-orange-400/40 to-orange-700/40', text: '#ff6b35' },
  { border: 'border-l-accent-pink',   avatar: 'from-pink-500/40 to-pink-800/40',    text: '#ff006e' },
  { border: 'border-l-accent-lime',   avatar: 'from-lime-400/40 to-lime-700/40',    text: '#00ff88' },
];

const pctColor = (earned, goal) => {
  if (!goal || earned === 0) return { text: 'text-text-secondary', bar: 'bg-white/20', chip: '' };
  const p = earned / goal;
  if (p >= 1)   return { text: 'text-accent-lime',   bar: 'bg-accent-lime',   chip: 'bg-accent-lime/15 border-accent-lime/40 text-accent-lime' };
  if (p >= 0.8) return { text: 'text-accent-orange', bar: 'bg-accent-orange', chip: 'bg-accent-orange/15 border-accent-orange/40 text-accent-orange' };
  return          { text: 'text-accent-pink',   bar: 'bg-accent-pink',   chip: 'bg-accent-pink/15 border-accent-pink/40 text-accent-pink' };
};

// Earned amount + mini progress bar (defined outside to avoid re-mount)
const EarnedCell = ({ earned, goal }) => {
  const pct = goal > 0 ? Math.min((earned / goal) * 100, 100) : 0;
  const { text, bar } = pctColor(earned, goal);
  return (
    <div className="text-right min-w-[80px]">
      <div className={`font-mono font-bold text-sm ${text}`}>${earned.toFixed(2)}</div>
      {goal > 0 && (
        <div className="flex items-center justify-end gap-1 mt-1">
          <div className="w-14 h-1 bg-bg-primary rounded-full overflow-hidden" style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }}>
            <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-text-tertiary font-mono" style={{ fontSize: 9 }}>{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
};

const RevenueMaster = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const addCreator = useStore(state => state.addCreator);
  const updateCreatorData = useStore(state => state.updateCreatorData);
  const deleteCreatorData = useStore(state => state.deleteCreatorData);

  const [agencyFilter, setAgencyFilter] = useState(null);
  const [earnings, setEarnings] = useState({});
  const [expandedInactive, setExpandedInactive] = useState(false);
  const [copiedAgency, setCopiedAgency] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pendingValue, setPendingValue] = useState('');
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [newCreator, setNewCreator] = useState({ name: '', agencyId: '', dailyGoal: '', weeklyGoal: '', monthlyGoal: '', commissionRate: '' });
  const [confirmDelete, setConfirmDelete] = useState(null); // creator object pending delete

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const today = currentDate.getDate();

  useEffect(() => { loadEarnings(); }, [creators]);

  const loadEarnings = () => {
    const all = {};
    creators.forEach(c => {
      all[c.id] = db.getEarningsForCreatorMonth(c.id, currentYear, currentMonth);
    });
    setEarnings(all);
  };

  const getEarningForDay = (creatorId, day) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return (earnings[creatorId] || []).find(e => e.date === date)?.amount || 0;
  };

  const getWeeklyTotal = (creatorId) => {
    const now = new Date();
    const dow = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return (earnings[creatorId] || []).reduce((sum, e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= startOfWeek && d <= now ? sum + e.amount : sum;
    }, 0);
  };

  const getMonthlyTotal = (creatorId) =>
    (earnings[creatorId] || []).reduce((sum, e) => sum + e.amount, 0);

  const getPctOfAgency = (creatorId, agencyId) => {
    const mine = getMonthlyTotal(creatorId);
    const total = creators.filter(c => c.agency_id === agencyId && c.is_active)
      .reduce((s, c) => s + getMonthlyTotal(c.id), 0);
    return total > 0 ? ((mine / total) * 100).toFixed(1) : '0.0';
  };

  const isEditing = (creatorId, type, day = null) =>
    editing?.creatorId === creatorId && editing?.type === type && editing?.day === day;

  const startEdit = (creatorId, type, day, currentValue) => {
    setEditing({ creatorId, type, day });
    setPendingValue(currentValue ? String(currentValue) : '');
  };

  const commitEdit = () => {
    if (!editing) return;
    const { creatorId, type, day } = editing;
    const creator = creators.find(c => c.id === creatorId);
    if (!creator) { cancelEdit(); return; }

    if (type === 'day') {
      const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const amount = parseFloat(pendingValue);
      if (!isNaN(amount) && amount > 0) db.addDailyEarning(creatorId, date, amount);
      else db.deleteDailyEarning(creatorId, date);
      loadEarnings();
    } else if (type === 'name') {
      const name = pendingValue.trim();
      if (name) updateCreatorData(creatorId, name, creator.daily_goal, creator.weekly_goal, creator.monthly_goal, creator.notes || '', creator.is_active, creator.commission_rate || 0);
    } else if (type === 'commission_rate') {
      const rate = Math.min(100, Math.max(0, parseFloat(pendingValue) || 0));
      updateCreatorData(creatorId, creator.stage_name, creator.daily_goal, creator.weekly_goal, creator.monthly_goal, creator.notes || '', creator.is_active, rate);
    } else {
      const amount = parseFloat(pendingValue) || 0;
      const g = { daily_goal: creator.daily_goal, weekly_goal: creator.weekly_goal, monthly_goal: creator.monthly_goal };
      g[type] = amount;
      updateCreatorData(creatorId, creator.stage_name, g.daily_goal, g.weekly_goal, g.monthly_goal, creator.notes || '', creator.is_active, creator.commission_rate || 0);
    }
    cancelEdit();
  };

  const cancelEdit = () => { setEditing(null); setPendingValue(''); };

  const handleDeleteCreator = (creator) => setConfirmDelete(creator);

  const confirmDeleteCreator = () => {
    if (!confirmDelete) return;
    deleteCreatorData(confirmDelete.id);
    loadEarnings();
    setConfirmDelete(null);
  };

  const handleAddCreator = () => {
    if (!newCreator.name.trim() || !newCreator.agencyId) return;
    addCreator(parseInt(newCreator.agencyId), newCreator.name.trim(),
      parseFloat(newCreator.dailyGoal) || 0,
      parseFloat(newCreator.weeklyGoal) || 0,
      parseFloat(newCreator.monthlyGoal) || 0,
      '',
      parseFloat(newCreator.commissionRate) || 0);
    setNewCreator({ name: '', agencyId: agencyFilter ? String(agencyFilter) : '', dailyGoal: '', weeklyGoal: '', monthlyGoal: '', commissionRate: '' });
    setShowAddCreator(false);
  };

  const copyAgencyReport = (agencyId) => {
    const agency = agencies.find(a => a.id === agencyId);
    const list = creators.filter(c => c.agency_id === agencyId && c.is_active);
    let rev = 0, topC = null, topE = 0;
    list.forEach(c => { const w = getWeeklyTotal(c.id); rev += w; if (w > topE) { topE = w; topC = c; } });
    navigator.clipboard.writeText(
      `📊 ${agency.name} Weekly Report\nWeek of ${new Date().toLocaleDateString()}\n\nTotal Revenue: $${rev.toFixed(2)}\nTop Performer: ${topC?.stage_name || 'N/A'} ($${topE.toFixed(2)})`
    );
    setCopiedAgency(agencyId);
    setTimeout(() => setCopiedAgency(null), 2000);
  };

  const inputClass = 'bg-bg-primary border border-accent-cyan rounded-md px-2 py-0.5 text-text-primary font-mono text-xs text-right focus:outline-none focus:ring-1 focus:ring-accent-cyan';

  const renderGoalCell = (creator, type, inactive) => {
    const value = creator[type] || 0;
    if (isEditing(creator.id, type)) {
      return (
        <input type="number" autoFocus value={pendingValue}
          onChange={e => setPendingValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          step="1" min="0" className={`${inputClass} w-20`}
        />
      );
    }
    return (
      <div
        onClick={() => !inactive && startEdit(creator.id, type, null, value)}
        className={`group/goal flex items-center justify-end gap-1 ${!inactive ? 'cursor-text' : ''}`}
      >
        <span className="font-mono text-text-tertiary text-xs">${value.toFixed(0)}</span>
        {!inactive && <Pencil size={9} className="opacity-0 group-hover/goal:opacity-40 text-accent-cyan transition-opacity" />}
      </div>
    );
  };

  const renderRow = (creator, inactive = false) => {
    const monthly = getMonthlyTotal(creator.id);
    const weekly = getWeeklyTotal(creator.id);
    const agencyIdx = agencies.findIndex(a => a.id === creator.agency_id);
    const accent = AGENCY_ACCENTS[agencyIdx % AGENCY_ACCENTS.length] || AGENCY_ACCENTS[0];
    const initials = creator.stage_name.slice(0, 2).toUpperCase();

    return (
      <tr
        key={creator.id}
        className={`group transition-colors hover:bg-white/[0.03] ${inactive ? 'opacity-50' : ''}`}
      >
        {/* Delete */}
        <td className="px-2 py-3 w-8">
          {!inactive && (
            <button onClick={() => handleDeleteCreator(creator)}
              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent-pink transition-all p-1 rounded">
              <Trash2 size={12} />
            </button>
          )}
        </td>

        {/* Creator name with left accent + avatar */}
        <td className={`py-3 pl-4 pr-6 border-l-2 min-w-[160px]`} style={{ borderLeftColor: accent.text }}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${accent.avatar} border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
              {initials}
            </div>
            {isEditing(creator.id, 'name') ? (
              <input type="text" autoFocus value={pendingValue}
                onChange={e => setPendingValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                className="bg-bg-primary border border-accent-cyan rounded-md px-2 py-0.5 text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent-cyan w-28"
              />
            ) : (
              <span onClick={() => !inactive && startEdit(creator.id, 'name', null, creator.stage_name)}
                className={`font-semibold text-sm text-text-primary ${!inactive ? 'cursor-text hover:text-accent-cyan transition-colors' : ''}`}>
                {creator.stage_name}
              </span>
            )}
          </div>
        </td>

        {/* % Revenue — pill badge */}
        <td className="text-right px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-bg-primary text-text-secondary">
            {getPctOfAgency(creator.id, creator.agency_id)}%
          </span>
        </td>

        {/* Weekly Earned */}
        <td className="text-right px-4 py-3">
          <EarnedCell earned={weekly} goal={creator.weekly_goal} />
        </td>

        {/* Weekly Goal */}
        <td className="text-right px-4 py-3">
          {renderGoalCell(creator, 'weekly_goal', inactive)}
        </td>

        {/* Monthly Earned */}
        <td className="text-right px-4 py-3">
          <EarnedCell earned={monthly} goal={creator.monthly_goal} />
        </td>

        {/* Monthly Goal */}
        <td className="text-right px-4 py-3">
          {renderGoalCell(creator, 'monthly_goal', inactive)}
        </td>

        {/* Daily Goal */}
        <td className="text-right px-4 py-3">
          {renderGoalCell(creator, 'daily_goal', inactive)}
        </td>

        {/* Commission Rate % */}
        <td className="text-right px-4 py-3 border-r border-white/5">
          {isEditing(creator.id, 'commission_rate') ? (
            <input type="number" autoFocus value={pendingValue}
              onChange={e => setPendingValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
              step="0.01" min="0" max="100"
              className={`${inputClass} w-16`}
            />
          ) : (
            <div
              onClick={() => !inactive && startEdit(creator.id, 'commission_rate', null, creator.commission_rate || 0)}
              className={`group/rate flex items-center justify-end gap-1 ${!inactive ? 'cursor-text' : ''}`}
            >
              <span className="font-mono text-accent-lime text-xs">{(creator.commission_rate || 0).toFixed(1)}%</span>
              {!inactive && <Pencil size={9} className="opacity-0 group-hover/rate:opacity-40 text-accent-lime transition-opacity" />}
            </div>
          )}
        </td>

        {/* Day columns */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const val = getEarningForDay(creator.id, day);
          const isToday = day === today;
          const isFuture = day > today;
          const { chip } = pctColor(val, creator.daily_goal);

          if (isEditing(creator.id, 'day', day)) {
            return (
              <td key={`${creator.id}-d${day}`} className="px-1 py-2">
                <input type="number" autoFocus value={pendingValue}
                  onChange={e => setPendingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  step="0.01" min="0"
                  className={`${inputClass} w-14`}
                />
              </td>
            );
          }

          return (
            <td
              key={`${creator.id}-d${day}`}
              onClick={() => !inactive && startEdit(creator.id, 'day', day, val)}
              className={`px-0.5 py-2 transition-colors text-center
                ${!inactive && !isFuture ? 'cursor-pointer hover:bg-white/5' : ''}
                ${isToday ? 'bg-accent-cyan/5' : ''}
              `}
            >
              {val > 0 ? (
                <div className={`mx-auto inline-flex items-center justify-center px-1.5 py-0.5 rounded-md border text-xs font-mono font-semibold ${chip || 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan'}`}>
                  ${val.toFixed(0)}
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className={`rounded-full ${isToday ? 'w-1.5 h-1.5 bg-accent-cyan/50' : isFuture ? 'w-px h-px bg-transparent' : 'w-1 h-1 bg-white/10'}`} />
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderTableHead = () => (
    <tr className="border-b border-white/10">
      <th className="w-8 bg-bg-primary/80" />
      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/80">Creator</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/80">% Rev</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-white/[0.02]">Wk Earned</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-cyan/60 bg-white/[0.02]">Wk Goal</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-white/[0.02]">Mo Earned</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-cyan/60 bg-white/[0.02]">Mo Goal</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-cyan/60 bg-white/[0.02]">Day Goal</th>
      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-white/[0.02] border-r border-white/5">Rate %</th>
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const isToday = day === today;
        return (
          <th key={`h-${day}`}
            className={`text-center py-3 font-semibold text-xs w-10 ${isToday ? 'text-accent-cyan bg-accent-cyan/10' : 'text-text-tertiary/50'}`}>
            {day}
          </th>
        );
      })}
    </tr>
  );

  const activeCreators = creators.filter(c => c.is_active);
  const inactiveCreators = creators.filter(c => !c.is_active);
  const filteredActive = agencyFilter ? activeCreators.filter(c => c.agency_id === agencyFilter) : activeCreators;
  const filteredInactive = agencyFilter ? inactiveCreators.filter(c => c.agency_id === agencyFilter) : inactiveCreators;

  // Month summary stats (computed from current earnings state)
  const monthSummary = (() => {
    const total = filteredActive.reduce((s, c) => s + getMonthlyTotal(c.id), 0);
    const dayTotals = {};
    filteredActive.forEach(c => {
      (earnings[c.id] || []).forEach(e => { dayTotals[e.date] = (dayTotals[e.date] || 0) + e.amount; });
    });
    const entries = Object.entries(dayTotals);
    const best    = entries.reduce((b, cur) => cur[1] > (b?.[1] ?? 0) ? cur : b, null);
    const logged  = entries.filter(([, v]) => v > 0).length;
    return { total, best, logged, daysElapsed: Math.min(today, daysInMonth) };
  })();

  return (
    <div className="p-lg h-full overflow-auto space-y-lg">
      <h1 className="text-3xl font-bold flex items-center gap-md">
        <BarChart3 size={32} className="text-accent-lime" />
        <span className="bg-gradient-to-r from-accent-lime to-accent-cyan bg-clip-text text-transparent">Revenue Master</span>
      </h1>

      {/* Controls */}
      <div className="flex items-center gap-md flex-wrap">
        <select value={agencyFilter || ''} onChange={e => setAgencyFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="rounded-lg px-lg py-sm text-text-primary focus:outline-none focus:border-accent-cyan transition-all">
          <option value="">All Agencies</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <button
          onClick={() => { setShowAddCreator(v => !v); setNewCreator(n => ({ ...n, agencyId: agencyFilter ? String(agencyFilter) : '' })); }}
          className="flex items-center gap-sm px-lg py-sm bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/40 rounded-lg text-accent-cyan text-sm font-medium hover:from-accent-cyan/30 hover:to-accent-purple/30 transition-all"
        >
          <Plus size={16} />
          Add Creator
        </button>
      </div>

      {/* Add Creator Form */}
      {showAddCreator && (
        <div className="neu-card p-lg animate-slide-up">
          <h3 className="text-sm font-semibold text-accent-cyan mb-md uppercase tracking-wider">New Creator</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
            <div>
              <label className="block text-xs text-text-tertiary mb-xs">Stage Name *</label>
              <input type="text" value={newCreator.name} onChange={e => setNewCreator(n => ({ ...n, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddCreator()} placeholder="e.g. Luna" className="w-full rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-all" />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-xs">Agency *</label>
              <select value={newCreator.agencyId} onChange={e => setNewCreator(n => ({ ...n, agencyId: e.target.value }))} className="w-full rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-cyan transition-all">
                <option value="">Select...</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {[['dailyGoal', 'Daily Goal'], ['weeklyGoal', 'Weekly Goal'], ['monthlyGoal', 'Monthly Goal']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-text-tertiary mb-xs">{label} ($)</label>
                <input type="number" value={newCreator[key]} onChange={e => setNewCreator(n => ({ ...n, [key]: e.target.value }))} placeholder="0" min="0" className="w-full rounded-lg px-md py-sm text-text-primary text-sm font-mono focus:outline-none focus:border-accent-cyan transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-accent-lime/80 mb-xs">Commission %</label>
              <input type="number" value={newCreator.commissionRate} onChange={e => setNewCreator(n => ({ ...n, commissionRate: e.target.value }))} placeholder="0" min="0" max="100" step="0.01" className="w-full rounded-lg px-md py-sm text-accent-lime text-sm font-mono focus:outline-none focus:border-accent-lime/60 transition-all" />
            </div>
            <div className="flex items-end gap-sm">
              <button onClick={handleAddCreator} disabled={!newCreator.name.trim() || !newCreator.agencyId}
                className="flex-1 px-md py-sm bg-gradient-to-r from-accent-cyan to-accent-purple text-bg-primary font-semibold rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                Add
              </button>
              <button onClick={() => setShowAddCreator(false)} className="px-md py-sm neu-btn rounded-lg text-sm text-text-tertiary hover:text-text-primary transition-colors">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-text-tertiary/60">
        Click any value to edit · Enter to save · Escape to cancel · Clear a day entry to remove it
      </p>

      {/* Month Summary Bar */}
      {filteredActive.length > 0 && monthSummary.total > 0 && (
        <div className="flex items-center gap-lg flex-wrap px-lg py-md neu-card-inset rounded-xl">
          <span className="text-xs font-bold text-text-secondary">{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
          <div className="w-px h-3 bg-white/15 shrink-0" />
          <div className="flex items-center gap-xs">
            <span className="text-[11px] text-text-tertiary">Total:</span>
            <span className="text-sm font-black font-mono text-accent-cyan">${monthSummary.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>
          {monthSummary.best && (
            <>
              <div className="w-px h-3 bg-white/15 shrink-0" />
              <div className="flex items-center gap-xs">
                <span className="text-[11px] text-text-tertiary">Best day:</span>
                <span className="text-sm font-bold font-mono text-accent-lime">${monthSummary.best[1].toFixed(0)}</span>
                <span className="text-[11px] text-text-tertiary">({monthSummary.best[0].slice(5).replace('-', '/')})</span>
              </div>
            </>
          )}
          <div className="w-px h-3 bg-white/15 shrink-0" />
          <div className="flex items-center gap-xs">
            <span className="text-[11px] text-text-tertiary">Days logged:</span>
            <span className="text-sm font-bold font-mono text-text-secondary">{monthSummary.logged}/{monthSummary.daysElapsed}</span>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl overflow-hidden border border-white/5 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ background: 'rgba(10,12,30,0.7)' }}>
            <thead>{renderTableHead()}</thead>
            <tbody>
              {filteredActive.length === 0 ? (
                <tr>
                  <td colSpan="100" className="text-center py-16 text-text-tertiary">
                    <div className="flex flex-col items-center gap-sm">
                      <BarChart3 size={32} className="text-text-tertiary/30" />
                      <span>No active creators — click "Add Creator" to get started</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActive.map(c => renderRow(c))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inactive */}
      {filteredInactive.length > 0 && (
        <div className="mt-xl">
          <button onClick={() => setExpandedInactive(v => !v)}
            className="flex items-center gap-md w-full text-left px-md py-sm neu-btn rounded-xl transition-all mb-lg">
            <ChevronDown size={16} className={`text-text-tertiary transition-transform ${expandedInactive ? 'rotate-180' : ''}`} />
            <span className="text-sm font-semibold text-text-secondary">Inactive Creators</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-primary text-text-tertiary font-mono">{filteredInactive.length}</span>
          </button>
          {expandedInactive && (
            <div className="rounded-xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ background: 'rgba(10,12,30,0.5)' }}>
                  <thead>{renderTableHead()}</thead>
                  <tbody>{filteredInactive.map(c => renderRow(c, true))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {agencies.length > 0 && (
        <div className="mt-xl space-y-lg">
          <h2 className="text-xl font-semibold text-text-primary">Analytics & Progress</h2>
          {agencyFilter ? (
            <div className="space-y-lg">
              <AgencyRevenueChart agencyId={agencyFilter} agencyName={agencies.find(a => a.id === agencyFilter)?.name} />
              <CreatorGoalProgress agencyId={agencyFilter} agencyName={agencies.find(a => a.id === agencyFilter)?.name} />
            </div>
          ) : (
            <div className="space-y-xl">
              {agencies.map(agency => (
                <div key={agency.id} className="space-y-lg">
                  <h3 className="text-lg font-semibold" style={{ color: AGENCY_ACCENTS[agencies.findIndex(a => a.id === agency.id) % AGENCY_ACCENTS.length]?.text }}>
                    {agency.name}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
                    <AgencyRevenueChart agencyId={agency.id} agencyName={agency.name} />
                    <CreatorGoalProgress agencyId={agency.id} agencyName={agency.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Creator?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              This will permanently delete <span className="text-accent-pink font-semibold">"{confirmDelete.stage_name}"</span> and all their earnings history.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button onClick={confirmDeleteCreator} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick copy reports */}
      {!agencyFilter && agencies.length > 0 && (
        <div className="mt-xl">
          <h3 className="text-sm font-semibold text-text-tertiary mb-md uppercase tracking-wider">Quick Actions</h3>
          <div className="flex flex-wrap gap-md">
            {agencies.map(agency => (
              <button key={agency.id} onClick={() => copyAgencyReport(agency.id)}
                className="flex items-center gap-sm px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-all">
                <Copy size={14} />
                {copiedAgency === agency.id ? '✓ Copied!' : `${agency.name} Report`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueMaster;
