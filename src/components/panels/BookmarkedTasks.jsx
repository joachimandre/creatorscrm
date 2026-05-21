import { useState, useEffect } from 'react';
import { Star, Plus, Trash2 } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import Modal from '../Modal';
import * as db from '../../db/index.js';
import { formatDistanceToNow } from 'date-fns';

const BookmarkedTasks = () => {
  const [bookmarkedTasks, setBookmarkedTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '' });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    const tasks = db.getBookmarkedTasks();
    setBookmarkedTasks(tasks);
  };

  const handleAddTask = () => {
    if (!formData.title.trim()) return;

    const taskId = db.createTask(
      null,
      formData.title,
      formData.description,
      formData.dueDate || null,
      'upcoming'
    );

    db.toggleBookmarkedTask(taskId, true);

    setFormData({ title: '', description: '', dueDate: '' });
    setIsModalOpen(false);
    loadTasks();
  };

  const handleToggleBookmark = (taskId, isBookmarked) => {
    db.toggleBookmarkedTask(taskId, !isBookmarked);
    loadTasks();
  };

  const handleDeleteTask = (taskId) => {
    db.deleteTask(taskId);
    loadTasks();
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-sm">
            <Star size={20} className="text-accent-warning" fill="currentColor" />
            Bookmarked Tasks
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-sm"
          >
            <Plus size={16} /> Add
          </Button>
        </div>

        <div className="space-y-sm max-h-64 overflow-y-auto">
          {bookmarkedTasks.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-lg">No bookmarked tasks yet</p>
          ) : (
            bookmarkedTasks.map(task => (
              <div key={task.id} className="bg-surface-2 rounded-lg p-sm border-l-2 border-accent-warning">
                <div className="flex items-start justify-between gap-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium text-sm">{task.title}</p>
                    {task.due_date && (
                      <p className="text-text-tertiary text-xs mt-1">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-sm flex-shrink-0">
                    <button
                      onClick={() => handleToggleBookmark(task.id, task.is_bookmarked)}
                      className="text-accent-warning hover:text-accent-warning p-xs"
                      aria-label="Remove bookmark"
                    >
                      <Star size={16} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-text-tertiary hover:text-accent-danger p-xs transition-all"
                      aria-label="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Bookmarked Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleAddTask} size="sm">
              Add Task
            </Button>
          </>
        }
      >
        <div className="space-y-md">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">
              Task Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Follow up with Agency X"
              className="w-full bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details..."
              rows="3"
              className="w-full bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-sm">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BookmarkedTasks;
