import { useState, useEffect } from 'react';
import { Bell, Wifi, Battery } from 'lucide-react';
import { useStore } from '../store.js';
import NotificationPanel from './NotificationPanel.jsx';

const VIEW_NAMES = {
  'dashboard':      'Dashboard',
  'analytics':      'Analytics',
  'revenue-master': 'Revenue Master',
  'creators':       'Creators',
  'tasks':          'Tasks',
  'team':           'Team',
  'chatters':       'Chatters',
  'brain-dump':     'Brain Dump',
  'reports':        'Reports',
  'payroll':        'Payroll',
  'requests':       'Requests',
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const formatted = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <time
      aria-live="off"
      aria-label={`Current time: ${formatted}`}
      className="text-xs text-text-secondary font-medium tabular-nums"
    >
      {formatted}
    </time>
  );
};

const TODAY = new Date().toISOString().split('T')[0];

const MenuBar = () => {
  const currentView     = useStore(s => s.currentView);
  const tasks           = useStore(s => s.tasks);
  const creatorRequests = useStore(s => s.creatorRequests);
  const [notifOpen, setNotifOpen] = useState(false);

  const overdueCount    = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < TODAY).length;
  const inquiryCount    = creatorRequests.filter(r => r.status === 'inquiry').length;
  const bellBadgeCount  = overdueCount + inquiryCount;

  return (
    <header
      className="flex items-center justify-between px-xl flex-shrink-0 z-50"
      style={{
        height: 'max(32px, calc(32px + env(safe-area-inset-top)))',
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(37,43,54,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
      }}
    >
      {/* Left: logo + app name + breadcrumb */}
      <div className="flex items-center gap-sm">
        {/* Icon mark */}
        <div
          className="flex items-center justify-center flex-shrink-0 shadow-glow"
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #00d9ff, #9d4edd)',
            fontSize: 9,
          }}
        >
          <span className="text-bg-primary font-black leading-none">C</span>
        </div>
        <span className="text-xs font-semibold text-text-primary">Creator CRM</span>
        <span className="text-white/20 text-xs mx-xs" aria-hidden="true">›</span>
        <span
          key={currentView}
          className="text-xs text-text-tertiary animate-fade-in"
          aria-label={`Current view: ${VIEW_NAMES[currentView] || currentView}`}
        >
          {VIEW_NAMES[currentView] || currentView}
        </span>
      </div>

      {/* Right: status items */}
      <div className="flex items-center gap-md">
        <Wifi size={11} className="text-text-tertiary" aria-hidden="true" />
        <Battery size={11} className="text-text-tertiary" aria-hidden="true" />
        {/* Bell — live notification count */}
        <div className="relative">
          <button
            aria-label="Notifications"
            onClick={() => setNotifOpen(v => !v)}
            className={`flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 rounded ${notifOpen ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
            style={{ width: 28, height: 28 }}
          >
            <Bell size={11} aria-hidden="true" />
            {bellBadgeCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] w-3 h-3 rounded-full bg-accent-pink flex items-center justify-center text-[7px] font-black text-white leading-none">
                {bellBadgeCount > 9 ? '9+' : bellBadgeCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>
        {/* User avatar — 44×44 touch target */}
        <button
          aria-label="User menu"
          className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 rounded-full"
          style={{ width: 28, height: 28 }}
        >
          <div
            className="shadow-glow-purple"
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #9d4edd, #ff006e)',
            }}
          />
        </button>
        <LiveClock />
      </div>
    </header>
  );
};

export default MenuBar;
