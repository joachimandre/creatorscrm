import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { Users, Plus, Trash2, X, Check, Settings, ChevronLeft, ChevronRight, UserPlus, Minus } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const TEAM_COLORS = [
  { id: 'accent-cyan',   gradient: 'from-accent-cyan to-accent-blue',   dot: 'bg-accent-cyan',   hex: '#00d9ff' },
  { id: 'accent-lime',   gradient: 'from-accent-lime to-accent-cyan',   dot: 'bg-accent-lime',   hex: '#00ff88' },
  { id: 'accent-purple', gradient: 'from-accent-purple to-accent-blue', dot: 'bg-accent-purple', hex: '#9d4edd' },
  { id: 'accent-pink',   gradient: 'from-accent-pink to-accent-orange', dot: 'bg-accent-pink',   hex: '#ff006e' },
  { id: 'accent-orange', gradient: 'from-accent-orange to-accent-pink', dot: 'bg-accent-orange', hex: '#ff6b35' },
  { id: 'accent-blue',   gradient: 'from-accent-blue to-accent-purple', dot: 'bg-accent-blue',   hex: '#3b82f6' },
];

const SHIFT_PALETTE = ['accent-orange', 'accent-cyan', 'accent-purple', 'accent-lime', 'accent-pink', 'accent-blue'];

const SHIFT_HEX = {
  'accent-orange': '#ff6b35',
  'accent-cyan':   '#00d9ff',
  'accent-purple': '#9d4edd',
  'accent-lime':   '#00ff88',
  'accent-pink':   '#ff006e',
  'accent-blue':   '#3b82f6',
};

const SHIFT_STYLE = {
  'accent-orange': { text: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/30' },
  'accent-cyan':   { text: 'text-accent-cyan',   bg: 'bg-accent-cyan/10',   border: 'border-accent-cyan/30'   },
  'accent-purple': { text: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/30' },
  'accent-lime':   { text: 'text-accent-lime',   bg: 'bg-accent-lime/10',   border: 'border-accent-lime/30'   },
  'accent-pink':   { text: 'text-accent-pink',   bg: 'bg-accent-pink/10',   border: 'border-accent-pink/30'   },
  'accent-blue':   { text: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/30'   },
};

const DEFAULT_SHIFTS = [
  { label: '00:00 - 08:00', color: 'accent-orange' },
  { label: '08:00 - 16:00', color: 'accent-cyan'   },
  { label: '16:00 - 00:00', color: 'accent-purple' },
];

// ── Date helpers ───────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function mondayOfWeek(iso) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

function fmtShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDay(iso) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(iso + 'T00:00:00').getDay()];
}

function fmtWeek(s, e) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const sd = new Date(s + 'T00:00:00'), ed = new Date(e + 'T00:00:00');
  return sd.getMonth() === ed.getMonth()
    ? `${MONTHS[sd.getMonth()]} ${sd.getDate()} – ${ed.getDate()}, ${sd.getFullYear()}`
    : `${MONTHS[sd.getMonth()]} ${sd.getDate()} – ${MONTHS[ed.getMonth()]} ${ed.getDate()}, ${ed.getFullYear()}`;
}

// ── Day note cell (local draft, commits on blur) ───────────────────────────────
const DayNoteCell = ({ date, initialValue, onBlur }) => {
  const [val, setVal] = useState(initialValue);
  useEffect(() => setVal(initialValue), [initialValue]);
  return (
    <div className="px-sm py-xs border-l border-white/10 flex items-center">
      <input
        type="text" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onBlur(date, val)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder="Notes…"
        className="w-full bg-transparent text-xs text-text-tertiary/70 placeholder-text-tertiary/30 focus:outline-none focus:text-text-secondary transition-colors"
      />
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const Team = () => {
  const agencies           = useStore(s => s.agencies);
  const creators           = useStore(s => s.creators);
  const chatters           = useStore(s => s.chatters);
  const teams              = useStore(s => s.teams);
  const teamMembers        = useStore(s => s.teamMembers);
  const teamChatters       = useStore(s => s.teamChatters);
  const teamSchedule       = useStore(s => s.teamSchedule);
  const teamDayNotes       = useStore(s => s.teamDayNotes);

  const addTeam              = useStore(s => s.addTeam);
  const updateTeamData       = useStore(s => s.updateTeamData);
  const deleteTeamData       = useStore(s => s.deleteTeamData);
  const addCreatorToTeam     = useStore(s => s.addCreatorToTeam);
  const removeCreatorFromTeam = useStore(s => s.removeCreatorFromTeam);
  const addChatterToTeam     = useStore(s => s.addChatterToTeam);
  const removeChatterFromTeam = useStore(s => s.removeChatterFromTeam);
  const loadTeamSchedule     = useStore(s => s.loadTeamSchedule);
  const setScheduleEntry     = useStore(s => s.setScheduleEntry);
  const setDayNote           = useStore(s => s.setDayNote);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [manageMode,     setManageMode]     = useState(false);
  const [weekStart,      setWeekStart]      = useState(() => mondayOfWeek(new Date().toISOString().split('T')[0]));

  const [showNewTeam,  setShowNewTeam]  = useState(false);
  const [newTeamName,  setNewTeamName]  = useState('');
  const [newTeamColor, setNewTeamColor] = useState('accent-cyan');

  const [editTeam,       setEditTeam]       = useState(null);
  const [showAddModel,   setShowAddModel]   = useState(false);
  const [showAddChatter, setShowAddChatter] = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeAgency = selectedAgency ?? agencies[0]?.id ?? null;
  const agencyTeams  = teams.filter(t => t.agency_id === activeAgency);
  const team         = agencyTeams.find(t => t.id === selectedTeamId) ?? agencyTeams[0] ?? null;

  const teamCreatorIds = new Set(teamMembers.filter(m => m.team_id === team?.id).map(m => m.creator_id));
  const teamChatterIds = new Set(teamChatters.filter(c => c.team_id === team?.id).map(c => c.chatter_id));
  const myCreators     = creators.filter(c => teamCreatorIds.has(c.id));
  const myChatters     = chatters.filter(c => teamChatterIds.has(c.id));
  const availCreators  = creators.filter(c => c.agency_id === activeAgency && c.is_active && !teamCreatorIds.has(c.id));
  const availChatters  = chatters.filter(c => c.agency_id === activeAgency && !teamChatterIds.has(c.id));

  const teamColor  = TEAM_COLORS.find(c => c.id === (team?.color || 'accent-cyan')) || TEAM_COLORS[0];
  const weekDates  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd    = weekDates[6];
  const today      = new Date().toISOString().split('T')[0];
  const shifts     = team?.shifts?.length ? team.shifts : DEFAULT_SHIFTS;

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const first = teams.find(t => t.agency_id === activeAgency);
    setSelectedTeamId(first?.id ?? null);
    setManageMode(false);
    setShowNewTeam(false);
  }, [activeAgency]);

  useEffect(() => {
    if (team) {
      setEditTeam({
        name:   team.name,
        color:  team.color  || 'accent-cyan',
        notes:  team.notes  || '',
        shifts: team.shifts ? JSON.parse(JSON.stringify(team.shifts)) : [...DEFAULT_SHIFTS],
      });
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (team) loadTeamSchedule(team.id, weekDates[0], weekDates[6]);
  }, [team?.id, weekStart]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreateTeam = () => {
    if (!newTeamName.trim() || !activeAgency) return;
    const id = addTeam(activeAgency, newTeamName.trim(), newTeamColor, '', [...DEFAULT_SHIFTS]);
    setSelectedTeamId(id);
    setNewTeamName('');
    setShowNewTeam(false);
  };

  const handleSaveTeam = () => {
    if (!editTeam || !team) return;
    updateTeamData(team.id, editTeam.name, editTeam.color, editTeam.notes, editTeam.shifts);
  };

  const executeDeleteTeam = () => {
    deleteTeamData(team.id);
    const remaining = agencyTeams.filter(t => t.id !== team.id);
    setSelectedTeamId(remaining[0]?.id ?? null);
    setConfirmDelete(null);
    setManageMode(false);
  };

  const cellValue = (date, si) => {
    const e = teamSchedule.find(s => s.team_id === team?.id && s.date === date && s.shift_index === si);
    if (!e) return '';
    if (e.is_cover && !e.chatter_id) return '__cover__';
    return e.chatter_id ? String(e.chatter_id) : '';
  };

  const getDayNote = date =>
    teamDayNotes.find(n => n.team_id === team?.id && n.date === date)?.notes || '';

  const handleShiftChange = (date, si, val) => {
    if (!team) return;
    if (!val)                setScheduleEntry(team.id, date, si, null, false);
    else if (val === '__cover__') setScheduleEntry(team.id, date, si, null, true);
    else                     setScheduleEntry(team.id, date, si, parseInt(val), false);
  };

  const addShift    = () => setEditTeam(e => ({ ...e, shifts: [...e.shifts, { label: 'New Shift', color: SHIFT_PALETTE[e.shifts.length % SHIFT_PALETTE.length] }] }));
  const removeShift = idx => setEditTeam(e => ({ ...e, shifts: e.shifts.filter((_, i) => i !== idx) }));
  const updateShift = (idx, field, val) => setEditTeam(e => ({ ...e, shifts: e.shifts.map((s, i) => i === idx ? { ...s, [field]: val } : s) }));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <Users size={32} className="text-accent-orange" />
        <h1 className="text-3xl font-bold text-text-primary">Team</h1>
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap">
        {agencies.map(agency => {
          const isActive = agency.id === activeAgency;
          const count = teams.filter(t => t.agency_id === agency.id).length;
          return (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-accent-orange to-accent-pink text-bg-primary border-transparent shadow-glow'
                  : 'bg-white/5 text-text-secondary border-white/10 hover:text-text-primary hover:bg-white/10'
              }`}>
              {agency.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
                {count} team{count !== 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
        {agencies.length === 0 && <p className="text-text-tertiary text-sm">No agencies yet — add one from the Dashboard.</p>}
      </div>

      {activeAgency && (
        <>
          {/* Team tabs + controls */}
          <div className="flex items-center gap-sm flex-wrap">
            {agencyTeams.map(t => {
              const isActive = t.id === team?.id;
              const ci = TEAM_COLORS.find(c => c.id === t.color) || TEAM_COLORS[0];
              return (
                <button key={t.id}
                  onClick={() => { setSelectedTeamId(t.id); setManageMode(false); setShowAddModel(false); setShowAddChatter(false); }}
                  className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? `bg-gradient-to-r ${ci.gradient} text-bg-primary border-transparent shadow-glow`
                      : 'bg-white/5 text-text-secondary border-white/10 hover:text-text-primary hover:bg-white/10'
                  }`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : ci.hex }} />
                  {t.name}
                </button>
              );
            })}

            {/* Inline new-team form */}
            {showNewTeam ? (
              <div className="flex items-center gap-sm bg-bg-tertiary/80 border border-white/15 rounded-xl px-md py-xs animate-scale-in">
                <input type="text" value={newTeamName} autoFocus
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam(); if (e.key === 'Escape') { setShowNewTeam(false); setNewTeamName(''); }}}
                  placeholder="Team name…"
                  className="bg-transparent text-text-primary text-sm focus:outline-none w-32 placeholder-text-tertiary/40"
                />
                <div className="flex gap-xs items-center">
                  {TEAM_COLORS.map(c => (
                    <button key={c.id} onClick={() => setNewTeamColor(c.id)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${newTeamColor === c.id ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-bg-tertiary scale-125' : 'opacity-50 hover:opacity-100'}`}
                    />
                  ))}
                </div>
                <button onClick={handleCreateTeam} disabled={!newTeamName.trim()}
                  className="text-accent-lime text-xs font-bold disabled:opacity-30 hover:underline">Create</button>
                <button onClick={() => { setShowNewTeam(false); setNewTeamName(''); }}
                  className="text-text-tertiary hover:text-text-primary"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => setShowNewTeam(true)}
                className="flex items-center gap-xs px-md py-sm rounded-xl text-sm text-text-tertiary hover:text-accent-lime border border-dashed border-white/10 hover:border-accent-lime/40 hover:bg-accent-lime/5 transition-all">
                <Plus size={13} /> New Team
              </button>
            )}

            {team && (
              <button onClick={() => setManageMode(v => !v)}
                className={`ml-auto flex items-center gap-xs px-md py-sm rounded-xl text-sm border transition-all ${
                  manageMode
                    ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                    : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary hover:bg-white/10'
                }`}>
                <Settings size={13} /> {manageMode ? 'Done' : 'Manage'}
              </button>
            )}
          </div>

          {/* No teams empty state */}
          {agencyTeams.length === 0 && (
            <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
              <Users size={40} className="mx-auto text-text-tertiary/30 mb-md" />
              <p className="text-text-tertiary">No teams for this agency yet</p>
              <p className="text-text-tertiary/50 text-sm mt-xs">Click "New Team" above to get started</p>
            </div>
          )}

          {/* ── SCHEDULE VIEW ─────────────────────────────────────────────────── */}
          {team && !manageMode && (
            <div className="space-y-md animate-fade-in">
              {/* Team header banner */}
              <div className={`bg-gradient-to-r ${teamColor.gradient} rounded-xl px-xl py-md`}>
                <div className="flex items-center gap-lg flex-wrap">
                  <span className="text-bg-primary font-black text-lg tracking-wide uppercase">{team.name}</span>
                  {myCreators.length > 0 && (
                    <>
                      <span className="text-bg-primary/40 font-bold text-xl">·</span>
                      <div className="flex items-center gap-sm flex-wrap">
                        {myCreators.map((c, i) => (
                          <span key={c.id} className="flex items-center gap-sm">
                            {i > 0 && <span className="text-bg-primary/40 font-bold">|</span>}
                            <span className="text-bg-primary/90 font-semibold text-sm uppercase tracking-wider">{c.stage_name}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  <span className="ml-auto text-bg-primary/60 text-xs font-medium">
                    {myChatters.length} chatter{myChatters.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Week navigator */}
              <div className="flex items-center justify-between bg-bg-tertiary/40 border border-white/8 rounded-xl px-lg py-sm">
                <button onClick={() => setWeekStart(w => addDays(w, -7))}
                  className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors px-sm py-xs rounded-lg hover:bg-white/5">
                  <ChevronLeft size={16} /> Prev
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary">{fmtWeek(weekStart, weekEnd)}</p>
                </div>
                <div className="flex items-center gap-sm">
                  <button onClick={() => setWeekStart(mondayOfWeek(today))}
                    className="text-xs text-text-tertiary hover:text-accent-lime transition-colors px-sm py-xs rounded-lg hover:bg-accent-lime/5 border border-transparent hover:border-accent-lime/20">
                    Today
                  </button>
                  <button onClick={() => setWeekStart(w => addDays(w, 7))}
                    className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors px-sm py-xs rounded-lg hover:bg-white/5">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Schedule grid */}
              <div className="bg-bg-tertiary/30 border border-white/8 rounded-xl overflow-x-auto">
                <div className="min-w-[640px]">
                  {/* Header row */}
                  <div className="grid border-b border-white/10"
                    style={{ gridTemplateColumns: `80px 52px repeat(${shifts.length}, 1fr) 150px` }}>
                    <div className="px-md py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider">Date</div>
                    <div className="px-xs py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider">Day</div>
                    {shifts.map((shift, si) => {
                      const s = SHIFT_STYLE[shift.color] || SHIFT_STYLE['accent-cyan'];
                      return (
                        <div key={si} className={`px-md py-sm text-xs font-bold border-l ${s.text} ${s.bg} ${s.border}`}>
                          {shift.label}
                        </div>
                      );
                    })}
                    <div className="px-md py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider border-l border-white/10">Notes</div>
                  </div>

                  {/* Day rows */}
                  {weekDates.map(date => {
                    const isToday = date === today;
                    return (
                      <div key={date}
                        className={`grid border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${isToday ? 'bg-accent-lime/[0.04]' : ''}`}
                        style={{ gridTemplateColumns: `80px 52px repeat(${shifts.length}, 1fr) 150px` }}>
                        {/* Date cell */}
                        <div className={`px-md py-sm flex flex-col justify-center ${isToday ? 'border-l-2 border-accent-lime' : ''}`}>
                          <p className={`text-xs font-bold ${isToday ? 'text-accent-lime' : 'text-text-secondary'}`}>{fmtShort(date)}</p>
                          <p className="text-[10px] text-text-tertiary/50">{date.slice(0, 4)}</p>
                        </div>
                        {/* Day name */}
                        <div className="px-xs py-sm flex items-center">
                          <span className={`text-xs font-semibold ${isToday ? 'text-accent-lime' : 'text-text-tertiary'}`}>{fmtDay(date)}</span>
                        </div>
                        {/* Shift cells */}
                        {shifts.map((shift, si) => {
                          const s = SHIFT_STYLE[shift.color] || SHIFT_STYLE['accent-cyan'];
                          const val = cellValue(date, si);
                          return (
                            <div key={si} className={`px-sm py-xs border-l ${s.border} flex items-center`}>
                              <select value={val} onChange={e => handleShiftChange(date, si, e.target.value)}
                                className={`w-full bg-transparent text-xs font-semibold cursor-pointer focus:outline-none rounded px-xs py-xs
                                  ${val === '__cover__' ? 'text-accent-pink italic' : val ? s.text : 'text-text-tertiary/40'}`}>
                                <option value="">— Unassigned —</option>
                                <option value="__cover__">Cover</option>
                                {myChatters.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                              </select>
                            </div>
                          );
                        })}
                        {/* Notes */}
                        <DayNoteCell date={date} initialValue={getDayNote(date)} onBlur={(d, v) => setDayNote(team.id, d, v)} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {myChatters.length === 0 && (
                <p className="text-center text-xs text-text-tertiary/50">
                  No chatters assigned yet —{' '}
                  <button onClick={() => setManageMode(true)} className="text-accent-cyan underline hover:no-underline">open Manage</button>{' '}
                  to assign some.
                </p>
              )}
            </div>
          )}

          {/* ── MANAGE VIEW ───────────────────────────────────────────────────── */}
          {team && manageMode && editTeam && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-lg animate-fade-in">
              {/* Left: Team info + shift editor + danger */}
              <div className="xl:col-span-2 space-y-md">
                {/* Team info card */}
                <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg space-y-md">
                  <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Team Info</h3>

                  <div>
                    <label className="block text-xs text-text-tertiary mb-xs">Team Name</label>
                    <input type="text" value={editTeam.name}
                      onChange={e => setEditTeam(t => ({ ...t, name: e.target.value }))}
                      className="w-full bg-bg-primary/50 border border-white/10 rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-text-tertiary mb-xs">Team Color</label>
                    <div className="flex gap-sm items-center">
                      {TEAM_COLORS.map(c => (
                        <button key={c.id} onClick={() => setEditTeam(t => ({ ...t, color: c.id }))}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full transition-all ${editTeam.color === c.id ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-bg-secondary scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                        />
                      ))}
                    </div>
                    <div className={`mt-sm h-1.5 rounded-full bg-gradient-to-r ${TEAM_COLORS.find(c => c.id === editTeam.color)?.gradient || TEAM_COLORS[0].gradient} opacity-70`} />
                  </div>

                  <div>
                    <label className="block text-xs text-text-tertiary mb-xs">Notes</label>
                    <textarea value={editTeam.notes} rows={2}
                      onChange={e => setEditTeam(t => ({ ...t, notes: e.target.value }))}
                      placeholder="Any notes about this team…"
                      className="w-full bg-bg-primary/50 border border-white/10 rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all resize-none placeholder-text-tertiary/40"
                    />
                  </div>

                  <button onClick={handleSaveTeam}
                    className="w-full py-sm bg-accent-purple/80 hover:bg-accent-purple text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-sm">
                    <Check size={14} /> Save Changes
                  </button>
                </div>

                {/* Shift editor */}
                <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg space-y-md">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Shift Definitions</h3>
                    <button onClick={addShift}
                      className="flex items-center gap-xs text-xs text-accent-lime hover:underline transition-colors">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <div className="space-y-sm">
                    {editTeam.shifts.map((shift, idx) => {
                      const s = SHIFT_STYLE[shift.color] || SHIFT_STYLE['accent-cyan'];
                      return (
                        <div key={idx} className={`flex items-center gap-sm p-sm rounded-lg border ${s.border} ${s.bg}`}>
                          <div className="flex gap-xs shrink-0">
                            {SHIFT_PALETTE.map(c => (
                              <button key={c} onClick={() => updateShift(idx, 'color', c)}
                                style={{ backgroundColor: SHIFT_HEX[c] || '#888' }}
                                className={`w-3 h-3 rounded-full transition-all ${shift.color === c ? 'ring-1 ring-white/70 scale-125' : 'opacity-40 hover:opacity-100'}`}
                              />
                            ))}
                          </div>
                          <input type="text" value={shift.label}
                            onChange={e => updateShift(idx, 'label', e.target.value)}
                            className={`flex-1 bg-transparent text-xs font-semibold ${s.text} focus:outline-none min-w-0`}
                          />
                          {editTeam.shifts.length > 1 && (
                            <button onClick={() => removeShift(idx)} className="text-text-tertiary/40 hover:text-accent-pink transition-colors shrink-0">
                              <Minus size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={handleSaveTeam}
                    className="w-full py-xs bg-white/5 hover:bg-white/10 text-text-tertiary text-xs rounded-lg transition-colors">
                    Save Shifts
                  </button>
                </div>

                {/* Danger zone */}
                <div className="bg-accent-pink/5 border border-accent-pink/15 rounded-xl p-lg">
                  <h3 className="text-xs font-bold text-accent-pink/60 uppercase tracking-widest mb-md">Danger Zone</h3>
                  <button onClick={() => setConfirmDelete({ type: 'team', payload: team })}
                    className="w-full py-sm border border-accent-pink/25 text-accent-pink/70 hover:bg-accent-pink/10 hover:text-accent-pink rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-sm">
                    <Trash2 size={14} /> Delete Team
                  </button>
                </div>
              </div>

              {/* Right: Members */}
              <div className="xl:col-span-3 space-y-md">
                {/* Models */}
                <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg space-y-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Models</h3>
                      <p className="text-[10px] text-text-tertiary/50 mt-xs">{myCreators.length} assigned to this team</p>
                    </div>
                    <div className="relative">
                      <button onClick={() => { setShowAddModel(v => !v); setShowAddChatter(false); }}
                        disabled={availCreators.length === 0}
                        className="flex items-center gap-xs px-md py-xs bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <UserPlus size={12} /> Assign Model
                      </button>
                      {showAddModel && (
                        <div className="absolute right-0 top-full mt-xs bg-bg-secondary border border-white/15 rounded-xl shadow-2xl z-20 py-xs min-w-48 animate-scale-in max-h-48 overflow-y-auto">
                          {availCreators.map(c => (
                            <button key={c.id} onClick={() => { addCreatorToTeam(team.id, c.id); setShowAddModel(false); }}
                              className="w-full text-left px-md py-sm text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors">
                              {c.stage_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {myCreators.length === 0 ? (
                    <p className="text-text-tertiary/50 text-sm text-center py-md">No models assigned yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-sm">
                      {myCreators.map(c => (
                        <div key={c.id} className="flex items-center gap-sm bg-bg-primary/50 border border-accent-cyan/20 rounded-lg px-md py-xs group">
                          <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center text-[10px] font-bold text-accent-cyan">
                            {c.stage_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{c.stage_name}</span>
                          <button onClick={() => setConfirmDelete({ type: 'member', payload: { teamId: team.id, creatorId: c.id, name: c.stage_name } })}
                            className="opacity-0 group-hover:opacity-100 text-text-tertiary/50 hover:text-accent-pink transition-all ml-xs">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chatters */}
                <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg space-y-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Chatters</h3>
                      <p className="text-[10px] text-text-tertiary/50 mt-xs">{myChatters.length} assigned to this team</p>
                    </div>
                    <div className="relative">
                      <button onClick={() => { setShowAddChatter(v => !v); setShowAddModel(false); }}
                        disabled={availChatters.length === 0}
                        className="flex items-center gap-xs px-md py-xs bg-accent-lime/10 hover:bg-accent-lime/20 text-accent-lime border border-accent-lime/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <UserPlus size={12} /> Assign Chatter
                      </button>
                      {showAddChatter && (
                        <div className="absolute right-0 top-full mt-xs bg-bg-secondary border border-white/15 rounded-xl shadow-2xl z-20 py-xs min-w-48 animate-scale-in max-h-48 overflow-y-auto">
                          {availChatters.map(c => (
                            <button key={c.id} onClick={() => { addChatterToTeam(team.id, c.id); setShowAddChatter(false); }}
                              className="w-full text-left px-md py-sm text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors">
                              {c.name} {c.role ? <span className="text-text-tertiary text-xs">· {c.role}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {myChatters.length === 0 ? (
                    <p className="text-text-tertiary/50 text-sm text-center py-md">No chatters assigned yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-sm">
                      {myChatters.map(c => (
                        <div key={c.id} className="flex items-center gap-sm bg-bg-primary/50 border border-accent-lime/20 rounded-lg px-md py-xs group">
                          <div className="w-6 h-6 rounded-full bg-accent-lime/20 flex items-center justify-center text-[10px] font-bold text-accent-lime">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{c.name}</p>
                            {c.role && <p className="text-[10px] text-text-tertiary/60">{c.role}</p>}
                          </div>
                          <button onClick={() => setConfirmDelete({ type: 'chatter', payload: { teamId: team.id, chatterId: c.id, name: c.name } })}
                            className="opacity-0 group-hover:opacity-100 text-text-tertiary/50 hover:text-accent-pink transition-all ml-xs">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CONFIRM MODAL ─────────────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
            onClick={e => e.stopPropagation()}>
            {confirmDelete.type === 'team' && <>
              <h3 className="text-lg font-bold text-text-primary mb-sm">Delete Team?</h3>
              <p className="text-text-secondary text-sm mb-lg">
                Delete <span className="text-accent-pink font-semibold">"{confirmDelete.payload.name}"</span>? All schedule data and assignments will be removed. Cannot be undone.
              </p>
              <div className="flex gap-md justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button onClick={executeDeleteTeam} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">Delete Team</button>
              </div>
            </>}
            {confirmDelete.type === 'member' && <>
              <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Model?</h3>
              <p className="text-text-secondary text-sm mb-lg">
                Remove <span className="text-accent-cyan font-semibold">"{confirmDelete.payload.name}"</span> from this team? Their earnings data is unaffected.
              </p>
              <div className="flex gap-md justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button onClick={() => { removeCreatorFromTeam(confirmDelete.payload.teamId, confirmDelete.payload.creatorId); setConfirmDelete(null); }}
                  className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">Remove</button>
              </div>
            </>}
            {confirmDelete.type === 'chatter' && <>
              <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Chatter?</h3>
              <p className="text-text-secondary text-sm mb-lg">
                Remove <span className="text-accent-lime font-semibold">"{confirmDelete.payload.name}"</span> from this team?
              </p>
              <div className="flex gap-md justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button onClick={() => { removeChatterFromTeam(confirmDelete.payload.teamId, confirmDelete.payload.chatterId); setConfirmDelete(null); }}
                  className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">Remove</button>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
