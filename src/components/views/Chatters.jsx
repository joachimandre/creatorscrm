import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import * as db from '../../db/index.js';
import {
  MessageSquare, ExternalLink, Pencil, X, Check, Plus, Trash2,
  Search, Link2, Clock, DollarSign,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-accent-lime/20',   text: 'text-accent-lime',   hex: '#00ff88' },
  { bg: 'bg-accent-cyan/20',   text: 'text-accent-cyan',   hex: '#00d9ff' },
  { bg: 'bg-accent-orange/20', text: 'text-accent-orange', hex: '#ff6b35' },
  { bg: 'bg-accent-purple/20', text: 'text-accent-purple', hex: '#9d4edd' },
  { bg: 'bg-accent-pink/20',   text: 'text-accent-pink',   hex: '#ff006e' },
  { bg: 'bg-accent-blue/20',   text: 'text-accent-blue',   hex: '#3b82f6' },
];

const TEAM_COLOR_HEX = {
  'accent-cyan':   '#00d9ff',
  'accent-lime':   '#00ff88',
  'accent-purple': '#9d4edd',
  'accent-pink':   '#ff006e',
  'accent-orange': '#ff6b35',
  'accent-blue':   '#3b82f6',
};

const avatarColor = (chatter) => AVATAR_COLORS[chatter.id % AVATAR_COLORS.length];

const fmt$ = (n) =>
  `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${MONTH_SHORT[parseInt(m) - 1]} ${parseInt(d)}`;
};

// ── Main Component ─────────────────────────────────────────────────────────────
const Chatters = () => {
  const agencies          = useStore(s => s.agencies);
  const chatters          = useStore(s => s.chatters);
  const teams             = useStore(s => s.teams);
  const teamChatters      = useStore(s => s.teamChatters);
  const addChatter        = useStore(s => s.addChatter);
  const updateChatterData = useStore(s => s.updateChatterData);
  const deleteChatterData = useStore(s => s.deleteChatterData);

  const [selectedAgency, setSelectedAgency] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [editingId,      setEditingId]      = useState(null);
  const [editForm,       setEditForm]       = useState({});
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [newChatter,     setNewChatter]     = useState({ name: '', role: '', commissionRate: '', hourlyRate: '', driveUrl: '' });
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [payrollData,    setPayrollData]    = useState({});
  const [shiftCounts,    setShiftCounts]    = useState({});

  const activeAgency = selectedAgency ?? agencies[0]?.id ?? null;

  // ── Load payroll + shift data ─────────────────────────────────────────────
  useEffect(() => {
    const rawDb = db.getDB();
    if (!rawDb) return;

    // Current week Mon–Sun
    const today = new Date();
    const dow = today.getDay();
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysFromMon);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartIso = weekStart.toISOString().split('T')[0];
    const weekEndIso   = weekEnd.toISOString().split('T')[0];

    const newPayroll = {};
    const newShifts  = {};

    chatters.forEach(chatter => {
      // Most recent payroll period
      const records = rawDb.payroll_records.filter(
        r => r.person_type === 'chatter' && r.person_id === chatter.id
      );
      if (records.length > 0) {
        const sorted = [...records].sort((a, b) => b.period_start.localeCompare(a.period_start));
        const latest = sorted[0];
        const periodRecs = records.filter(r => r.period_start === latest.period_start);
        newPayroll[chatter.id] = {
          total: periodRecs.reduce((s, r) => s + r.net_pay, 0),
          periodStart: latest.period_start,
          periodEnd:   latest.period_end,
        };
      }
      // Shifts this week
      const shifts = rawDb.team_schedules.filter(
        s => s.chatter_id === chatter.id && s.date >= weekStartIso && s.date <= weekEndIso
      );
      newShifts[chatter.id] = shifts.length;
    });

    setPayrollData(newPayroll);
    setShiftCounts(newShifts);
  }, [chatters]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') { setEditingId(null); setShowAddModal(false); setConfirmDelete(null); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getChatterTeam = (chatterId) => {
    const member = teamChatters.find(m => m.chatter_id === chatterId);
    if (!member) return null;
    return teams.find(t => t.id === member.team_id) || null;
  };

  const openEdit = (chatter) => {
    setEditingId(chatter.id);
    setEditForm({
      name:           chatter.name,
      role:           chatter.role || '',
      commissionRate: String(chatter.commission_rate || ''),
      hourlyRate:     String(chatter.hourly_rate || ''),
      driveUrl:       chatter.drive_url || '',
      notes:          chatter.notes || '',
    });
  };

  const saveEdit = (chatter) => {
    updateChatterData(
      chatter.id,
      editForm.name.trim() || chatter.name,
      editForm.role.trim(),
      editForm.notes,
      parseFloat(editForm.commissionRate) || 0,
      parseFloat(editForm.hourlyRate)     || 0,
      editForm.driveUrl.trim(),
    );
    setEditingId(null);
  };

  const handleAddChatter = () => {
    if (!newChatter.name.trim() || !activeAgency) return;
    addChatter(
      activeAgency,
      newChatter.name.trim(),
      newChatter.role.trim(),
      '',
      parseFloat(newChatter.commissionRate) || 0,
      parseFloat(newChatter.hourlyRate)     || 0,
      newChatter.driveUrl.trim(),
    );
    setNewChatter({ name: '', role: '', commissionRate: '', hourlyRate: '', driveUrl: '' });
    setShowAddModal(false);
  };

  const agencyChatters = chatters
    .filter(c => c.agency_id === activeAgency)
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── Card render ───────────────────────────────────────────────────────────
  const renderCard = (chatter) => {
    const av       = avatarColor(chatter);
    const team     = getChatterTeam(chatter.id);
    const teamHex  = team ? (TEAM_COLOR_HEX[team.color] || '#888') : null;
    const hasDrive = !!chatter.drive_url;
    const isEditing = editingId === chatter.id;
    const payroll  = payrollData[chatter.id];
    const shifts   = shiftCounts[chatter.id] || 0;

    return (
      <div key={chatter.id}
        className="relative group flex flex-col neu-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-[1px]">

        {/* Colored top strip */}
        <div className="h-[2px]" style={{ backgroundColor: teamHex || av.hex }} />

        <div className="p-lg flex flex-col gap-md flex-1">

          {/* Team badge + Drive icon */}
          <div className="flex items-center justify-between gap-sm">
            {team ? (
              <div className="flex items-center gap-xs">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: teamHex }} />
                <span className="text-[11px] font-semibold text-text-tertiary/80">{team.name}</span>
              </div>
            ) : (
              <span className="text-[11px] text-text-tertiary/40 italic">No Team</span>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                if (hasDrive) window.open(chatter.drive_url, '_blank', 'noopener,noreferrer');
                else openEdit(chatter);
              }}
              title={hasDrive ? 'Open Google Drive' : 'Add Drive link (click to edit)'}
              className={`flex items-center gap-xs p-xs rounded-lg transition-all
                ${hasDrive
                  ? 'text-accent-cyan hover:bg-accent-cyan/10 hover:text-accent-cyan'
                  : 'text-text-tertiary/25 hover:text-text-tertiary/60 hover:bg-white/5'
                }`}>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Avatar + name row */}
          <div className="flex items-center gap-md">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${av.bg} ${av.text}`}>
              {chatter.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{chatter.name}</p>
              <div className="flex items-center gap-sm mt-[2px] flex-wrap">
                {chatter.role && (
                  <span className="text-xs text-text-tertiary/70 truncate">{chatter.role}</span>
                )}
                <span className="text-xs px-1.5 py-[1px] rounded-full font-semibold border bg-accent-lime/10 border-accent-lime/25 text-accent-lime/80">
                  ● Active
                </span>
              </div>
            </div>
          </div>

          {/* Rates row */}
          <div className="flex items-center gap-md text-[11px] border border-white/6 rounded-lg px-md py-xs bg-white/[0.02]">
            {chatter.hourly_rate > 0 ? (
              <span className="flex items-center gap-xs text-text-secondary">
                <Clock size={10} className="text-accent-cyan/60" />
                ${chatter.hourly_rate}/hr
              </span>
            ) : null}
            {chatter.hourly_rate > 0 && chatter.commission_rate > 0 && (
              <span className="text-text-tertiary/30">|</span>
            )}
            {chatter.commission_rate > 0 ? (
              <span className="flex items-center gap-xs text-text-secondary">
                <DollarSign size={10} className="text-accent-lime/60" />
                {chatter.commission_rate}% comm
              </span>
            ) : null}
            {!chatter.hourly_rate && !chatter.commission_rate && (
              <span className="text-text-tertiary/30">No rates set</span>
            )}
          </div>

          {/* Payroll + Shifts */}
          <div className="space-y-xs pt-xs border-t border-white/5">
            {payroll ? (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-tertiary/60">Last Payroll</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-text-primary">{fmt$(payroll.total)}</span>
                  <span className="text-text-tertiary/40 text-xs ml-xs">
                    {fmtDate(payroll.periodStart)}–{fmtDate(payroll.periodEnd)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-text-tertiary/30 italic">No payroll records yet</div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-tertiary/60">Shifts this week</span>
              <span className={`font-bold ${shifts > 0 ? 'text-accent-lime' : 'text-text-tertiary/40'}`}>
                {shifts > 0 ? `${shifts} assigned` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit panel */}
        {isEditing && (
          <div className="border-t border-white/[0.06] bg-bg-primary p-lg space-y-md animate-fade-in"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Edit Chatter</p>
              <button onClick={() => setEditingId(null)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-xs">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Name</label>
                <input type="text" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Role</label>
                <input type="text" value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Senior Chatter"
                  className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all placeholder-text-tertiary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-xs">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Hourly Rate $</label>
                <input type="number" value={editForm.hourlyRate} min="0"
                  onChange={e => setEditForm(f => ({ ...f, hourlyRate: e.target.value }))}
                  className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Commission %</label>
                <input type="number" value={editForm.commissionRate} min="0" max="100"
                  onChange={e => setEditForm(f => ({ ...f, commissionRate: e.target.value }))}
                  className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-tertiary mb-xs flex items-center gap-xs">
                <Link2 size={10} /> Google Drive URL
              </label>
              <input type="url" value={editForm.driveUrl}
                onChange={e => setEditForm(f => ({ ...f, driveUrl: e.target.value }))}
                placeholder="https://drive.google.com/…"
                className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all placeholder-text-tertiary/30"
              />
            </div>

            <div>
              <label className="text-xs text-text-tertiary mb-xs block">Notes</label>
              <textarea value={editForm.notes} rows={2}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes…"
                className="w-full rounded-lg px-sm py-xs text-text-primary text-xs focus:outline-none transition-all resize-none placeholder-text-tertiary/30"
              />
            </div>

            <div className="flex gap-sm">
              <button onClick={() => saveEdit(chatter)}
                className="flex-1 py-xs bg-accent-lime/80 hover:bg-accent-lime text-bg-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-xs">
                <Check size={11} /> Save
              </button>
              <button onClick={() => setConfirmDelete(chatter)}
                className="px-md py-xs border border-accent-pink/20 text-accent-pink/60 hover:bg-accent-pink/10 hover:text-accent-pink text-xs rounded-lg transition-all">
                <Trash2 size={11} />
              </button>
              <button onClick={() => setEditingId(null)}
                className="px-md py-xs neu-btn text-text-tertiary text-xs hover:text-text-primary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Hover edit button */}
        {!isEditing && (
          <button
            onClick={e => { e.stopPropagation(); openEdit(chatter); }}
            className="absolute bottom-md right-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-xs px-sm py-[4px] bg-bg-secondary/90 border border-white/15 rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:border-white/25 shadow-lg">
            <Pencil size={10} /> Edit
          </button>
        )}
      </div>
    );
  };

  // ── Page render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-lg h-full overflow-auto space-y-lg">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <MessageSquare size={32} className="text-accent-lime" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-lime to-accent-cyan bg-clip-text text-transparent">Chatters</h1>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary border-transparent shadow-glow hover:opacity-90 transition-all">
          <Plus size={16} /> New Chatter
        </button>
      </div>

      {/* Agency tabs */}
      <div className="flex items-center gap-sm flex-wrap">
        {agencies.map(agency => {
          const isActive = agency.id === activeAgency;
          const count = chatters.filter(c => c.agency_id === agency.id).length;
          return (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`flex items-center gap-sm px-lg py-sm rounded-xl text-sm font-semibold transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary border-transparent shadow-glow'
                  : 'neu-btn text-text-secondary hover:text-text-primary'
              }`}>
              {agency.name}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-bg-primary' : 'bg-white/10'}`}>
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
          {/* Search */}
          <div className="relative max-w-xs">
            <Search size={13} className="absolute left-md top-1/2 -translate-y-1/2 text-text-tertiary/50 pointer-events-none" />
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chatters…"
              className="w-full rounded-xl pl-[34px] pr-md py-sm text-sm text-text-primary placeholder-text-tertiary/40 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-sm top-1/2 -translate-y-1/2 text-text-tertiary/50 hover:text-text-primary transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Cards grid */}
          {agencyChatters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg animate-fade-in">
              {agencyChatters.map(renderCard)}
            </div>
          ) : (
            <div className="text-center py-2xl border border-dashed border-white/10 rounded-xl">
              <MessageSquare size={40} className="mx-auto text-text-tertiary/25 mb-md" />
              <p className="text-text-tertiary">
                {searchQuery ? `No chatters match "${searchQuery}"` : 'No chatters for this agency'}
              </p>
              {!searchQuery && (
                <button onClick={() => setShowAddModal(true)}
                  className="mt-md text-accent-lime hover:underline text-sm">
                  Add your first chatter
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Chatter Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-secondary border border-white/15 rounded-2xl p-xl shadow-2xl w-full max-w-md mx-lg animate-scale-in space-y-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-sm">
                <MessageSquare size={18} className="text-accent-lime" /> New Chatter
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Name *</label>
                <input type="text" value={newChatter.name} autoFocus
                  onChange={e => setNewChatter(c => ({ ...c, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChatter(); }}
                  placeholder="Full name…"
                  className="w-full rounded-xl px-md py-sm text-text-primary text-sm focus:outline-none placeholder-text-tertiary/40 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Role</label>
                <input type="text" value={newChatter.role}
                  onChange={e => setNewChatter(c => ({ ...c, role: e.target.value }))}
                  placeholder="e.g. Senior Chatter"
                  className="w-full rounded-xl px-md py-sm text-text-primary text-sm focus:outline-none placeholder-text-tertiary/40 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Hourly Rate $</label>
                <input type="number" value={newChatter.hourlyRate} min="0"
                  onChange={e => setNewChatter(c => ({ ...c, hourlyRate: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl px-sm py-sm text-text-primary text-sm focus:outline-none placeholder-text-tertiary/40 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-xs block">Commission %</label>
                <input type="number" value={newChatter.commissionRate} min="0" max="100"
                  onChange={e => setNewChatter(c => ({ ...c, commissionRate: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl px-sm py-sm text-text-primary text-sm focus:outline-none placeholder-text-tertiary/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-tertiary mb-xs flex items-center gap-xs">
                <Link2 size={10} /> Google Drive URL
              </label>
              <input type="url" value={newChatter.driveUrl}
                onChange={e => setNewChatter(c => ({ ...c, driveUrl: e.target.value }))}
                placeholder="https://drive.google.com/… (optional)"
                className="w-full rounded-xl px-md py-sm text-text-primary text-sm focus:outline-none placeholder-text-tertiary/40 transition-all"
              />
            </div>

            <div className="flex gap-sm pt-xs">
              <button onClick={handleAddChatter} disabled={!newChatter.name.trim()}
                className="flex-1 py-sm bg-gradient-to-r from-accent-lime to-accent-cyan text-bg-primary font-bold rounded-xl text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-sm">
                <Plus size={14} /> Add Chatter
              </button>
              <button onClick={() => setShowAddModal(false)}
                className="px-xl py-sm neu-btn text-text-secondary text-sm hover:text-text-primary transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-bg-secondary border border-accent-pink/30 rounded-xl p-xl shadow-2xl max-w-sm w-full mx-lg animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-sm">Delete Chatter?</h3>
            <p className="text-text-secondary text-sm mb-lg">
              Permanently delete <span className="text-accent-pink font-semibold">"{confirmDelete.name}"</span>?
              Schedule and payroll entries tied to this chatter will be orphaned. This cannot be undone.
            </p>
            <div className="flex gap-md justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-lg py-sm neu-btn text-sm text-text-secondary hover:text-text-primary transition-colors">
                Cancel
              </button>
              <button onClick={() => { deleteChatterData(confirmDelete.id); setConfirmDelete(null); setEditingId(null); }}
                className="px-lg py-sm bg-accent-pink/80 hover:bg-accent-pink text-white font-semibold rounded-lg text-sm transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatters;
