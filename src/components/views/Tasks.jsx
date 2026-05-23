import { useState, useMemo } from 'react';
import { useStore } from '../../store.js';
import {
  CheckSquare, Plus, Trash2, Pencil, Check, X,
  AlertCircle, Clock, Calendar, Star, Link, Search,
  Flame, Minus, ArrowUp,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const PRIORITY = {
  high:   { label: 'High',   color: '#ff006e', bg: 'bg-accent-pink/15',   border: 'border-accent-pink/40',   icon: Flame   },
  medium: { label: 'Medium', color: '#ff6b35', bg: 'bg-accent-orange/15', border: 'border-accent-orange/40', icon: ArrowUp },
  low:    { label: 'Low',    color: '#00d9ff', bg: 'bg-accent-cyan/15',   border: 'border-accent-cyan/40',   icon: Minus   },
  none:   { label: 'None',   color: '#3f4258', bg: 'bg-bg-primary',       border: 'border-transparent',      icon: null    },
};

const COLUMNS = [
  { id: 'overdue',  label: 'Overdue',  color: '#ff006e', icon: AlertCircle, canAdd: false, emptyMsg: 'No overdue tasks 🎉'       },
  { id: 'today',    label: 'Today',    color: '#ff6b35', icon: Clock,        canAdd: true,  emptyMsg: 'Nothing due today'         },
  { id: 'upcoming', label: 'Upcoming', color: '#9d4edd', icon: Calendar,     canAdd: true,  emptyMsg: 'All clear — add a task ↑'  },
  { id: 'done',     label: 'Done',     color: '#00ff88', icon: Check,        canAdd: false, emptyMsg: 'Completed tasks appear here'},
];

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];

const dueDateLabel = (date) => {
  if (!date) return null;
  if (date < TODAY) {
    const days = Math.round((new Date(TODAY) - new Date(date + 'T00:00:00')) / 86400000);
    return { text: `${days}d overdue`, chip: 'bg-accent-pink/10 border-accent-pink/30 text-accent-pink' };
  }
  if (date === TODAY) return { text: 'Today', chip: 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange' };
  const days = Math.round((new Date(date + 'T00:00:00') - new Date(TODAY + 'T00:00:00')) / 86400000);
  if (days <= 3) return { text: `In ${days}d`, chip: 'bg-accent-orange/5 border-accent-orange/20 text-accent-orange/70' };
  return { text: date.slice(5).replace('-', '/'), chip: 'bg-transparent border-transparent text-text-tertiary/50' };
};

const sortByPriority = (arr) => [...arr].sort((a, b) => {
  const po = { high: 0, medium: 1, low: 2, none: 3 };
  const pd = (po[a.priority] ?? 3) - (po[b.priority] ?? 3);
  return pd !== 0 ? pd : (a.due_date || '9999').localeCompare(b.due_date || '9999');
});

// ─── Kanban Card ────────────────────────────────────────────────────────────────
const KanbanCard = ({ task, onToggle, onUpdate, onDelete, isDragging, onDragStart, onDragEnd }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editData, setEditData] = useState({});

  const p       = PRIORITY[task.priority] || PRIORITY.none;
  const PIcon   = p.icon;
  const dateInfo = dueDateLabel(task.due_date);

  const openEdit = (e) => {
    e.stopPropagation();
    setEditData({
      title:       task.title,
      description: task.description || '',
      due_date:    task.due_date   || '',
      priority:    task.priority   || 'none',
      link:        task.link       || '',
    });
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = () => {
    if (!editData.title.trim()) return;
    onUpdate(task.id, {
      title:       editData.title.trim(),
      description: editData.description,
      due_date:    editData.due_date || null,
      priority:    editData.priority,
      link:        editData.link,
    });
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(task.id); }}
      onDragEnd={e => { e.stopPropagation(); onDragEnd(); }}
      className={`group relative neu-card overflow-hidden select-none transition-all duration-200
        ${isDragging ? 'opacity-40 scale-[0.96] cursor-grabbing' : 'cursor-grab hover:shadow-neu-lg'}
        ${task.is_completed ? 'opacity-55' : ''}
      `}
      style={{ borderLeft: `3px solid ${p.color}55` }}
    >
      {/* Card body */}
      <div className="p-md space-y-xs">

        {/* Top row: priority chip + date chip */}
        <div className="flex items-center justify-between gap-xs min-h-[18px]">
          <div>
            {task.priority !== 'none' && PIcon && (
              <span className={`inline-flex items-center gap-[3px] px-xs py-[2px] rounded-full text-[10px] font-bold border ${p.bg} ${p.border}`}
                style={{ color: p.color }}>
                <PIcon size={9} /> {p.label}
              </span>
            )}
          </div>
          {dateInfo && (
            <span className={`text-[10px] font-semibold px-xs py-[2px] rounded-full border shrink-0 ${dateInfo.chip}`}>
              {dateInfo.text}
            </span>
          )}
        </div>

        {/* Title */}
        <p
          onClick={() => !editing && setExpanded(v => !v)}
          className={`text-sm font-semibold leading-snug
            ${task.is_completed ? 'line-through text-text-tertiary' : 'text-text-primary hover:text-accent-cyan'}
            transition-colors`}
        >
          {task.title}
        </p>

        {/* Context row: creator + bookmark */}
        <div className="flex items-center justify-between gap-xs">
          {task.creator_name
            ? <span className="text-[11px] text-text-tertiary/50 truncate">{task.creator_name}</span>
            : <span />
          }
          {task.is_bookmarked ? <Star size={10} style={{ color: '#ff6b35' }} fill="currentColor" /> : null}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-xs pt-xs border-t border-white/[0.06]">
          <button
            onClick={e => { e.stopPropagation(); onToggle(task.id); }}
            className={`flex items-center gap-xs px-sm py-[3px] rounded-lg text-[11px] font-semibold transition-all
              ${task.is_completed
                ? 'bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20'
                : 'neu-btn text-text-tertiary hover:text-accent-lime'}`}
          >
            <Check size={10} /> {task.is_completed ? 'Done' : 'Complete'}
          </button>

          <div className="flex items-center gap-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
            {!task.is_completed && (
              <>
                <button onClick={openEdit}
                  className="p-xs rounded-lg text-text-tertiary hover:text-accent-cyan hover:bg-white/5 transition-all">
                  <Pencil size={11} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onUpdate(task.id, { is_bookmarked: task.is_bookmarked ? 0 : 1 }); }}
                  className="p-xs rounded-lg transition-all"
                  style={{ color: task.is_bookmarked ? '#ff6b35' : undefined }}>
                  <Star size={11} fill={task.is_bookmarked ? 'currentColor' : 'none'}
                    className={task.is_bookmarked ? '' : 'text-text-tertiary hover:text-accent-orange'} />
                </button>
              </>
            )}
            <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
              className="p-xs rounded-lg text-text-tertiary hover:text-accent-pink hover:bg-white/5 transition-all">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded / edit panel */}
      {(expanded || editing) && !isDragging && (
        <div
          className="border-t border-white/8 bg-bg-primary/60 p-md space-y-sm animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          {editing ? (
            <>
              <input autoFocus value={editData.title}
                onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                className="w-full rounded-lg px-sm py-xs text-text-primary text-sm focus:outline-none" />
              <textarea value={editData.description}
                onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                placeholder="Description…"
                rows={2}
                className="w-full rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none resize-none" />
              <div className="flex flex-wrap gap-xs">
                {Object.entries(PRIORITY).filter(([k]) => k !== 'none').map(([key, pr]) => (
                  <button key={key}
                    onClick={() => setEditData(d => ({ ...d, priority: d.priority === key ? 'none' : key }))}
                    className={`px-sm py-[3px] rounded-md text-[10px] font-bold border transition-all
                      ${editData.priority === key ? `${pr.bg} ${pr.border}` : 'neu-btn border-transparent text-text-tertiary'}`}
                    style={{ color: editData.priority === key ? pr.color : undefined }}>
                    {pr.label}
                  </button>
                ))}
                <input type="date" value={editData.due_date}
                  onChange={e => setEditData(d => ({ ...d, due_date: e.target.value }))}
                  className="rounded-lg px-sm py-[3px] text-text-secondary text-xs focus:outline-none" />
              </div>
              <input type="url" value={editData.link}
                onChange={e => setEditData(d => ({ ...d, link: e.target.value }))}
                placeholder="https://…"
                className="w-full rounded-lg px-sm py-xs text-text-secondary text-xs focus:outline-none" />
              <div className="flex gap-xs justify-end">
                <button onClick={() => setEditing(false)}
                  className="px-sm py-[3px] neu-btn rounded-lg text-xs text-text-tertiary transition-colors">
                  Cancel
                </button>
                <button onClick={saveEdit}
                  className="px-sm py-[3px] bg-accent-purple/80 hover:bg-accent-purple text-white text-xs font-semibold rounded-lg transition-colors">
                  Save
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-xs">
              {task.description && (
                <p className="text-text-secondary text-xs leading-relaxed">{task.description}</p>
              )}
              {task.link && (
                <a href={task.link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-xs text-accent-cyan text-xs hover:underline">
                  <Link size={9} /> {task.link.replace(/^https?:\/\//, '').slice(0, 42)}
                </a>
              )}
              {!task.description && !task.link && (
                <p className="text-text-tertiary/30 text-xs italic">No details — click ✏ to edit</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Kanban Column ──────────────────────────────────────────────────────────────
const KanbanColumn = ({
  column, tasks, isDragTarget, onDragOver, onDragLeave, onDrop,
  onAdd, onToggle, onUpdate, onDelete, draggedId, onClearDone,
  onDragStart, onDragEnd,
}) => {
  const [addingTask, setAddingTask] = useState(false);
  const [addTitle,   setAddTitle]   = useState('');
  const Icon = column.icon;

  const submitAdd = () => {
    if (!addTitle.trim()) return;
    onAdd(addTitle.trim(), column.id);
    setAddTitle('');
    setAddingTask(false);
  };

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 272 }}>

      {/* Column header */}
      <div className="flex items-center gap-xs px-xs py-sm mb-xs">
        <Icon size={13} style={{ color: column.color }} />
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: column.color }}>
          {column.label}
        </span>
        <span className="ml-xs text-[10px] px-[5px] py-[1px] rounded-full font-mono font-bold"
          style={{ background: column.color + '18', color: column.color }}>
          {tasks.length}
        </span>
        <div className="ml-auto flex items-center gap-xs">
          {column.id === 'done' && tasks.length > 0 && onClearDone && (
            <button onClick={onClearDone}
              className="text-[10px] text-text-tertiary/40 hover:text-accent-pink transition-colors px-xs">
              Clear
            </button>
          )}
          {column.canAdd && (
            <button onClick={() => setAddingTask(true)}
              className="flex items-center justify-center w-5 h-5 rounded-md neu-btn text-text-tertiary hover:text-text-primary transition-all">
              <Plus size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); onDragOver(); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) onDragLeave(); }}
        onDrop={e => { e.preventDefault(); onDrop(); }}
        className="flex-1 rounded-xl p-sm space-y-sm overflow-y-auto transition-all duration-150"
        style={{
          minHeight: 180,
          boxShadow: isDragTarget
            ? `0 0 0 2px ${column.color}55, inset 0 0 0 10000px rgba(255,255,255,0.015)`
            : 'none',
          background: isDragTarget ? 'transparent' : 'transparent',
        }}
      >
        {/* Inline quick-add input */}
        {addingTask && (
          <div className="neu-card p-sm animate-slide-up">
            <input
              autoFocus
              type="text"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitAdd();
                if (e.key === 'Escape') { setAddTitle(''); setAddingTask(false); }
              }}
              onBlur={() => { if (!addTitle.trim()) setAddingTask(false); }}
              placeholder="Task title… Enter to add"
              className="w-full bg-transparent text-text-primary text-sm placeholder-text-tertiary/40 focus:outline-none"
            />
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && !addingTask && (
          <div
            className="flex flex-col items-center justify-center py-2xl text-center rounded-xl border border-dashed transition-all"
            style={{ borderColor: isDragTarget ? column.color + '40' : 'rgba(255,255,255,0.06)' }}
          >
            <Icon size={20} className="mb-xs" style={{ color: column.color, opacity: isDragTarget ? 0.5 : 0.15 }} />
            <p className="text-[11px] text-text-tertiary/35">{column.emptyMsg}</p>
            {column.canAdd && (
              <button onClick={() => setAddingTask(true)}
                className="mt-sm text-[11px] text-text-tertiary/30 hover:text-text-tertiary/60 transition-colors flex items-center gap-xs">
                <Plus size={10} /> Add task
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {tasks.map((task, idx) => (
          <div key={task.id} className="animate-fade-in" style={{ animationDelay: `${idx * 25}ms` }}>
            <KanbanCard
              task={task}
              isDragging={draggedId === task.id}
              onDragStart={() => onDragStart(task.id)}
              onDragEnd={onDragEnd}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Tasks View ────────────────────────────────────────────────────────────
const Tasks = () => {
  const agencies          = useStore(s => s.agencies);
  const creators          = useStore(s => s.creators);
  const tasks             = useStore(s => s.tasks);
  const addTask           = useStore(s => s.addTask);
  const updateTask        = useStore(s => s.updateTask);
  const deleteTask        = useStore(s => s.deleteTask);
  const clearCompletedTasks = useStore(s => s.clearCompletedTasks);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [search,         setSearch]         = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [confirmClear,   setConfirmClear]   = useState(false);

  // Drag state
  const [draggedId,  setDraggedId]  = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const activeAgencyId = selectedAgency ?? (agencies[0]?.id ?? null);
  const agencyIdx      = agencies.findIndex(a => a.id === activeAgencyId);
  const accentColor    = AGENCY_COLORS[agencyIdx % AGENCY_COLORS.length] || '#9d4edd';

  // Filtered tasks
  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (activeAgencyId && t.agency_id !== activeAgencyId) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  }), [tasks, activeAgencyId, search, priorityFilter]);

  // Distribute into kanban columns
  const tasksByCol = {
    overdue:  sortByPriority(filteredTasks.filter(t => !t.is_completed && t.due_date && t.due_date < TODAY)),
    today:    sortByPriority(filteredTasks.filter(t => !t.is_completed && t.due_date === TODAY)),
    upcoming: sortByPriority(filteredTasks.filter(t => !t.is_completed && (!t.due_date || t.due_date > TODAY))),
    done:     filteredTasks.filter(t => !!t.is_completed).slice(0, 30), // cap done at 30 for perf
  };

  // Stats
  const totalOverdue = tasksByCol.overdue.length;
  const totalActive  = tasksByCol.overdue.length + tasksByCol.today.length + tasksByCol.upcoming.length;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAdd = (title, columnId) => {
    if (!activeAgencyId) return;
    const dueDate = columnId === 'today' ? TODAY : null;
    addTask(activeAgencyId, null, title, '', dueDate, 'none', '');
  };

  const handleToggle = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    updateTask(id, { is_completed: task.is_completed ? 0 : 1 });
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleDrop = (colId) => {
    if (!draggedId) return;
    const task = tasks.find(t => t.id === draggedId);
    if (!task) return;

    const updates = {};
    if (colId === 'done')     { updates.is_completed = 1; }
    else if (colId === 'upcoming') { updates.is_completed = 0; updates.due_date = null; }
    else if (colId === 'today')    { updates.is_completed = 0; updates.due_date = TODAY; }
    else if (colId === 'overdue')  { /* no sensible action — ignore */ }

    if (Object.keys(updates).length > 0) updateTask(draggedId, updates);
    setDraggedId(null);
    setDragOverCol(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-lg h-full flex flex-col overflow-hidden gap-lg">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md flex-shrink-0">
        <div className="flex items-center gap-md">
          <CheckSquare size={28} className="text-accent-purple" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent">
            Tasks
          </h1>
          {totalActive > 0 && (
            <span className={`text-sm px-sm py-xs rounded-full font-semibold ${
              totalOverdue > 0
                ? 'bg-accent-pink/15 text-accent-pink border border-accent-pink/30'
                : 'bg-bg-primary text-text-secondary'
            }`}>
              {totalActive} active{totalOverdue > 0 ? ` · ${totalOverdue} overdue` : ''}
            </span>
          )}
        </div>
        {tasksByCol.done.length > 0 && (
          <button onClick={() => setConfirmClear(true)}
            className="text-xs text-text-tertiary hover:text-accent-pink neu-btn rounded-lg px-md py-xs transition-all">
            Clear {tasksByCol.done.length} completed
          </button>
        )}
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap flex-shrink-0">
        {agencies.map((agency, idx) => {
          const color    = AGENCY_COLORS[idx % AGENCY_COLORS.length];
          const isActive = agency.id === activeAgencyId;
          const count    = tasks.filter(t => !t.is_completed && t.agency_id === agency.id).length;
          return (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all
                ${isActive ? 'border border-transparent text-bg-primary shadow-lg' : 'neu-btn text-text-secondary hover:text-text-primary'}`}
              style={isActive ? { background: color } : {}}>
              {agency.name}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-text-tertiary'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {agencies.length === 0 && (
          <p className="text-text-tertiary text-sm">Add an agency from the Dashboard first.</p>
        )}
      </div>

      {activeAgencyId && (
        <>
          {/* Search + priority filter */}
          <div className="flex items-center gap-md flex-wrap flex-shrink-0">
            <div className="flex items-center gap-sm flex-1 min-w-48 neu-card-inset rounded-xl px-md py-sm">
              <Search size={13} className="text-text-tertiary flex-shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="flex-1 bg-transparent text-text-primary text-sm placeholder-text-tertiary/40 focus:outline-none" />
              {search && (
                <button onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-xs neu-card-inset rounded-xl p-xs">
              {['all', 'high', 'medium', 'low'].map(p => {
                const pr       = PRIORITY[p];
                const isActive = priorityFilter === p;
                return (
                  <button key={p} onClick={() => setPriorityFilter(p)}
                    className={`px-sm py-xs rounded-xl text-xs font-semibold border transition-all
                      ${isActive && p !== 'all' ? `${pr?.bg} ${pr?.border}` : isActive ? 'neu-card border-transparent text-text-primary' : 'neu-btn border-transparent text-text-tertiary hover:text-text-primary'}`}
                    style={{ color: isActive && p !== 'all' ? pr?.color : undefined }}>
                    {p === 'all' ? 'All' : pr?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Kanban board ─────────────────────────────────────────────────── */}
          <div className="relative flex-1 min-h-0">
          {/* Right-edge fade affordance */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
            style={{ background: 'linear-gradient(to right, transparent, #1d2027)' }} />
          <div className="flex gap-md overflow-x-auto h-full pb-sm kanban-scroll">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByCol[col.id]}
                isDragTarget={dragOverCol === col.id}
                onDragOver={() => setDragOverCol(col.id)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
                onAdd={handleAdd}
                draggedId={draggedId}
                onToggle={handleToggle}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onClearDone={col.id === 'done' ? () => setConfirmClear(true) : null}
                onDragStart={(id) => setDraggedId(id)}
                onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
              />
            ))}
          </div>
          </div>
        </>
      )}

      {/* Confirm clear dialog */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmClear(false)}>
          <div className="neu-card rounded-2xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Clear completed tasks?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              This will permanently delete all {tasksByCol.done.length} completed tasks for this agency.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmClear(false)}
                className="px-lg py-sm neu-btn rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button onClick={() => { clearCompletedTasks(activeAgencyId); setConfirmClear(false); }}
                className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-xl text-sm transition-colors">
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
