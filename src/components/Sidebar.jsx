import { useStore } from '../store.js';
import { LayoutDashboard, BarChart3, DollarSign, Brain } from 'lucide-react';

const Sidebar = () => {
  const currentView = useStore(state => state.currentView);
  const setCurrentView = useStore(state => state.setCurrentView);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'revenue-master', label: 'Revenue Master Sheet', icon: BarChart3 },
    { id: 'daily-income', label: 'Daily Income Input', icon: DollarSign },
    { id: 'brain-dump', label: 'Brain Dump Space', icon: Brain },
  ];

  return (
    <aside className="w-60 bg-surface-1 border-r border-surface-2 flex flex-col">
      {/* Header */}
      <div className="p-lg border-b border-surface-2">
        <h1 className="text-xl font-bold text-text-primary">Creator CRM</h1>
        <p className="text-xs text-text-tertiary mt-1">OnlyFans Manager</p>
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
                w-full flex items-center gap-md px-lg py-sm rounded-lg text-left transition-all
                ${isActive
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }
              `}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-lg border-t border-surface-2 text-xs text-text-tertiary">
        <p>💾 Auto-saved to browser storage</p>
      </div>
    </aside>
  );
};

export default Sidebar;
