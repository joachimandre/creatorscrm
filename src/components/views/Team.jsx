import { useState } from 'react';
import { useStore } from '../../store.js';
import { Users, Plus, Trash2, Pencil, Check, X, MessageSquare } from 'lucide-react';

const AGENCY_COLORS = ['#00d9ff', '#9d4edd', '#ff6b35', '#ff006e', '#00ff88'];

const Team = () => {
  const agencies = useStore(state => state.agencies);
  const chatters = useStore(state => state.chatters);
  const addChatter = useStore(state => state.addChatter);
  const updateChatterData = useStore(state => state.updateChatterData);
  const deleteChatterData = useStore(state => state.deleteChatterData);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChatter, setNewChatter] = useState({ name: '', role: '' });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', role: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const activeAgency = selectedAgency ?? agencies[0]?.id ?? null;
  const agencyColor = AGENCY_COLORS[agencies.findIndex(a => a.id === activeAgency) % AGENCY_COLORS.length] || '#00d9ff';
  const agencyChatters = chatters.filter(c => c.agency_id === activeAgency);

  const handleAdd = () => {
    if (!newChatter.name.trim() || !activeAgency) return;
    addChatter(activeAgency, newChatter.name.trim(), newChatter.role.trim());
    setNewChatter({ name: '', role: '' });
    setShowAddForm(false);
  };

  const startEdit = (chatter) => {
    setEditingId(chatter.id);
    setEditValues({ name: chatter.name, role: chatter.role || '' });
  };

  const commitEdit = () => {
    if (!editValues.name.trim()) { setEditingId(null); return; }
    updateChatterData(editingId, editValues.name.trim(), editValues.role.trim(), '');
    setEditingId(null);
  };

  return (
    <div className="p-lg bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary h-full overflow-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <Users size={32} className="text-accent-orange" />
        <h1 className="text-3xl font-bold text-text-primary">Team</h1>
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap">
        {agencies.map((agency, idx) => {
          const color = AGENCY_COLORS[idx % AGENCY_COLORS.length];
          const isActive = agency.id === activeAgency;
          const count = chatters.filter(c => c.agency_id === agency.id).length;
          return (
            <button
              key={agency.id}
              onClick={() => { setSelectedAgency(agency.id); setShowAddForm(false); }}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? 'text-bg-primary shadow-lg'
                  : 'bg-white/5 text-text-secondary border-white/10 hover:text-text-primary hover:bg-white/10'
              }`}
              style={isActive ? { background: color, borderColor: color } : {}}
            >
              {agency.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
                {count}
              </span>
            </button>
          );
        })}
        {agencies.length === 0 && (
          <p className="text-text-tertiary text-sm">No agencies yet — add one from the Dashboard.</p>
        )}
      </div>

      {activeAgency && (
        <>
          {/* Agency header + add button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {agencies.find(a => a.id === activeAgency)?.name} — Chatters
              </h2>
              <p className="text-text-tertiary text-sm mt-xs">
                {agencyChatters.length} {agencyChatters.length === 1 ? 'chatter' : 'chatters'} on this team
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold border border-white/10 hover:border-accent-orange/40 text-text-secondary hover:text-accent-orange transition-all"
            >
              <Plus size={16} />
              Add Chatter
            </button>
          </div>

          {/* Add chatter form */}
          {showAddForm && (
            <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-lg animate-slide-up">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-md">New Chatter</h3>
              <div className="flex items-end gap-md flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-text-tertiary mb-xs">Name *</label>
                  <input
                    type="text"
                    value={newChatter.name}
                    onChange={e => setNewChatter(n => ({ ...n, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Chatter name"
                    autoFocus
                    className="w-full bg-bg-primary/50 border border-white/10 rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-orange/60 transition-all"
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-xs text-text-tertiary mb-xs">Role (optional)</label>
                  <input
                    type="text"
                    value={newChatter.role}
                    onChange={e => setNewChatter(n => ({ ...n, role: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="e.g. Lead Chatter, Night Shift"
                    className="w-full bg-bg-primary/50 border border-white/10 rounded-lg px-md py-sm text-text-primary text-sm focus:outline-none focus:border-accent-orange/60 transition-all"
                  />
                </div>
                <div className="flex gap-sm">
                  <button
                    onClick={handleAdd}
                    disabled={!newChatter.name.trim()}
                    className="px-lg py-sm bg-accent-orange/80 hover:bg-accent-orange text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-md py-sm border border-white/10 rounded-lg text-sm text-text-tertiary hover:text-text-primary transition-colors">✕</button>
                </div>
              </div>
            </div>
          )}

          {/* Chatter grid */}
          {agencyChatters.length === 0 ? (
            <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
              <MessageSquare size={40} className="mx-auto text-text-tertiary/30 mb-md" />
              <p className="text-text-tertiary">No chatters yet for this agency</p>
              <p className="text-text-tertiary/50 text-sm mt-xs">Click "Add Chatter" to build your team</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
              {agencyChatters.map(chatter => {
                const isEditing = editingId === chatter.id;
                const initials = chatter.name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={chatter.id}
                    className="group bg-gradient-to-br from-bg-tertiary to-bg-secondary border border-white/10 rounded-xl p-lg hover:border-white/20 transition-all"
                    style={{ borderLeftColor: agencyColor, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start gap-md">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${agencyColor}40, ${agencyColor}20)` }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-xs">
                            <input
                              type="text"
                              value={editValues.name}
                              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              autoFocus
                              className="w-full bg-bg-primary border border-accent-orange/40 rounded px-sm py-xs text-text-primary text-sm focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editValues.role}
                              onChange={e => setEditValues(v => ({ ...v, role: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              placeholder="Role"
                              className="w-full bg-bg-primary border border-white/10 rounded px-sm py-xs text-text-secondary text-xs focus:outline-none"
                            />
                            <div className="flex gap-xs">
                              <button onClick={commitEdit} className="flex items-center gap-xs px-sm py-xs bg-accent-lime/20 text-accent-lime rounded text-xs hover:bg-accent-lime/30 transition-colors">
                                <Check size={10} /> Save
                              </button>
                              <button onClick={() => setEditingId(null)} className="px-sm py-xs border border-white/10 text-text-tertiary rounded text-xs hover:text-text-primary transition-colors">
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-text-primary text-sm truncate">{chatter.name}</p>
                            <p className="text-xs text-text-tertiary mt-xs">{chatter.role || 'Chatter'}</p>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(chatter)} className="p-xs text-text-tertiary hover:text-accent-cyan rounded transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete(chatter)} className="p-xs text-text-tertiary hover:text-accent-pink rounded transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Remove Chatter?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              Remove <span className="text-accent-pink font-semibold">"{confirmDelete.name}"</span> from the team?
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-lg py-sm border border-white/10 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={() => { deleteChatterData(confirmDelete.id); setConfirmDelete(null); }} className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
