import { useState } from 'react';

// This is a placeholder — the full LoginScreen component from the prototype
// will be migrated here. For now it provides basic sign-in functionality.

export default function LoginScreen({ auth, teamBranding }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('coach');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('signin');   // 'signin' | 'reset'
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    const { error } = await auth.signIn(email, password, role);
    if (error) setError(error.message);
  };

  const handleSendReset = async () => {
    setError(null);
    if (!email.trim()) { setError('Enter your email first.'); return; }
    setBusy(true);
    const { ok, error } = await auth.resetPassword(email);
    setBusy(false);
    if (ok) setResetSent(true);
    else setError(error || 'Could not send reset email.');
  };

  const switchMode = (m) => { setMode(m); setError(null); setResetSent(false); };

  // Use team branding if available, otherwise fall back to MatMind defaults
  const primaryColor   = teamBranding?.primaryColor   || '#1B3A5C';
  const secondaryColor = teamBranding?.secondaryColor || '#6BADE4';
  const teamName       = teamBranding?.teamName       || null;
  const mascot         = teamBranding?.mascot         || '';

  // Darken the primary color slightly for the gradient top
  const gradientTop = primaryColor.replace(/^#/, '');
  const bgGradient  = `linear-gradient(145deg, ${primaryColor}dd 0%, ${primaryColor} 50%, ${primaryColor}bb 100%)`;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: bgGradient,
      padding: '0 32px',
    }}>
      {/* Team branding — shown when arriving via subdomain */}
      {teamName ? (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {mascot && <p style={{ fontSize: 40, marginBottom: 8 }}>
            {mascot === 'Lions' ? '🦁' : mascot === 'Warriors' ? '⚔️' : mascot === 'Eagles' ? '🦅' : '🏆'}
          </p>}
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: -0.5 }}>
            {teamName}
          </h1>
          <p style={{ fontSize: 12, color: `${secondaryColor}cc`, marginBottom: 0, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
            Powered by MatMind
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>MatMind</h1>
          <p style={{ fontSize: 13, color: secondaryColor }}>AI Team Assistant</p>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340 }}>
        {mode === 'reset' ? (
          /* ── Password reset ── */
          resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>📧</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Check your email</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 24, lineHeight: 1.5 }}>
                If an account exists for <span style={{ color: '#fff', fontWeight: 600 }}>{email}</span>,
                a password reset link is on its way. Open it on this device to set a new password.
              </p>
              <button onClick={() => switchMode('signin')} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: secondaryColor, color: primaryColor, fontSize: 15, fontWeight: 700,
              }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Reset your password</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 16, lineHeight: 1.5 }}>
                Enter your account email and we'll send you a link to set a new password.
              </p>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email" onKeyDown={e => e.key === 'Enter' && handleSendReset()}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                  color: '#fff', boxSizing: 'border-box', outline: 'none' }}
              />
              {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}
              <button onClick={handleSendReset} disabled={busy} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                cursor: busy ? 'default' : 'pointer',
                background: busy ? 'rgba(255,255,255,0.25)' : secondaryColor,
                color: primaryColor, fontSize: 15, fontWeight: 700,
              }}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <button onClick={() => switchMode('signin')} style={{
                width: '100%', marginTop: 12, background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}>
                ← Back to sign in
              </button>
            </>
          )
        ) : (
          /* ── Sign in ── */
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['coach', 'parent'].map(r => (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  border: role === r ? `2px solid ${secondaryColor}` : '1px solid rgba(255,255,255,0.15)',
                  background: role === r ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: role === r ? secondaryColor : 'rgba(255,255,255,0.5)',
                }}>{r}</button>
              ))}
            </div>

            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                color: '#fff', boxSizing: 'border-box', outline: 'none' }}
            />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16,
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                color: '#fff', boxSizing: 'border-box', outline: 'none' }}
            />

            {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <button onClick={handleSignIn} style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: secondaryColor, color: primaryColor, fontSize: 15, fontWeight: 700,
            }}>
              {auth.isDemo ? 'Sign in (Demo Mode)' : 'Sign in'}
            </button>

            <button onClick={() => switchMode('reset')} style={{
              width: '100%', marginTop: 14, background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
            }}>
              Forgot password?
            </button>

            {auth.isDemo && (
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
                Demo mode — no Supabase connected. Select a role and click sign in.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
