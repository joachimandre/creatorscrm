import { useState, useMemo, useRef } from 'react';
import { useStore } from '../../store.js';
import {
  CheckSquare, Plus, Trash2, Pencil, Check, X, ChevronDown,
  AlertCircle, Clock, Calendar, Star, Link, AlignLeft,
  Search, SlidersHorizontal, Flame, Minus, ArrowUp
} from 'lucide-react';

const TODAY = new Date().toISOString().split('T')[0];

const PRIORITY = {
  high:   { label: 'High',   color: '#ff006e', bg: 'bg-accent-pink/15',   border: 'border-accent-pink/40',   icon: Flame },
  medium: { label: 'Medium', color: '#ff6b35', bg: 'bg-accent-orange/15', border: 'border-accent-orange/40', icon: ArrowUp },
  low:    { label: 'Low',    color: '#00d9ff', bg: 'bg-accent-cyan/15',   border: 'border-accent-cyan/40',   icon: Minus },
  none:   { label: 'None',   color: '#64748b', bg: 'bg-white/5',          border: 'border-white/10',         icon: null },
};

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];

const dueDateLabel = (date) => {
  if (!date) return null;
  if (date < TODAY) return { text: 'Overdue', color: 'text-accent-pink', bg: 'bg-accent-pink/10 border-accent-pink/30' };
  if (date === TODAY) return { text: 'Today', color: 'text-accent-orange', bg: 'bg-accent-orange/10 border-accent-orange/30' };
  const days = Math.ceil((new Date(date) - new Date(TODAY)) / 86400000);
  if (days <= 3) return { text: `In ${days}d`, color: 'text-accent-orange/70', bg: 'bg-accent-orange/5 border-accent-orange/20' };
  return { text: date.slice(5).replace('-', '/'), color: 'text-text-tertiary', bg: 'bg-white/5 border-white/10' };
};

// ─── Checkbox component ────────────────────────────────────────────────────────
const TaskCheckbox = ({ checked, onChange, priority }) => {
  const color = checked ? '#00ff88' : (PRIORITY[priority]?.color || '#64748b');
  return (
    <button
      onClick={onChange}
      className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 hover:scale-110"
      style={{ borderColor: checked ? '#00ff88' : color + '60', background: checked ? '#00ff8820' : 'transparent' }}
    >
      {checked && <Check size={11} style={{ color: '#00ff88' }} strokeWidth={3} />}
    </button>
  );
};

// ─── Quick add row ─────────────────────────────────────────────────────────────
const QuickAdd = ({ agencyId, creators, onAdd }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, dueDate: dueDate || null, creatorId: creatorId ? parseInt(creatorId) : null });
    setTitle(''); setPriority('none'); setDueDate(''); setCreatorId(''); setExpanded(false);
  };

  return (
    <div className="bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-md hover:border-accent-purple/30 transition-all">
      <div className="flex items-center gap-sm">
        <div className="w-5 h-5 rounded-md border-2 border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
          <Plus size={11} className="text-text-tertiary" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); if (!expanded && e.target.value) setExpanded(true); }}
          onFocus={() => title && setExpanded(true)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setTitle(''); setExpanded(false); } }}
          placeholder="Add a task... (Enter to save)"
          className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-tertiary/50 focus:outline-none"
        />
        {title && (
          <button onClick={submit} className="px-md py-xs bg-accent-purple/80 hover:bg-accent-purple text-white text-xs font-semibold rounded-lg transition-colors">
            Add
          </button>
        )}
      </div>

      {expanded && title && (
        <div className="mt-sm pt-sm border-t border-white/5 flex items-center gap-md flex-wrap animate-slide-up">
          {/* Priority */}
          <div className="flex items-center gap-xs">
            {Object.entries(PRIORITY).filter(([k]) => k !== 'none').map(([key, p]) => (
              <button key={key} onClick={() => setPriority(priority === key ? 'none' : key)}
                className={`px-sm py-xs rounded-md text-xs font-semibold border transition-all ${priority === key ? `${p.bg} ${p.border}` : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-primary'}`}
                style={{ color: priority === key ? p.color : undefined }}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Due date */}
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none focus:border-accent-purple/40 transition-all" />
          {/* Creator */}
          {creators.length > 0 && (
            <select value={creatorId} onChange={e => setCreatorId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none focus:border-accent-purple/40 transition-all">
              <option value="">No creator</option>
              {creators.map(c => <option key={c.id} value={c.id}>{c.stage_name}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Task item ─────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onUpdate, onDelete, accentColor }) => {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editData, setEditData] = useState({});

  const startEdit = (e) => {
    e.stopPropagation();
    setEditData({ title: task.title, description: task.description || '', due_date: task.due_date || '', priority: task.priority || 'none', link: task.link || '' });
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = () => {
    if (!editData.title.trim()) return;
    onUpdate(task.id, { title: editData.title.trim(), description: editData.description, due_date: editData.due_date || null, priority: editData.priority, link: editData.link });
    setEditing(false);
  };

  const p = PRIORITY[task.priority] || PRIORITY.none;
  const dateInfo = dueDateLabel(task.due_date);
  const PIcon = p.icon;

  return (
    <div className={`group relative rounded-xl border transition-all duration-200 ${
      task.is_completed ? 'opacity-60 bg-white/2 border-white/5' : 'bg-gradient-to-r from-bg-tertiary to-bg-secondary border-white/8 hover:border-white/15'
    }`} style={!task.is_completed ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : {}}>

      {/* Main row */}
      <div className="flex items-center gap-md px-md py-sm">
        <TaskCheckbox checked={!!task.is_completed} onChange={() => onToggle(task.id)} priority={task.priority} />

        {/* Priority dot */}
        {task.priority !== 'none' && PIcon && (
          <PIcon size={12} style={{ color: p.color }} className="flex-shrink-0" />
        )}

        {/* Title */}
        {editing ? (
          <input autoFocus value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 bg-bg-primary border border-accent-purple/40 rounded-lg px-md py-xs text-text-primary text-sm focus:outline-none" />
        ) : (
          <span
            onClick={() => setExpanded(v => !v)}
            className={`flex-1 text-sm font-medium cursor-pointer select-none ${task.is_completed ? 'line-through text-text-tertiary' : 'text-text-primary hover:text-accent-cyan'} transition-colors`}>
            {task.title}
          </span>
        )}

        {/* Meta badges */}
        <div className="flex items-center gap-xs flex-shrink-0">
          {task.creator_name && (
            <span className="hidden sm:flex text-xs px-sm py-xs rounded-full bg-white/5 border border-white/10 text-text-tertiary">
              {task.creator_name}
            </span>
          )}
          {dateInfo && (
            <span className={`text-xs px-sm py-xs rounded-full border ${dateInfo.bg} ${dateInfo.color}`}>
              {dateInfo.text}
            </span>
          )}
          {task.is_bookmarked ? <Star size={13} style={{ color: '#ff6b35' }} fill="currentColor" className="flex-shrink-0" /> : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!task.is_completed && (
            <>
              <button onClick={startEdit} className="p-xs rounded-lg text-text-tertiary hover:text-accent-cyan hover:bg-white/5 transition-all">
                <Pencil size={13} />
              </button>
              <button onClick={() => onUpdate(task.id, { is_bookmarked: task.is_bookmarked ? 0 : 1 })}
                className="p-xs rounded-lg text-text-tertiary hover:text-accent-orange hover:bg-white/5 transition-all">
                <Star size={13} fill={task.is_bookmarked ? 'currentColor' : 'none'} />
              </button>
            </>
          )}
          <button onClick={() => onDelete(task.id)} className="p-xs rounded-lg text-text-tertiary hover:text-accent-pink hover:bg-white/5 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded / editing section */}
      {(expanded || editing) && (
        <div className="px-md pb-md pt-xs border-t border-white/5 space-y-sm animate-slide-up">
          {editing ? (
            <>
              <textarea value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                placeholder="Add a description..."
                rows={2}
                className="w-full bg-bg-primary/50 border border-white/10 rounded-lg px-md py-sm text-text-secondary text-sm focus:outline-none focus:border-accent-purple/40 resize-none transition-all" />
              <div className="flex items-center gap-md flex-wrap">
                {/* Priority */}
                <div className="flex gap-xs">
                  {Object.entries(PRIORITY).filter(([k]) => k !== 'none').map(([key, pr]) => (
                    <button key={key} onClick={() => setEditData(d => ({ ...d, priority: d.priority === key ? 'none' : key }))}
                      className={`px-sm py-xs rounded-md text-xs font-semibold border transition-all ${editData.priority === key ? `${pr.bg} ${pr.border}` : 'bg-white/5 border-white/10 text-text-tertiary'}`}
                      style={{ color: editData.priority === key ? pr.color : undefined }}>
                      {pr.label}
                    </button>
                  ))}
                </div>
                {/* Date */}
                <input type="date" value={editData.due_date} onChange={e => setEditData(d => ({ ...d, due_date: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none focus:border-accent-purple/40 transition-all" />
                {/* Link */}
                <input type="url" value={editData.link} onChange={e => setEditData(d => ({ ...d, link: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 min-w-32 bg-white/5 border border-white/10 rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none focus:border-accent-purple/40 transition-all" />
              </div>
              <div className="flex gap-sm justify-end">
                <button onClick={() => setEditing(false)} className="px-md py-xs border border-white/10 rounded-lg text-xs text-text-tertiary hover:text-text-primary transition-colors">Cancel</button>
                <button onClick={saveEdit} className="px-md py-xs bg-accent-purple/80 hover:bg-accent-purple text-white text-xs font-semibold rounded-lg transition-colors">Save</button>
              </div>
            </>
          ) : (
            <div className="space-y-xs pl-9">
              {task.description && <p className="text-text-secondary text-xs leading-relaxed">{task.description}</p>}
              {task.link && (
                <a href={task.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-xs text-accent-cyan text-xs hover:underline" onClick={e => e.stopPropagation()}>
                  <Link size={10} /> {task.link.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              )}
              {!task.description && !task.link && (
                <p className="text-text-tertiary/40 text-xs italic">No details — click ✏ to add</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Task group ────────────────────────────────────────────────────────────────
const TaskGroup = ({ label, tasks, icon: Icon, color, defaultOpen = true, onToggle, onUpdate, onDelete, accentColor }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-xs">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-sm w-full text-left py-xs group">
        <Icon size={13} style={{ color }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold font-mono"
          style={{ backgroundColor: color + '20', color }}>{tasks.length}</span>
        <div className="flex-1 h-px mx-xs" style={{ backgroundColor: color + '18' }} />
        <ChevronDown size={12} className={`text-text-tertiary transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="space-y-xs pl-1">
          {tasks.length === 0 ? (
            <div className="text-xs text-text-tertiary/30 italic py-xs pl-md">No tasks here</div>
          ) : (
            tasks.map(t => (
              <TaskItem key={t.id} task={t} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} accentColor={accentColor} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Tasks view ───────────────────────────────────────────────────────────
const Tasks = () => {
  const agencies = useStore(state => state.agencies);
  const creators = useStore(state => state.creators);
  const tasks = useStore(state => state.tasks);
  const addTask = useStore(state => state.addTask);
  const updateTask = useStore(state => state.updateTask);
  const deleteTask = useStore(state => state.deleteTask);
  const clearCompletedTasks = useStore(state => state.clearCompletedTasks);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const activeAgencyId = selectedAgency ?? (agencies[0]?.id ?? null);
  const agencyIdx = agencies.findIndex(a => a.id === activeAgencyId);
  const accentColor = AGENCY_COLORS[agencyIdx % AGENCY_COLORS.length] || '#9d4edd';
  const agencyCreators = creators.filter(c => c.agency_id === activeAgencyId && c.is_active);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeAgencyId && t.agency_id !== activeAgencyId) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, activeAgencyId, search, priorityFilter]);

  const activeTasks = filteredTasks.filter(t => !t.is_completed);
  const completedTasks = filteredTasks.filter(t => t.is_completed);

  // Group active tasks
  const overdue  = activeTasks.filter(t => t.due_date && t.due_date < TODAY);
  const dueToday = activeTasks.filter(t => t.due_date === TODAY);
  const upcoming = activeTasks.filter(t => !t.due_date || t.due_date > TODAY);

  // Sort each group by priority then date
  const sortTasks = (arr) => arr.sort((a, b) => {
    const po = { high: 0, medium: 1, low: 2, none: 3 };
    const pd = (po[a.priority] || 3) - (po[b.priority] || 3);
    if (pd !== 0) return pd;
    return (a.due_date || '9999').localeCompare(b.due_date || '9999');
  });

  const handleAdd = ({ title, priority, dueDate, creatorId }) => {
    if (!activeAgencyId) return;
    addTask(activeAgencyId, creatorId, title, '', dueDate, priority, '');
  };

  const handleToggle = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { is_completed: task.is_completed ? 0 : 1 });
  };

  // Stats
  const totalActive = tasks.filter(t => !t.is_completed && (!activeAgencyId || t.agency_id === activeAgencyId)).length;
  const totalOverdue = tasks.filter(t => !t.is_completed && t.due_date && t.due_date < TODAY && (!activeAgencyId || t.agency_id === activeAgencyId)).length;
  const totalDoneCount = completedTasks.length;

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div className="flex items-center gap-md">
          <CheckSquare size={30} className="text-accent-purple" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">Tasks</h1>
          {totalActive > 0 && (
            <span className={`text-sm px-sm py-xs rounded-full font-semibold ${totalOverdue > 0 ? 'bg-accent-pink/15 text-accent-pink border border-accent-pink/30' : 'bg-white/8 text-text-secondary border border-white/10'}`}>
              {totalActive} active {totalOverdue > 0 ? `· ${totalOverdue} overdue` : ''}
            </span>
          )}
        </div>
        {totalDoneCount > 0 && (
          <button onClick={() => setConfirmClear(true)}
            className="text-xs text-text-tertiary hover:text-accent-pink border border-white/10 hover:border-accent-pink/30 rounded-lg px-md py-xs transition-all">
            Clear {totalDoneCount} completed
          </button>
        )}
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap">
        {agencies.map((agency, idx) => {
          const color = AGENCY_COLORS[idx % AGENCY_COLORS.length];
          const isActive = agency.id === activeAgencyId;
          const count = tasks.filter(t => !t.is_completed && t.agency_id === agency.id).length;
          return (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${isActive ? 'text-bg-primary border-transparent shadow-lg' : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/8'}`}
              style={isActive ? { background: color, borderColor: color } : {}}>
              {agency.name}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-text-tertiary'}`}>{count}</span>
              )}
            </button>
          );
        })}
        {agencies.length === 0 && <p className="text-text-tertiary text-sm">Add an agency from the Dashboard first.</p>}
      </div>

      {/* Task summary strip */}
      {activeAgencyId && (
        <div className="flex items-center gap-sm flex-wrap">
          {[
            { label: 'Active',    value: activeTasks.length,    color: 'text-text-secondary', bg: 'bg-white/5 border-white/10'                       },
            { label: 'Overdue',   value: overdue.length,        color: 'text-accent-pink',    bg: 'bg-accent-pink/10 border-accent-pink/25'            },
            { label: 'Due Today', value: dueToday.length,       color: 'text-accent-orange',  bg: 'bg-accent-orange/10 border-accent-orange/25'        },
            { label: 'Done',      value: completedTasks.length, color: 'text-accent-lime/80', bg: 'bg-accent-lime/8 border-accent-lime/20'             },
          ].map(({ label, value, color, bg }) => value > 0 ? (
            <div key={label} className={`flex items-center gap-xs px-sm py-xs rounded-full border text-xs ${bg}`}>
              <span className="text-text-tertiary/60">{label}:</span>
              <span className={`font-bold ${color}`}>{value}</span>
            </div>
          ) : null)}
        </div>
      )}

      {activeAgencyId && (
        <>
          {/* Search + filter bar */}
          <div className="flex items-center gap-md flex-wrap">
            <div className="flex items-center gap-sm flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-md py-sm hover:border-white/20 transition-all">
              <Search size={14} className="text-text-tertiary flex-shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-tertiary/50 focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary transition-colors"><X size={13} /></button>}
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-xs">
              <SlidersHorizontal size={13} className="text-text-tertiary" />
              {['all', 'high', 'medium', 'low'].map(p => {
                const pr = PRIORITY[p];
                const isActive = priorityFilter === p;
                return (
                  <button key={p} onClick={() => setPriorityFilter(p)}
                    className={`px-sm py-xs rounded-lg text-xs font-semibold border transition-all ${
                      isActive && p !== 'all' ? `${pr?.bg} ${pr?.border}` : isActive ? 'bg-white/10 border-white/20 text-text-primary' : 'bg-white/5 border-white/8 text-text-tertiary hover:text-text-primary'
                    }`}
                    style={{ color: isActive && p !== 'all' ? pr?.color : undefined }}>
                    {p === 'all' ? 'All' : pr?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick add */}
          <QuickAdd agencyId={activeAgencyId} creators={agencyCreators} onAdd={handleAdd} />

          {/* Task groups */}
          <div className="space-y-lg">
            {activeTasks.length === 0 && !search ? (
              <div className="text-center py-2xl border border-dashed border-white/10 rounded-2xl">
                <CheckSquare size={40} className="mx-auto text-text-tertiary/20 mb-md" />
                <p className="text-text-secondary font-semibold">All clear!</p>
                <p className="text-text-tertiary text-sm mt-xs">Add a task above to get started</p>
              </div>
            ) : activeTasks.length === 0 && search ? (
              <p className="text-text-tertiary text-center py-lg">No tasks match "{search}"</p>
            ) : (
              <>
                <TaskGroup label="Overdue" tasks={sortTasks(overdue)} icon={AlertCircle} color="#ff006e" defaultOpen={true}
                  onToggle={handleToggle} onUpdate={updateTask} onDelete={deleteTask} accentColor="#ff006e" />
                <TaskGroup label="Due Today" tasks={sortTasks(dueToday)} icon={Clock} color="#ff6b35" defaultOpen={true}
                  onToggle={handleToggle} onUpdate={updateTask} onDelete={deleteTask} accentColor="#ff6b35" />
                <TaskGroup label="Upcoming" tasks={sortTasks(upcoming)} icon={Calendar} color={accentColor} defaultOpen={true}
                  onToggle={handleToggle} onUpdate={updateTask} onDelete={deleteTask} accentColor={accentColor} />
              </>
            )}

            {/* Completed section */}
            {completedTasks.length > 0 && (
              <div className="space-y-xs">
                <button onClick={() => setShowCompleted(v => !v)}
                  className="flex items-center gap-sm w-full text-left py-xs px-sm rounded-lg hover:bg-white/5 transition-colors">
                  <Check size={14} style={{ color: '#00ff88' }} />
                  <span className="text-xs font-bold uppercase tracking-widest text-accent-lime/70">Completed</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-lime/10 text-accent-lime/70 font-mono">{completedTasks.length}</span>
                  <ChevronDown size={12} className={`ml-auto text-text-tertiary transition-transform ${showCompleted ? '' : '-rotate-90'}`} />
                </button>
                {showCompleted && (
                  <div className="space-y-xs pl-1 opacity-70">
                    {completedTasks.map(t => (
                      <TaskItem key={t.id} task={t} onToggle={handleToggle} onUpdate={updateTask} onDelete={deleteTask} accentColor="#00ff88" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Clear completed confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmClear(false)}>
          <div className="bg-bg-secondary border border-white/10 rounded-2xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Clear completed tasks?</h3>
            <p className="text-text-secondary text-sm mb-lg">This will permanently delete all {totalDoneCount} completed tasks for this agency.</p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmClear(false)} className="px-lg py-sm border border-white/10 rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={() => { clearCompletedTasks(activeAgencyId); setConfirmClear(false); }} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-xl text-sm transition-colors">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
