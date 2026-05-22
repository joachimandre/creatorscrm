import { useState, useEffect } from 'react';
import { Plus, Building2 } from 'lucide-react';
import TaskCard from '../TaskCard';
import * as db from '../../db/index.js';

const AgencyTodoSection = ({ agencies }) => {
  const [agencyTodos, setAgencyTodos] = useState({});
  const [newTaskInput, setNewTaskInput] = useState({});
  const [expandedAgency, setExpandedAgency] = useState(null);

  useEffect(() => {
    loadAgencyTodos();
  }, [agencies]);

  const loadAgencyTodos = () => {
    try {
      const todos = {};
      agencies.forEach(agency => {
        // Get all creators for this agency
        const creatorIds = db.getCreatorsByAgency(agency.id, true).map(c => c.id);
        // Get tasks for each creator and combine
        let agencyTaskList = [];
        creatorIds.forEach(creatorId => {
          const creatorTasks = db.getTasksForCreator(creatorId);
          agencyTaskList = [...agencyTaskList, ...creatorTasks];
        });
        todos[agency.id] = agencyTaskList;
      });
      setAgencyTodos(todos);
    } catch (error) {
      console.error('Error loading agency todos:', error);
      setAgencyTodos({});
    }
  };

  const handleAddTaskForAgency = (agencyId) => {
    const input = newTaskInput[agencyId]?.trim();
    if (!input) return;

    try {
      const creators = db.getCreatorsByAgency(agencyId, false);
      if (creators.length > 0) {
        db.createTask(creators[0].id, input, '', null, 'upcoming', '');
        setNewTaskInput({ ...newTaskInput, [agencyId]: '' });
        loadAgencyTodos();
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleToggleTask = (taskId, isCompleted) => {
    db.toggleTaskCompletion(taskId, isCompleted);
    loadAgencyTodos();
  };

  const handleUpdateTask = (taskId, updates) => {
    db.updateTask(taskId, updates);
    loadAgencyTodos();
  };

  const handleDeleteTask = (taskId) => {
    db.deleteTask(taskId);
    loadAgencyTodos();
  };

  if (!agencies || agencies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-md">
        <Building2 size={28} className="text-accent-orange" />
        <h2 className="text-2xl font-bold text-text-primary">Agency TODOs</h2>
      </div>

      <div className="space-y-lg">
        {agencies.map(agency => {
          const todos = agencyTodos[agency.id] || [];
          const isExpanded = expandedAgency === agency.id;

          return (
            <div
              key={agency.id}
              className="border border-accent-orange/30 rounded-xl overflow-hidden bg-gradient-to-br from-bg-tertiary to-bg-secondary transition-all duration-300"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedAgency(isExpanded ? null : agency.id)}
                className="w-full p-lg flex items-center justify-between hover:bg-bg-secondary/50 transition-colors group"
              >
                <div className="flex items-center gap-md text-left flex-1">
                  <div className="w-2 h-10 rounded-full bg-gradient-to-b from-accent-orange to-accent-pink" />
                  <div>
                    <h3 className="font-semibold text-text-primary group-hover:text-accent-orange transition-colors">
                      {agency.name}
                    </h3>
                    <p className="text-text-tertiary text-sm">
                      {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                </div>
                <div className="text-accent-orange opacity-60 group-hover:opacity-100 transition-opacity">
                  {isExpanded ? '−' : '+'}
                </div>
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="border-t border-accent-orange/20 p-lg space-y-lg animate-slide-up">
                  {/* Add task input */}
                  <div className="flex gap-sm">
                    <input
                      type="text"
                      value={newTaskInput[agency.id] || ''}
                      onChange={(e) =>
                        setNewTaskInput({ ...newTaskInput, [agency.id]: e.target.value })
                      }
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTaskForAgency(agency.id)}
                      placeholder="Add task..."
                      className="flex-1 bg-bg-secondary/50 border border-accent-orange/30 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-orange transition-all"
                    />
                    <button
                      onClick={() => handleAddTaskForAgency(agency.id)}
                      className="px-lg py-sm bg-gradient-to-r from-accent-orange to-accent-pink text-bg-primary font-semibold rounded-lg hover:shadow-glow-pink transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Tasks grid */}
                  {todos.length === 0 ? (
                    <p className="text-center text-text-tertiary py-lg">No tasks yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                      {todos.map(task => (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgencyTodoSection;
