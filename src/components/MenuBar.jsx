import { useState, useEffect } from 'react';
import { Bell, Wifi, Battery } from 'lucide-react';
import { useStore } from '../store.js';

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
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs text-text-secondary font-medium tabular-nums">
      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
};

const MenuBar = () => {
  const currentView = useStore(s => s.currentView);

  return (
    <header
      className="flex items-center justify-between px-xl flex-shrink-0 z-50 select-none"
      style={{
        height: '32px',
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
        <span className="text-white/20 text-xs mx-xs">›</span>
        <span
          key={currentView}
          className="text-xs text-text-tertiary animate-fade-in"
        >
          {VIEW_NAMES[currentView] || currentView}
        </span>
      </div>

      {/* Right: status items */}
      <div className="flex items-center gap-md">
        <Wifi size={11} className="text-text-tertiary" />
        <Battery size={11} className="text-text-tertiary" />
        <Bell
          size={11}
          className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
        />
        {/* User avatar dot */}
        <div
          className="cursor-pointer shadow-glow-purple"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9d4edd, #ff006e)',
          }}
        />
        <LiveClock />
      </div>
    </header>
  );
};

export default MenuBar;
