import { useState, useEffect, useRef } from 'react';
import { Bell, Wifi, Battery, LogOut, ShieldCheck } from 'lucide-react';
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
  'users':          'User Management',
};

const ROLE_COLORS = {
  admin:   '#9d4edd',
  manager: '#00d9ff',
  chatter: '#00ff88',
  viewer:  '#3b82f6',
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

const UserMenu = ({ profile, onClose }) => {
  const signOut        = useStore(s => s.signOut);
  const setCurrentView = useStore(s => s.setCurrentView);
  const menuRef        = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.charAt(0).toUpperCase() || '?';

  const roleColor = ROLE_COLORS[profile?.role] || '#9d4edd';

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-xs rounded-2xl overflow-hidden animate-scale-in"
      style={{
        width: 220,
        background: '#252b36',
        boxShadow: '10px 10px 20px rgba(0,0,0,0.45), -10px -10px 20px rgba(255,255,255,0.045), 0 0 0 1px rgba(255,255,255,0.06)',
        zIndex: 9999,
      }}
    >
      {/* Profile info */}
      <div className="px-lg py-md border-b border-white/[0.06] flex items-center gap-sm">
        <div
          className="flex items-center justify-center rounded-xl text-xs font-black shrink-0"
          style={{ width: 32, height: 32, background: roleColor + '20', color: roleColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-primary truncate">{profile?.full_name || 'User'}</p>
          <p className="text-[10px] text-text-tertiary capitalize">{profile?.role}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-xs">
        {profile?.role === 'admin' && (
          <button
            onClick={() => { setCurrentView('users'); onClose(); }}
            className="w-full flex items-center gap-sm px-md py-sm rounded-xl text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-left"
          >
            <ShieldCheck size={13} className="text-accent-purple" />
            User Management
          </button>
        )}
        <button
          onClick={async () => { await signOut(); onClose(); }}
          className="w-full flex items-center gap-sm px-md py-sm rounded-xl text-xs text-text-secondary hover:text-accent-pink transition-all text-left"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const MenuBar = () => {
  const currentView     = useStore(s => s.currentView);
  const tasks           = useStore(s => s.tasks);
  const creatorRequests = useStore(s => s.creatorRequests);
  const userProfile     = useStore(s => s.userProfile);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const overdueCount   = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < TODAY).length;
  const inquiryCount   = creatorRequests.filter(r => r.status === 'inquiry').length;
  const bellBadgeCount = overdueCount + inquiryCount;

  const initials = userProfile?.full_name
    ? userProfile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : userProfile?.email?.charAt(0).toUpperCase() || '?';

  const roleColor = ROLE_COLORS[userProfile?.role] || '#9d4edd';

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
      {/* Left: logo + breadcrumb */}
      <div className="flex items-center gap-sm">
        <div
          className="flex items-center justify-center flex-shrink-0 shadow-glow"
          style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, #00d9ff, #9d4edd)', fontSize: 9 }}
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

        {/* Bell */}
        <div className="relative">
          <button
            aria-label="Notifications"
            onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
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

        {/* User avatar + menu */}
        <div className="relative">
          <button
            aria-label="User menu"
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
            className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 rounded-full"
            style={{ width: 28, height: 28 }}
            title={userProfile?.full_name || userProfile?.email}
          >
            <div
              className="flex items-center justify-center rounded-full text-[8px] font-black"
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
                color: '#fff',
                boxShadow: `0 0 8px ${roleColor}50`,
              }}
            >
              {initials}
            </div>
          </button>
          {userMenuOpen && <UserMenu profile={userProfile} onClose={() => setUserMenuOpen(false)} />}
        </div>

        <LiveClock />
      </div>
    </header>
  );
};

export default MenuBar;
