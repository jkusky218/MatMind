import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTeamResolver } from './hooks/useTeamResolver';
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
  const { teamBranding, loading: brandingLoading, notFound } = useTeamResolver();

  // Track whether this page load came from an invite or password-reset link.
  // We derive it only once from the captured hash; onComplete clears it.
  const [needsSetPassword, setNeedsSetPassword] = useState(
    () => _authType === 'invite' || _authType === 'recovery'
  );

  // Primary color for the loading/error screens — use team color if resolved
  const primary   = teamBranding?.primaryColor   || '#1B3A5C';
  const primaryDk = primary; // darker shade could be derived later
  const secondary = teamBranding?.secondaryColor || '#6BADE4';

  // ── Team not found ──────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)', padding: '0 32px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🤷</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Team not found</p>
          <p style={{ fontSize: 13, color: '#aaa' }}>
            The link you followed doesn't match any team.<br />Contact your coach for the correct URL.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading spinner (auth or branding) ─────────────────────────────────────
  if (auth.loading || brandingLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(145deg, ${primaryDk} 0%, ${primary} 100%)`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {teamBranding?.teamName || 'MatMind'}
          </p>
          <p style={{ fontSize: 13, color: secondary }}>Loading…</p>
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
        teamBranding={teamBranding}
      />
    );
  }

  // ── Normal auth flow ────────────────────────────────────────────────────────
  if (!auth.user) {
    return <LoginScreen auth={auth} teamBranding={teamBranding} />;
  }

  return <MainApp auth={auth} />;
}
