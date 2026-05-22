import { useStore } from '../store.js';
import { LayoutDashboard, BarChart3, Users, Brain, CheckSquare, FileText, DollarSign } from 'lucide-react';

const Sidebar = () => {
  const currentView = useStore(state => state.currentView);
  const setCurrentView = useStore(state => state.setCurrentView);
  const tasks = useStore(state => state.tasks);
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < today).length;
  const activeCount = tasks.filter(t => !t.is_completed).length;

  const navItems = [
    { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard, color: 'from-accent-cyan to-accent-blue' },
    { id: 'revenue-master', label: 'Revenue Master', icon: BarChart3,       color: 'from-accent-lime to-accent-cyan' },
    { id: 'tasks',          label: 'Tasks',           icon: CheckSquare,     color: 'from-accent-purple to-accent-blue' },
    { id: 'team',           label: 'Team',            icon: Users,           color: 'from-accent-orange to-accent-pink' },
    { id: 'brain-dump',     label: 'Brain Dump',      icon: Brain,           color: 'from-accent-purple to-accent-pink' },
    { id: 'reports',        label: 'Reports',          icon: FileText,        color: 'from-accent-pink to-accent-orange' },
    { id: 'payroll',        label: 'Payroll',          icon: DollarSign,      color: 'from-accent-lime to-accent-cyan' },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-bg-secondary to-bg-tertiary border-r border-accent-cyan/20 flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="p-lg border-b border-accent-cyan/20">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple bg-clip-text text-transparent">
          Creator CRM
        </h1>
        <p className="text-xs text-text-tertiary mt-sm">OnlyFans Manager</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-lg space-y-sm">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                w-full flex items-center gap-md px-lg py-sm rounded-xl text-left transition-all duration-200
                ${isActive
                  ? `bg-gradient-to-r ${item.color} text-bg-primary font-semibold shadow-glow`
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 border border-transparent hover:border-accent-cyan/30'
                }
              `}
            >
              <Icon size={20} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.id === 'tasks' && activeCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-white' : overdueCount > 0 ? 'bg-accent-pink/20 text-accent-pink' : 'bg-white/10 text-text-tertiary'
                }`}>
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-lg border-t border-accent-cyan/20 text-xs text-text-tertiary">
        <div className="flex items-center gap-sm">
          <div className="w-2 h-2 bg-accent-lime rounded-full animate-pulse-glow" />
          <p>Auto-saved</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
