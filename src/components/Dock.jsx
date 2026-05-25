import { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, CheckSquare,
  Users, MessageSquare, Brain, FileText, DollarSign, ClipboardList, ShieldCheck, Clock,
} from 'lucide-react';
import { useStore } from '../store.js';

const ICON_HEX = {
  'dashboard':      '#00d9ff',
  'analytics':      '#4361ee',
  'revenue-master': '#00ff88',
  'creators':       '#9d4edd',
  'tasks':          '#9d4edd',
  'team':           '#ff6b35',
  'chatters':       '#00ff88',
  'brain-dump':     '#9d4edd',
  'reports':        '#ff006e',
  'payroll':        '#00ff88',
  'requests':       '#9d4edd',
  'users':          '#9d4edd',
  'timesheet':      '#ff6b35',
};

const ALL_NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'analytics',      label: 'Analytics',      icon: TrendingUp },
  { id: 'revenue-master', label: 'Revenue Master', icon: BarChart3 },
  { id: 'creators',       label: 'Creators',       icon: Star },
  { id: 'tasks',          label: 'Tasks',          icon: CheckSquare },
  { id: 'team',           label: 'Team',           icon: Users },
  { id: 'chatters',       label: 'Chatters',       icon: MessageSquare },
  { id: 'brain-dump',     label: 'Brain Dump',     icon: Brain },
  { id: 'reports',        label: 'Reports',        icon: FileText },
  { id: 'payroll',        label: 'Payroll',        icon: DollarSign },
  { id: 'requests',       label: 'Requests',       icon: ClipboardList },
  { id: 'users',          label: 'Users',          icon: ShieldCheck },
  { id: 'timesheet',      label: 'Timesheet',      icon: Clock },
];

const ROLE_VIEWS = {
  admin:   ['dashboard','analytics','revenue-master','creators','tasks','team','chatters','brain-dump','reports','payroll','requests','users','timesheet'],
  manager: ['dashboard','analytics','revenue-master','creators','tasks','team','chatters','brain-dump','reports','requests','timesheet'],
  chatter: ['dashboard','creators','requests','team','timesheet'],
  viewer:  ['dashboard','analytics','revenue-master','creators','tasks','team','chatters','reports','requests','timesheet'],
};

const getScale = (idx, hoveredIdx) => {
  if (hoveredIdx === -1) return 1;
  const dist = Math.abs(idx - hoveredIdx);
  if (dist === 0) return 1.35;
  if (dist === 1) return 1.15;
  if (dist === 2) return 1.06;
  return 1;
};

const Dock = () => {
  const currentView     = useStore(s => s.currentView);
  const setCurrentView  = useStore(s => s.setCurrentView);
  const tasks           = useStore(s => s.tasks);
  const creatorRequests = useStore(s => s.creatorRequests);
  const userProfiles    = useStore(s => s.userProfiles);
  const userProfile     = useStore(s => s.userProfile);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const today = new Date().toISOString().split('T')[0];
  const overdueCount        = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < today).length;
  const pendingRequestsCount = creatorRequests.filter(r => r.status === 'inquiry' || r.status === 'pending').length;
  const pendingUsersCount    = userProfiles.filter(p => !p.approved).length;

  // Filter nav items by the current user's role
  const allowedViews = ROLE_VIEWS[userProfile?.role] || ROLE_VIEWS.viewer;
  const navItems = ALL_NAV_ITEMS.filter(item => allowedViews.includes(item.id));

  return (
    <div className="flex justify-center items-end flex-shrink-0 relative z-40" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <nav aria-label="Main navigation">
      <div
        className="dock-pill flex items-end gap-xs px-md py-sm"
        style={{
          background: 'rgba(37,43,54,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28,
          boxShadow: '0 -4px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 6px 6px 12px rgba(0,0,0,0.4), -6px -6px 12px rgba(255,255,255,0.04)',
        }}
      >
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const scale = getScale(i, hoveredIdx);
          const color = ICON_HEX[item.id];

          const showTooltip = hoveredIdx === i || focusedIdx === i;

          return (
            <div
              key={item.id}
              className="relative flex flex-col items-center"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'bottom center',
                transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(-1)}
            >
              {/* Tooltip */}
              {showTooltip && (
                <div
                  className="absolute text-xs text-text-primary px-sm py-xs rounded-lg whitespace-nowrap animate-tooltip-show pointer-events-none"
                  style={{
                    bottom: '100%',
                    left: '50%',
                    marginBottom: 8,
                    background: '#2e3545',
                    boxShadow: '3px 3px 7px rgba(0,0,0,0.35), -3px -3px 7px rgba(255,255,255,0.03)',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {item.label}
                </div>
              )}

              {/* Icon button */}
              <button
                onClick={() => setCurrentView(item.id)}
                onFocus={() => setFocusedIdx(i)}
                onBlur={() => setFocusedIdx(-1)}
                aria-label={
                  item.id === 'tasks'    && overdueCount > 0
                    ? `${item.label} — ${overdueCount} overdue`
                    : item.id === 'requests' && pendingRequestsCount > 0
                    ? `${item.label} — ${pendingRequestsCount} pending`
                    : item.id === 'users' && pendingUsersCount > 0
                    ? `${item.label} — ${pendingUsersCount} awaiting approval`
                    : item.label
                }
                aria-current={isActive ? 'page' : undefined}
                className="dock-icon-btn relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent-cyan/40"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: isActive
                    ? `linear-gradient(135deg, ${color}22, ${color}0a)`
                    : '#252523',
                  boxShadow: isActive
                    ? `inset 4px 4px 8px rgba(0,0,0,0.38), inset -4px -4px 8px rgba(255,255,255,0.035), 0 0 12px ${color}30`
                    : '4px 4px 8px rgba(0,0,0,0.35), -4px -4px 8px rgba(255,255,255,0.03)',
                  transition: 'box-shadow 0.25s ease, background 0.25s ease',
                }}
              >
                {/* Task overdue badge */}
                {item.id === 'tasks' && overdueCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold z-10"
                    style={{ width: 16, height: 16, borderRadius: '50%', background: '#ff006e', fontSize: 9 }}
                  >
                    {overdueCount}
                  </span>
                )}
                {/* Requests pending badge */}
                {item.id === 'requests' && pendingRequestsCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold z-10"
                    style={{ width: 16, height: 16, borderRadius: '50%', background: '#9d4edd', fontSize: 9 }}
                  >
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
                {/* Pending users badge */}
                {item.id === 'users' && pendingUsersCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold z-10"
                    style={{ width: 16, height: 16, borderRadius: '50%', background: '#ff6b35', fontSize: 9 }}
                  >
                    {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
                  </span>
                )}
                <Icon
                  size={20}
                  style={{ color: isActive ? color : `${color}cc` }}
                />
              </button>

              {/* Active dot */}
              <div
                style={{
                  marginTop: 4,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: isActive ? color : 'transparent',
                  boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease',
                }}
              />
            </div>
          );
        })}
      </div>
      </nav>
    </div>
  );
};

export default Dock;
