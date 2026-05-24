import { Clock, LogOut } from 'lucide-react';
import { useStore } from '../../store.js';

const PendingApprovalView = () => {
  const userProfile = useStore(s => s.userProfile);
  const signOut     = useStore(s => s.signOut);

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
              background: 'rgba(157,78,221,0.12)',
              border: '1px solid rgba(157,78,221,0.25)',
            }}
          >
            <Clock size={28} style={{ color: '#9d4edd' }} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-sm">
          <h1 className="text-lg font-black text-text-primary">Awaiting Approval</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your account has been created successfully. An admin needs to approve your access before you can use the CRM.
          </p>
          {userProfile?.email && (
            <p className="text-xs text-text-tertiary/60 mt-sm">
              Signed in as <span className="text-text-secondary font-semibold">{userProfile.email}</span>
            </p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-xs mx-auto text-xs text-text-tertiary hover:text-accent-pink transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalView;
