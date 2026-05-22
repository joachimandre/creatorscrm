import { useState } from 'react';
import { Trash2, ExternalLink, Calendar, Edit2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TaskCard = ({ task, onToggle, onDelete, onUpdate, isCompleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    link: task.link || '',
    dueDate: task.due_date || '',
  });

  const handleSave = () => {
    onUpdate?.(task.id, editData);
    setIsEditing(false);
  };

  // Extract URL from description if it looks like a link
  const urlMatch = editData.link?.match(/https?:\/\/[^\s]+/);
  const displayUrl = editData.link || urlMatch?.[0];

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border transition-all duration-300
        ${isCompleted
          ? 'border-accent-lime bg-gradient-to-br from-accent-lime/10 to-bg-tertiary opacity-60'
          : 'border-accent-cyan/30 bg-gradient-to-br from-bg-tertiary to-bg-secondary hover:border-accent-cyan/60 hover:shadow-glow'
        }
        p-lg hover:scale-105 active:scale-95 cursor-pointer animation-scale-in
      `}
    >
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 space-y-md">
        {/* Header with checkbox */}
        <div className="flex items-start gap-md">
          <button
            onClick={() => onToggle(task.id, !isCompleted)}
            className={`
              flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center
              transition-all duration-200 mt-1
              ${isCompleted
                ? 'bg-accent-lime border-accent-lime shadow-glow-lime'
                : 'border-accent-cyan hover:border-accent-lime hover:bg-accent-cyan/10'
              }
            `}
          >
            {isCompleted && <Check size={16} className="text-bg-primary font-bold" />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full bg-bg-secondary/50 border border-accent-cyan/30 rounded-lg px-md py-sm text-text-primary focus:outline-none focus:border-accent-cyan"
              />
            ) : (
              <h3 className={`font-semibold text-base transition-all ${isCompleted ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                {task.title}
              </h3>
            )}
          </div>

          <div className="flex gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-sm hover:bg-accent-blue/20 rounded-lg transition-colors text-accent-blue"
            >
              {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
            </button>
            <button
              onClick={() => onDelete?.(task.id)}
              className="p-sm hover:bg-accent-pink/20 rounded-lg transition-colors text-accent-pink"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Description */}
        {isEditing ? (
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Add description..."
            rows="2"
            className="w-full bg-bg-secondary/50 border border-accent-cyan/30 rounded-lg px-md py-sm text-text-secondary focus:outline-none focus:border-accent-cyan text-sm resize-none"
          />
        ) : (
          editData.description && !isEditing && (
            <p className="text-text-secondary text-sm leading-relaxed">{editData.description}</p>
          )
        )}

        {/* Link section */}
        <div className="space-y-sm">
          {isEditing ? (
            <input
              type="text"
              value={editData.link}
              onChange={(e) => setEditData({ ...editData, link: e.target.value })}
              placeholder="Add link (https://...)"
              className="w-full bg-bg-secondary/50 border border-accent-cyan/30 rounded-lg px-md py-sm text-text-secondary focus:outline-none focus:border-accent-cyan text-sm"
            />
          ) : (
            displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-sm text-accent-cyan hover:text-accent-lime transition-colors text-sm group/link"
              >
                <ExternalLink size={14} />
                <span className="underline group-hover/link:text-accent-lime">{displayUrl.substring(0, 40)}...</span>
              </a>
            )
          )}
        </div>

        {/* Footer with due date */}
        <div className="flex items-center justify-between pt-md border-t border-accent-cyan/10">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                className="bg-bg-secondary/50 border border-accent-cyan/30 rounded-lg px-md py-sm text-text-secondary focus:outline-none focus:border-accent-cyan text-sm"
              />
            ) : (
              editData.dueDate && (
                <div className="flex items-center gap-sm text-text-tertiary text-xs">
                  <Calendar size={14} />
                  <span>{new Date(editData.dueDate).toLocaleDateString()}</span>
                  <span className="text-accent-orange">
                    {formatDistanceToNow(new Date(editData.dueDate), { addSuffix: true })}
                  </span>
                </div>
              )
            )}
          </div>

          {isEditing && (
            <button
              onClick={handleSave}
              className="ml-sm px-md py-sm bg-gradient-to-r from-accent-cyan to-accent-blue text-bg-primary font-semibold rounded-lg hover:shadow-glow transition-all text-sm"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Animated background gradient on hover */}
      {!isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/0 via-accent-cyan/5 to-accent-blue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
      )}
    </div>
  );
};

export default TaskCard;
