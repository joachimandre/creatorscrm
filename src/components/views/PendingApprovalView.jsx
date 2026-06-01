import { Clock, LogOut, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store.js';

const PendingApprovalView = ({ blocked = null }) => {
  const userProfile = useStore(s => s.userProfile);
  const authUser    = useStore(s => s.authUser);
  const signOut     = useStore(s => s.signOut);

  // `blocked` is set when the profile read was denied (e.g. an RLS policy error),
  // which is a different situation from a genuinely unapproved account.
  const isBlocked = !!blocked;
  const email     = userProfile?.email || authUser?.email;
  const accent    = isBlocked ? '#ff6b35' : '#9d4edd';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-lg"
      style={{ background: '#1d2027' }}
    >
      <div
        className="w-full text-center space-y-lg"
        style={{
          maxWidth: 380,
          background: '#252b36',
          borderRadius: 24,
          padding: 40,
          boxShadow: '10px 10px 24px rgba(0,0,0,0.45), -10px -10px 24px rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: `${accent}1f`,
              border: `1px solid ${accent}40`,
            }}
          >
            {isBlocked
              ? <AlertTriangle size={28} style={{ color: accent }} />
              : <Clock size={28} style={{ color: accent }} />}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-sm">
          <h1 className="text-lg font-black text-text-primary">
            {isBlocked ? "Couldn't load your profile" : 'Awaiting Approval'}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {isBlocked
              ? 'You are signed in, but the server blocked access to your account profile. This is usually a database security-policy issue — contact your admin.'
              : 'Your account has been created successfully. An admin needs to approve your access before you can use the CRM.'}
          </p>
          {isBlocked && blocked?.message && (
            <p className="text-[11px] font-mono text-text-tertiary/50 mt-sm break-words">
              {blocked.code ? `[${blocked.code}] ` : ''}{blocked.message}
            </p>
          )}
          {email && (
            <p className="text-xs text-text-tertiary/60 mt-sm">
              Signed in as <span className="text-text-secondary font-semibold">{email}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-sm">
          {isBlocked && (
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold px-md py-xs rounded-xl transition-colors"
              style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}40` }}
            >
              Retry
            </button>
          )}
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-xs mx-auto text-xs text-text-tertiary hover:text-accent-pink transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalView;
