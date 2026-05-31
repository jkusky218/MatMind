import { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTeamResolver } from './hooks/useTeamResolver';
import LoginScreen from './pages/LoginScreen';
import MainApp from './pages/MainApp';
import SetPasswordPage from './pages/SetPasswordPage';

// ── Pull-to-refresh ───────────────────────────────────────────────────────────
// In standalone / home-screen mode there's no browser refresh button.
// Pulling down from the top of the screen (≥ 90px) triggers a full reload.
// A small indicator pill animates in to give visual feedback.

function usePullToRefresh() {
  const [pullY,    setPullY]    = useState(0);   // px pulled (0 = none)
  const [released, setReleased] = useState(false);
  const startYRef = useRef(0);
  const THRESHOLD = 90;

  useEffect(() => {
    const onStart = (e) => {
      startYRef.current = e.touches[0].pageY;
      setReleased(false);
    };

    const onMove = (e) => {
      const dy = e.touches[0].pageY - startYRef.current;
      // Only activate when pulling DOWN from the very top (window not scrolled)
      if (dy > 0 && window.scrollY === 0) {
        setPullY(Math.min(dy, THRESHOLD + 20));
      } else {
        setPullY(0);
      }
    };

    const onEnd = () => {
      if (pullY >= THRESHOLD) {
        setReleased(true);
        setTimeout(() => window.location.reload(), 200);
      } else {
        setPullY(0);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove',  onMove,  { passive: true });
    document.addEventListener('touchend',   onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove',  onMove);
      document.removeEventListener('touchend',   onEnd);
    };
  }, [pullY]);

  return { pullY, released, threshold: THRESHOLD };
}

// Read the URL hash ONCE at module load — Supabase clears it after processing,
// so we capture it here before any effects run.
const _hash = window.location.hash;
const _params = new URLSearchParams(_hash.startsWith('#') ? _hash.slice(1) : _hash);
const _authType = _params.get('type'); // 'invite' | 'recovery' | null

export default function App() {
  const auth = useAuth();
  const { teamBranding, loading: brandingLoading, notFound } = useTeamResolver();
  const { pullY, released, threshold } = usePullToRefresh();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateReady(true);
    window.addEventListener('pwa-updated', handler);
    return () => window.removeEventListener('pwa-updated', handler);
  }, []);

  // Super admin team-switching: when a super admin visits a subdomain whose
  // team differs from their profile's current team_id, silently update the DB
  // so Supabase RLS scopes all queries to the correct team.
  useEffect(() => {
    if (!auth.isSuperAdmin)       return;
    if (!teamBranding?.teamId)    return;
    if (!auth.profile)            return;
    if (auth.profile.team_id === teamBranding.teamId) return;
    auth.switchTeam(teamBranding.teamId);
  }, [auth.isSuperAdmin, teamBranding?.teamId, auth.profile?.team_id]);

  const pullProgress  = Math.min(pullY / threshold, 1);
  const showIndicator = pullY > 12;

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

  // ── Loading spinner (auth, branding, or super-admin team switch) ───────────
  if (auth.loading || brandingLoading || auth.switching) {
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

  // Override profile.team_id with the subdomain-resolved teamId so all data
  // hooks load the correct team regardless of which team_id is in the DB row.
  const resolvedAuth = teamBranding?.teamId && auth.profile
    ? { ...auth, profile: { ...auth.profile, team_id: teamBranding.teamId } }
    : auth;

  return (
    <>
      {/* Update available banner — tap to reload at a convenient time */}
      {updateReady && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: '#1B3A5C', pointerEvents: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', width: '100%', maxWidth: 430,
          }}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>
              Update available
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: '#6BADE4', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Refresh
            </button>
            <button
              onClick={() => setUpdateReady(false)}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Pull-to-refresh indicator — floats above the app, visible only while pulling */}
      {showIndicator && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          display: 'flex', justifyContent: 'center',
          transform: `translateY(${Math.max(pullY - 10, 0)}px)`,
          transition: released ? 'transform 0.2s' : 'none',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#1B3A5C', color: '#fff',
            borderRadius: 20, padding: '5px 14px',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            opacity: Math.min(pullProgress * 2, 1),
          }}>
            <span style={{
              display: 'inline-block',
              transform: `rotate(${pullProgress * 180}deg)`,
              transition: 'transform 0.1s',
              fontSize: 14,
            }}>↓</span>
            {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}
      <MainApp auth={resolvedAuth} />
    </>
  );
}
