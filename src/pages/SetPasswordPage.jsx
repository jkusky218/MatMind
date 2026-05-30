import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Shown when a user arrives via an invite or password-reset link.
// Supabase auto-processes the hash tokens and signs them in; we just
// need to let them set their actual password before entering the app.

export default function SetPasswordPage({ isRecovery = false, onComplete, teamBranding }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [done, setDone]         = useState(false);

  const teamName = teamBranding?.teamName || null;
  const primaryColor   = teamBranding?.primaryColor   || '#1B3A5C';
  const secondaryColor = teamBranding?.secondaryColor || '#6BADE4';

  const title    = isRecovery ? 'Reset your password' : `Welcome to${teamName ? ' ' + teamName : ' MatMind'}!`;
  const subtitle = isRecovery
    ? 'Enter a new password for your account.'
    : `Your coach has added you to ${teamName || 'the team'}. Set a password to get started.`;

  const handleSubmit = async () => {
    setError(null);
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setDone(true);
      // Give the user a moment to see the success message before entering the app
      setTimeout(() => onComplete(), 1500);
    }
  };

  // ── Styles (match the app's navy theme) ────────────────────────────────────
  const wrap = {
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(145deg, ${primaryColor}dd 0%, ${primaryColor} 50%, ${primaryColor}bb 100%)`,
    padding: '0 32px',
  };
  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
    color: '#fff', boxSizing: 'border-box', outline: 'none',
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={wrap}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            Password set!
          </p>
          <p style={{ fontSize: 13, color: '#A5D0F0' }}>Taking you to MatMind…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6, textAlign: 'center' }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: '#A5D0F0', marginBottom: 32, textAlign: 'center', maxWidth: 300 }}>
        {subtitle}
      </p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          style={{ ...inputStyle, marginBottom: 12 }}
          autoFocus
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm password"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        {error && (
          <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? `${secondaryColor}99` : secondaryColor,
            color: '#0F2440', fontSize: 15, fontWeight: 700,
          }}
        >
          {loading ? 'Setting password…' : 'Set password & enter MatMind'}
        </button>
      </div>
    </div>
  );
}
