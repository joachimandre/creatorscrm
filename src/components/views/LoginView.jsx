import { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useStore } from '../../store.js';

const InputField = ({ label, type = 'text', value, onChange, placeholder, showToggle, onToggle, showPassword }) => (
  <div className="space-y-xs">
    <label className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">{label}</label>
    <div className="relative">
      <input
        type={showToggle ? (showPassword ? 'text' : 'password') : type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm text-text-primary rounded-xl px-md py-sm pr-10"
        style={{
          background: '#1d2027',
          border: '1px solid rgba(255,255,255,0.08)',
          outline: 'none',
        }}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-sm top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  </div>
);

const LoginView = () => {
  const [tab, setTab]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [fullName, setFullName]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const signIn = useStore(s => s.signIn);
  const signUp = useStore(s => s.signUp);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!email) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const profile = await signUp(email, password, fullName.trim());
      if (profile && !profile.approved) {
        setSuccess('Account created! Waiting for admin approval.');
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-lg"
      style={{ background: '#1d2027' }}
    >
      {/* Card */}
      <div
        className="w-full space-y-xl"
        style={{
          maxWidth: 400,
          background: '#252b36',
          borderRadius: 24,
          padding: 32,
          boxShadow: '10px 10px 24px rgba(0,0,0,0.45), -10px -10px 24px rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-sm">
          <div
            className="flex items-center justify-center shadow-glow"
            style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #00d9ff, #9d4edd)' }}
          >
            <span className="text-bg-primary font-black text-xl">C</span>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-black text-text-primary">Creator CRM</h1>
            <p className="text-xs text-text-tertiary mt-[2px]">Agency management platform</p>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl p-[3px]"
          style={{ background: '#1d2027', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.35), inset -2px -2px 6px rgba(255,255,255,0.025)' }}
        >
          {[{ id: 'signin', label: 'Sign In' }, { id: 'signup', label: 'Create Account' }].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setSuccess(''); }}
              className="flex-1 py-sm text-xs font-bold rounded-lg transition-all"
              style={{
                background: tab === t.id ? '#252b36' : 'transparent',
                color: tab === t.id ? '#ffffff' : 'rgba(200,205,216,0.5)',
                boxShadow: tab === t.id ? '3px 3px 7px rgba(0,0,0,0.3), -3px -3px 7px rgba(255,255,255,0.03)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={tab === 'signin' ? handleSignIn : handleSignUp} className="space-y-md">
          {tab === 'signup' && (
            <InputField
              label="Full Name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
            />
          )}
          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <InputField
            label="Password"
            showToggle
            value={password}
            onChange={setPassword}
            placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
            showPassword={showPw}
            onToggle={() => setShowPw(v => !v)}
          />
          {tab === 'signup' && (
            <InputField
              label="Confirm Password"
              showToggle
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter password"
              showPassword={showPw}
              onToggle={() => setShowPw(v => !v)}
            />
          )}

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-xs text-xs text-accent-pink bg-accent-pink/10 border border-accent-pink/20 rounded-xl px-md py-sm">
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-xs text-xs text-accent-lime bg-accent-lime/10 border border-accent-lime/20 rounded-xl px-md py-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-md rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-sm"
            style={{
              background: loading ? 'rgba(157,78,221,0.3)' : 'linear-gradient(135deg, #9d4edd, #ff006e)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(157,78,221,0.35)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block',
                }}
              />
            ) : tab === 'signin' ? (
              <><LogIn size={15} /> Sign In</>
            ) : (
              <><UserPlus size={15} /> Create Account</>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>

        {tab === 'signup' && (
          <p className="text-[10px] text-text-tertiary/50 text-center leading-relaxed">
            New accounts require admin approval before you can access the CRM.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginView;
