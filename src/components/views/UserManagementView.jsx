import { useEffect, useState, useMemo } from 'react';
import { ShieldCheck, Clock, Check, X, ChevronDown, Trash2, UserCheck, Users } from 'lucide-react';
import { useStore } from '../../store.js';

const ROLES = ['admin', 'manager', 'chatter', 'viewer'];

const ROLE_STYLES = {
  admin:   { pill: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30' },
  manager: { pill: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30' },
  chatter: { pill: 'bg-accent-lime/15 text-accent-lime border-accent-lime/30' },
  viewer:  { pill: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30' },
};

// ── Approve modal ─────────────────────────────────────────────────────────────
const ApproveModal = ({ user, chatters, onConfirm, onClose }) => {
  const [role, setRole]           = useState('chatter');
  const [chatterId, setChatterId] = useState('');

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative p-xl rounded-2xl space-y-lg animate-scale-in"
        style={{
          background: '#252b36',
          boxShadow: '10px 10px 20px rgba(0,0,0,0.5), -10px -10px 20px rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          maxWidth: 360, width: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="text-text-primary font-bold text-sm">Approve Account</p>
          <p className="text-text-tertiary text-xs mt-[3px]">{user.email}</p>
        </div>

        {/* Role select */}
        <div className="space-y-xs">
          <label className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">Role</label>
          <div className="relative">
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full text-sm text-text-primary rounded-xl px-md py-sm appearance-none capitalize"
              style={{ background: '#1d2027', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            >
              {ROLES.map(r => <option key={r} value={r} style={{ background: '#1d2027' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-sm top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Link to chatter record (for chatter role) */}
        {role === 'chatter' && (
          <div className="space-y-xs">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">Link to Chatter Profile <span className="normal-case font-normal text-text-tertiary/50">(optional)</span></label>
            <div className="relative">
              <select
                value={chatterId}
                onChange={e => setChatterId(e.target.value)}
                className="w-full text-sm text-text-secondary rounded-xl px-md py-sm appearance-none"
                style={{ background: '#1d2027', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
              >
                <option value="">No link</option>
                {chatters.map(c => <option key={c.id} value={String(c.id)} style={{ background: '#1d2027' }}>{c.name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-sm top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            </div>
            <p className="text-[10px] text-text-tertiary/50">Links this account to a chatter record for schedule and creator filtering.</p>
          </div>
        )}

        <div className="flex gap-sm">
          <button
            onClick={onClose}
            className="neu-btn flex-1 py-sm text-xs font-semibold text-text-secondary rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(user.id, role, chatterId ? parseInt(chatterId, 10) : null)}
            className="flex-1 py-sm text-xs font-bold rounded-xl flex items-center justify-center gap-xs"
            style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' }}
          >
            <UserCheck size={13} /> Approve
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
const UserManagementView = () => {
  const userProfiles     = useStore(s => s.userProfiles);
  const chatters         = useStore(s => s.chatters);
  const loadUserProfiles = useStore(s => s.loadUserProfiles);
  const approveUser      = useStore(s => s.approveUser);
  const rejectUser       = useStore(s => s.rejectUser);
  const updateUserRole   = useStore(s => s.updateUserRole);
  const currentUser      = useStore(s => s.userProfile);

  const [activeTab, setActiveTab]   = useState('pending');
  const [approveModal, setApproveModal] = useState(null); // profile object
  const [confirmReject, setConfirmReject] = useState(null); // userId

  useEffect(() => { loadUserProfiles(); }, [loadUserProfiles]);

  const pending = useMemo(() => userProfiles.filter(p => !p.approved), [userProfiles]);
  const active  = useMemo(() => userProfiles.filter(p => p.approved), [userProfiles]);

  const handleApprove = async (userId, role, chatterId) => {
    await approveUser(userId, role, chatterId);
    setApproveModal(null);
  };

  const handleReject = async (userId) => {
    await rejectUser(userId);
    setConfirmReject(null);
  };

  const rows = activeTab === 'pending' ? pending : active;

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-xl space-y-lg">

      {/* Header */}
      <div className="flex items-center gap-md">
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(157,78,221,0.15)' }}
        >
          <ShieldCheck size={18} style={{ color: '#9d4edd' }} />
        </div>
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent">
          User Management
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-xs">
        {[
          { id: 'pending', label: 'Pending Approval', count: pending.length, color: '#ff6b35' },
          { id: 'active',  label: 'Active Users',     count: active.length,  color: '#00ff88' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-xs px-md py-xs rounded-full text-xs font-bold border transition-all"
            style={activeTab === t.id
              ? { background: t.color + '18', color: t.color, border: `1px solid ${t.color}40` }
              : { background: 'transparent', color: 'rgba(200,205,216,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: activeTab === t.id ? t.color : 'rgba(255,255,255,0.2)' }}
            />
            {t.label}
            <span className="text-[10px] font-black ml-[1px] opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="neu-card p-xl flex flex-col items-center gap-md text-center" style={{ minHeight: 180, justifyContent: 'center' }}>
          <Users size={28} className="text-text-tertiary/30" />
          <p className="text-text-secondary font-semibold text-sm">
            {activeTab === 'pending' ? 'No pending accounts' : 'No active users yet'}
          </p>
          <p className="text-text-tertiary text-xs">
            {activeTab === 'pending'
              ? 'New accounts created by your team will appear here.'
              : 'Approved accounts will appear here.'}
          </p>
        </div>
      ) : (
        <div className="neu-card overflow-hidden">
          {/* Column headers */}
          <div
            className="grid text-[10px] font-bold uppercase tracking-widest text-text-tertiary px-lg py-sm"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', gridTemplateColumns: '1fr 1fr 100px 110px 80px', gap: '0 12px' }}
          >
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span />
          </div>

          <div className="divide-y divide-white/[0.04]">
            {rows.map(profile => {
              const isSelf = profile.id === currentUser?.id;
              const style  = ROLE_STYLES[profile.role] || ROLE_STYLES.viewer;
              return (
                <div
                  key={profile.id}
                  className="grid items-center px-lg py-sm hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: '1fr 1fr 100px 110px 80px', gap: '0 12px' }}
                >
                  {/* Name */}
                  <div className="flex items-center gap-xs min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: 'rgba(157,78,221,0.15)', color: '#9d4edd' }}
                    >
                      {(profile.full_name || profile.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {profile.full_name || '—'}
                      {isSelf && <span className="ml-xs text-[9px] text-accent-purple/60 font-normal">(you)</span>}
                    </span>
                  </div>

                  {/* Email */}
                  <span className="text-xs text-text-tertiary truncate">{profile.email}</span>

                  {/* Role */}
                  {activeTab === 'active' && !isSelf ? (
                    <div className="relative">
                      <select
                        value={profile.role}
                        onChange={e => updateUserRole(profile.id, e.target.value)}
                        className={`text-[11px] font-bold rounded-lg px-sm py-[3px] appearance-none cursor-pointer border capitalize w-full ${style.pill}`}
                        style={{ background: 'transparent', outline: 'none' }}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r} style={{ background: '#1d2027', color: '#c8cdd8' }} className="capitalize">{r}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className={`text-[11px] font-bold px-sm py-[3px] rounded-lg border capitalize inline-block w-fit ${style.pill}`}>
                      {profile.role}
                    </span>
                  )}

                  {/* Joined */}
                  <span className="text-[10px] text-text-tertiary">{fmtDate(profile.created_at)}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-xs justify-end">
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => setApproveModal(profile)}
                        className="flex items-center gap-xs text-[11px] font-bold px-sm py-[3px] rounded-lg transition-all"
                        style={{ background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}
                        title="Approve"
                      >
                        <Check size={11} /> Approve
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        onClick={() => setConfirmReject(profile.id)}
                        className="flex items-center justify-center text-text-tertiary/40 hover:text-accent-pink transition-colors rounded"
                        title={activeTab === 'pending' ? 'Reject' : 'Remove user'}
                        style={{ width: 26, height: 26 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveModal && (
        <ApproveModal
          user={approveModal}
          chatters={chatters}
          onConfirm={handleApprove}
          onClose={() => setApproveModal(null)}
        />
      )}

      {/* Confirm reject/remove */}
      {confirmReject && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setConfirmReject(null)}
        >
          <div
            className="relative p-xl rounded-2xl space-y-lg animate-scale-in"
            style={{
              background: '#252b36',
              boxShadow: '10px 10px 20px rgba(0,0,0,0.5), -10px -10px 20px rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              maxWidth: 320, width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-text-primary font-bold text-sm">Remove this user?</p>
              <p className="text-text-tertiary text-xs mt-xs">Their account data will be deleted. They can re-register if needed.</p>
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setConfirmReject(null)} className="neu-btn flex-1 py-sm text-xs font-semibold text-text-secondary rounded-xl">Cancel</button>
              <button
                onClick={() => handleReject(confirmReject)}
                className="flex-1 py-sm text-xs font-bold rounded-xl"
                style={{ background: 'rgba(255,0,110,0.15)', color: '#ff006e', border: '1px solid rgba(255,0,110,0.3)' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
