import { useEffect, useRef } from 'react';
import { X, AlertCircle, CheckSquare, DollarSign, TrendingDown } from 'lucide-react';
import { useStore } from '../store.js';
import * as db from '../db/index.js';

const TODAY = new Date().toISOString().split('T')[0];

function buildNotifications(tasks, creators, payrollPeriod) {
  const notes = [];

  // Overdue tasks
  const overdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < TODAY);
  if (overdue.length > 0) {
    notes.push({
      id:    'overdue-tasks',
      type:  'warning',
      icon:  CheckSquare,
      color: '#ff006e',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      body:  overdue.slice(0, 3).map(t => t.title).join(', ') + (overdue.length > 3 ? ` +${overdue.length - 3} more` : ''),
      view:  'tasks',
    });
  }

  // Payroll period ending within 2 days
  if (payrollPeriod?.periodEnd) {
    const daysLeft = Math.round(
      (new Date(payrollPeriod.periodEnd + 'T00:00:00') - new Date(TODAY + 'T00:00:00')) / 86400000
    );
    if (daysLeft >= 0 && daysLeft <= 2) {
      notes.push({
        id:    'payroll-due',
        type:  'info',
        icon:  DollarSign,
        color: '#00ff88',
        title: daysLeft === 0 ? 'Payroll period ends today' : `Payroll period ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
        body:  `Period ending ${payrollPeriod.periodEnd}`,
        view:  'payroll',
      });
    }
  }

  // Creators with zero earnings today
  const rawDb = db.getDB();
  if (rawDb) {
    const zeroToday = creators.filter(c => {
      if (!c.is_active) return false;
      const rec = rawDb.daily_earnings.find(e => e.creator_id === c.id && e.date === TODAY);
      return !rec || rec.amount === 0;
    });
    if (zeroToday.length > 0) {
      notes.push({
        id:    'zero-earnings',
        type:  'warn',
        icon:  TrendingDown,
        color: '#ff6b35',
        title: `${zeroToday.length} creator${zeroToday.length > 1 ? 's' : ''} with no earnings today`,
        body:  zeroToday.slice(0, 3).map(c => c.stage_name).join(', ') + (zeroToday.length > 3 ? ` +${zeroToday.length - 3} more` : ''),
        view:  'creators',
      });
    }
  }

  // Risk-flagged creators (last 3 days vs prior 3 days > 30% drop)
  const padN = n => String(n).padStart(2, '0');
  const shiftDay = (isoDate, days) => {
    const d = new Date(isoDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${padN(d.getMonth()+1)}-${padN(d.getDate())}`;
  };
  const risked = creators.filter(c => {
    if (!c.is_active) return false;
    const rawDb = db.getDB();
    if (!rawDb) return false;
    const getAmt = date => rawDb.daily_earnings.find(e => e.creator_id === c.id && e.date === date)?.amount || 0;
    const sumLast  = [0,1,2].map(i => getAmt(shiftDay(TODAY,-i))).reduce((a,b)=>a+b,0);
    const sumPrior = [3,4,5].map(i => getAmt(shiftDay(TODAY,-i))).reduce((a,b)=>a+b,0);
    return sumPrior > 5 && ((sumPrior - sumLast) / sumPrior) > 0.30;
  });
  if (risked.length > 0) {
    notes.push({
      id:    'risk-flag',
      type:  'warning',
      icon:  TrendingDown,
      color: '#ff6b35',
      title: `${risked.length} creator${risked.length > 1 ? 's' : ''} with earnings drop`,
      body:  risked.slice(0, 3).map(c => c.stage_name).join(', ') + (risked.length > 3 ? ` +${risked.length - 3} more` : ''),
      view:  'creators',
    });
  }

  if (notes.length === 0) {
    notes.push({
      id:    'all-clear',
      type:  'ok',
      icon:  AlertCircle,
      color: '#00ff88',
      title: 'All clear!',
      body:  'No overdue tasks or pending alerts.',
      view:  null,
    });
  }

  return notes;
}

const NotificationPanel = ({ onClose }) => {
  const tasks         = useStore(s => s.tasks);
  const creators      = useStore(s => s.creators);
  const payrollPeriod = useStore(s => s.payrollPeriod);
  const setCurrentView = useStore(s => s.setCurrentView);
  const panelRef      = useRef(null);

  const notes = buildNotifications(tasks, creators, payrollPeriod);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-xs w-80 rounded-2xl overflow-hidden animate-scale-in"
      style={{
        background: '#252b36',
        boxShadow: '10px 10px 20px rgba(0,0,0,0.45), -10px -10px 20px rgba(255,255,255,0.045), 0 0 0 1px rgba(255,255,255,0.06)',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-lg py-md border-b border-white/[0.06]">
        <span className="text-sm font-bold text-text-primary">Notifications</span>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Items */}
      <div className="p-sm space-y-xs max-h-80 overflow-y-auto">
        {notes.map(n => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => { if (n.view) { setCurrentView(n.view); onClose(); } }}
              className={`w-full text-left flex gap-md p-md rounded-xl transition-all
                ${n.view ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: n.color + '18' }}
              >
                <Icon size={15} style={{ color: n.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-snug">{n.title}</p>
                <p className="text-xs text-text-tertiary/70 mt-[2px] truncate">{n.body}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-lg py-sm border-t border-white/[0.06]">
        <p className="text-[10px] text-text-tertiary/40 text-center">Updates every time you open this panel</p>
      </div>
    </div>
  );
};

export default NotificationPanel;
