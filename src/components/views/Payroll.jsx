import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store.js';
import * as db from '../../db/index.js';
import {
  DollarSign, Users, ChevronLeft, ChevronRight,
  Pencil, Trash2, Copy, Printer, Zap, Check, TrendingUp,
  Calendar, X, AlertTriangle, Settings2, CheckSquare, Square,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];
const MONTH_NAMES   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Pure helpers ────────────────────────────────────────────────────────────

const pad       = n  => String(n).padStart(2, '0');
const isoDate   = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn    = (y, m) => new Date(y, m, 0).getDate();
const firstDay  = (y, m) => new Date(y, m - 1, 1).getDay(); // 0=Sun
const fmt       = n  => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseDateLabel(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const mo = MONTH_SHORT[parseInt(m) - 1];
  return `${mo} ${parseInt(d)}`;
}

function fullDateLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${MONTH_SHORT[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function periodLabel(start, end) {
  if (!start || !end) return 'No period selected';
  const [sy, sm, sd] = start.split('-');
  const [ey, em, ed] = end.split('-');
  const startStr = `${MONTH_SHORT[parseInt(sm) - 1]} ${parseInt(sd)}`;
  const endStr   = sy === ey
    ? (sm === em ? parseInt(ed) : `${MONTH_SHORT[parseInt(em) - 1]} ${parseInt(ed)}`)
    : `${MONTH_SHORT[parseInt(em) - 1]} ${parseInt(ed)}, ${ey}`;
  return `${startStr} – ${endStr}, ${sy}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status, onClick }) => {
  const styles = {
    pending:  'bg-accent-orange/15 text-accent-orange border-accent-orange/30',
    approved: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    paid:     'bg-accent-lime/15 text-accent-lime border-accent-lime/30',
  };
  return (
    <button onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize transition-all hover:opacity-80 ${styles[status] || styles.pending}`}>
      {status}
    </button>
  );
};

const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/8 rounded-xl p-lg relative overflow-hidden group hover:border-white/15 transition-all">
    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity rounded-xl"
      style={{ background: `radial-gradient(circle at top right, ${color}, transparent 60%)` }} />
    <div className="flex items-start justify-between mb-sm relative">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
      <div className="p-sm rounded-xl border border-white/8" style={{ background: `${color}15` }}>
        <Icon size={14} style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-text-primary relative font-mono">{value}</p>
    {sub && <p className="text-xs text-text-tertiary mt-xs relative">{sub}</p>}
  </div>
);

// ─── Calendar Picker ─────────────────────────────────────────────────────────

const CalendarPicker = ({ currentStart, currentEnd, onApply, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayParts = today.split('-');
  const todayYear  = parseInt(todayParts[0]);
  const todayMonth = parseInt(todayParts[1]);

  const [calYear,  setCalYear]  = useState(() => {
    if (currentStart) return parseInt(currentStart.split('-')[0]);
    return todayYear;
  });
  const [calMonth, setCalMonth] = useState(() => {
    if (currentStart) return parseInt(currentStart.split('-')[1]);
    return todayMonth;
  });
  const [stagingStart, setStagingStart] = useState(currentStart || '');
  const [stagingEnd,   setStagingEnd]   = useState(currentEnd   || '');
  const [hoverDate,    setHoverDate]    = useState('');
  const [selectStep,   setSelectStep]   = useState('start');

  const navMonth = (dir) => {
    let nm = calMonth + dir, ny = calYear;
    if (nm < 1)  { nm = 12; ny--; }
    if (nm > 12) { nm = 1;  ny++; }
    setCalMonth(nm); setCalYear(ny);
  };

  const applyPreset = (start, end) => {
    setStagingStart(start);
    setStagingEnd(end);
    setSelectStep('start');
    const [py, pm] = start.split('-');
    setCalYear(parseInt(py)); setCalMonth(parseInt(pm));
  };

  const presets = [
    {
      label: '1st – 15th',
      fn: () => applyPreset(isoDate(calYear, calMonth, 1), isoDate(calYear, calMonth, 15)),
    },
    {
      label: '16th – End',
      fn: () => applyPreset(isoDate(calYear, calMonth, 16), isoDate(calYear, calMonth, daysIn(calYear, calMonth))),
    },
    {
      label: 'Full Month',
      fn: () => applyPreset(isoDate(calYear, calMonth, 1), isoDate(calYear, calMonth, daysIn(calYear, calMonth))),
    },
    {
      label: 'Last 7d',
      fn: () => {
        const end   = new Date(); end.setDate(end.getDate());
        const start = new Date(); start.setDate(start.getDate() - 6);
        const es = end.toISOString().split('T')[0];
        const ss = start.toISOString().split('T')[0];
        applyPreset(ss, es);
      },
    },
    {
      label: 'Last 14d',
      fn: () => {
        const end   = new Date();
        const start = new Date(); start.setDate(start.getDate() - 13);
        const es = end.toISOString().split('T')[0];
        const ss = start.toISOString().split('T')[0];
        applyPreset(ss, es);
      },
    },
  ];

  const handleDayClick = (iso) => {
    if (selectStep === 'start') {
      setStagingStart(iso);
      setStagingEnd('');
      setSelectStep('end');
    } else {
      if (iso < stagingStart) {
        // Clicked before start — flip
        setStagingEnd(stagingStart);
        setStagingStart(iso);
      } else {
        setStagingEnd(iso);
      }
      setSelectStep('start');
    }
  };

  const effectiveEnd = stagingEnd || hoverDate;

  const dayClass = (iso) => {
    const isStart  = iso === stagingStart;
    const isEnd    = iso === stagingEnd;
    const inRange  = stagingStart && effectiveEnd && iso > stagingStart && iso < effectiveEnd;
    const isToday  = iso === today;

    let cls = 'relative flex items-center justify-center w-8 h-8 text-xs font-medium cursor-pointer select-none transition-all ';
    if (isStart || isEnd) {
      cls += 'bg-accent-lime text-bg-primary rounded-full font-bold shadow-glow-lime z-10 ';
    } else if (inRange) {
      cls += 'bg-accent-lime/20 text-accent-lime rounded-none ';
    } else {
      cls += 'text-text-secondary hover:bg-white/10 hover:text-text-primary rounded-full ';
    }
    if (isToday && !isStart && !isEnd) cls += 'ring-1 ring-accent-cyan/50 rounded-full ';
    return cls;
  };

  // Build calendar grid
  const totalDays = daysIn(calYear, calMonth);
  const startOffset = firstDay(calYear, calMonth);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const canApply = stagingStart && stagingEnd && stagingStart <= stagingEnd;

  return (
    <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-white/15 rounded-2xl shadow-2xl w-[340px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-lg py-md border-b border-white/8">
        <div className="flex items-center gap-sm">
          <Calendar size={14} className="text-accent-lime" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Select Pay Period</span>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors p-xs rounded-lg hover:bg-white/5">
          <X size={14} />
        </button>
      </div>

      {/* Quick presets */}
      <div className="px-lg pt-md pb-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-sm">Quick Select</p>
        <div className="flex flex-wrap gap-xs">
          {presets.map(p => (
            <button key={p.label} onClick={p.fn}
              className="px-sm py-xs text-[11px] font-semibold rounded-lg border border-white/10 text-text-secondary hover:text-accent-lime hover:border-accent-lime/40 hover:bg-accent-lime/5 transition-all">
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

      {/* Calendar grid */}
      <div className="px-lg pb-md">
        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-xs">
          {DAY_LABELS.map(d => (
            <div key={d} className="flex items-center justify-center w-8 h-6 text-[10px] font-bold text-text-tertiary/50 uppercase">{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-xs">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="w-8 h-8" />;
            const iso = isoDate(calYear, calMonth, day);
            return (
              <div key={iso} className={dayClass(iso)}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => selectStep === 'end' && stagingStart && setHoverDate(iso)}
                onMouseLeave={() => setHoverDate('')}>
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection summary */}
      <div className="mx-lg mb-md bg-white/[0.03] border border-white/8 rounded-xl px-md py-sm">
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-[2px]">From</p>
            <p className={`font-mono font-semibold ${stagingStart ? 'text-accent-lime' : 'text-text-tertiary/40'}`}>
              {stagingStart ? fullDateLabel(stagingStart) : 'Click a day'}
            </p>
          </div>
          <ChevronRight size={12} className="text-text-tertiary/30 mx-sm" />
          <div className="text-right">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest mb-[2px]">To</p>
            <p className={`font-mono font-semibold ${stagingEnd ? 'text-accent-cyan' : 'text-text-tertiary/40'}`}>
              {stagingEnd ? fullDateLabel(stagingEnd) : (stagingStart ? 'Click end date' : '—')}
            </p>
          </div>
        </div>
        {stagingStart && stagingEnd && (
          <p className="text-[10px] text-text-tertiary/50 mt-xs text-center">
            {(() => {
              const d1 = new Date(stagingStart), d2 = new Date(stagingEnd);
              const days = Math.round((d2 - d1) / 86400000) + 1;
              return `${days} day${days === 1 ? '' : 's'}`;
            })()}
          </p>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex items-center gap-sm px-lg pb-lg">
        <button onClick={onClose}
          className="flex-1 py-sm border border-white/10 rounded-xl text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-all">
          Cancel
        </button>
        <button
          disabled={!canApply}
          onClick={() => onApply(stagingStart, stagingEnd)}
          className="flex-1 py-sm bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary font-bold rounded-xl text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-xs">
          <Check size={12} /> Apply Period
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const Payroll = () => {
  const agencies          = useStore(state => state.agencies);
  const creators          = useStore(state => state.creators);
  const chatters          = useStore(state => state.chatters);
  const payrollRecords    = useStore(state => state.payrollRecords);
  const teams             = useStore(state => state.teams);
  const teamMembers       = useStore(state => state.teamMembers);
  const teamChatters      = useStore(state => state.teamChatters);
  const payrollPeriod     = useStore(state => state.payrollPeriod);
  const setPayrollPeriod  = useStore(state => state.setPayrollPeriod);
  const loadPayrollRecords = useStore(state => state.loadPayrollRecords);
  const generatePayroll   = useStore(state => state.generatePayroll);
  const updatePayrollEntry = useStore(state => state.updatePayrollEntry);
  const deletePayrollEntry = useStore(state => state.deletePayrollEntry);
  const deletePayrollPeriod = useStore(state => state.deletePayrollPeriod);

  const { periodStart, periodEnd } = payrollPeriod;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedAgency,  setSelectedAgency]  = useState(null);
  const [selectedTeam,    setSelectedTeam]    = useState(null);
  const [generating,      setGenerating]      = useState(false);
  const [generated,       setGenerated]       = useState(false);
  const [showConfirmGen,  setShowConfirmGen]  = useState(false);
  const [showHistory,     setShowHistory]     = useState(false);
  const [historyPeriods,  setHistoryPeriods]  = useState([]);
  const [historyManage,   setHistoryManage]   = useState(false);
  const [historySelected, setHistorySelected] = useState(new Set());
  const [confirmDelete,   setConfirmDelete]   = useState(null);  // { type:'record'|'period', payload }
  const [showExport,      setShowExport]      = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [pickerOpen,      setPickerOpen]      = useState(false);
  const pickerRef = useRef(null);

  // ── Inline editing ─────────────────────────────────────────────────────────
  const [editing,      setEditing]      = useState(null); // { recordId, field }
  const [pendingValue, setPendingValue] = useState('');

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPayrollRecords(periodStart, periodEnd);
    setHistoryPeriods(db.getPayrollHistory());
  }, [periodStart, periodEnd]);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  // Close picker on Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerOpen]);

  // ── Inline edit handlers ───────────────────────────────────────────────────
  const startEdit = (recordId, field, currentValue) => {
    setEditing({ recordId, field });
    setPendingValue(String(currentValue ?? ''));
  };
  const commitEdit = () => {
    if (!editing) return;
    const val = parseFloat(pendingValue);
    updatePayrollEntry(editing.recordId, { [editing.field]: isNaN(val) ? 0 : Math.max(0, val) });
    setEditing(null);
    setPendingValue('');
  };
  const cancelEdit = () => { setEditing(null); setPendingValue(''); };

  // ── Period picker apply ────────────────────────────────────────────────────
  const applyPeriod = (start, end) => {
    setPickerOpen(false);
    setPayrollPeriod(start, end);
    loadPayrollRecords(start, end);
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const hasExisting = payrollRecords.length > 0;
    if (hasExisting && !showConfirmGen) { setShowConfirmGen(true); return; }
    setShowConfirmGen(false);
    setGenerating(true);
    generatePayroll(periodStart, periodEnd);
    setGenerating(false);
    setGenerated(true);
    setHistoryPeriods(db.getPayrollHistory());
    setTimeout(() => setGenerated(false), 2500);
  };

  // Reset team filter when agency changes
  const handleSetAgency = (id) => { setSelectedAgency(id); setSelectedTeam(null); };

  // ── Derived data ───────────────────────────────────────────────────────────
  const agencyTeams = useMemo(() =>
    teams.filter(t => selectedAgency === null ? true : t.agency_id === selectedAgency),
    [teams, selectedAgency]
  );

  const selectedTeamObj = agencyTeams.find(t => t.id === selectedTeam) ?? null;

  const visibleRecords = useMemo(() => {
    let records = selectedAgency === null
      ? payrollRecords
      : payrollRecords.filter(r => r.agency_id === selectedAgency);
    if (selectedTeam !== null) {
      const tcIds = new Set(teamMembers.filter(m => m.team_id === selectedTeam).map(m => m.creator_id));
      const ttIds = new Set(teamChatters.filter(c => c.team_id === selectedTeam).map(c => c.chatter_id));
      records = records.filter(r =>
        r.person_type === 'creator' ? tcIds.has(r.person_id) : ttIds.has(r.person_id)
      );
    }
    return records;
  }, [payrollRecords, selectedAgency, selectedTeam, teamMembers, teamChatters]);
  const creatorRecords  = visibleRecords.filter(r => r.person_type === 'creator');
  const chatterRecords  = visibleRecords.filter(r => r.person_type === 'chatter');
  const totalNet        = visibleRecords.reduce((s, r) => s + r.net_pay, 0);
  const creatorNet      = creatorRecords.reduce((s, r) => s + r.net_pay, 0);
  const chatterNet      = chatterRecords.reduce((s, r) => s + r.net_pay, 0);
  const statusCounts    = { pending: 0, approved: 0, paid: 0 };
  visibleRecords.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  const getCreatorName  = id => creators.find(c => c.id === id)?.stage_name || 'Unknown';
  const getChatterName  = id => chatters.find(c => c.id === id)?.name        || 'Unknown';
  const getChatterRole  = id => chatters.find(c => c.id === id)?.role        || '';
  const getAgencyColor  = id => AGENCY_COLORS[agencies.findIndex(a => a.id === id) % AGENCY_COLORS.length] || '#00d9ff';

  const cycleStatus = record => {
    const order = ['pending', 'approved', 'paid'];
    updatePayrollEntry(record.id, { status: order[(order.indexOf(record.status) + 1) % order.length] });
  };

  // ── History management ─────────────────────────────────────────────────────
  const toggleHistorySelect = (key) => {
    setHistorySelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllHistory = () => setHistorySelected(new Set(historyPeriods.map(p => p.key)));
  const clearHistorySelect = () => setHistorySelected(new Set());

  const confirmDeletePeriod = (period) => {
    setConfirmDelete({ type: 'period', payload: period });
  };

  const confirmDeleteRecord = (record) => {
    setConfirmDelete({ type: 'record', payload: record });
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'record') {
      deletePayrollEntry(confirmDelete.payload.id);
    } else if (confirmDelete.type === 'period') {
      deletePayrollPeriod(confirmDelete.payload.period_start, confirmDelete.payload.period_end);
      setHistoryPeriods(db.getPayrollHistory());
    } else if (confirmDelete.type === 'bulk') {
      confirmDelete.payload.forEach(p => {
        deletePayrollPeriod(p.period_start, p.period_end);
      });
      setHistoryPeriods(db.getPayrollHistory());
      setHistorySelected(new Set());
    }
    setConfirmDelete(null);
  };

  const handleBulkDelete = () => {
    const toDelete = historyPeriods.filter(p => historySelected.has(p.key));
    setConfirmDelete({ type: 'bulk', payload: toDelete });
  };

  // ── History navigation ─────────────────────────────────────────────────────
  const navigateToPeriod = (p) => {
    setPayrollPeriod(p.period_start, p.period_end);
    loadPayrollRecords(p.period_start, p.period_end);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const buildExportText = () => {
    const agencyName = selectedAgency ? agencies.find(a => a.id === selectedAgency)?.name : 'All Agencies';
    const lines = [
      `PAYROLL REPORT — ${periodLabel(periodStart, periodEnd)}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Agency: ${agencyName}`,
      '─'.repeat(52), '',
    ];
    if (creatorRecords.length > 0) {
      lines.push('CREATORS');
      creatorRecords.forEach(r => {
        lines.push(`  ${getCreatorName(r.person_id)}: ${fmt(r.net_pay)}  [${r.status}]`);
        lines.push(`    Total Sales: ${fmt(r.base_revenue)}  ×  ${r.commission_rate}%  =  ${fmt(r.commission_amount)}`);
        if (r.deductions > 0) lines.push(`    Deductions: -${fmt(r.deductions)}`);
        if (r.bonuses > 0) lines.push(`    Bonuses: +${fmt(r.bonuses)}`);
      });
      lines.push('');
    }
    if (chatterRecords.length > 0) {
      lines.push('CHATTERS / MANAGERS');
      chatterRecords.forEach(r => {
        const role = getChatterRole(r.person_id);
        lines.push(`  ${getChatterName(r.person_id)}${role ? ` (${role})` : ''}: ${fmt(r.net_pay)}  [${r.status}]`);
        if (r.hourly_rate > 0) lines.push(`    Hourly: $${r.hourly_rate}/hr × ${r.hours_worked}h = ${fmt(r.hourly_amount)}`);
        if (r.commission_rate > 0) lines.push(`    Commission: ${r.commission_rate}% × ${fmt(r.base_revenue)} = ${fmt(r.commission_amount)}`);
        if (r.deductions > 0) lines.push(`    Deductions: -${fmt(r.deductions)}`);
        if (r.bonuses > 0) lines.push(`    Bonuses: +${fmt(r.bonuses)}`);
        if (r.notes) lines.push(`    Note: ${r.notes}`);
      });
      lines.push('');
    }
    lines.push('─'.repeat(52));
    lines.push(`TOTAL PAYOUT: ${fmt(totalNet)}`);
    lines.push(`  Creators: ${fmt(creatorNet)}  |  Chatters: ${fmt(chatterNet)}`);
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildExportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'payroll-print-style';
    style.textContent = `@media print { body > * { display: none !important; } #payroll-print-root { display: block !important; color: #000; background: #fff; padding: 20px; } }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById('payroll-print-style')?.remove(), 1000);
  };

  // ── Editable cell ──────────────────────────────────────────────────────────
  const EditableCell = ({ record, field, display, color = 'text-text-secondary', step = '0.01' }) => {
    const isActive = editing?.recordId === record.id && editing?.field === field;
    if (isActive) return (
      <input
        autoFocus type="number" value={pendingValue} min="0" step={step}
        onChange={e => setPendingValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
        className="bg-bg-primary border border-accent-cyan rounded px-2 py-0.5 text-text-primary font-mono text-xs text-right focus:outline-none focus:ring-1 focus:ring-accent-cyan w-20"
      />
    );
    return (
      <div onClick={() => startEdit(record.id, field, record[field] || 0)}
        className="group/ec flex items-center justify-end gap-1 cursor-text">
        <span className={`font-mono text-xs ${color}`}>{display}</span>
        <Pencil size={8} className="opacity-0 group-hover/ec:opacity-40 transition-opacity text-text-tertiary" />
      </div>
    );
  };

  // ── Row renderers ──────────────────────────────────────────────────────────
  const renderCreatorRow = record => {
    const name    = getCreatorName(record.person_id);
    const initials = name.slice(0, 2).toUpperCase();
    const color   = getAgencyColor(record.agency_id);
    return (
      <tr key={record.id} className="group transition-colors hover:bg-white/[0.03] border-b border-white/5">
        <td className="px-4 py-3 min-w-[160px]" style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10"
              style={{ background: `linear-gradient(135deg, ${color}50, ${color}20)` }}>{initials}</div>
            <span className="font-semibold text-text-primary text-sm">{name}</span>
          </div>
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="base_revenue" display={fmt(record.base_revenue)} />
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="commission_rate" display={`${record.commission_rate || 0}%`} color="text-accent-lime" step="0.01" />
        </td>
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-text-secondary">{fmt(record.commission_amount)}</span>
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="deductions" display={record.deductions > 0 ? `-${fmt(record.deductions)}` : '—'} color={record.deductions > 0 ? 'text-accent-pink' : 'text-white/20'} />
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="bonuses" display={record.bonuses > 0 ? `+${fmt(record.bonuses)}` : '—'} color={record.bonuses > 0 ? 'text-accent-lime' : 'text-white/20'} />
        </td>
        <td className="text-right px-3 py-3">
          <span className="font-bold text-accent-cyan font-mono">{fmt(record.net_pay)}</span>
        </td>
        <td className="px-3 py-3"><StatusBadge status={record.status} onClick={() => cycleStatus(record)} /></td>
        <td className="px-2 py-3">
          <button onClick={() => confirmDeleteRecord(record)}
            className="opacity-0 group-hover:opacity-100 p-xs text-text-tertiary hover:text-accent-pink rounded transition-all">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    );
  };

  const renderChatterRow = record => {
    const name    = getChatterName(record.person_id);
    const role    = getChatterRole(record.person_id);
    const initials = name.slice(0, 2).toUpperCase();
    const color   = getAgencyColor(record.agency_id);
    return (
      <tr key={record.id} className="group transition-colors hover:bg-white/[0.03] border-b border-white/5">
        <td className="px-4 py-3 min-w-[160px]" style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10"
              style={{ background: `linear-gradient(135deg, ${color}50, ${color}20)` }}>{initials}</div>
            <div>
              <p className="font-semibold text-text-primary text-sm">{name}</p>
              {role && <p className="text-xs text-text-tertiary">{role}</p>}
            </div>
          </div>
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="base_revenue" display={fmt(record.base_revenue)} />
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="hourly_rate" display={record.hourly_rate > 0 ? `$${record.hourly_rate}/hr` : '—'} color={record.hourly_rate > 0 ? 'text-accent-orange' : 'text-white/20'} step="0.01" />
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="hours_worked" display={record.hours_worked > 0 ? `${record.hours_worked}h` : '—'} color={record.hours_worked > 0 ? 'text-accent-orange' : 'text-white/20'} step="0.5" />
        </td>
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-accent-orange/80">{record.hourly_amount > 0 ? fmt(record.hourly_amount) : '—'}</span>
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="commission_rate" display={`${record.commission_rate || 0}%`} color="text-accent-lime" step="0.01" />
        </td>
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-accent-lime/80">{record.commission_amount > 0 ? fmt(record.commission_amount) : '—'}</span>
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="deductions" display={record.deductions > 0 ? `-${fmt(record.deductions)}` : '—'} color={record.deductions > 0 ? 'text-accent-pink' : 'text-white/20'} />
        </td>
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="bonuses" display={record.bonuses > 0 ? `+${fmt(record.bonuses)}` : '—'} color={record.bonuses > 0 ? 'text-accent-lime' : 'text-white/20'} />
        </td>
        <td className="text-right px-3 py-3">
          <span className="font-bold text-accent-cyan font-mono">{fmt(record.net_pay)}</span>
        </td>
        <td className="px-3 py-3"><StatusBadge status={record.status} onClick={() => cycleStatus(record)} /></td>
        <td className="px-2 py-3">
          <button onClick={() => confirmDeleteRecord(record)}
            className="opacity-0 group-hover:opacity-100 p-xs text-text-tertiary hover:text-accent-pink rounded transition-all">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    );
  };

  // ── Confirm modal content ──────────────────────────────────────────────────
  const confirmModalContent = () => {
    if (!confirmDelete) return null;
    if (confirmDelete.type === 'record') {
      const r = confirmDelete.payload;
      const name = r.person_type === 'creator' ? getCreatorName(r.person_id) : getChatterName(r.person_id);
      return { title: 'Remove Record?', body: `Remove payroll record for ${name}?` };
    }
    if (confirmDelete.type === 'period') {
      const p = confirmDelete.payload;
      return {
        title: 'Delete Period?',
        body: `Delete all ${p.record_count} payroll records for ${parseDateLabel(p.period_start)}–${parseDateLabel(p.period_end)}? This cannot be undone.`,
      };
    }
    if (confirmDelete.type === 'bulk') {
      const periods = confirmDelete.payload;
      const totalRecs = periods.reduce((s, p) => s + p.record_count, 0);
      return {
        title: `Delete ${periods.length} Periods?`,
        body: `Remove all ${totalRecs} payroll records across ${periods.length} selected periods? This cannot be undone.`,
      };
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div className="flex items-center gap-md">
          <DollarSign size={28} className="text-accent-lime" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary leading-tight">Payroll</h1>
            <p className="text-xs text-accent-lime/70 font-mono">{periodLabel(periodStart, periodEnd)}</p>
          </div>
        </div>
        <div className="flex items-center gap-md flex-wrap">
          <button onClick={() => setShowExport(v => !v)}
            className="flex items-center gap-xs px-md py-sm text-xs text-text-tertiary hover:text-text-primary border border-white/10 hover:border-white/20 rounded-lg transition-all">
            <Printer size={12} /> Export
          </button>
          {showConfirmGen ? (
            <div className="flex items-center gap-sm bg-accent-orange/10 border border-accent-orange/30 rounded-lg px-md py-xs">
              <span className="text-xs text-accent-orange">Overwrite existing payroll?</span>
              <button onClick={handleGenerate} className="text-xs text-accent-orange font-semibold hover:underline">Yes</button>
              <button onClick={() => setShowConfirmGen(false)} className="text-xs text-text-tertiary hover:text-text-primary ml-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={handleGenerate} disabled={generating || agencies.length === 0}
              className="flex items-center gap-sm px-lg py-sm bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary font-semibold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {generating
                ? <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                : <Zap size={14} />}
              {generated ? '✓ Generated!' : 'Generate Payroll'}
            </button>
          )}
        </div>
      </div>

      {/* ── Period bar + picker ── */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(v => !v)}
          className={`flex items-center gap-md px-lg py-md rounded-xl border transition-all group ${
            pickerOpen
              ? 'bg-accent-lime/10 border-accent-lime/40 shadow-glow-lime'
              : 'bg-gradient-to-br from-bg-tertiary to-bg-secondary border-white/10 hover:border-accent-lime/30 hover:bg-accent-lime/5'
          }`}
        >
          <Calendar size={16} className={pickerOpen ? 'text-accent-lime' : 'text-text-tertiary group-hover:text-accent-lime transition-colors'} />
          <div className="text-left">
            <p className={`text-sm font-bold transition-colors ${pickerOpen ? 'text-accent-lime' : 'text-text-primary'}`}>
              {periodLabel(periodStart, periodEnd)}
            </p>
            <p className="text-[10px] text-text-tertiary/60 mt-[1px]">Click to change pay period</p>
          </div>
          <Pencil size={12} className="ml-auto text-text-tertiary/40 group-hover:text-accent-lime/60 transition-colors" />
        </button>

        {pickerOpen && (
          <div className="absolute top-full mt-sm left-0 z-50 animate-scale-in">
            <CalendarPicker
              currentStart={periodStart}
              currentEnd={periodEnd}
              onApply={applyPeriod}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}

        <p className="text-xs text-text-tertiary/40 mt-sm hidden sm:block">
          Click any value in the table to edit · Enter to save · Esc to cancel
        </p>
      </div>

      {/* ── Export panel ── */}
      {showExport && (
        <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-lg flex items-center gap-md animate-slide-up flex-wrap">
          <p className="text-sm text-text-secondary flex-1">{periodLabel(periodStart, periodEnd)}</p>
          <button onClick={handleCopy}
            className="flex items-center gap-xs px-lg py-sm bg-white/5 border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent-cyan/30 transition-all">
            <Copy size={14} />{copied ? '✓ Copied!' : 'Copy to clipboard'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-xs px-lg py-sm bg-white/5 border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent-cyan/30 transition-all">
            <Printer size={14} /> Print
          </button>
        </div>
      )}

      {/* ── History ── */}
      {historyPeriods.length > 0 && (
        <div className="bg-gradient-to-br from-bg-tertiary/50 to-bg-secondary/50 border border-white/8 rounded-xl overflow-hidden">
          {/* History header */}
          <div className="flex items-center justify-between px-lg py-md border-b border-white/8">
            <button onClick={() => { setShowHistory(v => !v); setHistoryManage(false); setHistorySelected(new Set()); }}
              className="flex items-center gap-sm text-xs font-bold uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
              <Calendar size={12} />
              History ({historyPeriods.length})
              <ChevronRight size={12} className={`transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            </button>
            {showHistory && (
              <div className="flex items-center gap-sm">
                {historyManage && historySelected.size > 0 && (
                  <>
                    <button onClick={selectAllHistory}
                      className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                      Select All
                    </button>
                    <button onClick={handleBulkDelete}
                      className="flex items-center gap-xs px-md py-xs bg-accent-pink/10 border border-accent-pink/30 text-accent-pink text-xs font-semibold rounded-lg hover:bg-accent-pink/20 transition-all">
                      <Trash2 size={10} /> Delete Selected ({historySelected.size})
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setHistoryManage(v => !v); setHistorySelected(new Set()); }}
                  className={`flex items-center gap-xs px-md py-xs text-xs font-semibold rounded-lg border transition-all ${
                    historyManage
                      ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                      : 'border-white/10 text-text-tertiary hover:text-text-primary hover:border-white/20'
                  }`}>
                  <Settings2 size={11} /> {historyManage ? 'Done' : 'Manage'}
                </button>
              </div>
            )}
          </div>

          {/* History rows */}
          {showHistory && (
            <div className="divide-y divide-white/5">
              {historyPeriods.map(p => {
                const isActive   = p.period_start === periodStart && p.period_end === periodEnd;
                const isSelected = historySelected.has(p.key);
                return (
                  <div key={p.key}
                    className={`flex items-center gap-md px-lg py-md group transition-all ${
                      isActive ? 'bg-accent-lime/8 border-l-2 border-accent-lime' : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                    } ${isSelected ? 'bg-accent-pink/5' : ''}`}>

                    {/* Checkbox in manage mode */}
                    {historyManage && (
                      <button onClick={() => toggleHistorySelect(p.key)} className="flex-shrink-0 text-text-tertiary hover:text-accent-cyan transition-colors">
                        {isSelected ? <CheckSquare size={15} className="text-accent-cyan" /> : <Square size={15} />}
                      </button>
                    )}

                    {/* Period info — clickable to navigate */}
                    <button onClick={() => !historyManage && navigateToPeriod(p)}
                      className={`flex-1 flex items-center gap-lg text-left ${historyManage ? 'pointer-events-none' : ''}`}>
                      <div className="min-w-[130px]">
                        <p className={`text-sm font-semibold ${isActive ? 'text-accent-lime' : 'text-text-primary'}`}>
                          {parseDateLabel(p.period_start)} – {parseDateLabel(p.period_end)}, {p.period_year}
                        </p>
                      </div>
                      <div className="flex items-center gap-lg text-xs text-text-tertiary">
                        <span>{p.record_count} record{p.record_count !== 1 ? 's' : ''}</span>
                        <span className="font-mono font-semibold text-text-secondary">{fmt(p.total_net_pay)}</span>
                      </div>
                      {isActive && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-accent-lime/70 bg-accent-lime/10 px-sm py-[2px] rounded-full">Active</span>
                      )}
                    </button>

                    {/* Individual delete — only in normal mode, on hover */}
                    {!historyManage && (
                      <button onClick={() => confirmDeletePeriod(p)}
                        className="opacity-0 group-hover:opacity-100 p-xs text-text-tertiary hover:text-accent-pink rounded-lg transition-all flex-shrink-0">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Agency tabs ── */}
      {agencies.length > 1 && (
        <div className="flex items-center gap-sm flex-wrap">
          <button onClick={() => handleSetAgency(null)}
            className={`px-lg py-sm rounded-xl text-sm font-semibold border transition-all ${
              selectedAgency === null
                ? 'bg-white/10 border-white/20 text-text-primary'
                : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary'
            }`}>All Agencies</button>
          {agencies.map((agency, idx) => {
            const color    = AGENCY_COLORS[idx % AGENCY_COLORS.length];
            const isActive = selectedAgency === agency.id;
            return (
              <button key={agency.id} onClick={() => handleSetAgency(agency.id)}
                className={`px-lg py-sm rounded-xl text-sm font-semibold border transition-all ${isActive ? 'text-bg-primary' : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'}`}
                style={isActive ? { background: color, borderColor: color } : {}}>
                {agency.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Team filter row ── */}
      {agencyTeams.length > 0 && (
        <div className="flex items-center gap-sm flex-wrap">
          <span className="text-xs text-text-tertiary/60 font-semibold uppercase tracking-widest mr-xs">Team</span>
          <button onClick={() => setSelectedTeam(null)}
            className={`px-md py-xs rounded-lg text-xs font-semibold border transition-all ${
              selectedTeam === null
                ? 'bg-white/10 border-white/20 text-text-primary'
                : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary'
            }`}>All Teams</button>
          {agencyTeams.map(t => {
            const TEAM_HEX = { 'accent-cyan': '#00d9ff', 'accent-lime': '#00ff88', 'accent-purple': '#9d4edd', 'accent-pink': '#ff006e', 'accent-orange': '#ff6b35', 'accent-blue': '#3b82f6' };
            const hex = TEAM_HEX[t.color] || '#00d9ff';
            const isActive = selectedTeam === t.id;
            return (
              <button key={t.id} onClick={() => setSelectedTeam(isActive ? null : t.id)}
                className={`flex items-center gap-xs px-md py-xs rounded-lg text-xs font-semibold border transition-all ${isActive ? 'text-bg-primary' : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary'}`}
                style={isActive ? { background: hex, borderColor: hex } : {}}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.6)' : hex }} />
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard label="Total Payout"  value={fmt(totalNet)}     sub={`${visibleRecords.length} records`}        color="#00ff88" icon={DollarSign} />
        <StatCard label="Creators"      value={fmt(creatorNet)}   sub={`${creatorRecords.length} creators`}        color="#00d9ff" icon={TrendingUp} />
        <StatCard label="Chatters"      value={fmt(chatterNet)}   sub={`${chatterRecords.length} chatters`}        color="#9d4edd" icon={Users} />
        <StatCard label="Status"        value={`${statusCounts.paid || 0} paid`}
          sub={`${statusCounts.pending || 0} pending · ${statusCounts.approved || 0} approved`}
          color="#ff6b35" icon={Check} />
      </div>

      {/* ── Tables ── */}
      {visibleRecords.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
          <DollarSign size={40} className="mx-auto text-text-tertiary/30 mb-md" />
          <p className="text-text-tertiary font-semibold">No payroll for this period</p>
          <p className="text-text-tertiary/50 text-sm mt-xs">
            Pick a period above then click <span className="text-accent-lime">Generate Payroll</span>
          </p>
          {agencies.length === 0 && <p className="text-accent-pink text-xs mt-md">Add agencies and creators first</p>}
        </div>
      ) : (
        <div id="payroll-print-root" className="space-y-lg">

          {/* Creators table */}
          {creatorRecords.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-white/5 shadow-xl">
              <div className="px-lg py-sm border-b border-white/8 bg-white/[0.02] flex items-center gap-sm">
                <TrendingUp size={14} className="text-accent-cyan" />
                <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan/70">
                  {selectedTeamObj ? `${selectedTeamObj.name} — ` : ''}Creators ({creatorRecords.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ background: 'rgba(10,12,30,0.7)' }}>
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60 min-w-[150px]">Creator</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60">Total Sales</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-bg-primary/60">Rate %</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60">Commission</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-pink/60 bg-bg-primary/60">Deductions</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-bg-primary/60">Bonuses</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-cyan bg-bg-primary/60">Take Home</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60">Status</th>
                      <th className="w-8 bg-bg-primary/60" />
                    </tr>
                  </thead>
                  <tbody>{creatorRecords.map(renderCreatorRow)}</tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10">
                      <td colSpan="6" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-widest text-text-tertiary">Creators Total</td>
                      <td className="px-3 py-2 text-right font-bold text-accent-cyan font-mono">{fmt(creatorNet)}</td>
                      <td colSpan="2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Chatters table */}
          {chatterRecords.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-white/5 shadow-xl">
              <div className="px-lg py-sm border-b border-white/8 bg-white/[0.02] flex items-center gap-sm">
                <Users size={14} className="text-accent-purple" />
                <span className="text-xs font-bold uppercase tracking-widest text-accent-purple/70">
                  {selectedTeamObj ? `${selectedTeamObj.name} — ` : ''}Chatters &amp; Managers ({chatterRecords.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ background: 'rgba(10,12,30,0.7)' }}>
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60 min-w-[150px]">Name</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60">Agency Sales</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-orange/60 bg-bg-primary/60">$/hr</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-orange/60 bg-bg-primary/60">Hours</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-orange/60 bg-bg-primary/60">Hourly Pay</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-bg-primary/60">Rate %</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-bg-primary/60">Commission</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-pink/60 bg-bg-primary/60">Deductions</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-lime/60 bg-bg-primary/60">Bonuses</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-widest text-accent-cyan bg-bg-primary/60">Take Home</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary bg-bg-primary/60">Status</th>
                      <th className="w-8 bg-bg-primary/60" />
                    </tr>
                  </thead>
                  <tbody>{chatterRecords.map(renderChatterRow)}</tbody>
                  <tfoot>
                    <tr className="border-t-2 border-white/10">
                      <td colSpan="9" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-widest text-text-tertiary">Chatters Total</td>
                      <td className="px-3 py-2 text-right font-bold text-accent-cyan font-mono">{fmt(chatterNet)}</td>
                      <td colSpan="2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Grand total */}
          <div className="flex justify-end">
            <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-accent-lime/20 rounded-xl px-xl py-md flex items-center gap-xl">
              <span className="text-sm font-semibold uppercase tracking-widest text-text-tertiary">Grand Total</span>
              <span className="text-2xl font-bold text-accent-lime font-mono">{fmt(totalNet)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirmDelete && (() => {
        const content = confirmModalContent();
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setConfirmDelete(null)}>
            <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-sm mb-md">
                <AlertTriangle size={18} className="text-accent-pink flex-shrink-0" />
                <h3 className="text-lg font-bold text-text-primary">{content.title}</h3>
              </div>
              <p className="text-text-secondary text-sm mb-lg">{content.body}</p>
              <div className="flex gap-md justify-end">
                <button onClick={() => setConfirmDelete(null)}
                  className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Cancel
                </button>
                <button onClick={executeDelete}
                  className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Payroll;
