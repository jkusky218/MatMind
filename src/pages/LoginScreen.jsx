import { useState } from 'react';

// This is a placeholder — the full LoginScreen component from the prototype
// will be migrated here. For now it provides basic sign-in functionality.

export default function LoginScreen({ auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('coach');
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setError(null);
    const { error } = await auth.signIn(email, password, role);
    if (error) setError(error.message);
  };

  // TODO: Migrate full LoginScreen UI from prototype
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #0F2440 0%, #1B3A5C 50%, #2A4F7A 100%)',
      padding: '0 32px',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>MatMind</h1>
      <p style={{ fontSize: 13, color: '#A5D0F0', marginBottom: 32 }}>AI Team Assistant</p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['coach', 'parent'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textTransform: 'capitalize',
              border: role === r ? '2px solid #6BADE4' : '1px solid rgba(255,255,255,0.15)',
              background: role === r ? 'rgba(107,173,228,0.15)' : 'transparent',
              color: role === r ? '#6BADE4' : 'rgba(255,255,255,0.5)',
            }}>{r}</button>
          ))}
        </div>

        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 12,
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
            color: '#fff', boxSizing: 'border-box' }}
        />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleSignIn()}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
            color: '#fff', boxSizing: 'border-box' }}
        />

        {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <button onClick={handleSignIn} style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: '#6BADE4', color: '#0F2440', fontSize: 15, fontWeight: 700,
        }}>
          {auth.isDemo ? 'Sign in (Demo Mode)' : 'Sign in'}
        </button>

        {auth.isDemo && (
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
            Demo mode — no Supabase connected. Select a role and click sign in.
          </p>
        )}
      </div>
    </div>
  );
}
