import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Plus, Trash2 } from 'lucide-react';
import Card from '../Card';
import TaskCard from '../TaskCard';
import * as db from '../../db/index.js';

const CreatorWorkspace = ({ creator }) => {
  const [tasks, setTasks] = useState([]);
  const [brainDump, setBrainDump] = useState([]);
  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    if (creator) {
      loadTasks();
      loadBrainDump();
    }
  }, [creator?.id]);

  const loadTasks = () => {
    const creatorTasks = db.getTasksForCreator(creator.id);
    setTasks(creatorTasks);
  };

  const loadBrainDump = () => {
    const notes = db.getBrainDumpForCreator(creator.id);
    setBrainDump(notes);
  };

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    db.createTask(creator.id, taskInput.trim(), '', null, 'upcoming', '');
    setTaskInput('');
    loadTasks();
  };

  const handleToggleTask = (taskId, isCompleted) => {
    db.toggleTaskCompletion(taskId, isCompleted);
    loadTasks();
  };

  const handleUpdateTask = (taskId, updates) => {
    db.updateTask(taskId, updates);
    loadTasks();
  };

  const handleDeleteTask = (taskId) => {
    db.deleteTask(taskId);
    loadTasks();
  };

  const handleAddNote = () => {
    if (!brainDumpInput.trim()) return;
    db.addBrainDumpNote(creator.id, brainDumpInput.trim());
    setBrainDumpInput('');
    loadBrainDump();
  };

  const handleDeleteNote = (noteId) => {
    db.deleteBrainDumpNote(noteId);
    loadBrainDump();
  };

  const handleUpdateNote = (noteId, content) => {
    db.updateBrainDumpNote(noteId, content);
    loadBrainDump();
  };

  if (!creator) {
    return null;
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">{creator.stage_name}</h2>
          <p className="text-text-tertiary text-sm mt-sm">Workspace & Tasks</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-md border-b border-accent-cyan/20">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-md px-md text-sm font-medium transition-all ${
            activeTab === 'tasks'
              ? 'text-accent-cyan border-b-2 border-accent-cyan'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <FileText className="inline mr-sm" size={16} /> Tasks
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-md px-md text-sm font-medium transition-all ${
            activeTab === 'notes'
              ? 'text-accent-cyan border-b-2 border-accent-cyan'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <MessageSquare className="inline mr-sm" size={16} /> Brain Dump
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tasks' ? (
        <div className="space-y-lg">
          {/* Add task input */}
          <div className="flex gap-sm">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Quick task (press Enter)..."
              className="flex-1 bg-bg-tertiary/50 border border-accent-cyan/30 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-cyan transition-all"
            />
            <button
              onClick={handleAddTask}
              className="px-lg py-sm bg-gradient-to-r from-accent-cyan to-accent-blue text-bg-primary font-semibold rounded-lg hover:shadow-glow transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Tasks Grid */}
          {tasks.length === 0 ? (
            <div className="text-center py-xl text-text-tertiary">
              <p>No tasks yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isCompleted={task.is_completed}
                  onToggle={handleToggleTask}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-lg">
          <textarea
            value={brainDumpInput}
            onChange={(e) => setBrainDumpInput(e.target.value)}
            onBlur={handleAddNote}
            placeholder="Quick notes... (auto-saves on blur)"
            rows="4"
            className="w-full bg-bg-tertiary/50 border border-accent-cyan/30 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-cyan transition-all resize-none"
          />

          {brainDump.length === 0 ? (
            <p className="text-center text-text-tertiary">No notes yet</p>
          ) : (
            <div className="space-y-md">
              {brainDump.map(note => (
                <div
                  key={note.id}
                  className="bg-bg-tertiary/50 border border-accent-purple/30 rounded-lg p-md group hover:border-accent-purple/60 hover:shadow-glow-purple transition-all animation-slide-up"
                >
                  <textarea
                    defaultValue={note.content}
                    onBlur={(e) => {
                      if (e.target.value !== note.content) {
                        handleUpdateNote(note.id, e.target.value);
                      }
                    }}
                    className="w-full bg-transparent text-text-primary focus:outline-none resize-none text-sm"
                    rows="2"
                  />
                  <div className="flex items-center justify-between mt-md pt-md border-t border-accent-purple/20">
                    <p className="text-text-tertiary text-xs">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-text-tertiary hover:text-accent-pink opacity-0 group-hover:opacity-100 transition-all p-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatorWorkspace;
