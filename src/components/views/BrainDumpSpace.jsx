import { useState, useEffect } from 'react';
import { Brain, Trash2 } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
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
    <div className="p-lg bg-surface-0 h-full overflow-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-lg flex items-center gap-md">
        <Brain size={32} />
        Personal Brain Dump
      </h1>

      <div className="max-w-2xl space-y-lg">
        {/* Quick note input */}
        <Card>
          <div className="space-y-md">
            <p className="text-text-secondary text-sm">Dump all your thoughts, ideas, and reminders here. Sort them later without breaking your workflow.</p>
            <div className="space-y-sm">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleAddNote();
                  }
                }}
                placeholder="Type your thought... (Ctrl+Enter to save)"
                rows="4"
                className="w-full bg-surface-0 border border-surface-2 rounded-lg px-lg py-sm text-text-primary placeholder-text-tertiary focus:border-accent-primary focus:outline-none resize-none"
              />
              <Button onClick={handleAddNote} className="w-full">
                Save Note
              </Button>
            </div>
          </div>
        </Card>

        {/* Notes list */}
        <div className="space-y-lg">
          {notes.length === 0 ? (
            <Card className="text-center py-xl">
              <p className="text-text-tertiary text-base">No notes yet. Start capturing your thoughts!</p>
            </Card>
          ) : (
            notes.map(note => (
              <Card key={note.id} className="relative">
                <div className="space-y-md">
                  <textarea
                    defaultValue={note.content}
                    onBlur={(e) => {
                      if (e.target.value !== note.content) {
                        handleUpdateNote(note.id, e.target.value);
                      }
                    }}
                    className="w-full bg-surface-1 text-text-primary placeholder-text-tertiary focus:outline-none resize-none text-base"
                    rows="3"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-text-tertiary text-xs">
                      {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-text-tertiary hover:text-accent-danger p-xs transition-all"
                      aria-label="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BrainDumpSpace;
