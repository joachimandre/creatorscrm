import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Plus, Trash2, Save } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import * as db from '../../db/index.js';

const CreatorWorkspace = ({ creator }) => {
  const [tasks, setTasks] = useState([]);
  const [brainDump, setBrainDump] = useState([]);
  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [activeTab, setActiveTab] = useState('tasks'); // tasks or notes

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
    db.createTask(creator.id, taskInput.trim(), '', null, 'upcoming');
    setTaskInput('');
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
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">{creator.stage_name}</h2>
          <p className="text-text-tertiary text-sm mt-sm">Workspace & Notes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-md border-b border-surface-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-md px-md text-sm font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="inline mr-sm" size={16} /> Tasks
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-md px-md text-sm font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <MessageSquare className="inline mr-sm" size={16} /> Brain Dump
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tasks' ? (
        <Card>
          <div className="space-y-md">
            {/* Input */}
            <div className="flex gap-sm">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a quick task..."
                className="flex-1 bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none"
              />
              <Button onClick={handleAddTask} size="md">
                <Plus size={16} />
              </Button>
            </div>

            {/* Tasks List */}
            <div className="space-y-sm">
              {tasks.length === 0 ? (
                <p className="text-text-tertiary text-sm text-center py-lg">No tasks yet</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="bg-surface-1 rounded-lg p-sm border-l-4 border-accent-primary">
                    <div className="flex items-start justify-between gap-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-text-secondary text-xs mt-1">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-text-tertiary text-xs mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-text-tertiary hover:text-accent-danger p-xs transition-all flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-md">
            {/* Auto-saving note input */}
            <div className="relative">
              <textarea
                value={brainDumpInput}
                onChange={(e) => setBrainDumpInput(e.target.value)}
                onBlur={handleAddNote}
                placeholder="Quick notes, thoughts, reminders... (auto-saves on blur)"
                rows="4"
                className="w-full bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none resize-none"
              />
            </div>

            {/* Notes List */}
            <div className="space-y-sm">
              {brainDump.length === 0 ? (
                <p className="text-text-tertiary text-sm text-center py-lg">No notes yet</p>
              ) : (
                brainDump.map(note => (
                  <div key={note.id} className="bg-surface-1 rounded-lg p-md border-l-4 border-accent-primary relative">
                    <textarea
                      defaultValue={note.content}
                      onBlur={(e) => {
                        if (e.target.value !== note.content) {
                          handleUpdateNote(note.id, e.target.value);
                        }
                      }}
                      className="w-full bg-surface-1 text-text-primary placeholder-text-tertiary focus:outline-none resize-none text-sm"
                      rows="2"
                    />
                    <div className="flex items-center justify-between mt-sm">
                      <p className="text-text-tertiary text-xs">
                        {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                      </p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-text-tertiary hover:text-accent-danger p-xs transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CreatorWorkspace;
