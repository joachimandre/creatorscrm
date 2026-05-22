import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store.js';
import * as db from '../../db/index.js';
import {
  DollarSign, Users, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Pencil, Trash2, Copy, Printer, Zap, Check, TrendingUp, Clock
} from 'lucide-react';

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const pad = n => String(n).padStart(2, '0');

function getPeriodDates(year, month, half) {
  const lastDay = new Date(year, month, 0).getDate();
  if (half === 'first')  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-15` };
  if (half === 'second') return { start: `${year}-${pad(month)}-16`, end: `${year}-${pad(month)}-${lastDay}` };
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${lastDay}` };
}

function formatPeriodLabel(year, month, half) {
  const mn = MONTH_SHORT[month - 1];
  const lastDay = new Date(year, month, 0).getDate();
  if (half === 'first')  return `${mn} 1–15, ${year}`;
  if (half === 'second') return `${mn} 16–${lastDay}, ${year}`;
  return `${mn} 1–${lastDay}, ${year}`;
}

function historyLabel(period) {
  const mn = MONTH_SHORT[period.period_month - 1];
  const d = new Date(period.period_end).getDate();
  const s = new Date(period.period_start).getDate();
  return `${mn} ${s}–${d}`;
}

const fmt = n => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    <p className="text-2xl font-bold text-text-primary relative">{value}</p>
    {sub && <p className="text-xs text-text-tertiary mt-xs relative">{sub}</p>}
  </div>
);

const Payroll = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const chatters = useStore(state => state.chatters);
  const payrollRecords = useStore(state => state.payrollRecords);
  const payrollPeriod = useStore(state => state.payrollPeriod);
  const setPayrollPeriod = useStore(state => state.setPayrollPeriod);
  const loadPayrollRecords = useStore(state => state.loadPayrollRecords);
  const generatePayroll = useStore(state => state.generatePayroll);
  const updatePayrollEntry = useStore(state => state.updatePayrollEntry);
  const deletePayrollEntry = useStore(state => state.deletePayrollEntry);

  const { year, month, half } = payrollPeriod;
  const { start: periodStart, end: periodEnd } = getPeriodDates(year, month, half);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showConfirmGen, setShowConfirmGen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPeriods, setHistoryPeriods] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Inline editing state (Revenue Master pattern)
  const [editing, setEditing] = useState(null); // { recordId, field }
  const [pendingValue, setPendingValue] = useState('');

  useEffect(() => {
    loadPayrollRecords(periodStart, periodEnd);
    setHistoryPeriods(db.getPayrollHistory());
  }, [periodStart, periodEnd]);

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

  const navigateMonth = (dir) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1)  { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1;  newYear += 1; }
    setPayrollPeriod(newYear, newMonth, half);
  };

  const visibleRecords = useMemo(() => {
    if (selectedAgency === null) return payrollRecords;
    return payrollRecords.filter(r => r.agency_id === selectedAgency);
  }, [payrollRecords, selectedAgency]);

  const creatorRecords = visibleRecords.filter(r => r.person_type === 'creator');
  const chatterRecords = visibleRecords.filter(r => r.person_type === 'chatter');

  const totalNet    = visibleRecords.reduce((s, r) => s + r.net_pay, 0);
  const creatorNet  = creatorRecords.reduce((s, r) => s + r.net_pay, 0);
  const chatterNet  = chatterRecords.reduce((s, r) => s + r.net_pay, 0);
  const statusCounts = { pending: 0, approved: 0, paid: 0 };
  visibleRecords.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  const getCreatorName = id => creators.find(c => c.id === id)?.stage_name || 'Unknown';
  const getChatterName = id => chatters.find(c => c.id === id)?.name || 'Unknown';
  const getChatterRole = id => chatters.find(c => c.id === id)?.role || '';
  const getAgencyColor = id => AGENCY_COLORS[agencies.findIndex(a => a.id === id) % AGENCY_COLORS.length] || '#00d9ff';

  const cycleStatus = record => {
    const order = ['pending', 'approved', 'paid'];
    const next = order[(order.indexOf(record.status) + 1) % order.length];
    updatePayrollEntry(record.id, { status: next });
  };

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

  // Editable cell renderer
  const EditableCell = ({ record, field, display, color = 'text-text-secondary', step = '0.01', suffix = '' }) => {
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
        <span className={`font-mono text-xs ${color}`}>{display}{suffix}</span>
        <Pencil size={8} className="opacity-0 group-hover/ec:opacity-40 transition-opacity text-text-tertiary" />
      </div>
    );
  };

  const buildExportText = () => {
    const agencyName = selectedAgency ? agencies.find(a => a.id === selectedAgency)?.name : 'All Agencies';
    const periodLabel = formatPeriodLabel(year, month, half);
    const lines = [
      `PAYROLL REPORT — ${periodLabel}`,
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

  // Row renderers
  const renderCreatorRow = record => {
    const name = getCreatorName(record.person_id);
    const initials = name.slice(0, 2).toUpperCase();
    const color = getAgencyColor(record.agency_id);
    return (
      <tr key={record.id} className="group transition-colors hover:bg-white/[0.03] border-b border-white/5">
        <td className="px-4 py-3 min-w-[160px]" style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10"
              style={{ background: `linear-gradient(135deg, ${color}50, ${color}20)` }}>{initials}</div>
            <span className="font-semibold text-text-primary text-sm">{name}</span>
          </div>
        </td>
        {/* Total Sales */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="base_revenue" display={fmt(record.base_revenue)} color="text-text-secondary" />
        </td>
        {/* Rate % */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="commission_rate" display={`${record.commission_rate || 0}%`} color="text-accent-lime" step="0.01" />
        </td>
        {/* Commission (calculated) */}
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-text-secondary">{fmt(record.commission_amount)}</span>
        </td>
        {/* Deductions */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="deductions" display={record.deductions > 0 ? `-${fmt(record.deductions)}` : '—'} color={record.deductions > 0 ? 'text-accent-pink' : 'text-white/20'} />
        </td>
        {/* Bonuses */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="bonuses" display={record.bonuses > 0 ? `+${fmt(record.bonuses)}` : '—'} color={record.bonuses > 0 ? 'text-accent-lime' : 'text-white/20'} />
        </td>
        {/* Take Home */}
        <td className="text-right px-3 py-3">
          <span className="font-bold text-accent-cyan font-mono">{fmt(record.net_pay)}</span>
        </td>
        {/* Status */}
        <td className="px-3 py-3"><StatusBadge status={record.status} onClick={() => cycleStatus(record)} /></td>
        {/* Actions */}
        <td className="px-2 py-3">
          <button onClick={() => setConfirmDelete(record)}
            className="opacity-0 group-hover:opacity-100 p-xs text-text-tertiary hover:text-accent-pink rounded transition-all">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    );
  };

  const renderChatterRow = record => {
    const name = getChatterName(record.person_id);
    const role = getChatterRole(record.person_id);
    const initials = name.slice(0, 2).toUpperCase();
    const color = getAgencyColor(record.agency_id);
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
        {/* Agency Sales (base_revenue) */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="base_revenue" display={fmt(record.base_revenue)} color="text-text-secondary" />
        </td>
        {/* Hourly Rate */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="hourly_rate" display={record.hourly_rate > 0 ? `$${record.hourly_rate}/hr` : '—'} color={record.hourly_rate > 0 ? 'text-accent-orange' : 'text-white/20'} step="0.01" />
        </td>
        {/* Hours */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="hours_worked" display={record.hours_worked > 0 ? `${record.hours_worked}h` : '—'} color={record.hours_worked > 0 ? 'text-accent-orange' : 'text-white/20'} step="0.5" />
        </td>
        {/* Hourly Pay (calculated) */}
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-accent-orange/80">{record.hourly_amount > 0 ? fmt(record.hourly_amount) : '—'}</span>
        </td>
        {/* Rate % */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="commission_rate" display={`${record.commission_rate || 0}%`} color="text-accent-lime" step="0.01" />
        </td>
        {/* Commission (calculated) */}
        <td className="text-right px-3 py-3">
          <span className="font-mono text-xs text-accent-lime/80">{record.commission_amount > 0 ? fmt(record.commission_amount) : '—'}</span>
        </td>
        {/* Deductions */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="deductions" display={record.deductions > 0 ? `-${fmt(record.deductions)}` : '—'} color={record.deductions > 0 ? 'text-accent-pink' : 'text-white/20'} />
        </td>
        {/* Bonuses */}
        <td className="text-right px-3 py-3">
          <EditableCell record={record} field="bonuses" display={record.bonuses > 0 ? `+${fmt(record.bonuses)}` : '—'} color={record.bonuses > 0 ? 'text-accent-lime' : 'text-white/20'} />
        </td>
        {/* Take Home */}
        <td className="text-right px-3 py-3">
          <span className="font-bold text-accent-cyan font-mono">{fmt(record.net_pay)}</span>
        </td>
        {/* Status */}
        <td className="px-3 py-3"><StatusBadge status={record.status} onClick={() => cycleStatus(record)} /></td>
        {/* Actions */}
        <td className="px-2 py-3">
          <button onClick={() => setConfirmDelete(record)}
            className="opacity-0 group-hover:opacity-100 p-xs text-text-tertiary hover:text-accent-pink rounded transition-all">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div className="flex items-center gap-md">
          <DollarSign size={28} className="text-accent-lime" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary leading-tight">Payroll</h1>
            <p className="text-xs text-accent-lime/70 font-mono">{formatPeriodLabel(year, month, half)}</p>
          </div>
        </div>
        <div className="flex items-center gap-md flex-wrap">
          {/* Export */}
          <button onClick={() => setShowExport(v => !v)}
            className="flex items-center gap-xs px-md py-sm text-xs text-text-tertiary hover:text-text-primary border border-white/10 hover:border-white/20 rounded-lg transition-all">
            <Printer size={12} /> Export
          </button>
          {/* Generate */}
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

      {/* Period selector */}
      <div className="flex items-center gap-lg flex-wrap">
        {/* Month navigator */}
        <div className="flex items-center gap-sm bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl px-md py-sm">
          <button onClick={() => navigateMonth(-1)} className="text-text-tertiary hover:text-text-primary transition-colors p-xs rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-text-primary min-w-[110px] text-center text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={() => navigateMonth(1)} className="text-text-tertiary hover:text-text-primary transition-colors p-xs rounded">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Half selector */}
        <div className="flex items-center bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-xs gap-xs">
          {[
            { key: 'first',  label: '1 – 15' },
            { key: 'second', label: '16 – End' },
            { key: 'full',   label: 'Full Month' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setPayrollPeriod(year, month, opt.key)}
              className={`px-md py-xs rounded-lg text-xs font-semibold transition-all ${
                half === opt.key
                  ? 'bg-accent-lime text-bg-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Hint */}
        <p className="text-xs text-text-tertiary/50 hidden sm:block">
          Click any value in the table to edit · Enter to save · Esc to cancel
        </p>
      </div>

      {/* Export panel */}
      {showExport && (
        <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-lg flex items-center gap-md animate-slide-up flex-wrap">
          <p className="text-sm text-text-secondary flex-1">{formatPeriodLabel(year, month, half)} export</p>
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

      {/* History */}
      {historyPeriods.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-xs text-xs text-text-tertiary hover:text-text-primary transition-colors mb-sm">
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            History ({historyPeriods.length} periods)
          </button>
          {showHistory && (
            <div className="flex flex-wrap gap-sm">
              {historyPeriods.map(p => {
                const isActive = p.period_start === periodStart && p.period_end === periodEnd;
                return (
                  <button key={p.key}
                    onClick={() => {
                      // Parse the period and set it
                      const ps = p.period_start.split('-');
                      const yr = parseInt(ps[0]), mo = parseInt(ps[1]), day = parseInt(ps[2]);
                      const pe = p.period_end.split('-');
                      const endDay = parseInt(pe[2]);
                      const lastDay = new Date(yr, mo, 0).getDate();
                      let h = 'full';
                      if (day === 1 && endDay === 15) h = 'first';
                      else if (day === 16 && endDay === lastDay) h = 'second';
                      setPayrollPeriod(yr, mo, h);
                    }}
                    className={`px-md py-xs text-xs rounded-full border transition-all ${
                      isActive
                        ? 'bg-accent-lime/20 border-accent-lime/40 text-accent-lime'
                        : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary hover:border-white/20'
                    }`}>
                    {historyLabel(p)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Agency tabs */}
      {agencies.length > 1 && (
        <div className="flex items-center gap-sm flex-wrap">
          <button onClick={() => setSelectedAgency(null)}
            className={`px-lg py-sm rounded-xl text-sm font-semibold border transition-all ${
              selectedAgency === null
                ? 'bg-white/10 border-white/20 text-text-primary'
                : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary'
            }`}>
            All Agencies
          </button>
          {agencies.map((agency, idx) => {
            const color = AGENCY_COLORS[idx % AGENCY_COLORS.length];
            const isActive = selectedAgency === agency.id;
            return (
              <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
                className={`px-lg py-sm rounded-xl text-sm font-semibold border transition-all ${isActive ? 'text-bg-primary' : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'}`}
                style={isActive ? { background: color, borderColor: color } : {}}>
                {agency.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard label="Total Payout" value={fmt(totalNet)} sub={`${visibleRecords.length} records`} color="#00ff88" icon={DollarSign} />
        <StatCard label="Creators" value={fmt(creatorNet)} sub={`${creatorRecords.length} creators`} color="#00d9ff" icon={TrendingUp} />
        <StatCard label="Chatters" value={fmt(chatterNet)} sub={`${chatterRecords.length} chatters`} color="#9d4edd" icon={Users} />
        <StatCard label="Status" value={`${statusCounts.paid || 0} paid`}
          sub={`${statusCounts.pending || 0} pending · ${statusCounts.approved || 0} approved`}
          color="#ff6b35" icon={Check} />
      </div>

      {/* Tables */}
      {visibleRecords.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
          <DollarSign size={40} className="mx-auto text-text-tertiary/30 mb-md" />
          <p className="text-text-tertiary font-semibold">No payroll for this period</p>
          <p className="text-text-tertiary/50 text-sm mt-xs">
            Select a period above and click <span className="text-accent-lime">Generate Payroll</span>
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
                <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan/70">Creators ({creatorRecords.length})</span>
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
                <span className="text-xs font-bold uppercase tracking-widest text-accent-purple/70">Chatters &amp; Managers ({chatterRecords.length})</span>
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Record?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              Remove payroll record for <span className="text-accent-pink font-semibold">
                {confirmDelete.person_type === 'creator' ? getCreatorName(confirmDelete.person_id) : getChatterName(confirmDelete.person_id)}
              </span>?
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button onClick={() => { deletePayrollEntry(confirmDelete.id); setConfirmDelete(null); }}
                className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
