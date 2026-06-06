import { useState } from 'react';

export default function LoginScreen({ auth, team }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('coach');
  const [error, setError]       = useState(null);
  const [magicSent, setMagicSent] = useState(false);
  const [showMagic, setShowMagic] = useState(false);

  const primaryColor   = team?.branding?.primaryColor   ?? '#1B3A5C';
  const secondaryColor = team?.branding?.secondaryColor ?? '#6BADE4';

  const handleSignIn = async () => {
    setError(null);
    const { error } = await auth.signIn(email, password, role, team?.team_id);
    if (error) setError(error.message);
  };

  const handleMagicLink = async () => {
    setError(null);
    const { error } = await auth.sendMagicLink(email);
    if (error) setError(error.message);
    else setMagicSent(true);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', boxSizing: 'border-box',
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(145deg, #0F2440 0%, ${primaryColor} 50%, #2A4F7A 100%)`,
      padding: '0 32px',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>MatMind</h1>
      <p style={{ fontSize: 13, color: '#A5D0F0', marginBottom: 32 }}>
        {team ? `${team.name} AI Assistant` : 'Wrestling Team AI Assistant'}
      </p>

      {magicSent ? (
        <div style={{ maxWidth: 340, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📬</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Check your email</p>
          <p style={{ fontSize: 13, color: '#A5D0F0' }}>
            We sent a sign-in link to <strong>{email}</strong>. Click it to log in — no password needed.
          </p>
          <button onClick={() => { setMagicSent(false); setShowMagic(false); }}
            style={{ marginTop: 20, background: 'transparent', border: 'none',
              color: secondaryColor, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
            Back to sign in
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 340 }}>
          {!showMagic && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['coach', 'parent'].map(r => (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  border: role === r ? `2px solid ${secondaryColor}` : '1px solid rgba(255,255,255,0.15)',
                  background: role === r ? 'rgba(107,173,228,0.15)' : 'transparent',
                  color: role === r ? secondaryColor : 'rgba(255,255,255,0.5)',
                }}>{r}</button>
              ))}
            </div>
          )}

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            onKeyDown={e => e.key === 'Enter' && (showMagic ? handleMagicLink() : handleSignIn())}
            style={{ ...inputStyle, marginBottom: 12 }}
          />

          {!showMagic && (
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
          )}

          {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button
            onClick={showMagic ? handleMagicLink : handleSignIn}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              cursor: 'pointer', background: secondaryColor, color: '#0F2440',
              fontSize: 15, fontWeight: 700, marginBottom: 12,
            }}
          >
            {auth.isDemo ? 'Sign in (Demo Mode)' : showMagic ? 'Send magic link' : 'Sign in'}
          </button>

          {!auth.isDemo && (
            <button
              onClick={() => { setShowMagic(s => !s); setError(null); }}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {showMagic ? 'Sign in with password instead' : 'Send a magic link instead'}
            </button>
          )}

          {auth.isDemo && (
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Demo mode — no Supabase connected. Select a role and click sign in.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
