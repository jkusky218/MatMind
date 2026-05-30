import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './pages/LoginScreen';
import MainApp from './pages/MainApp';
import SetPasswordPage from './pages/SetPasswordPage';

// Read the URL hash ONCE at module load — Supabase clears it after processing,
// so we capture it here before any effects run.
const _hash = window.location.hash;
const _params = new URLSearchParams(_hash.startsWith('#') ? _hash.slice(1) : _hash);
const _authType = _params.get('type'); // 'invite' | 'recovery' | null

export default function App() {
  const auth = useAuth();

  // Track whether this page load came from an invite or password-reset link.
  // We derive it only once from the captured hash; onComplete clears it.
  const [needsSetPassword, setNeedsSetPassword] = useState(
    () => _authType === 'invite' || _authType === 'recovery'
  );

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (auth.loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F2440 0%, #1B3A5C 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>MatMind</p>
          <p style={{ fontSize: 13, color: '#A5D0F0' }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Invite / password-reset flow ────────────────────────────────────────────
  // Show the set-password screen when the user arrived via an email link.
  // auth.user will be set because Supabase auto-processes the hash tokens.
  if (needsSetPassword && auth.user) {
    return (
      <SetPasswordPage
        isRecovery={_authType === 'recovery'}
        onComplete={() => setNeedsSetPassword(false)}
      />
    );
  }

  // ── Normal auth flow ────────────────────────────────────────────────────────
  if (!auth.user) {
    return <LoginScreen auth={auth} />;
  }

  return <MainApp auth={auth} />;
}
