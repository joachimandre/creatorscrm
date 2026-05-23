import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import * as db from '../../db/index.js';
import {
  Star, ExternalLink, Pencil, X, Check, Plus, Trash2,
  Search, ChevronDown, ChevronUp, Target, Link2, Users,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-accent-cyan/20',   text: 'text-accent-cyan',   hex: '#00d9ff' },
  { bg: 'bg-accent-purple/20', text: 'text-accent-purple', hex: '#9d4edd' },
  { bg: 'bg-accent-pink/20',   text: 'text-accent-pink',   hex: '#ff006e' },
  { bg: 'bg-accent-lime/20',   text: 'text-accent-lime',   hex: '#00ff88' },
  { bg: 'bg-accent-orange/20', text: 'text-accent-orange', hex: '#ff6b35' },
  { bg: 'bg-accent-blue/20',   text: 'text-accent-blue',   hex: '#3b82f6' },
];

const TEAM_COLOR_HEX = {
  'accent-cyan':   '#00d9ff',
  'accent-lime':   '#00ff88',
  'accent-purple': '#9d4edd',
  'accent-pink':   '#ff006e',
  'accent-orange': '#ff6b35',
  'accent-blue':   '#3b82f6',
};

const avatarColor = (creator) => AVATAR_COLORS[creator.id % AVATAR_COLORS.length];

const pctColor = (earned, goal) => {
  if (!goal) return { bar: 'bg-white/15', text: 'text-text-tertiary', hex: '#ffffff30', glow: false, label: '' };
  const p = earned / goal;
  if (p >= 1)   return { bar: 'bg-accent-lime',   text: 'text-accent-lime',   hex: '#00ff88', glow: true,  label: '🎯 Goal Hit!' };
  if (p >= 0.8) return { bar: 'bg-accent-lime/60', text: 'text-accent-lime',  hex: '#00ff8899', glow: false, label: '' };
  if (p >= 0.5) return { bar: 'bg-accent-orange', text: 'text-accent-orange', hex: '#ff6b35', glow: false, label: '' };
  return          { bar: 'bg-accent-pink',   text: 'text-accent-pink',   hex: '#ff006e', glow: false, label: '' };
};

const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDec = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Sparkline — pure CSS mini bars ────────────────────────────────────────────
const Sparkline = ({ values, barHex }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 22 }}>
      {values.map((v, i) => (
        <div key={i}
          className="w-[3px] rounded-t-[1px] transition-all"
          style={{
            height: v > 0 ? `${Math.max(10, Math.round((v / max) * 100))}%` : '8%',
            backgroundColor: barHex,
            opacity: v === 0 ? 0.12 : 0.65,
          }}
        />
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Creators = () => {
  const agencies          = useStore(s => s.agencies);
  const creators          = useStore(s => s.creators);
  const teams             = useStore(s => s.teams);
  const teamMembers       = useStore(s => s.teamMembers);
  const addCreator        = useStore(s => s.addCreator);
  const updateCreatorData = useStore(s => s.updateCreatorData);
  const deleteCreatorData = useStore(s => s.deleteCreatorData);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [sortBy,         setSortBy]         = useState('name'); // 'name' | 'monthly' | 'progress'
  const [showInactive,   setShowInactive]   = useState(false);
  const [editingId,      setEditingId]      = useState(null);
  const [editForm,       setEditForm]       = useState({});
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [newCreator,     setNewCreator]     = useState({ name: '', dailyGoal: '', weeklyGoal: '', monthlyGoal: '', commissionRate: '', driveUrl: '' });
  const [confirmDelete,  setConfirmDelete]  = useState(null);

  // Subscriber tracker state
  const [subscriberCounts, setSubscriberCounts] = useState({});
  const [subLogOpen,       setSubLogOpen]        = useState(null);
  const [subLogForm,       setSubLogForm]        = useState({ date: '', count: '', notes: '' });

  // ── Earnings state ────────────────────────────────────────────────────────────
  const [earnings,     setEarnings]     = useState({}); // creatorId → [{date,amount}]
  const [todayEarnings, setTodayEarnings] = useState({}); // creatorId → number
  const [last7Earnings, setLast7Earnings] = useState({}); // creatorId → [7 numbers]

  // ── Derived ───────────────────────────────────────────────────────────────────
  const activeAgency  = selectedAgency ?? agencies[0]?.id ?? null;
  const now           = new Date();
  const currentYear   = now.getFullYear();
  const currentMonth  = now.getMonth() + 1;
  const todayIso      = now.toISOString().split('T')[0];

  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // ── Load earnings ─────────────────────────────────────────────────────────────
  const loadEarnings = () => {
    const newEarnings  = {};
    const newToday     = {};
    const newLast7     = {};
    creators.forEach(c => {
      newEarnings[c.id]  = db.getEarningsForCreatorMonth(c.id, currentYear, currentMonth);
      newToday[c.id]     = db.getEarningsForCreator(c.id, todayIso)?.amount || 0;
      newLast7[c.id]     = last7Dates.map(d => db.getEarningsForCreator(c.id, d)?.amount || 0);
    });
    setEarnings(newEarnings);
    setTodayEarnings(newToday);
    setLast7Earnings(newLast7);
  };

  useEffect(() => { loadEarnings(); }, [creators]);

  // ── Load subscriber counts ────────────────────────────────────────────────
  const loadSubscriberCounts = () => {
    const counts = {};
    creators.forEach(c => {
      const history = db.getSubscriberHistory(c.id);
      counts[c.id] = {
        latest: history.length > 0 ? history[history.length - 1] : null,
        prev:   history.length >= 2 ? history[history.length - 2] : null,
      };
    });
    setSubscriberCounts(counts);
  };

  useEffect(() => { loadSubscriberCounts(); }, [creators]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcut: Escape closes edit panel & add modal ───────────────────
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') {
        setEditingId(null);
        setShowAddModal(false);
        setConfirmDelete(null);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getMonthlyTotal = (creatorId) =>
    (earnings[creatorId] || []).reduce((sum, e) => sum + e.amount, 0);

  const agencyCreators = creators.filter(c => c.agency_id === activeAgency);
  const agencyMonthlyTotal = agencyCreators
    .filter(c => c.is_active)
    .reduce((sum, c) => sum + getMonthlyTotal(c.id), 0);

  const getAgencyPct = (creatorId) => {
    if (!agencyMonthlyTotal) return '0';
    return ((getMonthlyTotal(creatorId) / agencyMonthlyTotal) * 100).toFixed(1);
  };

  const getCreatorTeam = (creatorId) => {
    const member = teamMembers.find(m => m.creator_id === creatorId);
    if (!member) return null;
    return teams.find(t => t.id === member.team_id) || null;
  };

  // Filter + sort
  const filteredCreators = agencyCreators
    .filter(c => c.stage_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name')     return a.stage_name.localeCompare(b.stage_name);
      if (sortBy === 'monthly')  return getMonthlyTotal(b.id) - getMonthlyTotal(a.id);
      if (sortBy === 'progress') {
        const pa = a.monthly_goal ? getMonthlyTotal(a.id) / a.monthly_goal : 0;
        const pb = b.monthly_goal ? getMonthlyTotal(b.id) / b.monthly_goal : 0;
        return pb - pa;
      }
      return 0;
    });

  const activeCreators   = filteredCreators.filter(c => c.is_active);
  const inactiveCreators = filteredCreators.filter(c => !c.is_active);

  // ── Edit handlers ─────────────────────────────────────────────────────────────
  const openEdit = (creator) => {
    setEditingId(creator.id);
    setEditForm({
      name:           creator.stage_name,
      dailyGoal:      String(creator.daily_goal   || ''),
      weeklyGoal:     String(creator.weekly_goal  || ''),
      monthlyGoal:    String(creator.monthly_goal || ''),
      commissionRate: String(creator.commission_rate || ''),
      driveUrl:       creator.drive_url || '',
      notes:          creator.notes || '',
      isActive:       !!creator.is_active,
    });
  };

  const saveEdit = (creator) => {
    updateCreatorData(
      creator.id,
      editForm.name.trim() || creator.stage_name,
      parseFloat(editForm.dailyGoal)      || 0,
      parseFloat(editForm.weeklyGoal)     || 0,
      parseFloat(editForm.monthlyGoal)    || 0,
      editForm.notes,
      editForm.isActive,
      parseFloat(editForm.commissionRate) || 0,
      editForm.driveUrl.trim(),
    );
    setEditingId(null);
  };

  // ── Subscriber log handler ────────────────────────────────────────────────────
  const handleLogSub = (creatorId) => {
    const count = parseInt(subLogForm.count);
    if (isNaN(count) || count < 0) return;
    const date = subLogForm.date || todayIso;
    db.addSubscriberCount(creatorId, date, count, subLogForm.notes || '');
    loadSubscriberCounts();
    setSubLogOpen(null);
    setSubLogForm({ date: '', count: '', notes: '' });
  };

  // ── Add creator handler ───────────────────────────────────────────────────────
  const handleAddCreator = () => {
    if (!newCreator.name.trim() || !activeAgency) return;
    addCreator(
      activeAgency,
      newCreator.name.trim(),
      parseFloat(newCreator.dailyGoal)      || 0,
      parseFloat(newCreator.weeklyGoal)     || 0,
      parseFloat(newCreator.monthlyGoal)    || 0,
      '',
      parseFloat(newCreator.commissionRate) || 0,
      newCreator.driveUrl.trim(),
    );
    setNewCreator({ name: '', dailyGoal: '', weeklyGoal: '', monthlyGoal: '', commissionRate: '', driveUrl: '' });
    setShowAddModal(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────────
  const renderCard = (creator) => {
    const monthEarned = getMonthlyTotal(creator.id);
    const todayAmt    = todayEarnings[creator.id] || 0;
    const last7       = last7Earnings[creator.id]  || Array(7).fill(0);
    const pct         = creator.monthly_goal ? (monthEarned / creator.monthly_goal) * 100 : 0;
    const colors      = pctColor(monthEarned, creator.monthly_goal);
    const av          = avatarColor(creator);
    const team        = getCreatorTeam(creator.id);
    const teamHex     = team ? (TEAM_COLOR_HEX[team.color] || '#888') : null;
    const hasDrive    = !!creator.drive_url;
    const isEditing   = editingId === creator.id;
    const todayPct    = creator.daily_goal ? todayAmt / creator.daily_goal : 0;
    const todayColor  = todayAmt === 0 ? 'text-text-tertiary/60'
      : todayPct >= 1 ? 'text-accent-lime' : 'text-accent-orange';
    const isInactive  = !creator.is_active;
    const subData     = subscriberCounts[creator.id] || null;

    return (
      <div key={creator.id}
        className={`relative group flex flex-col neu-card overflow-hidden transition-all duration-200
          ${isInactive ? 'opacity-60' : ''}
          ${hasDrive && !isInactive ? 'cursor-pointer hover:shadow-lg hover:-translate-y-[1px]' : ''}
          ${colors.glow && !isInactive ? '!border-accent-lime/30 shadow-glow-lime' : ''}
        `}
        onClick={() => {
          if (!isEditing && hasDrive && !isInactive) {
            window.open(creator.drive_url, '_blank', 'noopener,noreferrer');
          }
        }}>

        {/* Colored top strip */}
        <div className="h-[2px]" style={{ backgroundColor: teamHex || av.hex }} />

        {/* Card body */}
        <div className="p-lg flex flex-col gap-md flex-1">

          {/* Top row: team badge + drive icon */}
          <div className="flex items-center justify-between gap-sm">
            {/* Team badge */}
            {team ? (
              <div className="flex items-center gap-xs">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: teamHex }} />
                <span className="text-[11px] font-semibold text-text-tertiary/80">{team.name}</span>
              </div>
            ) : (
              <span className="text-[11px] text-text-tertiary/40 italic">No Team</span>
            )}

            {/* Drive link icon */}
            <button
              onClick={e => {
                e.stopPropagation();
                if (hasDrive) window.open(creator.drive_url, '_blank', 'noopener,noreferrer');
                else openEdit(creator);
              }}
              title={hasDrive ? 'Open Google Drive' : 'Add Drive link (click to edit)'}
              className={`flex items-center gap-xs p-xs rounded-lg transition-all
                ${hasDrive
                  ? 'text-accent-cyan hover:bg-accent-cyan/10 hover:text-accent-cyan'
                  : 'text-text-tertiary/25 hover:text-text-tertiary/60 hover:bg-white/5'
                }`}>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Avatar + name row */}
          <div className="flex items-center gap-md">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${av.bg} ${av.text} ${isInactive ? 'grayscale' : ''}`}>
              {creator.stage_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{creator.stage_name}</p>
              <div className="flex items-center gap-sm mt-[2px]">
                {creator.commission_rate > 0 && (
                  <span className="text-xs text-text-tertiary/60 font-medium">{creator.commission_rate}% comm</span>
                )}
                <span className={`text-xs px-1.5 py-[1px] rounded-full font-semibold border
                  ${creator.is_active
                    ? 'bg-accent-lime/10 border-accent-lime/25 text-accent-lime/80'
                    : 'bg-bg-primary text-text-tertiary/50'
                  }`}>
                  {creator.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly goal progress */}
          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-tertiary/60 uppercase tracking-wider">Monthly Goal</span>
              {colors.label && (
                <span className="text-xs font-bold text-accent-lime">{colors.label}</span>
              )}
            </div>
            <div className="flex items-end justify-between gap-sm">
              <div>
                <span className={`text-base font-black font-mono ${colors.text}`}>{fmt(monthEarned)}</span>
                {creator.monthly_goal > 0 && (
                  <span className="text-xs text-text-tertiary/50 ml-xs">of {fmt(creator.monthly_goal)}</span>
                )}
              </div>
              {creator.monthly_goal > 0 && (
                <span className={`text-xs font-bold font-mono ${colors.text}`}>{Math.round(pct)}%</span>
              )}
            </div>
            {creator.monthly_goal > 0 ? (
              <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden" style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }}>
                <div className={`h-full ${colors.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            ) : (
              <div className="w-full h-1.5 bg-bg-primary rounded-full" style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }}>
                <div className="text-[9px] text-text-tertiary/30 text-center leading-none mt-px">no goal set</div>
              </div>
            )}
          </div>

          {/* Sparkline + today stat */}
          <div className="flex items-end justify-between gap-md pt-xs border-t border-white/5">
            <div className="flex flex-col gap-xs">
              <span className="text-[9px] text-text-tertiary/40 uppercase tracking-wider">Last 7 days</span>
              <Sparkline values={last7} barHex={colors.hex} />
            </div>
            <div className="text-right">
              <span className="text-[9px] text-text-tertiary/40 uppercase tracking-wider block mb-[2px]">Today</span>
              <span className={`text-xs font-bold font-mono ${todayColor}`}>
                {fmtDec(todayAmt)}
              </span>
              {creator.daily_goal > 0 && (
                <div className="text-[9px] text-text-tertiary/40">/ {fmt(creator.daily_goal)} goal</div>
              )}
            </div>
          </div>

          {/* Agency % share */}
          {agencyMonthlyTotal > 0 && monthEarned > 0 && (
            <div className="text-xs text-text-tertiary/40 text-right -mt-xs">
              {getAgencyPct(creator.id)}% of agency
            </div>
          )}

          {/* ── Subscriber tracker ─────────────────────────────────────────── */}
          {!isInactive && (
            <div className="border-t border-white/5 pt-xs" onClick={e => e.stopPropagation()}>
              {subData?.latest ? (
                <div className="flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-xs text-[11px] min-w-0">
                    <Users size={10} className="text-text-tertiary/40 shrink-0" />
                    <span className="text-text-tertiary/60 shrink-0">Subs:</span>
                    <span className="font-mono font-bold text-text-primary">
                      {subData.latest.count.toLocaleString()}
                    </span>
                    {subData.prev && (
                      <span className={`text-xs font-bold shrink-0 ${
                        subData.latest.count > subData.prev.count ? 'text-accent-lime'
                        : subData.latest.count < subData.prev.count ? 'text-accent-pink'
                        : 'text-text-tertiary/40'
                      }`}>
                        {subData.latest.count > subData.prev.count
                          ? `↑ +${(subData.latest.count - subData.prev.count).toLocaleString()}`
                          : subData.latest.count < subData.prev.count
                          ? `↓ ${(subData.prev.count - subData.latest.count).toLocaleString()}`
                          : '= 0'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setSubLogOpen(creator.id); setSubLogForm({ date: todayIso, count: '', notes: '' }); }}
                    className="shrink-0 text-xs px-sm py-[2px] neu-btn rounded-lg text-text-tertiary/60 hover:text-text-primary transition-all">
                    + Log
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-sm">
                  <span className="text-[11px] text-text-tertiary/30 italic flex items-center gap-xs">
                    <Users size={10} className="text-text-tertiary/25" /> No subscriber data
                  </span>
                  <button
                    onClick={() => { setSubLogOpen(creator.id); setSubLogForm({ date: todayIso, count: '', notes: '' }); }}
                    className="shrink-0 text-xs px-sm py-[2px] border border-accent-cyan/20 rounded-lg text-accent-cyan/60 hover:text-accent-cyan hover:bg-accent-cyan/5 transition-all">
                    + Log
                  </button>
                </div>
              )}

              {/* Inline log form */}
              {subLogOpen === creator.id && (
                <div className="mt-xs space-y-xs animate-fade-in border-t border-white/5 pt-xs">
                  <div className="grid grid-cols-2 gap-xs">
                    <div>
                      <label className="text-[9px] text-text-tertiary/50 mb-[2px] block">Date</label>
                      <input type="date" value={subLogForm.date}
                        onChange={e => setSubLogForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-lg px-xs py-[3px] text-text-primary text-xs focus:outline-none focus:border-accent-cyan/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-text-tertiary/50 mb-[2px] block">Count *</label>
                      <input type="number" value={subLogForm.count} min="0"
                        autoFocus
                        onChange={e => setSubLogForm(f => ({ ...f, count: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleLogSub(creator.id); if (e.key === 'Escape') setSubLogOpen(null); }}
                        placeholder="e.g. 4820"
                        className="w-full rounded-lg px-xs py-[3px] text-text-primary text-xs focus:outline-none focus:border-accent-cyan/50 placeholder-text-tertiary/25 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-xs">
                    <button
                      onClick={() => handleLogSub(creator.id)}
                      disabled={!subLogForm.count || isNaN(parseInt(subLogForm.count))}
                      className="flex-1 py-[3px] bg-accent-cyan/70 hover:bg-accent-cyan/90 text-bg-primary text-xs font-bold rounded-lg disabled:opacity-30 transition-all">
                      Save
                    </button>
                    <button onClick={() => setSubLogOpen(null)}
                      className="px-sm py-[3px] neu-btn text-text-tertiary text-xs rounded-lg hover:text-text-primary transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit panel (inline slide-down) */}
        {isEditing && (
          <div className="border-t border-white/10 bg-bg-primary p-lg space-y-md animate-fade-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Edit Creator</p>
              <button onClick={() => setEditingId(null)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Stage name */}
            <div>
              <label className="text-xs text-text-tertiary mb-xs block">Stage Name</label>
              <input type="text" value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-purple/50 transition-all"
              />
            </div>

            {/* Goals row */}
            <div className="grid grid-cols-3 gap-xs">
              {[
                { key: 'dailyGoal',   label: 'Daily $' },
                { key: 'weeklyGoal',  label: 'Weekly $' },
                { key: 'monthlyGoal', label: 'Monthly $' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-text-tertiary mb-xs block">{label}</label>
                  <input type="number" value={editForm[key]} min="0"
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-lg px-xs py-xs text-text-primary text-xs focus:outline-none focus:border-accent-purple/50 transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Commission */}
            <div className="grid grid-cols-2 gap-xs">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Commission %</label>
                <input type="number" value={editForm.commissionRate} min="0" max="100"
                  onChange={e => setEditForm(f => ({ ...f, commissionRate: e.target.value }))}
                  className="w-full rounded-lg px-xs py-xs text-text-primary text-xs focus:outline-none focus:border-accent-purple/50 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-full py-xs rounded-lg text-xs font-semibold transition-all ${
                    editForm.isActive
                      ? 'bg-accent-lime/10 border border-accent-lime/30 text-accent-lime'
                      : 'neu-btn text-text-tertiary'
                  }`}>
                  {editForm.isActive ? '● Active' : '○ Inactive'}
                </button>
              </div>
            </div>

            {/* Drive URL */}
            <div>
              <label className="text-xs text-text-tertiary mb-xs flex items-center gap-xs">
                <Link2 size={10} /> Google Drive URL
              </label>
              <input type="url" value={editForm.driveUrl}
                onChange={e => setEditForm(f => ({ ...f, driveUrl: e.target.value }))}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-cyan/50 transition-all placeholder-text-tertiary/30"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-text-tertiary mb-xs block">Notes</label>
              <textarea value={editForm.notes} rows={2}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes…"
                className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-purple/50 transition-all resize-none placeholder-text-tertiary/30"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-sm">
              <button onClick={() => saveEdit(creator)}
                className="flex-1 py-xs bg-accent-purple/80 hover:bg-accent-purple text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-xs">
                <Check size={11} /> Save
              </button>
              <button onClick={() => setConfirmDelete(creator)}
                className="px-md py-xs border border-accent-pink/20 text-accent-pink/60 hover:bg-accent-pink/10 hover:text-accent-pink text-xs rounded-lg transition-all">
                <Trash2 size={11} />
              </button>
              <button onClick={() => setEditingId(null)}
                className="px-md py-xs neu-btn text-text-tertiary text-xs rounded-lg hover:text-text-primary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hover edit button (only when not in edit mode) */}
        {!isEditing && (
          <button
            onClick={e => { e.stopPropagation(); openEdit(creator); }}
            className="absolute bottom-md right-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-xs px-sm py-[4px] bg-bg-secondary/90 border border-white/15 rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:border-white/25 shadow-lg">
            <Pencil size={10} /> Edit
          </button>
        )}
      </div>
    );
  };

  // ── Page render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-lg h-full overflow-auto space-y-lg">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <Star size={32} className="text-accent-purple" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent">Creators</h1>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-purple to-accent-pink text-white border-transparent shadow-glow-purple hover:opacity-90 transition-all">
          <Plus size={16} /> New Creator
        </button>
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap">
        {agencies.map(agency => {
          const isActive = agency.id === activeAgency;
          const count = creators.filter(c => c.agency_id === agency.id && c.is_active).length;
          return (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-accent-purple to-accent-pink text-white border-transparent shadow-glow-purple'
                  : 'neu-btn text-text-secondary hover:text-text-primary'
              }`}>
              {agency.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
                {count}
              </span>
            </button>
          );
        })}
        {agencies.length === 0 && (
          <p className="text-text-tertiary text-sm">No agencies yet — add one from the Dashboard.</p>
        )}
      </div>

      {activeAgency && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-sm flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-md top-1/2 -translate-y-1/2 text-text-tertiary/50 pointer-events-none" />
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search creators…"
                className="w-full rounded-xl pl-[34px] pr-md py-sm text-sm text-text-primary placeholder-text-tertiary/40 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-sm top-1/2 -translate-y-1/2 text-text-tertiary/50 hover:text-text-primary transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort pills */}
            <div className="flex items-center gap-xs neu-card-inset rounded-xl p-xs">
              {[
                { key: 'name',     label: 'Name' },
                { key: 'monthly',  label: 'Monthly $' },
                { key: 'progress', label: 'Goal %' },
              ].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  className={`px-md py-xs rounded-lg text-xs font-semibold transition-all ${
                    sortBy === s.key
                      ? 'bg-accent-purple/80 text-white shadow-sm'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Inactive toggle */}
            {inactiveCreators.length > 0 && (
              <button onClick={() => setShowInactive(v => !v)}
                className={`flex items-center gap-xs px-md py-sm rounded-xl text-xs font-semibold transition-all ${
                  showInactive
                    ? 'neu-card text-text-primary'
                    : 'neu-btn text-text-tertiary hover:text-text-primary'
                }`}>
                {showInactive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {inactiveCreators.length} inactive
              </button>
            )}

            {/* Agency monthly total */}
            {agencyMonthlyTotal > 0 && (
              <div className="ml-auto flex items-center gap-xs text-xs text-text-tertiary/60 bg-bg-primary rounded-xl px-md py-sm">
                <Target size={11} className="text-accent-lime/60" />
                <span>Agency: <span className="text-accent-lime font-mono font-bold">{fmt(agencyMonthlyTotal)}</span> this month</span>
              </div>
            )}
          </div>

          {/* Active creators grid */}
          {activeCreators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg animate-fade-in">
              {activeCreators.map(renderCard)}
            </div>
          ) : (
            <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
              <Star size={40} className="mx-auto text-text-tertiary/25 mb-md" />
              <p className="text-text-tertiary">
                {searchQuery ? `No creators match "${searchQuery}"` : 'No active creators for this agency'}
              </p>
              {!searchQuery && (
                <button onClick={() => setShowAddModal(true)}
                  className="mt-md text-accent-purple hover:underline text-sm">
                  Add your first creator
                </button>
              )}
            </div>
          )}

          {/* Inactive creators accordion */}
          {showInactive && inactiveCreators.length > 0 && (
            <div className="space-y-md animate-fade-in">
              <div className="flex items-center gap-md">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-text-tertiary/50 uppercase tracking-widest font-semibold">
                  Inactive ({inactiveCreators.length})
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
                {inactiveCreators.map(renderCard)}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add Creator Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-secondary border border-white/15 rounded-2xl p-xl shadow-2xl w-full max-w-md mx-lg animate-scale-in space-y-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-sm">
                <Star size={18} className="text-accent-purple" /> New Creator
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Agency selector if multiple */}
            <div>
              <label className="text-xs text-text-tertiary mb-xs block">Stage Name *</label>
              <input type="text" value={newCreator.name} autoFocus
                onChange={e => setNewCreator(c => ({ ...c, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCreator(); }}
                placeholder="Creator's stage name…"
                className="w-full rounded-xl px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all placeholder-text-tertiary/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-sm">
              {[
                { key: 'dailyGoal',   label: 'Daily Goal $' },
                { key: 'weeklyGoal',  label: 'Weekly Goal $' },
                { key: 'monthlyGoal', label: 'Monthly Goal $' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-text-tertiary mb-xs block">{label}</label>
                  <input type="number" value={newCreator[key]} min="0"
                    onChange={e => setNewCreator(c => ({ ...c, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl px-sm py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all placeholder-text-tertiary/40"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Commission %</label>
                <input type="number" value={newCreator.commissionRate} min="0" max="100"
                  onChange={e => setNewCreator(c => ({ ...c, commissionRate: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl px-sm py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all placeholder-text-tertiary/40"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-xs flex items-center gap-xs">
                  <Link2 size={10} /> Drive URL
                </label>
                <input type="url" value={newCreator.driveUrl}
                  onChange={e => setNewCreator(c => ({ ...c, driveUrl: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-xl px-sm py-sm text-text-primary text-sm focus:outline-none focus:border-accent-cyan/50 transition-all placeholder-text-tertiary/40"
                />
              </div>
            </div>

            <div className="flex gap-sm pt-xs">
              <button onClick={handleAddCreator} disabled={!newCreator.name.trim()}
                className="flex-1 py-sm bg-gradient-to-r from-accent-purple to-accent-pink text-white font-bold rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-sm">
                <Plus size={14} /> Add Creator
              </button>
              <button onClick={() => setShowAddModal(false)}
                className="px-xl py-sm neu-btn text-text-secondary rounded-xl text-sm hover:text-text-primary transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ─────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Delete Creator?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              Permanently delete <span className="text-accent-pink font-semibold">"{confirmDelete.stage_name}"</span>?
              All their earnings data and tasks will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button onClick={() => { deleteCreatorData(confirmDelete.id); setConfirmDelete(null); setEditingId(null); }}
                className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Creators;
