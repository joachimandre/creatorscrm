import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, LayoutDashboard, TrendingUp, BarChart3, Star, CheckSquare,
  Users, MessageSquare, Brain, FileText, DollarSign, X, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store.js';

const ICON_HEX = {
  Navigate: '#00d9ff',
  Creators: '#9d4edd',
  Chatters: '#00ff88',
  Tasks:    '#ff6b35',
};

const COMMANDS = [
  { id: 'nav-dashboard',      label: 'Go to Dashboard',      icon: LayoutDashboard, view: 'dashboard',      group: 'Navigate' },
  { id: 'nav-analytics',      label: 'Go to Analytics',      icon: TrendingUp,      view: 'analytics',      group: 'Navigate' },
  { id: 'nav-revenue',        label: 'Go to Revenue Master', icon: BarChart3,       view: 'revenue-master', group: 'Navigate' },
  { id: 'nav-creators',       label: 'Go to Creators',       icon: Star,            view: 'creators',       group: 'Navigate' },
  { id: 'nav-tasks',          label: 'Go to Tasks',          icon: CheckSquare,     view: 'tasks',          group: 'Navigate' },
  { id: 'nav-team',           label: 'Go to Team',           icon: Users,           view: 'team',           group: 'Navigate' },
  { id: 'nav-chatters',       label: 'Go to Chatters',       icon: MessageSquare,   view: 'chatters',       group: 'Navigate' },
  { id: 'nav-brain-dump',     label: 'Go to Brain Dump',     icon: Brain,           view: 'brain-dump',     group: 'Navigate' },
  { id: 'nav-reports',        label: 'Go to Reports',        icon: FileText,        view: 'reports',        group: 'Navigate' },
  { id: 'nav-payroll',        label: 'Go to Payroll',        icon: DollarSign,      view: 'payroll',        group: 'Navigate' },
];

const CommandPalette = () => {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [selIdx, setSelIdx] = useState(0);
  const inputRef            = useRef(null);
  const panelRef            = useRef(null);
  const setCurrentView      = useStore(s => s.setCurrentView);
  const creators            = useStore(s => s.creators);
  const chatters            = useStore(s => s.chatters);
  const tasks               = useStore(s => s.tasks);

  // Focus trap — keep Tab/Shift+Tab inside the panel while open
  const handleTrapFocus = useCallback((e) => {
    if (!panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  // Open / close on Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened; attach/detach focus trap
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setSelIdx(0);
      document.addEventListener('keydown', handleTrapFocus);
    } else {
      document.removeEventListener('keydown', handleTrapFocus);
    }
    return () => document.removeEventListener('keydown', handleTrapFocus);
  }, [open, handleTrapFocus]);

  // Build dynamic search results when query is non-empty
  const dynamicResults = query.trim().length > 0 ? [
    ...creators
      .filter(c => c.stage_name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map(c => ({ id: `creator-${c.id}`, label: c.stage_name, icon: Star, view: 'creators', group: 'Creators', hint: c.is_active ? 'Active' : 'Inactive' })),
    ...chatters
      .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map(c => ({ id: `chatter-${c.id}`, label: c.name, icon: MessageSquare, view: 'chatters', group: 'Chatters', hint: c.role || '' })),
    ...tasks
      .filter(t => !t.is_completed && t.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4)
      .map(t => ({ id: `task-${t.id}`, label: t.title, icon: CheckSquare, view: 'tasks', group: 'Tasks', hint: t.due_date || '' })),
  ] : [];

  const filtered = [
    ...COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase())),
    ...dynamicResults,
  ];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selIdx]) {
      execute(filtered[selIdx]);
    }
  };

  const execute = (cmd) => {
    if (cmd.view) setCurrentView(cmd.view);
    setOpen(false);
    setQuery('');
  };

  if (!open) return null;

  // Group commands
  const groups = {};
  filtered.forEach(cmd => {
    if (!groups[cmd.group]) groups[cmd.group] = [];
    groups[cmd.group].push(cmd);
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center animate-fade-in"
      style={{ paddingTop: '18vh' }}
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full mx-xl overflow-hidden animate-palette-open"
        style={{
          maxWidth: 520,
          background: '#252523',
          borderRadius: 18,
          boxShadow: '10px 10px 20px rgba(0,0,0,0.45), -10px -10px 20px rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search row */}
        <div
          className="flex items-center gap-sm px-lg"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            height: 52,
          }}
        >
          <Search size={16} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-text-primary text-sm placeholder:text-text-tertiary"
            style={{ border: 'none', boxShadow: 'none', outline: 'none', padding: 0 }}
          />
          <div className="flex items-center gap-xs">
            <kbd
              className="text-text-tertiary text-xs rounded px-sm py-[2px]"
              style={{
                background: '#1d2027',
                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.35), inset -2px -2px 4px rgba(255,255,255,0.025)',
                fontFamily: 'inherit',
              }}
            >
              ESC
            </kbd>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close command palette"
              className="text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 rounded"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div role="listbox" aria-label="Commands" className="overflow-y-auto p-sm" style={{ maxHeight: 320 }}>
          {filtered.length === 0 ? (
            <p className="text-center py-xl text-text-tertiary text-sm">No results for "{query}"</p>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <p className="text-xs text-text-tertiary uppercase tracking-widest px-md pb-xs pt-sm font-semibold">
                  {group}
                </p>
                {cmds.map(cmd => {
                  const globalIdx = filtered.indexOf(cmd);
                  const isSelected = globalIdx === selIdx;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelIdx(globalIdx)}
                      className="w-full flex items-center gap-md px-md py-sm rounded-xl text-left transition-all group"
                      style={{
                        background: isSelected ? 'rgba(0,217,255,0.08)' : 'transparent',
                        boxShadow: isSelected ? 'inset 2px 2px 4px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.02)' : 'none',
                      }}
                    >
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: '#1d2027',
                          boxShadow: '2px 2px 5px rgba(0,0,0,0.35), -2px -2px 5px rgba(255,255,255,0.03)',
                        }}
                      >
                        <Icon size={14} style={{ color: isSelected ? (ICON_HEX[cmd.group] || '#00d9ff') : undefined }} className={isSelected ? '' : 'text-text-tertiary'} />
                      </div>
                      <span className={`text-sm flex-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span className="text-[10px] text-text-tertiary/50 shrink-0">{cmd.hint}</span>
                      )}
                      {isSelected && (
                        <ArrowRight size={13} className="text-text-tertiary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-md px-lg py-sm text-xs text-text-tertiary"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span><kbd aria-label="Up and down arrows" style={{ fontFamily: 'inherit' }}>↑↓</kbd> Navigate</span>
          <span><kbd aria-label="Enter" style={{ fontFamily: 'inherit' }}>↵</kbd> Open</span>
          <span><kbd aria-label="Escape" style={{ fontFamily: 'inherit' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
