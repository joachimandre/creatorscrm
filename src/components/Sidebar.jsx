import { useStore } from '../store.js';
import { LayoutDashboard, BarChart3, Users, Brain, CheckSquare, FileText, DollarSign, Star, TrendingUp, MessageSquare } from 'lucide-react';

const ICON_HEX = {
  'dashboard':      '#00d9ff',
  'analytics':      '#3b82f6',
  'revenue-master': '#00ff88',
  'creators':       '#9d4edd',
  'tasks':          '#9d4edd',
  'team':           '#ff6b35',
  'chatters':       '#00ff88',
  'brain-dump':     '#9d4edd',
  'reports':        '#ff006e',
  'payroll':        '#00ff88',
};

const Sidebar = () => {
  const currentView = useStore(state => state.currentView);
  const setCurrentView = useStore(state => state.setCurrentView);
  const tasks = useStore(state => state.tasks);
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < today).length;
  const activeCount = tasks.filter(t => !t.is_completed).length;

  const navItems = [
    { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard, color: 'from-accent-cyan to-accent-blue' },
    { id: 'analytics',      label: 'Analytics',      icon: TrendingUp,      color: 'from-accent-cyan to-accent-blue' },
    { id: 'revenue-master', label: 'Revenue Master', icon: BarChart3,       color: 'from-accent-lime to-accent-cyan' },
    { id: 'creators',       label: 'Creators',        icon: Star,            color: 'from-accent-purple to-accent-pink' },
    { id: 'tasks',          label: 'Tasks',           icon: CheckSquare,     color: 'from-accent-purple to-accent-blue' },
    { id: 'team',           label: 'Team',            icon: Users,           color: 'from-accent-orange to-accent-pink' },
    { id: 'chatters',       label: 'Chatters',        icon: MessageSquare,   color: 'from-accent-lime to-accent-cyan' },
    { id: 'brain-dump',     label: 'Brain Dump',      icon: Brain,           color: 'from-accent-purple to-accent-pink' },
    { id: 'reports',        label: 'Reports',          icon: FileText,        color: 'from-accent-pink to-accent-orange' },
    { id: 'payroll',        label: 'Payroll',          icon: DollarSign,      color: 'from-accent-lime to-accent-cyan' },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-bg-secondary to-bg-tertiary border-r border-white/8 flex flex-col backdrop-blur-md">
      {/* Header — icon mark + compact title */}
      <div className="p-lg border-b border-white/8">
        <div className="flex items-center gap-sm">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple
            flex items-center justify-center flex-shrink-0 shadow-glow">
            <span className="text-bg-primary font-black text-base leading-none">C</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight">Creator CRM</p>
            <p className="text-[10px] text-text-tertiary leading-tight">OnlyFans Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-md space-y-xs overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                relative w-full flex items-center gap-md px-md py-sm rounded-xl text-left
                transition-all duration-200 group
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-cyan/40
                ${isActive ? 'text-white font-semibold' : 'text-text-tertiary hover:text-text-primary'}
              `}
            >
              {/* Gradient background — active only */}
              {isActive && (
                <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-xl opacity-85`} />
              )}
              {/* Hover background — inactive */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-all" />
              )}
              {/* Left-edge white bar — non-color active signal (WCAG 1.4.1) */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-white/60" />
              )}
              {/* Icon badge */}
              <div className={`
                relative z-10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                ${isActive ? 'bg-white/20' : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}
              `}>
                <Icon size={16} style={{ color: isActive ? 'white' : ICON_HEX[item.id] }} />
              </div>
              <span className="relative z-10 text-sm flex-1">{item.label}</span>
              {/* Task badge: show overdue count (pink) when overdue, else active count */}
              {item.id === 'tasks' && (overdueCount > 0 || activeCount > 0) && (
                <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-black/20 text-white'
                    : overdueCount > 0
                    ? 'bg-accent-pink/20 text-accent-pink'
                    : 'bg-white/10 text-text-tertiary'
                }`}>
                  {overdueCount > 0 ? overdueCount : activeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-lg border-t border-white/8 text-xs text-text-tertiary">
        <div className="flex items-center gap-sm">
          <div className="w-2 h-2 bg-accent-lime rounded-full animate-pulse-glow" />
          <p>Auto-saved</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
