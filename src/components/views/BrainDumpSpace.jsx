import { useState, useEffect } from 'react';
import { Brain, Trash2 } from 'lucide-react';
import * as db from '../../db/index.js';

const BrainDumpSpace = () => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const generalNotes = db.getGeneralBrainDump();
    setNotes(generalNotes);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    db.addGeneralNote(newNote.trim());
    setNewNote('');
    loadNotes();
  };

  const handleDeleteNote = (noteId) => {
    db.deleteBrainDumpNote(noteId);
    loadNotes();
  };

  const handleUpdateNote = (noteId, content) => {
    db.updateBrainDumpNote(noteId, content);
  };

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">

      {/* Header */}
      <div className="flex items-center gap-md">
        <Brain size={32} className="text-accent-purple" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent">
          Brain Dump
        </h1>
      </div>

      <div className="max-w-2xl space-y-lg">

        {/* Input card */}
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-lg space-y-md shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <p className="text-text-secondary text-sm">
            Dump all your thoughts, ideas, and reminders here. Sort them later without breaking your workflow.
          </p>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleAddNote();
            }}
            placeholder="Type your thought... (Ctrl+Enter to save)"
            rows={4}
            className="w-full bg-bg-primary/60 border border-white/10 rounded-xl px-lg py-md text-text-primary placeholder-text-tertiary/50 focus:outline-none focus:border-accent-purple/50 resize-none transition-all"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="w-full py-sm bg-gradient-to-r from-accent-purple to-accent-pink text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Save Note
          </button>
        </div>

        {/* Empty state */}
        {notes.length === 0 && (
          <div className="text-center py-2xl border border-dashed border-white/10 rounded-2xl">
            <Brain size={40} className="mx-auto text-text-tertiary/20 mb-md" />
            <p className="text-text-secondary font-semibold">Nothing captured yet</p>
            <p className="text-text-tertiary text-sm mt-xs">Type above and press Ctrl+Enter to save</p>
          </div>
        )}

        {/* Notes list */}
        {notes.length > 0 && (
          <div className="space-y-md">
            {notes.map(note => (
              <div
                key={note.id}
                className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-lg group hover:border-white/18 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <textarea
                  defaultValue={note.content}
                  onBlur={(e) => {
                    if (e.target.value !== note.content) {
                      handleUpdateNote(note.id, e.target.value);
                    }
                  }}
                  className="w-full bg-transparent text-text-primary focus:outline-none resize-none text-sm leading-relaxed"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-sm pt-sm border-t border-white/5">
                  <p className="text-text-tertiary text-xs font-mono">
                    {new Date(note.created_at).toLocaleDateString()} · {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent-pink p-sm rounded-lg hover:bg-accent-pink/10 transition-all"
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default BrainDumpSpace;
