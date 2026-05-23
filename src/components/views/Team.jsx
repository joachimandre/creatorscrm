import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store.js';
import {
  Users, Plus, Trash2, X, Check, Settings,
  ChevronLeft, ChevronRight, ChevronDown,
  UserPlus, Minus, Pencil, Calendar, Copy,
} from 'lucide-react';

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

// ── Calendar helpers (for WeekPicker) ─────────────────────────────────────────
const MONTH_NAMES    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su']; // Monday-first so weeks align visually

const daysIn = (y, m) => new Date(y, m, 0).getDate();

// Monday-first offset: Mon=0, Tue=1, ..., Sun=6
function firstDayMon(y, m) {
  const dow = new Date(y, m - 1, 1).getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

// ── Date helpers ───────────────────────────────────────────────────────────────
const pad     = n => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function mondayOfWeek(iso) {
  const d   = new Date(iso + 'T00:00:00');
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
    <div className="px-sm py-xs border-l border-white/8 flex items-center">
      <input
        type="text" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onBlur(date, val)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder="Notes…"
        className="w-full bg-transparent text-xs text-text-tertiary/60 placeholder-text-tertiary/20 italic focus:outline-none focus:text-text-secondary transition-colors"
      />
    </div>
  );
};

// ── ShiftCell — portal dropdown that escapes overflow-x-auto ──────────────────
const ShiftCell = ({ value, onChange, chatters, shiftStyle: s, hoursValue, onHoursChange }) => {
  const [open, setOpen]     = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 192) });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (!dropRef.current?.contains(e.target) && e.target !== btnRef.current)
        setOpen(false);
    };
    const closeKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeKey);
    };
  }, [open]);

  const label = value === '__cover__'
    ? 'Cover'
    : value
      ? (chatters.find(c => String(c.id) === value)?.name || '?')
      : null;

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, zIndex: 9999 }}
      className="bg-bg-secondary border border-white/15 rounded-xl shadow-2xl py-xs animate-scale-in max-h-60 overflow-y-auto"
    >
      <button
        onClick={() => { onChange(''); setOpen(false); }}
        className="w-full text-left px-md py-sm text-xs text-text-tertiary/55 hover:text-text-primary hover:bg-white/5 transition-colors">
        — Unassigned —
      </button>
      <button
        onClick={() => { onChange('__cover__'); setOpen(false); }}
        className="w-full text-left px-md py-sm text-xs text-accent-pink italic hover:bg-accent-pink/5 transition-colors">
        Cover
      </button>
      {chatters.length > 0 && <div className="border-t border-white/8 my-xs" />}
      {chatters.length === 0 && (
        <p className="px-md py-sm text-xs text-text-tertiary/40 italic">No chatters in team</p>
      )}
      {chatters.map(c => (
        <button key={c.id}
          onClick={() => { onChange(String(c.id)); setOpen(false); }}
          className={`w-full text-left px-md py-sm text-xs transition-colors hover:bg-white/5 flex items-center gap-sm
            ${String(c.id) === value ? `${s.text} font-bold bg-white/[0.03]` : 'text-text-secondary'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${s.bg} ${s.text}`}>
            {c.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="flex-1 truncate">{c.name}</span>
          {c.role && <span className="text-[10px] text-text-tertiary/45 flex-shrink-0">{c.role}</span>}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative h-full flex flex-col justify-center px-sm py-xs gap-[2px]">
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-xs px-sm py-[5px] rounded-lg border text-xs font-semibold transition-all focus:outline-none
          ${value === '__cover__'
            ? 'border-accent-pink/40 bg-accent-pink/10 text-accent-pink italic'
            : value
              ? `${s.border} ${s.bg} ${s.text}`
              : 'border-white/8 bg-white/[0.03] text-text-tertiary/30 hover:border-white/15 hover:text-text-tertiary/55'
          }`}>
        <span className="truncate leading-tight">{label ?? '—'}</span>
        <ChevronDown size={9} className={`shrink-0 ml-xs transition-transform duration-200 opacity-35 ${open ? 'rotate-180' : ''}`} />
      </button>
      {/* Hours input — only when a real chatter is assigned */}
      {value && value !== '__cover__' && onHoursChange && (
        <div className="flex items-center gap-[3px]">
          <input
            type="number" min="0" max="24" step="0.5"
            value={hoursValue ?? ''}
            onChange={e => onHoursChange(parseFloat(e.target.value) || 0)}
            onClick={e => e.stopPropagation()}
            placeholder="hrs"
            className="w-10 bg-bg-primary/50 text-[9px] text-text-tertiary/70 placeholder-text-tertiary/20 text-center rounded px-[3px] py-[1px] focus:outline-none focus:text-text-secondary transition-colors border border-white/5"
          />
          <span className="text-[8px] text-text-tertiary/30">h</span>
        </div>
      )}
      {dropdown}
    </div>
  );
};

// ── WeekPicker — calendar popover for week selection ───────────────────────────
const WeekPicker = ({ currentWeekStart, onApply, onClose }) => {
  const today      = new Date().toISOString().split('T')[0];
  const todayParts = today.split('-');

  const [calYear,    setCalYear]    = useState(() =>
    currentWeekStart ? parseInt(currentWeekStart.split('-')[0]) : parseInt(todayParts[0])
  );
  const [calMonth,   setCalMonth]   = useState(() =>
    currentWeekStart ? parseInt(currentWeekStart.split('-')[1]) : parseInt(todayParts[1])
  );
  const [hoveredMon, setHoveredMon] = useState('');

  const navMonth = (dir) => {
    let nm = calMonth + dir, ny = calYear;
    if (nm < 1)  { nm = 12; ny--; }
    if (nm > 12) { nm = 1;  ny++; }
    setCalMonth(nm); setCalYear(ny);
  };

  const thisMonday = mondayOfWeek(today);
  const presets = [
    { label: 'This Week', mon: thisMonday },
    { label: 'Last Week', mon: addDays(thisMonday, -7) },
    { label: 'Next Week', mon: addDays(thisMonday, 7) },
  ];

  const dayClass = (iso) => {
    const selSun  = currentWeekStart ? addDays(currentWeekStart, 6) : '';
    const hovSun  = hoveredMon ? addDays(hoveredMon, 6) : '';
    const inSel   = currentWeekStart && iso >= currentWeekStart && iso <= selSun;
    const isSelEdge = iso === currentWeekStart || iso === selSun;
    const inHov   = hoveredMon && iso >= hoveredMon && iso <= hovSun && !inSel;
    const isHovEdge = iso === hoveredMon || iso === hovSun;
    const isToday = iso === today;

    let cls = 'relative flex items-center justify-center w-7 h-7 text-xs font-medium cursor-pointer select-none transition-all ';

    if (inSel && isSelEdge) {
      cls += 'bg-accent-lime text-bg-primary rounded-full font-bold ';
    } else if (inSel) {
      cls += 'bg-accent-lime/20 text-accent-lime ';
    } else if (inHov && isHovEdge) {
      cls += 'bg-white/15 text-text-primary rounded-full ';
    } else if (inHov) {
      cls += 'bg-white/8 text-text-primary ';
    } else {
      cls += 'text-text-secondary hover:bg-white/10 rounded-full ';
    }
    if (isToday && !inSel && !inHov) cls += 'ring-1 ring-accent-cyan/60 rounded-full ';
    return cls;
  };

  const totalDays = daysIn(calYear, calMonth);
  const startOff  = firstDayMon(calYear, calMonth);
  const cells = [];
  for (let i = 0; i < startOff; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="neu-card shadow-2xl w-[292px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-lg py-md border-b border-white/8">
        <div className="flex items-center gap-sm">
          <Calendar size={14} className="text-accent-lime" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Select Week</span>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors p-xs rounded-lg hover:bg-white/5">
          <X size={14} />
        </button>
      </div>

      {/* Presets */}
      <div className="px-lg pt-md pb-sm">
        <div className="flex gap-xs">
          {presets.map(p => (
            <button key={p.label} onClick={() => onApply(p.mon)}
              className={`flex-1 py-xs text-[11px] font-semibold rounded-lg border transition-all
                ${currentWeekStart === p.mon
                  ? 'border-accent-lime/50 bg-accent-lime/10 text-accent-lime'
                  : 'border-white/10 text-text-secondary hover:text-accent-lime hover:border-accent-lime/40 hover:bg-accent-lime/5'
                }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between px-lg py-sm">
        <button onClick={() => navMonth(-1)} className="p-xs text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-bold text-text-primary">{MONTH_NAMES[calMonth - 1]} {calYear}</span>
        <button onClick={() => navMonth(1)} className="p-xs text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Calendar grid — Monday-first, so each row = one Mon–Sun week */}
      <div className="px-lg pb-lg">
        <div className="grid grid-cols-7 mb-xs">
          {WEEK_DAY_LABELS.map(d => (
            <div key={d} className="flex items-center justify-center w-7 h-6 text-[10px] font-bold text-text-tertiary/50 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-[3px]">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="w-7 h-7" />;
            const iso = isoDate(calYear, calMonth, day);
            const mon = mondayOfWeek(iso);
            return (
              <div key={iso} className={dayClass(iso)}
                onClick={() => onApply(mon)}
                onMouseEnter={() => setHoveredMon(mon)}
                onMouseLeave={() => setHoveredMon('')}>
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const Team = () => {
  const agencies              = useStore(s => s.agencies);
  const creators              = useStore(s => s.creators);
  const chatters              = useStore(s => s.chatters);
  const teams                 = useStore(s => s.teams);
  const teamMembers           = useStore(s => s.teamMembers);
  const teamChatters          = useStore(s => s.teamChatters);
  const teamSchedule          = useStore(s => s.teamSchedule);
  const teamDayNotes          = useStore(s => s.teamDayNotes);

  const addTeam               = useStore(s => s.addTeam);
  const updateTeamData        = useStore(s => s.updateTeamData);
  const deleteTeamData        = useStore(s => s.deleteTeamData);
  const addCreatorToTeam      = useStore(s => s.addCreatorToTeam);
  const removeCreatorFromTeam = useStore(s => s.removeCreatorFromTeam);
  const addChatter            = useStore(s => s.addChatter);
  const addChatterToTeam      = useStore(s => s.addChatterToTeam);
  const removeChatterFromTeam = useStore(s => s.removeChatterFromTeam);
  const loadTeamSchedule      = useStore(s => s.loadTeamSchedule);
  const setScheduleEntry      = useStore(s => s.setScheduleEntry);
  const setDayNote            = useStore(s => s.setDayNote);
  const copyScheduleWeek      = useStore(s => s.copyScheduleWeek);
  const updateScheduleHours   = useStore(s => s.updateScheduleHours);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [manageMode,     setManageMode]     = useState(false);
  const [weekStart,      setWeekStart]      = useState(() => mondayOfWeek(new Date().toISOString().split('T')[0]));
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [pickerPos,      setPickerPos]      = useState({ top: 0, left: 0 });
  const [copySuccess,    setCopySuccess]    = useState(false);
  const weekBtnRef        = useRef(null);
  const weekPickerDropRef = useRef(null);

  const [showNewTeam,  setShowNewTeam]  = useState(false);
  const [newTeamName,  setNewTeamName]  = useState('');
  const [newTeamColor, setNewTeamColor] = useState('accent-cyan');

  const [editTeam,       setEditTeam]       = useState(null);
  const [showAddModel,   setShowAddModel]   = useState(false);
  const [showAddChatter, setShowAddChatter] = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);

  const addModelRef   = useRef(null);
  const addChatterRef = useRef(null);

  // Create-chatter sub-form state
  const [showCreateChatter, setShowCreateChatter] = useState(false);
  const [newChatter,        setNewChatter]        = useState({ name: '', role: '', hourlyRate: '', commissionRate: '' });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const activeAgency = selectedAgency ?? agencies[0]?.id ?? null;
  const agencyTeams  = teams.filter(t => t.agency_id === activeAgency);
  const team         = agencyTeams.find(t => t.id === selectedTeamId) ?? agencyTeams[0] ?? null;

  const teamCreatorIds = new Set(teamMembers.filter(m => m.team_id === team?.id).map(m => m.creator_id));
  const teamChatterIds = new Set(teamChatters.filter(c => c.team_id === team?.id).map(c => c.chatter_id));
  const myCreators     = creators.filter(c => teamCreatorIds.has(c.id));
  const myChatters     = chatters.filter(c => teamChatterIds.has(c.id));
  const availCreators  = creators.filter(c => c.agency_id === activeAgency && c.is_active && !teamCreatorIds.has(c.id));
  const availChatters  = chatters.filter(c => c.agency_id === activeAgency && !teamChatterIds.has(c.id));

  const teamColor = TEAM_COLORS.find(c => c.id === (team?.color || 'accent-cyan')) || TEAM_COLORS[0];
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd   = weekDates[6];
  const today     = new Date().toISOString().split('T')[0];
  const shifts    = team?.shifts?.length ? team.shifts : DEFAULT_SHIFTS;

  // ── Effects ───────────────────────────────────────────────────────────────────
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

  // WeekPicker: close on outside click or Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onMouse = e => {
      const inBtn    = weekBtnRef.current?.contains(e.target);
      const inPicker = weekPickerDropRef.current?.contains(e.target);
      if (!inBtn && !inPicker) setPickerOpen(false);
    };
    const onKey = e => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown',   onKey);
    };
  }, [pickerOpen]);

  // Manage dropdowns: close on outside click
  useEffect(() => {
    if (!showAddModel && !showAddChatter) return;
    const h = e => {
      if (showAddModel   && addModelRef.current   && !addModelRef.current.contains(e.target))   setShowAddModel(false);
      if (showAddChatter && addChatterRef.current && !addChatterRef.current.contains(e.target)) setShowAddChatter(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAddModel, showAddChatter]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
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

  const cellHours = (date, si) => {
    const e = teamSchedule.find(s => s.team_id === team?.id && s.date === date && s.shift_index === si);
    return e?.hours_worked ?? '';
  };

  // Returns Set of chatter IDs that appear more than once across all shifts on a given day (within this team)
  const conflictedChattersOnDay = (date) => {
    const entries = teamSchedule.filter(s => s.team_id === team?.id && s.date === date && s.chatter_id);
    const seen = new Map();
    entries.forEach(e => seen.set(e.chatter_id, (seen.get(e.chatter_id) || 0) + 1));
    return new Set([...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  };

  const getDayNote = date =>
    teamDayNotes.find(n => n.team_id === team?.id && n.date === date)?.notes || '';

  const handleShiftChange = (date, si, val) => {
    if (!team) return;
    if (!val)                     setScheduleEntry(team.id, date, si, null, false);
    else if (val === '__cover__') setScheduleEntry(team.id, date, si, null, true);
    else                          setScheduleEntry(team.id, date, si, parseInt(val), false);
  };

  const handleCreateChatter = () => {
    if (!newChatter.name.trim() || !activeAgency) return;
    const chatterId = addChatter(
      activeAgency,
      newChatter.name.trim(),
      newChatter.role.trim(),
      '',
      parseFloat(newChatter.commissionRate) || 0,
      parseFloat(newChatter.hourlyRate) || 0,
    );
    if (team && chatterId) addChatterToTeam(team.id, chatterId);
    setNewChatter({ name: '', role: '', hourlyRate: '', commissionRate: '' });
    setShowCreateChatter(false);
  };

  const addShift    = () => setEditTeam(e => ({ ...e, shifts: [...e.shifts, { label: 'New Shift', color: SHIFT_PALETTE[e.shifts.length % SHIFT_PALETTE.length] }] }));
  const removeShift = idx => setEditTeam(e => ({ ...e, shifts: e.shifts.filter((_, i) => i !== idx) }));
  const updateShift = (idx, field, val) => setEditTeam(e => ({ ...e, shifts: e.shifts.map((s, i) => i === idx ? { ...s, [field]: val } : s) }));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-lg h-full overflow-auto space-y-lg">

      {/* Page header */}
      <div className="flex items-center gap-md">
        <Users size={32} className="text-accent-orange" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-orange to-accent-pink bg-clip-text text-transparent">Team</h1>
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
                  : 'neu-btn text-text-secondary hover:text-text-primary'
              }`}>
              {agency.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
                {count} team{count !== 1 ? 's' : ''}
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
          {/* Team tabs + controls */}
          <div className="flex items-center gap-sm flex-wrap">
            {agencyTeams.map(t => {
              const isActive = t.id === team?.id;
              const ci = TEAM_COLORS.find(c => c.id === t.color) || TEAM_COLORS[0];
              return (
                <button key={t.id}
                  onClick={() => {
                    setSelectedTeamId(t.id);
                    setManageMode(false);
                    setShowAddModel(false);
                    setShowAddChatter(false);
                    setShowCreateChatter(false);
                  }}
                  className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                    isActive
                      ? `bg-gradient-to-r ${ci.gradient} text-bg-primary border-transparent shadow-glow`
                      : 'neu-btn text-text-secondary hover:text-text-primary'
                  }`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : ci.hex }} />
                  {t.name}
                </button>
              );
            })}

            {/* Inline new-team form */}
            {showNewTeam ? (
              <div className="flex items-center gap-sm neu-card rounded-xl px-md py-xs animate-scale-in">
                <input type="text" value={newTeamName} autoFocus
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  handleCreateTeam();
                    if (e.key === 'Escape') { setShowNewTeam(false); setNewTeamName(''); }
                  }}
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
                className="flex items-center gap-xs px-md py-sm rounded-xl text-sm neu-btn text-text-tertiary hover:text-accent-lime transition-all">
                <Plus size={13} /> New Team
              </button>
            )}

            {team && (
              <button onClick={() => setManageMode(v => !v)}
                className={`ml-auto flex items-center gap-xs px-md py-sm rounded-xl text-sm border transition-all ${
                  manageMode
                    ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
                    : 'neu-btn text-text-tertiary hover:text-text-primary'
                }`}>
                <Settings size={13} /> {manageMode ? 'Done' : 'Manage'}
              </button>
            )}
          </div>

          {/* Empty state */}
          {agencyTeams.length === 0 && (
            <div className="flex flex-col items-center justify-center py-2xl neu-card-inset rounded-2xl text-center">
              <Users size={36} className="text-text-tertiary/20 mb-md" />
              <p className="text-text-secondary font-semibold text-sm">No teams for this agency yet</p>
              <p className="text-text-tertiary/60 text-xs mt-xs">Click "New Team" above to get started</p>
            </div>
          )}

          {/* ── SCHEDULE VIEW ──────────────────────────────────────────────────── */}
          {team && !manageMode && (
            <div className="space-y-md animate-fade-in">

              {/* Team header banner — polished */}
              <div className={`relative overflow-hidden bg-gradient-to-r ${teamColor.gradient} rounded-xl px-xl py-lg`}>
                {/* Layered overlays to soften the gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/45 pointer-events-none" />
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                <div className="relative flex items-center gap-lg flex-wrap">
                  {/* Team name */}
                  <div className="flex items-center gap-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/60 shrink-0 shadow-sm" />
                    <span className="text-white font-black text-xl tracking-wide drop-shadow-sm">{team.name}</span>
                  </div>
                  {/* Model name chips */}
                  {myCreators.length > 0 && (
                    <div className="flex items-center gap-xs flex-wrap">
                      {myCreators.map(c => (
                        <span key={c.id}
                          className="px-sm py-[3px] rounded-full text-xs font-semibold bg-white/20 text-white/90 border border-white/15">
                          {c.stage_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Chatter count badge */}
                  <div className="ml-auto">
                    <span className="text-white/75 text-xs font-medium bg-black/25 px-sm py-[3px] rounded-full">
                      {myChatters.length} chatter{myChatters.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Week navigator + calendar picker */}
              <div className="relative">
                <div className="flex items-center justify-between neu-card-inset rounded-xl px-lg py-sm">
                  <button
                    onClick={() => setWeekStart(w => addDays(w, -7))}
                    className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors px-sm py-xs rounded-lg hover:bg-white/5">
                    <ChevronLeft size={16} /> Prev
                  </button>

                  {/* Clickable week label → opens WeekPicker */}
                  <button
                    ref={weekBtnRef}
                    onClick={() => {
                      if (!pickerOpen && weekBtnRef.current) {
                        const r = weekBtnRef.current.getBoundingClientRect();
                        setPickerPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
                      }
                      setPickerOpen(v => !v);
                    }}
                    className={`flex items-center gap-sm px-md py-xs rounded-xl border transition-all ${
                      pickerOpen
                        ? 'border-accent-lime/50 bg-accent-lime/10 text-accent-lime'
                        : 'neu-btn border-transparent text-text-primary'
                    }`}>
                    <Calendar size={13} className="opacity-60" />
                    <span className="text-sm font-semibold">{fmtWeek(weekStart, weekEnd)}</span>
                    <Pencil size={10} className="opacity-35" />
                  </button>

                  <div className="flex items-center gap-sm">
                    {/* Copy from previous week */}
                    <button
                      onClick={() => {
                        if (!team) return;
                        const prevWeekStart = addDays(weekStart, -7);
                        copyScheduleWeek(team.id, prevWeekStart, weekStart, weekStart, weekEnd);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      title="Copy schedule from last week"
                      className={`flex items-center gap-xs text-xs transition-all px-sm py-xs rounded-lg border ${
                        copySuccess
                          ? 'text-accent-lime border-accent-lime/40 bg-accent-lime/10'
                          : 'text-text-tertiary hover:text-accent-lime border-transparent hover:border-accent-lime/20 hover:bg-accent-lime/5'
                      }`}>
                      {copySuccess ? <Check size={12} /> : <Copy size={12} />}
                      {copySuccess ? 'Copied!' : 'Copy prev'}
                    </button>
                    <button
                      onClick={() => setWeekStart(mondayOfWeek(today))}
                      className="text-xs text-text-tertiary hover:text-accent-lime transition-colors px-sm py-xs rounded-lg hover:bg-accent-lime/5 border border-transparent hover:border-accent-lime/20">
                      Today
                    </button>
                    <button
                      onClick={() => setWeekStart(w => addDays(w, 7))}
                      className="flex items-center gap-xs text-text-secondary hover:text-text-primary transition-colors px-sm py-xs rounded-lg hover:bg-white/5">
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {pickerOpen && createPortal(
                  <div
                    ref={weekPickerDropRef}
                    style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
                    className="animate-scale-in"
                  >
                    <WeekPicker
                      currentWeekStart={weekStart}
                      onApply={w => { setWeekStart(w); setPickerOpen(false); }}
                      onClose={() => setPickerOpen(false)}
                    />
                  </div>,
                  document.body
                )}
              </div>

              {/* Schedule grid */}
              <div className="neu-card-inset rounded-xl overflow-x-auto shadow-lg">
                <div className="min-w-[640px]">
                  {/* Header row */}
                  <div className="grid border-b border-white/10"
                    style={{ gridTemplateColumns: `80px 52px repeat(${shifts.length}, 1fr) 180px` }}>
                    <div className="px-md py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider">Date</div>
                    <div className="px-xs py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider">Day</div>
                    {shifts.map((shift, si) => {
                      const s   = SHIFT_STYLE[shift.color] || SHIFT_STYLE['accent-cyan'];
                      const hex = SHIFT_HEX[shift.color]   || '#888';
                      return (
                        <div key={si} className={`px-md py-sm ${s.text} ${s.bg}`}
                          style={{
                            borderLeft: `1px solid ${hex}30`,
                            borderTop:  `2px solid ${hex}`,
                          }}>
                          <span className="text-[9px] opacity-35 font-mono mr-[3px]">#{si + 1}</span>
                          <span className="text-xs font-bold">{shift.label}</span>
                        </div>
                      );
                    })}
                    <div className="px-md py-sm text-xs font-semibold text-text-tertiary uppercase tracking-wider border-l border-white/8">Notes</div>
                  </div>

                  {/* Day rows */}
                  {weekDates.map((date, idx) => {
                    const isToday = date === today;
                    return (
                      <div key={date}
                        className={`grid border-b border-white/5 last:border-0 transition-colors
                          ${isToday
                            ? 'bg-accent-lime/[0.05]'
                            : idx % 2 === 1 ? 'bg-white/[0.012]' : ''
                          } hover:bg-white/[0.03]`}
                        style={{ gridTemplateColumns: `80px 52px repeat(${shifts.length}, 1fr) 180px` }}>

                        {/* Date cell */}
                        <div className={`px-md py-sm flex flex-col justify-center ${isToday ? 'border-l-2 border-accent-lime' : 'border-l-2 border-transparent'}`}>
                          <p className={`text-xs font-bold ${isToday ? 'text-accent-lime' : 'text-text-secondary'}`}>{fmtShort(date)}</p>
                          {isToday
                            ? <span className="text-[9px] font-bold text-accent-lime/60 uppercase tracking-wider mt-px">Today</span>
                            : <p className="text-[10px] text-text-tertiary/35">{date.slice(0, 4)}</p>
                          }
                        </div>

                        {/* Day name */}
                        <div className="px-xs py-sm flex items-center">
                          <span className={`text-xs font-semibold ${isToday ? 'text-accent-lime' : 'text-text-tertiary/70'}`}>{fmtDay(date)}</span>
                        </div>

                        {/* Shift cells — custom dropdown */}
                        {(() => {
                          const conflicts = conflictedChattersOnDay(date);
                          return shifts.map((shift, si) => {
                            const s   = SHIFT_STYLE[shift.color] || SHIFT_STYLE['accent-cyan'];
                            const hex = SHIFT_HEX[shift.color]   || '#888';
                            const entry = teamSchedule.find(e => e.team_id === team?.id && e.date === date && e.shift_index === si);
                            const isConflict = entry?.chatter_id && conflicts.has(entry.chatter_id);
                            return (
                              <div key={si} style={{ borderLeft: `1px solid ${hex}20` }}
                                title={isConflict ? '⚠️ Double-booked on this day' : undefined}
                                className={isConflict ? 'ring-1 ring-inset ring-accent-orange/60 bg-accent-orange/5' : ''}>
                                <ShiftCell
                                  value={cellValue(date, si)}
                                  onChange={val => handleShiftChange(date, si, val)}
                                  chatters={myChatters}
                                  shiftStyle={s}
                                  hoursValue={cellHours(date, si)}
                                  onHoursChange={h => team && updateScheduleHours(team.id, date, si, h)}
                                />
                              </div>
                            );
                          });
                        })()}

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

              {/* Left col: Team info + Shift editor + Danger zone */}
              <div className="xl:col-span-2 space-y-md">

                {/* Team info card */}
                <div className="neu-card border-t-2 border-accent-purple/50">
                  <div className="p-lg space-y-md">
                    <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Team Info</h3>
                    <div>
                      <label className="block text-xs text-text-tertiary mb-xs">Team Name</label>
                      <input type="text" value={editTeam.name}
                        onChange={e => setEditTeam(t => ({ ...t, name: e.target.value }))}
                        className="w-full rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all"
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
                        className="w-full rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-purple/50 transition-all resize-none placeholder-text-tertiary/40"
                      />
                    </div>
                    <button onClick={handleSaveTeam}
                      className="w-full py-sm bg-accent-purple/80 hover:bg-accent-purple text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-sm">
                      <Check size={14} /> Save Changes
                    </button>
                  </div>
                </div>

                {/* Shift editor */}
                <div className="neu-card border-t-2 border-accent-orange/50">
                  <div className="p-lg space-y-md">
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
                      className="w-full py-sm bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange text-xs font-semibold rounded-lg border border-accent-orange/20 transition-colors flex items-center justify-center gap-xs">
                      <Check size={12} /> Save Shifts
                    </button>
                  </div>
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

              {/* Right col: Models + Chatters */}
              <div className="xl:col-span-3 space-y-md">

                {/* Models card */}
                <div className="neu-card border-t-2 border-accent-cyan/50">
                  <div className="p-lg space-y-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Models</h3>
                        <p className="text-[10px] text-text-tertiary/50 mt-xs">{myCreators.length} assigned to this team</p>
                      </div>
                      <div className="relative" ref={addModelRef}>
                        <button
                          onClick={() => { setShowAddModel(v => !v); setShowAddChatter(false); }}
                          disabled={availCreators.length === 0}
                          className="flex items-center gap-xs px-md py-xs bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                          <UserPlus size={12} /> Assign Model
                        </button>
                        {showAddModel && (
                          <div className="absolute right-0 top-full mt-xs bg-bg-secondary border border-white/15 rounded-xl shadow-2xl z-50 py-xs min-w-52 animate-scale-in max-h-64 overflow-y-auto">
                            {availCreators.map(c => (
                              <button key={c.id}
                                onClick={() => { addCreatorToTeam(team.id, c.id); setShowAddModel(false); }}
                                className="w-full text-left px-md py-sm text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-sm">
                                <span className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center text-[10px] font-bold text-accent-cyan flex-shrink-0">
                                  {c.stage_name.slice(0, 2).toUpperCase()}
                                </span>
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
                          <div key={c.id}
                            className="flex items-center gap-sm bg-bg-primary/50 border border-accent-cyan/20 rounded-lg px-md py-xs group hover:border-accent-cyan/40 transition-all">
                            <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center text-[10px] font-bold text-accent-cyan">
                              {c.stage_name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-text-primary">{c.stage_name}</span>
                            <button
                              onClick={() => setConfirmDelete({ type: 'member', payload: { teamId: team.id, creatorId: c.id, name: c.stage_name } })}
                              className="opacity-0 group-hover:opacity-100 text-text-tertiary/50 hover:text-accent-pink transition-all ml-xs">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chatters card */}
                <div className="neu-card border-t-2 border-accent-lime/50">
                  <div className="p-lg space-y-md">
                    <div className="flex items-center justify-between gap-sm flex-wrap">
                      <div>
                        <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Chatters</h3>
                        <p className="text-[10px] text-text-tertiary/50 mt-xs">{myChatters.length} assigned to this team</p>
                      </div>
                      <div className="flex items-center gap-xs">
                        {/* Assign existing chatter */}
                        <div className="relative" ref={addChatterRef}>
                          <button
                            onClick={() => { setShowAddChatter(v => !v); setShowAddModel(false); setShowCreateChatter(false); }}
                            disabled={availChatters.length === 0}
                            className="flex items-center gap-xs px-md py-xs bg-accent-lime/10 hover:bg-accent-lime/20 text-accent-lime border border-accent-lime/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                            <UserPlus size={12} /> Assign
                          </button>
                          {showAddChatter && (
                            <div className="absolute right-0 top-full mt-xs bg-bg-secondary border border-white/15 rounded-xl shadow-2xl z-50 py-xs min-w-52 animate-scale-in max-h-64 overflow-y-auto">
                              {availChatters.map(c => (
                                <button key={c.id}
                                  onClick={() => { addChatterToTeam(team.id, c.id); setShowAddChatter(false); }}
                                  className="w-full text-left px-md py-sm text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center gap-sm">
                                  <span className="w-6 h-6 rounded-full bg-accent-lime/20 flex items-center justify-center text-[10px] font-bold text-accent-lime flex-shrink-0">
                                    {c.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="flex-1">{c.name}</span>
                                  {c.role && <span className="text-text-tertiary text-xs">{c.role}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Create new chatter toggle */}
                        <button
                          onClick={() => { setShowCreateChatter(v => !v); setShowAddChatter(false); setShowAddModel(false); }}
                          className={`flex items-center gap-xs px-md py-xs rounded-lg text-xs font-semibold border transition-all ${
                            showCreateChatter
                              ? 'bg-accent-lime/15 border-accent-lime/40 text-accent-lime'
                              : 'neu-btn border-transparent text-text-tertiary hover:text-accent-lime'
                          }`}>
                          <Plus size={12} /> New
                        </button>
                      </div>
                    </div>

                    {/* ── Create chatter sub-form ── */}
                    {showCreateChatter && (
                      <div className="border border-accent-lime/20 rounded-xl p-md space-y-sm bg-accent-lime/[0.03] animate-scale-in">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-lime/70">Create New Chatter</p>
                        <div className="grid grid-cols-2 gap-sm">
                          <div className="col-span-2">
                            <label className="text-[10px] text-text-tertiary mb-xs block">Name *</label>
                            <input type="text" value={newChatter.name} autoFocus
                              onChange={e => setNewChatter(c => ({ ...c, name: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  handleCreateChatter();
                                if (e.key === 'Escape') { setShowCreateChatter(false); setNewChatter({ name: '', role: '', hourlyRate: '', commissionRate: '' }); }
                              }}
                              placeholder="Full name…"
                              className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-lime/50 transition-all placeholder-text-tertiary/40"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-tertiary mb-xs block">Role</label>
                            <input type="text" value={newChatter.role}
                              onChange={e => setNewChatter(c => ({ ...c, role: e.target.value }))}
                              placeholder="e.g. Senior"
                              className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-lime/50 transition-all placeholder-text-tertiary/40"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-tertiary mb-xs block">$/hr</label>
                            <input type="number" value={newChatter.hourlyRate} min="0"
                              onChange={e => setNewChatter(c => ({ ...c, hourlyRate: e.target.value }))}
                              placeholder="0.00"
                              className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-lime/50 transition-all placeholder-text-tertiary/40"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-tertiary mb-xs block">Commission %</label>
                            <input type="number" value={newChatter.commissionRate} min="0" max="100"
                              onChange={e => setNewChatter(c => ({ ...c, commissionRate: e.target.value }))}
                              placeholder="0"
                              className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none focus:border-accent-lime/50 transition-all placeholder-text-tertiary/40"
                            />
                          </div>
                          <div className="col-span-2 flex gap-sm pt-xs">
                            <button
                              onClick={handleCreateChatter}
                              disabled={!newChatter.name.trim()}
                              className="flex-1 py-xs bg-accent-lime/80 hover:bg-accent-lime text-bg-primary text-xs font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-xs">
                              <UserPlus size={11} /> Add &amp; Assign
                            </button>
                            <button
                              onClick={() => { setShowCreateChatter(false); setNewChatter({ name: '', role: '', hourlyRate: '', commissionRate: '' }); }}
                              className="px-md py-xs neu-btn text-text-tertiary text-xs rounded-lg hover:text-text-primary transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chatter chips */}
                    {myChatters.length === 0 && !showCreateChatter && (
                      <p className="text-text-tertiary/50 text-sm text-center py-md">No chatters assigned yet.</p>
                    )}
                    {myChatters.length > 0 && (
                      <div className="flex flex-wrap gap-sm">
                        {myChatters.map(c => (
                          <div key={c.id}
                            className="flex items-center gap-sm bg-bg-primary/50 border border-accent-lime/20 rounded-lg px-md py-xs group hover:border-accent-lime/40 transition-all">
                            <div className="w-6 h-6 rounded-full bg-accent-lime/20 flex items-center justify-center text-[10px] font-bold text-accent-lime">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary">{c.name}</p>
                              {c.role && <p className="text-[10px] text-text-tertiary/60">{c.role}</p>}
                            </div>
                            <button
                              onClick={() => setConfirmDelete({ type: 'chatter', payload: { teamId: team.id, chatterId: c.id, name: c.name } })}
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
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button onClick={executeDeleteTeam} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">Delete Team</button>
              </div>
            </>}

            {confirmDelete.type === 'member' && <>
              <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Model?</h3>
              <p className="text-text-secondary text-sm mb-lg">
                Remove <span className="text-accent-cyan font-semibold">"{confirmDelete.payload.name}"</span> from this team? Their earnings data is unaffected.
              </p>
              <div className="flex gap-md justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
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
                <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm neu-btn rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
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
