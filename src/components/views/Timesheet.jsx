import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Clock, DollarSign, TrendingUp, Wallet,
  ChevronLeft, ChevronRight, ChevronDown,
  Plus, Trash2, AlertTriangle, X, Pencil,
} from 'lucide-react';
import { useStore } from '../../store.js';
import StatCard from '../StatCard.jsx';

// â”€â”€ Date helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const pad = n => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn  = (y, m) => new Date(y, m, 0).getDate();
const firstDay = (y, m) => new Date(y, m - 1, 1).getDay();

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_HDR   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const fmt$ = n => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getDefaultPeriod = () => {
  const t = new Date();
  const y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
  if (d <= 14) return { periodStart: isoDate(y, m, 1),  periodEnd: isoDate(y, m, 14) };
  return       { periodStart: isoDate(y, m, 15), periodEnd: isoDate(y, m, daysIn(y, m)) };
};

const getDatesInPeriod = (s, e) => {
  const dates = [];
  const d = new Date(s + 'T00:00:00'), end = new Date(e + 'T00:00:00');
  while (d <= end) { dates.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
  return dates;
};

const periodLabel = (s, e) => {
  if (!s || !e) return 'Select Period';
  const [sy, sm, sd] = s.split('-').map(Number);
  const [, em, ed]   = e.split('-').map(Number);
  if (sm === em) return `${MONTH_SHORT[sm-1]} ${sd}â€“${ed}, ${sy}`;
  return `${MONTH_SHORT[sm-1]} ${sd} â€“ ${MONTH_SHORT[em-1]} ${ed}, ${sy}`;
};

const shiftPeriod = (start, end, dir) => {
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00');
  s.setDate(s.getDate() + dir * 14);
  e.setDate(e.getDate() + dir * 14);
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  return { periodStart: fmt(s), periodEnd: fmt(e) };
};

import CalendarPicker from '../CalendarPicker.jsx';


// â”€â”€ Main view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TimesheetView = () => {
  const userProfile       = useStore(s => s.userProfile);
  const chatters          = useStore(s => s.chatters);
  const creators          = useStore(s => s.creators);
  const teamChatters      = useStore(s => s.teamChatters);
  const teamMembers       = useStore(s => s.teamMembers);
  const timesheetHours    = useStore(s => s.timesheetHours);
  const timesheetSales    = useStore(s => s.timesheetSales);
  const timesheetHistory  = useStore(s => s.timesheetHistory);

  const loadTimesheetData    = useStore(s => s.loadTimesheetData);
  const loadTimesheetHistory = useStore(s => s.loadTimesheetHistory);
  const addTimesheetHours    = useStore(s => s.addTimesheetHours);
  const updateTimesheetHours = useStore(s => s.updateTimesheetHours);
  const deleteTimesheetHours = useStore(s => s.deleteTimesheetHours);
  const addTimesheetSale     = useStore(s => s.addTimesheetSale);
  const updateTimesheetSale  = useStore(s => s.updateTimesheetSale);
  const deleteTimesheetSale  = useStore(s => s.deleteTimesheetSale);

  const isChatter = userProfile?.role === 'chatter';
  const isViewer  = userProfile?.role === 'viewer';
  const isAdmin   = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // â”€â”€ Period state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [period, setPeriod]     = useState(getDefaultPeriod);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // â”€â”€ Chatter selection (admin / manager) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedChatterId, setSelectedChatterId] = useState(null);

  // â”€â”€ Hours editing state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editingDate, setEditingDate]   = useState(null);
  const [pendingHours, setPendingHours] = useState('');

  // â”€â”€ Sales state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [addSaleCreatorId, setAddSaleCreatorId] = useState(null);
  const [newSale, setNewSale]           = useState({ date: '', grossAmount: '', notes: '' });
  const [editingSaleId, setEditingSaleId]       = useState(null);
  const [editingSale, setEditingSale]           = useState({});
  const [confirmDeleteSale, setConfirmDeleteSale] = useState(null);
  const [collapsedCreators, setCollapsedCreators] = useState(new Set());

  // â”€â”€ History accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showHistory, setShowHistory] = useState(false);

  // â”€â”€ Effective chatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const effectiveChatterId = useMemo(() => {
    if (isChatter) return userProfile?.chatter_id || null;
    return selectedChatterId;
  }, [isChatter, userProfile, selectedChatterId]);

  const effectiveChatter = useMemo(() =>
    chatters.find(c => c.id === effectiveChatterId) || null,
  [chatters, effectiveChatterId]);

  // Set default selected chatter for admin
  useEffect(() => {
    if (isAdmin && chatters.length > 0 && !selectedChatterId) {
      setSelectedChatterId(chatters[0].id);
    }
  }, [isAdmin, chatters, selectedChatterId]);

  // â”€â”€ Load data on period / chatter change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!period.periodStart || !period.periodEnd) return;
    loadTimesheetData(period.periodStart, period.periodEnd, effectiveChatterId ?? undefined);
  }, [period.periodStart, period.periodEnd, effectiveChatterId, loadTimesheetData]);

  useEffect(() => {
    loadTimesheetHistory(effectiveChatterId ?? undefined);
  }, [effectiveChatterId, loadTimesheetHistory]);

  // â”€â”€ Close picker on outside click â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = e => {
      if (!pickerRef.current?.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  // â”€â”€ Computed: dates in period â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const datesInPeriod = useMemo(() =>
    getDatesInPeriod(period.periodStart, period.periodEnd),
  [period]);

  // â”€â”€ Computed: assigned creators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const assignedCreatorIds = useMemo(() => {
    if (!effectiveChatterId) return new Set();
    const myTeamIds = new Set(
      teamChatters.filter(tc => tc.chatter_id === effectiveChatterId).map(tc => tc.team_id)
    );
    return new Set(
      teamMembers.filter(tm => myTeamIds.has(tm.team_id)).map(tm => tm.creator_id)
    );
  }, [effectiveChatterId, teamChatters, teamMembers]);

  const assignedCreators = useMemo(() =>
    creators.filter(c => assignedCreatorIds.has(c.id) && c.is_active),
  [creators, assignedCreatorIds]);

  // â”€â”€ Computed: filtered timesheet data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredHours = useMemo(() =>
    effectiveChatterId
      ? timesheetHours.filter(h => h.chatter_id === effectiveChatterId)
      : timesheetHours,
  [timesheetHours, effectiveChatterId]);

  const filteredSales = useMemo(() =>
    effectiveChatterId
      ? timesheetSales.filter(s => s.chatter_id === effectiveChatterId)
      : timesheetSales,
  [timesheetSales, effectiveChatterId]);

  // â”€â”€ Computed: totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalHours      = useMemo(() => filteredHours.reduce((sum, h) => sum + (h.hours_worked || 0), 0), [filteredHours]);
  const totalGross      = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.gross_amount || 0), 0), [filteredSales]);
  const totalCommission = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.commission_amount || 0), 0), [filteredSales]);
  const commissionRate  = effectiveChatter?.commission_rate || 0;
  const estPay = useMemo(() =>
    (effectiveChatter?.hourly_rate || 0) * totalHours + totalCommission,
  [effectiveChatter, totalHours, totalCommission]);

  // â”€â”€ Hours handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startEditHours = (date) => {
    const existing = filteredHours.find(h => h.date === date);
    setEditingDate(date);
    setPendingHours(existing ? String(existing.hours_worked) : '');
  };

  const commitHours = useCallback(() => {
    if (!editingDate || !effectiveChatterId) { setEditingDate(null); return; }
    const val = parseFloat(pendingHours);
    const existing = filteredHours.find(h => h.date === editingDate);
    if (!isNaN(val) && val > 0) {
      if (existing) updateTimesheetHours(existing.id, val);
      else addTimesheetHours(effectiveChatterId, period.periodStart, period.periodEnd, editingDate, val);
    } else if (val === 0 && existing) {
      deleteTimesheetHours(existing.id);
    }
    setEditingDate(null);
  }, [editingDate, pendingHours, effectiveChatterId, filteredHours, period, addTimesheetHours, updateTimesheetHours, deleteTimesheetHours]);

  // â”€â”€ Sales handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startAddSale = (creatorId) => {
    setAddSaleCreatorId(creatorId);
    setNewSale({ date: new Date().toISOString().split('T')[0], grossAmount: '', notes: '' });
  };

  const submitSale = () => {
    const gross = parseFloat(newSale.grossAmount);
    if (!effectiveChatterId || !addSaleCreatorId || isNaN(gross) || gross <= 0) return;
    addTimesheetSale(effectiveChatterId, addSaleCreatorId, period.periodStart, period.periodEnd,
      newSale.date, gross, commissionRate, newSale.notes);
    setAddSaleCreatorId(null);
  };

  const startEditSale = (sale) => {
    setEditingSaleId(sale.id);
    setEditingSale({ date: sale.date, grossAmount: String(sale.gross_amount), notes: sale.notes || '' });
  };

  const submitEditSale = () => {
    const gross = parseFloat(editingSale.grossAmount);
    if (!editingSaleId || isNaN(gross) || gross <= 0) return;
    updateTimesheetSale(editingSaleId, {
      date: editingSale.date,
      gross_amount: gross,
      commission_amount: gross * (commissionRate / 100),
      notes: editingSale.notes,
    });
    setEditingSaleId(null);
  };

  const toggleCreator = (id) =>
    setCollapsedCreators(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="h-full overflow-y-auto px-xl py-xl">
      <div className="max-w-6xl mx-auto space-y-xl">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-start justify-between flex-wrap gap-md">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-accent-orange to-accent-pink bg-clip-text text-transparent">
              Timesheet
            </h1>
            <p className="text-text-tertiary text-sm mt-xs">
              {isChatter ? 'Log your hours and sales per creator' : 'Review and manage team timesheets'}
            </p>
          </div>

          {/* Period selector */}
          <div className="relative flex items-center gap-sm" ref={pickerRef}>
            <button onClick={() => setPeriod(p => shiftPeriod(p.periodStart, p.periodEnd, -1))}
              className="p-sm rounded-xl text-text-tertiary hover:text-text-primary transition-colors neu-btn">
              <ChevronLeft size={16} />
            </button>

            <button onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold text-text-primary transition-all"
              style={{
                background: pickerOpen ? '#ff6b3518' : '#252b36',
                border: `1px solid ${pickerOpen ? '#ff6b35' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: pickerOpen
                  ? 'inset 2px 2px 5px rgba(0,0,0,0.3)'
                  : '3px 3px 6px rgba(0,0,0,0.3), -3px -3px 6px rgba(255,255,255,0.03)',
              }}>
              <Clock size={14} style={{ color: '#ff6b35' }} />
              {periodLabel(period.periodStart, period.periodEnd)}
            </button>

            <button onClick={() => setPeriod(p => shiftPeriod(p.periodStart, p.periodEnd, 1))}
              className="p-sm rounded-xl text-text-tertiary hover:text-text-primary transition-colors neu-btn">
              <ChevronRight size={16} />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-full mt-xs z-[200] animate-scale-in">
                <CalendarPicker
                  currentStart={period.periodStart}
                  currentEnd={period.periodEnd}
                  onApply={(s, e) => { setPeriod({ periodStart: s, periodEnd: e }); setPickerOpen(false); }}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Chatter selector (admin / manager only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {isAdmin && chatters.length > 0 && (
          <div className="flex items-center gap-sm flex-wrap">
            {chatters.map(c => {
              const active = selectedChatterId === c.id;
              return (
                <button key={c.id} onClick={() => setSelectedChatterId(c.id)}
                  className="px-md py-xs rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #ff6b35, #ff006e)' : '#252b36',
                    color: active ? '#fff' : '#94a3b8',
                    border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: active ? '0 4px 12px rgba(255,107,53,0.3)' : '3px 3px 6px rgba(0,0,0,0.3), -3px -3px 6px rgba(255,255,255,0.03)',
                  }}>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* No chatter linked warning */}
        {isChatter && !effectiveChatterId && (
          <div className="neu-card p-xl text-center text-text-secondary">
            <Clock size={32} className="mx-auto mb-md text-text-tertiary/30" />
            <p className="font-semibold mb-xs">Account not linked</p>
            <p className="text-sm text-text-tertiary">
              Your account isn&apos;t linked to a chatter profile yet. Ask your admin to link it in User Management.
            </p>
          </div>
        )}

        {/* â”€â”€ Main content (only shown when a chatter is selected / linked) â”€â”€ */}
        {(effectiveChatterId || (isAdmin && !selectedChatterId)) && (

          /* Show prompt if admin hasn't selected anyone yet */
          isAdmin && !selectedChatterId ? (
            <div className="neu-card p-xl text-center text-text-tertiary">
              Select a chatter above to view their timesheet.
            </div>
          ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
              <StatCard label="Total Hours"  value={`${totalHours.toFixed(1)}h`}  color="#ff6b35" icon={Clock} mono
                sub={effectiveChatter?.hourly_rate ? `@ $${effectiveChatter.hourly_rate}/hr` : 'No hourly rate set'} />
              <StatCard label="Gross Sales"  value={fmt$(totalGross)}              color="#00ff88" icon={DollarSign} mono
                sub={`${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''}`} />
              <StatCard label="Commission"   value={fmt$(totalCommission)}         color="#00d9ff" icon={TrendingUp} mono
                sub={`${commissionRate}% rate`} />
              <StatCard label="Est. Pay"     value={fmt$(estPay)}                  color="#9d4edd" icon={Wallet} mono
                sub="Hours earnings + commission" />
            </div>

            {/* Two-column content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">

              {/* â”€â”€ Left: Hours Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="neu-card p-lg">
                <div className="flex items-center gap-sm mb-lg">
                  <div className="p-sm rounded-xl" style={{ background: '#ff6b3518' }}>
                    <Clock size={15} style={{ color: '#ff6b35' }} />
                  </div>
                  <h2 className="text-sm font-bold text-text-primary">Hours Worked</h2>
                  <span className="ml-auto text-xs font-mono text-text-tertiary">{totalHours.toFixed(1)}h total</span>
                </div>

                {/* Headers */}
                <div className="grid grid-cols-[auto_1fr_auto] gap-sm pb-xs border-b border-white/6 mb-xs px-sm">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider w-8">Day</span>
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Date</span>
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Hrs</span>
                </div>

                {datesInPeriod.map(date => {
                  const [y, m, d] = date.split('-').map(Number);
                  const dow       = new Date(date + 'T00:00:00').getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const existing  = filteredHours.find(h => h.date === date);
                  const isEditing = editingDate === date;
                  const hrs       = existing?.hours_worked || 0;

                  return (
                    <div key={date}
                      className={`grid grid-cols-[auto_1fr_auto] gap-sm items-center py-[5px] px-sm rounded-lg group transition-colors hover:bg-white/[0.03] ${isWeekend ? 'opacity-40' : ''}`}>
                      <span className="text-[10px] font-medium text-text-tertiary w-8">{DAY_SHORT[dow].slice(0,2)}</span>
                      <span className="text-xs text-text-secondary">{MONTH_SHORT[m-1]} {d}</span>
                      {isEditing && !isViewer ? (
                        <input
                          autoFocus type="number" min="0" max="24" step="0.5"
                          value={pendingHours}
                          onChange={e => setPendingHours(e.target.value)}
                          onBlur={commitHours}
                          onKeyDown={e => { if (e.key === 'Enter') commitHours(); if (e.key === 'Escape') setEditingDate(null); }}
                          className="w-16 text-right bg-bg-primary border border-accent-orange rounded px-xs py-[2px] text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-orange"
                        />
                      ) : (
                        <button
                          onClick={() => !isViewer && startEditHours(date)}
                          disabled={isViewer}
                          className={`font-mono text-xs w-16 text-right transition-colors ${hrs > 0 ? 'text-accent-orange' : 'text-text-tertiary/30'} ${!isViewer ? 'hover:text-accent-orange cursor-text' : 'cursor-default'}`}>
                          {hrs > 0 ? `${hrs}h` : 'â€”'}
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Total */}
                <div className="grid grid-cols-[auto_1fr_auto] gap-sm items-center pt-sm mt-xs border-t border-white/6 px-sm">
                  <span className="w-8" />
                  <span className="text-xs font-bold text-text-secondary">Total</span>
                  <span className="font-mono text-sm font-bold w-16 text-right" style={{ color: '#ff6b35' }}>
                    {totalHours.toFixed(1)}h
                  </span>
                </div>
              </div>

              {/* â”€â”€ Right: Sales Entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="neu-card p-lg">
                <div className="flex items-center gap-sm mb-lg">
                  <div className="p-sm rounded-xl" style={{ background: '#00ff8818' }}>
                    <DollarSign size={15} style={{ color: '#00ff88' }} />
                  </div>
                  <h2 className="text-sm font-bold text-text-primary">Sales</h2>
                  <span className="ml-auto text-xs font-mono text-text-tertiary">{fmt$(totalGross)} gross</span>
                </div>

                {assignedCreators.length === 0 ? (
                  <div className="flex flex-col items-center py-xl text-center">
                    <DollarSign size={28} className="text-text-tertiary/20 mb-md" />
                    <p className="text-sm text-text-tertiary">No creators assigned yet</p>
                    <p className="text-xs text-text-tertiary/60 mt-xs">Assign creators to this chatter's team to log sales here</p>
                  </div>
                ) : (
                  <div className="space-y-sm">
                    {assignedCreators.map(creator => {
                      const cSales    = filteredSales.filter(s => s.creator_id === creator.id);
                      const cGross    = cSales.reduce((sum, s) => sum + (s.gross_amount || 0), 0);
                      const cComm     = cSales.reduce((sum, s) => sum + (s.commission_amount || 0), 0);
                      const collapsed = collapsedCreators.has(creator.id);
                      const adding    = addSaleCreatorId === creator.id;

                      return (
                        <div key={creator.id} className="rounded-xl overflow-hidden"
                          style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#1d2027' }}>

                          {/* Creator header */}
                          <button onClick={() => toggleCreator(creator.id)}
                            className="w-full flex items-center gap-sm px-md py-sm hover:bg-white/[0.03] transition-colors text-left">
                            <ChevronDown size={13} className="text-text-tertiary transition-transform flex-shrink-0"
                              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                            <span className="text-sm font-semibold text-text-primary flex-1 truncate">{creator.stage_name}</span>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-mono text-accent-lime">{fmt$(cGross)}</span>
                              {cComm > 0 && (
                                <span className="text-[10px] text-text-tertiary ml-sm">â†’ {fmt$(cComm)}</span>
                              )}
                            </div>
                          </button>

                          {!collapsed && (
                            <div className="px-md pb-md">
                              {/* Sale rows */}
                              {cSales.length > 0 && (
                                <div className="mb-xs">
                                  <div className="grid grid-cols-[70px_1fr_1fr_28px] gap-xs text-[10px] text-text-tertiary uppercase tracking-wider pb-xs border-b border-white/6 mb-xs px-xs">
                                    <span>Date</span>
                                    <span className="text-right">Gross</span>
                                    <span className="text-right">Comm.</span>
                                    <span />
                                  </div>
                                  {cSales.map(sale => {
                                    const editing = editingSaleId === sale.id;
                                    if (editing) {
                                      return (
                                        <div key={sale.id} className="grid grid-cols-[70px_1fr_1fr_28px] gap-xs items-center py-xs px-xs rounded-lg mb-[2px]"
                                          style={{ background: '#252b36' }}>
                                          <input type="date" value={editingSale.date}
                                            onChange={e => setEditingSale(s => ({ ...s, date: e.target.value }))}
                                            className="text-[11px] bg-bg-primary rounded px-xs py-[2px] text-text-primary border border-accent-orange/40 focus:outline-none w-full" />
                                          <input type="number" min="0" step="0.01" value={editingSale.grossAmount}
                                            onChange={e => setEditingSale(s => ({ ...s, grossAmount: e.target.value }))}
                                            placeholder="Gross"
                                            className="text-right text-[11px] bg-bg-primary rounded px-xs py-[2px] text-text-primary border border-accent-orange/40 focus:outline-none w-full" />
                                          <span className="text-right text-[11px] font-mono text-text-tertiary">
                                            {fmt$(parseFloat(editingSale.grossAmount || 0) * commissionRate / 100)}
                                          </span>
                                          <div className="flex flex-col gap-[2px]">
                                            <button onClick={submitEditSale} className="text-accent-lime hover:opacity-70 transition-opacity">
                                              <ChevronDown size={11} style={{ transform: 'rotate(-90deg)' }} />
                                            </button>
                                            <button onClick={() => setEditingSaleId(null)} className="text-text-tertiary hover:opacity-70 transition-opacity">
                                              <X size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={sale.id}
                                        className="grid grid-cols-[70px_1fr_1fr_28px] gap-xs items-center py-[5px] px-xs rounded-lg group/row hover:bg-white/[0.04] transition-colors mb-[2px]">
                                        <span className="text-[11px] text-text-tertiary">{sale.date?.slice(5)}</span>
                                        <span className="text-right text-[11px] font-mono text-text-secondary">{fmt$(sale.gross_amount)}</span>
                                        <span className="text-right text-[11px] font-mono text-accent-cyan">{fmt$(sale.commission_amount)}</span>
                                        {!isViewer ? (
                                          <div className="flex gap-[2px] opacity-0 group-hover/row:opacity-100 transition-opacity justify-end">
                                            <button onClick={() => startEditSale(sale)}
                                              className="p-[3px] text-text-tertiary hover:text-text-primary rounded transition-colors">
                                              <Pencil size={9} />
                                            </button>
                                            <button onClick={() => setConfirmDeleteSale(sale.id)}
                                              className="p-[3px] text-text-tertiary hover:text-accent-pink rounded transition-colors">
                                              <Trash2 size={9} />
                                            </button>
                                          </div>
                                        ) : <span />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {cSales.length === 0 && !adding && (
                                <p className="text-[11px] text-text-tertiary/40 px-xs pb-xs">No sales this period</p>
                              )}

                              {/* Add sale form */}
                              {adding ? (
                                <div className="mt-xs p-sm rounded-xl space-y-sm"
                                  style={{ background: '#252b36', border: '1px solid rgba(255,107,53,0.25)' }}>
                                  <div className="grid grid-cols-2 gap-sm">
                                    <div>
                                      <label className="text-[10px] text-text-tertiary block mb-xs">Date</label>
                                      <input type="date" value={newSale.date}
                                        onChange={e => setNewSale(s => ({ ...s, date: e.target.value }))}
                                        className="w-full text-xs rounded-lg px-sm py-xs text-text-primary border border-white/10 focus:outline-none focus:border-accent-orange"
                                        style={{ background: '#1d2027' }} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-text-tertiary block mb-xs">Gross Amount ($)</label>
                                      <input type="number" min="0" step="0.01" placeholder="0.00" value={newSale.grossAmount}
                                        onChange={e => setNewSale(s => ({ ...s, grossAmount: e.target.value }))}
                                        className="w-full text-xs rounded-lg px-sm py-xs text-text-primary border border-white/10 focus:outline-none focus:border-accent-orange"
                                        style={{ background: '#1d2027' }} />
                                    </div>
                                  </div>
                                  {newSale.grossAmount && parseFloat(newSale.grossAmount) > 0 && (
                                    <p className="text-[10px] text-text-tertiary">
                                      Commission:&nbsp;
                                      <span className="text-accent-cyan font-mono">{fmt$(parseFloat(newSale.grossAmount) * commissionRate / 100)}</span>
                                      <span className="text-text-tertiary/50 ml-xs">({commissionRate}%)</span>
                                    </p>
                                  )}
                                  <input type="text" placeholder="Notes (optional)" value={newSale.notes}
                                    onChange={e => setNewSale(s => ({ ...s, notes: e.target.value }))}
                                    className="w-full text-xs rounded-lg px-sm py-xs text-text-secondary border border-white/10 focus:outline-none focus:border-accent-orange"
                                    style={{ background: '#1d2027' }} />
                                  <div className="flex gap-sm justify-end">
                                    <button onClick={() => setAddSaleCreatorId(null)}
                                      className="text-xs px-md py-xs rounded-lg text-text-tertiary neu-btn transition-all">
                                      Cancel
                                    </button>
                                    <button onClick={submitSale}
                                      className="text-xs px-md py-xs rounded-lg font-semibold text-white transition-all"
                                      style={{ background: '#ff6b35' }}>
                                      Add Sale
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                !isViewer && (
                                  <button onClick={() => startAddSale(creator.id)}
                                    className="flex items-center gap-xs text-[11px] text-text-tertiary hover:text-accent-orange transition-colors px-xs mt-xs">
                                    <Plus size={11} />
                                    Add sale
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* â”€â”€ History accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="neu-card overflow-hidden">
              <button onClick={() => setShowHistory(h => !h)}
                className="w-full flex items-center gap-md px-lg py-md hover:bg-white/[0.02] transition-colors">
                <ChevronRight size={15} className="text-text-tertiary transition-transform"
                  style={{ transform: showHistory ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                <span className="text-sm font-semibold text-text-primary">Period History</span>
                <span className="text-xs text-text-tertiary ml-auto">
                  {timesheetHistory.length} period{timesheetHistory.length !== 1 ? 's' : ''}
                </span>
              </button>

              {showHistory && (
                <div className="border-t border-white/6">
                  {timesheetHistory.length === 0 ? (
                    <p className="text-center py-lg text-text-tertiary text-sm">No previous periods yet</p>
                  ) : (
                    timesheetHistory.map(item => {
                      const isCurrent = item.period_start === period.periodStart;
                      return (
                        <div key={item.key}
                          className="flex items-center gap-md px-lg py-sm hover:bg-white/[0.02] transition-colors group border-b border-white/[0.04] last:border-0">
                          <div className="flex-1 flex items-center gap-sm">
                            <span className="text-sm text-text-secondary">{periodLabel(item.period_start, item.period_end)}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-xs py-[1px] rounded-full font-semibold"
                                style={{ background: '#ff6b3520', color: '#ff6b35' }}>current</span>
                            )}
                          </div>
                          <div className="flex items-center gap-lg text-xs text-text-tertiary font-mono flex-shrink-0">
                            <span>{item.total_hours.toFixed(1)}h</span>
                            <span className="text-accent-cyan">{fmt$(item.total_commission)}</span>
                          </div>
                          <button
                            onClick={() => { setPeriod({ periodStart: item.period_start, periodEnd: item.period_end }); setShowHistory(false); }}
                            className="text-xs px-md py-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all text-text-secondary hover:text-text-primary"
                            style={{ background: '#252b36', border: '1px solid rgba(255,255,255,0.07)' }}>
                            Load
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        ))}
      </div>

      {/* â”€â”€ Confirm delete sale modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {confirmDeleteSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmDeleteSale(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-sm mb-md">
              <AlertTriangle size={18} className="text-accent-pink flex-shrink-0" />
              <h3 className="text-lg font-bold text-text-primary">Delete Sale Entry?</h3>
            </div>
            <p className="text-text-secondary text-sm mb-lg">
              This will permanently remove this sale entry and cannot be undone.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDeleteSale(null)}
                className="px-lg py-sm neu-btn rounded-xl text-sm text-text-secondary transition-all">
                Cancel
              </button>
              <button
                onClick={() => { deleteTimesheetSale(confirmDeleteSale); setConfirmDeleteSale(null); }}
                className="px-lg py-sm rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#ff006e' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetView;
