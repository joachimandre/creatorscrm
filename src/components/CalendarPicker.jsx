/**
 * Shared CalendarPicker — reused by Payroll and Timesheet views.
 * Renders a self-contained card; the caller is responsible for positioning it.
 *
 * Props:
 *   currentStart  {string} YYYY-MM-DD — initial start (optional)
 *   currentEnd    {string} YYYY-MM-DD — initial end (optional)
 *   onApply(start, end) — called when user confirms a selection
 *   onClose()           — called on Cancel or ✕
 */

import { useState } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const pad      = n => String(n).padStart(2, '0');
const isoDate  = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn   = (y, m) => new Date(y, m, 0).getDate();
const firstDay = (y, m) => new Date(y, m - 1, 1).getDay(); // 0 = Sun

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fullDateLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${MONTH_SHORT[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
const CalendarPicker = ({ currentStart, currentEnd, onApply, onClose }) => {
  const today     = new Date().toISOString().split('T')[0];
  const [ty, tm]  = today.split('-').map(Number);

  const [calYear,  setCalYear]  = useState(() => currentStart ? parseInt(currentStart.split('-')[0]) : ty);
  const [calMonth, setCalMonth] = useState(() => currentStart ? parseInt(currentStart.split('-')[1]) : tm);

  const [stagingStart, setStagingStart] = useState(currentStart || '');
  const [stagingEnd,   setStagingEnd]   = useState(currentEnd   || '');
  const [hoverDate,    setHoverDate]    = useState('');
  const [selectStep,   setSelectStep]   = useState('start'); // 'start' | 'end'

  const navMonth = (dir) => {
    let nm = calMonth + dir, ny = calYear;
    if (nm < 1)  { nm = 12; ny--; }
    if (nm > 12) { nm = 1;  ny++; }
    setCalMonth(nm); setCalYear(ny);
  };

  const applyPreset = (start, end) => {
    setStagingStart(start); setStagingEnd(end); setSelectStep('start');
    const [py, pm] = start.split('-');
    setCalYear(parseInt(py)); setCalMonth(parseInt(pm));
  };

  const presets = [
    { label: '1st – 14th', fn: () => applyPreset(isoDate(calYear, calMonth, 1), isoDate(calYear, calMonth, 14)) },
    { label: '15th – End', fn: () => applyPreset(isoDate(calYear, calMonth, 15), isoDate(calYear, calMonth, daysIn(calYear, calMonth))) },
    { label: 'Full Month', fn: () => applyPreset(isoDate(calYear, calMonth, 1), isoDate(calYear, calMonth, daysIn(calYear, calMonth))) },
    {
      label: 'Last 7d',
      fn: () => {
        const e = new Date(), s = new Date(); s.setDate(s.getDate() - 6);
        applyPreset(s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
      },
    },
    {
      label: 'Last 14d',
      fn: () => {
        const e = new Date(), s = new Date(); s.setDate(s.getDate() - 13);
        applyPreset(s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
      },
    },
  ];

  const handleDayClick = (iso) => {
    if (selectStep === 'start') {
      setStagingStart(iso); setStagingEnd(''); setSelectStep('end');
    } else {
      if (iso < stagingStart) { setStagingEnd(stagingStart); setStagingStart(iso); }
      else { setStagingEnd(iso); }
      setSelectStep('start');
    }
  };

  const effectiveEnd = stagingEnd || hoverDate;

  const dayClass = (iso) => {
    const isStart = iso === stagingStart;
    const isEnd   = iso === stagingEnd;
    const inRange = stagingStart && effectiveEnd && iso > stagingStart && iso < effectiveEnd;
    const isToday = iso === today;
    let cls = 'relative flex items-center justify-center w-8 h-8 text-xs font-medium cursor-pointer select-none transition-all ';
    if (isStart || isEnd) cls += 'bg-accent-lime text-bg-primary rounded-full font-bold shadow-glow-lime z-10 ';
    else if (inRange)     cls += 'bg-accent-lime/20 text-accent-lime ';
    else                  cls += 'text-text-secondary hover:bg-white/10 hover:text-text-primary rounded-full ';
    if (isToday && !isStart && !isEnd) cls += 'ring-1 ring-accent-cyan/50 rounded-full ';
    return cls;
  };

  const totalDays   = daysIn(calYear, calMonth);
  const startOffset = firstDay(calYear, calMonth);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const canApply = stagingStart && stagingEnd && stagingStart <= stagingEnd;

  return (
    <div className="neu-card w-[320px] overflow-hidden" style={{ boxShadow: '10px 10px 24px rgba(0,0,0,0.55), -4px -4px 12px rgba(255,255,255,0.03)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-lg py-md border-b border-white/8">
        <div className="flex items-center gap-sm">
          <Calendar size={14} className="text-accent-lime" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Select Period</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary transition-colors p-xs rounded-lg hover:bg-white/5"
          aria-label="Close calendar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick presets */}
      <div className="px-lg pt-md pb-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-sm">Quick select</p>
        <div className="flex flex-wrap gap-xs">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={p.fn}
              className="px-sm py-xs text-[11px] font-semibold rounded-lg border border-white/10 text-text-secondary hover:text-accent-lime hover:border-accent-lime/40 hover:bg-accent-lime/5 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between px-lg py-sm">
        <button onClick={() => navMonth(-1)} className="p-xs text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5" aria-label="Previous month">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-bold text-text-primary">{MONTH_NAMES[calMonth - 1]} {calYear}</span>
        <button onClick={() => navMonth(1)} className="p-xs text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5" aria-label="Next month">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-lg pb-md">
        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-xs">
          {DAY_LABELS.map(d => (
            <div key={d} className="flex items-center justify-center w-8 h-6 text-[10px] font-bold text-text-tertiary/50 uppercase">
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-xs">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="w-8 h-8" />;
            const iso = isoDate(calYear, calMonth, day);
            return (
              <div
                key={iso}
                className={dayClass(iso)}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => selectStep === 'end' && stagingStart && setHoverDate(iso)}
                onMouseLeave={() => setHoverDate('')}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection summary */}
      <div className="mx-lg mb-md neu-card-inset rounded-xl px-md py-sm">
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
              const days = Math.round((new Date(stagingEnd) - new Date(stagingStart)) / 86400000) + 1;
              return `${days} day${days === 1 ? '' : 's'}`;
            })()}
          </p>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex items-center gap-sm px-lg pb-lg">
        <button
          onClick={onClose}
          className="flex-1 py-sm neu-btn rounded-xl text-xs text-text-secondary hover:text-text-primary transition-all"
        >
          Cancel
        </button>
        <button
          disabled={!canApply}
          onClick={() => onApply(stagingStart, stagingEnd)}
          className="flex-1 py-sm bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary font-bold rounded-xl text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-xs"
        >
          <Check size={12} /> Apply Period
        </button>
      </div>
    </div>
  );
};

export default CalendarPicker;
