import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ClipboardList, Search, Pencil, Trash2, X, Check, ChevronDown,
} from 'lucide-react';
import { useStore } from '../../store.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUSES = ['inquiry', 'approved', 'pending', 'done', 'declined'];

const STATUS_STYLES = {
  inquiry:  { pill: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',     dot: '#3b82f6' },
  approved: { pill: 'bg-accent-lime/15 text-accent-lime border-accent-lime/30',     dot: '#00ff88' },
  pending:  { pill: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30', dot: '#ff6b35' },
  done:     { pill: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',     dot: '#00d9ff' },
  declined: { pill: 'bg-accent-pink/15 text-accent-pink border-accent-pink/30',     dot: '#ff006e' },
};

const AVATAR_COLORS = [
  '#00d9ff', '#9d4edd', '#ff006e', '#00ff88', '#ff6b35', '#3b82f6',
];
const creatorColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const fmtDate = (iso) => {
  if (!iso) return null;
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
};

// ── Sub-component: Notes cell ──────────────────────────────────────────────────
const NotesCell = ({ request, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(request.notes || '');
  const taRef                 = useRef(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (request.notes || '')) onSave(request.id, draft);
  };

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setEditing(false); setDraft(request.notes || ''); } }}
        rows={2}
        className="w-full text-xs text-text-primary rounded-lg p-xs resize-none"
        style={{
          minWidth: 140,
          background: '#1d2027',
          border: '1px solid rgba(157,78,221,0.4)',
          outline: 'none',
        }}
        placeholder="Add notes…"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(request.notes || ''); setEditing(true); }}
      title={request.notes || 'Add notes'}
      className="flex items-center gap-xs text-xs text-text-tertiary hover:text-text-primary transition-colors group max-w-[160px]"
    >
      <Pencil size={11} className="shrink-0 group-hover:text-accent-purple transition-colors" />
      {request.notes
        ? <span className="truncate text-text-secondary">{request.notes}</span>
        : <span className="text-text-tertiary/40 italic">Add note…</span>
      }
    </button>
  );
};

// ── Main View ──────────────────────────────────────────────────────────────────
const Requests = () => {
  const agencies              = useStore(s => s.agencies);
  const creators              = useStore(s => s.creators);
  const creatorRequests       = useStore(s => s.creatorRequests);
  const updateCreatorRequestStatus = useStore(s => s.updateCreatorRequestStatus);
  const updateCreatorRequestData   = useStore(s => s.updateCreatorRequestData);
  const deleteCreatorRequest       = useStore(s => s.deleteCreatorRequest);
  const setCurrentView             = useStore(s => s.setCurrentView);

  const [activeTab, setActiveTab] = useState('inquiry');
  const [agencyFilter, setAgencyFilter]   = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [search, setSearch]               = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // request id

  // Filtered list (all statuses — used for counts)
  const baseFiltered = useMemo(() => {
    return creatorRequests.filter(r => {
      if (agencyFilter && String(r.agency_id) !== agencyFilter) return false;
      if (creatorFilter && String(r.creator_id) !== creatorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const creator = creators.find(c => c.id === r.creator_id);
        const inCreator = creator?.stage_name.toLowerCase().includes(q);
        const inFan     = r.fan_name.toLowerCase().includes(q) || r.fan_id?.toLowerCase().includes(q);
        const inDetails = r.details?.toLowerCase().includes(q);
        if (!inCreator && !inFan && !inDetails) return false;
      }
      return true;
    });
  }, [creatorRequests, agencyFilter, creatorFilter, search, creators]);

  const tabCounts = useMemo(() => {
    const counts = {};
    STATUSES.forEach(s => { counts[s] = baseFiltered.filter(r => r.status === s).length; });
    return counts;
  }, [baseFiltered]);

  const visibleRows = useMemo(
    () => baseFiltered.filter(r => r.status === activeTab),
    [baseFiltered, activeTab],
  );

  // Creator options filtered by agency
  const creatorOptions = useMemo(() => {
    return creators.filter(c => !agencyFilter || String(c.agency_id) === agencyFilter);
  }, [creators, agencyFilter]);

  const getCreator = (id) => creators.find(c => c.id === id);

  return (
    <div className="p-xl space-y-lg">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <div
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(157,78,221,0.15)' }}
          >
            <ClipboardList size={18} style={{ color: '#9d4edd' }} />
          </div>
          <h1
            className="text-2xl font-black tracking-tight bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent"
          >
            Requests
          </h1>
        </div>
        <span
          className="text-xs font-bold text-text-tertiary px-md py-xs rounded-full"
          style={{ background: '#2e3545', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {creatorRequests.length} total
        </span>
      </div>

      {/* ── Filters ── */}
      <div
        className="neu-card p-md flex flex-wrap items-center gap-sm"
      >
        {/* Agency select */}
        <div className="relative">
          <select
            value={agencyFilter}
            onChange={e => { setAgencyFilter(e.target.value); setCreatorFilter(''); }}
            className="text-xs text-text-secondary rounded-lg pl-sm pr-lg py-xs appearance-none cursor-pointer"
            style={{
              background: '#1d2027',
              border: '1px solid rgba(255,255,255,0.08)',
              outline: 'none',
              minWidth: 130,
            }}
          >
            <option value="">All Agencies</option>
            {agencies.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-xs top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        </div>

        {/* Creator select */}
        <div className="relative">
          <select
            value={creatorFilter}
            onChange={e => setCreatorFilter(e.target.value)}
            className="text-xs text-text-secondary rounded-lg pl-sm pr-lg py-xs appearance-none cursor-pointer"
            style={{
              background: '#1d2027',
              border: '1px solid rgba(255,255,255,0.08)',
              outline: 'none',
              minWidth: 140,
            }}
          >
            <option value="">All Creators</option>
            {creatorOptions.map(c => <option key={c.id} value={String(c.id)}>{c.stage_name}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-xs top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 160 }}>
          <Search size={12} className="absolute left-sm top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search fan name, creator…"
            className="w-full text-xs text-text-primary rounded-lg pl-[28px] pr-sm py-xs"
            style={{
              background: '#1d2027',
              border: '1px solid rgba(255,255,255,0.08)',
              outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-xs top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex items-center gap-xs flex-wrap">
        {STATUSES.map(s => {
          const isActive = activeTab === s;
          const style    = STATUS_STYLES[s];
          const count    = tabCounts[s];
          return (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`flex items-center gap-xs px-md py-xs rounded-full text-xs font-bold border transition-all capitalize ${
                isActive
                  ? style.pill
                  : 'text-text-tertiary border-white/10 hover:border-white/20 hover:text-text-secondary'
              }`}
              style={isActive ? {} : { background: 'transparent' }}
            >
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ background: isActive ? style.dot : 'rgba(255,255,255,0.2)' }}
              />
              {s}
              <span
                className={`text-[10px] font-black ml-[1px] ${isActive ? 'opacity-80' : 'opacity-50'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      {visibleRows.length === 0 ? (
        <div className="neu-card p-xl flex flex-col items-center gap-md text-center" style={{ minHeight: 200, justifyContent: 'center' }}>
          <ClipboardList size={32} className="text-text-tertiary/30" />
          <div>
            <p className="text-text-secondary font-semibold text-sm">No {activeTab} requests</p>
            <p className="text-text-tertiary text-xs mt-xs">
              {activeTab === 'inquiry'
                ? 'Chatters submit requests from creator cards.'
                : `No requests have been moved to "${activeTab}" yet.`}
            </p>
          </div>
          {activeTab === 'inquiry' && (
            <button
              onClick={() => setCurrentView('creators')}
              className="text-xs font-semibold text-accent-purple hover:text-accent-pink transition-colors mt-xs"
            >
              Go to Creators →
            </button>
          )}
        </div>
      ) : (
        <div className="neu-card overflow-hidden">
          {/* Column headers */}
          <div
            className="grid text-[10px] font-bold uppercase tracking-widest text-text-tertiary px-lg py-sm"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              gridTemplateColumns: '160px 1fr 72px 72px 150px 130px 1fr 36px',
              gap: '0 12px',
            }}
          >
            <span>Creator</span>
            <span>Fan</span>
            <span>Amount</span>
            <span>Duration</span>
            <span>Dates</span>
            <span>Status</span>
            <span>Notes</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {visibleRows.map(r => {
              const creator = getCreator(r.creator_id);
              const color   = creator ? creatorColor(creator.id) : '#ffffff55';
              const earliest = fmtDate(r.earliest_date);
              const latest   = fmtDate(r.latest_date);
              const style    = STATUS_STYLES[r.status] || STATUS_STYLES.inquiry;

              return (
                <div
                  key={r.id}
                  className="grid items-center px-lg py-sm hover:bg-white/[0.02] transition-colors"
                  style={{
                    gridTemplateColumns: '160px 1fr 72px 72px 150px 130px 1fr 36px',
                    gap: '0 12px',
                  }}
                >
                  {/* Creator */}
                  <div className="flex items-center gap-xs min-w-0">
                    <span
                      className="w-[8px] h-[8px] rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 5px ${color}66` }}
                    />
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {creator?.stage_name ?? `Creator #${r.creator_id}`}
                    </span>
                  </div>

                  {/* Fan */}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{r.fan_name}</p>
                    {r.fan_id && (
                      <p className="text-[10px] text-text-tertiary/60 truncate">{r.fan_id}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <span className="text-xs font-mono text-accent-lime tabular-nums">
                    ${(r.amount_paid || 0).toFixed(2)}
                  </span>

                  {/* Duration */}
                  <span className="text-xs text-text-secondary truncate">
                    {r.duration || <span className="text-text-tertiary/40">—</span>}
                  </span>

                  {/* Dates */}
                  <div className="text-[10px] text-text-tertiary">
                    {earliest || latest ? (
                      <span>
                        {earliest && <span>From <strong className="text-text-secondary">{earliest}</strong></span>}
                        {earliest && latest && ' → '}
                        {latest && <span>By <strong className="text-text-secondary">{latest}</strong></span>}
                      </span>
                    ) : (
                      <span className="text-text-tertiary/30">—</span>
                    )}
                  </div>

                  {/* Status select */}
                  <div className="relative">
                    <select
                      value={r.status}
                      onChange={e => updateCreatorRequestStatus(r.id, e.target.value)}
                      className={`w-full text-[11px] font-bold rounded-lg px-sm py-[3px] appearance-none cursor-pointer border capitalize ${style.pill}`}
                      style={{ background: 'transparent', outline: 'none' }}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} style={{ background: '#1d2027', color: '#c8cdd8' }} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <NotesCell
                    request={r}
                    onSave={(id, notes) => updateCreatorRequestData(id, { notes })}
                  />

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(r.id)}
                    className="flex items-center justify-center text-text-tertiary/40 hover:text-accent-pink transition-colors rounded"
                    title="Delete request"
                    style={{ width: 28, height: 28 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Confirm delete modal ── */}
      {confirmDelete !== null && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="relative p-xl rounded-2xl space-y-lg animate-scale-in"
            style={{
              background: '#252b36',
              boxShadow: '10px 10px 20px rgba(0,0,0,0.5), -10px -10px 20px rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              maxWidth: 340,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-text-primary font-bold text-sm">Delete this request?</p>
              <p className="text-text-tertiary text-xs mt-xs">This action cannot be undone.</p>
            </div>
            <div className="flex gap-sm">
              <button
                onClick={() => setConfirmDelete(null)}
                className="neu-btn flex-1 py-sm text-xs font-semibold text-text-secondary rounded-xl transition-all hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteCreatorRequest(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-sm text-xs font-bold rounded-xl transition-all"
                style={{ background: 'rgba(255,0,110,0.15)', color: '#ff006e', border: '1px solid rgba(255,0,110,0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
