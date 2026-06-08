// TenantsPage.jsx — Tenant Operations: list view + detail view
// Routes:
//   /admin/tenants           → TenantList
//   /admin/tenants/:teamId   → TenantDetail (rendered inline, no nested router)

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  white:    '#FFFFFF',
  muted:    'rgba(255,255,255,0.45)',
  card:     '#0F2440',
  mainBg:   '#1B3A5C',
  columbia: '#6BADE4',
  gold:     '#C4A44A',
  green:    '#52C97C',
  amber:    '#C4A44A',
  red:      '#E05252',
  border:   'rgba(255,255,255,0.08)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No session');
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No session');
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({ label, value, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'rgba(107,173,228,0.1)', borderRadius: 6,
      padding: '3px 9px', fontSize: 12, color: color ?? C.muted,
    }}>
      <span style={{ fontWeight: 700, color: color ?? C.white }}>{value}</span>
      {label}
    </span>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: C.card, borderRadius: 14, padding: '28px 32px',
        maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <p style={{ fontSize: 15, color: C.white, margin: '0 0 24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: C.red, color: C.white, cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Tenant list ───────────────────────────────────────────────────────────────
function TenantList({ onSelect }) {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiFetch('/api/admin/tenants')
      .then(d => setTeams(d.teams ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading tenants…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const active   = teams.filter(t => t.active);
  const inactive = teams.filter(t => !t.active);
  const atRisk   = active.filter(t => t.atRisk);

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>
          Tenant Operations
        </h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {teams.length} total · {active.length} active · {atRisk.length} at-risk
        </p>
      </div>

      {/* At-risk callout */}
      {atRisk.length > 0 && (
        <div style={{
          background: 'rgba(196,164,74,0.12)', border: `1px solid ${C.amber}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          fontSize: 13, color: C.amber,
        }}>
          ⚠️ {atRisk.length} team{atRisk.length > 1 ? 's' : ''} with no activity in 14+ days —
          consider reaching out.
        </div>
      )}

      {/* Team rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {teams.map(team => (
          <div
            key={team.id}
            onClick={() => onSelect(team.id)}
            style={{
              background: C.card,
              borderRadius: 10,
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderLeft: `3px solid ${team.atRisk && team.active ? C.amber : team.active ? C.green : C.grey ?? '#4A5568'}`,
              transition: 'opacity 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {/* Name + slug */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
                  {team.name}
                </span>
                {!team.active && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.red,
                    background: 'rgba(224,82,82,0.15)', padding: '2px 6px',
                    borderRadius: 4, letterSpacing: '0.06em' }}>INACTIVE</span>
                )}
                {team.atRisk && team.active && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.amber,
                    background: 'rgba(196,164,74,0.15)', padding: '2px 6px',
                    borderRadius: 4, letterSpacing: '0.06em' }}>AT RISK</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>
                {team.slug ? `${team.slug}.mat-mind.com` : 'No subdomain'} · {team.plan_tier}
              </span>
            </div>

            {/* Pills */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Pill value={team.athleteCount} label="athletes" />
              <Pill value={team.coachCount}   label="coaches"  />
            </div>

            {/* Last active */}
            <span style={{
              fontSize: 12, color: team.atRisk ? C.amber : C.muted,
              minWidth: 80, textAlign: 'right', flexShrink: 0,
            }}>
              {timeAgo(team.lastActive)}
            </span>

            <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tenant detail ─────────────────────────────────────────────────────────────
function TenantDetail({ teamId, onBack }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [toasting, setToasting] = useState(null);

  useEffect(() => {
    apiFetch(`/api/admin/tenants?id=${teamId}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  function toast(msg) {
    setToasting(msg);
    setTimeout(() => setToasting(null), 3000);
  }

  async function handleDeactivate() {
    setConfirm({
      message: `Deactivate "${data.team.name}"? Users will not be able to log in until the team is reactivated.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await apiPost('/api/admin/tenants', { teamId, active: false });
          setData(prev => ({ ...prev, team: { ...prev.team, active: false } }));
          toast('Team deactivated');
        } catch (e) { toast(`Error: ${e.message}`); }
      },
    });
  }

  async function handleReactivate() {
    try {
      await apiPost('/api/admin/tenants', { teamId, active: true });
      setData(prev => ({ ...prev, team: { ...prev.team, active: true } }));
      toast('Team reactivated');
    } catch (e) { toast(`Error: ${e.message}`); }
  }

  function handleOpenTeam() {
    const slug = data?.team?.slug;
    if (!slug) return toast('No subdomain configured for this team');
    window.open(`https://${slug}.mat-mind.com`, '_blank', 'noopener');
  }

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading team…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const { team, athleteCount, parentCount, coachCount,
          eventCount30d, messageCount30d,
          aiCallsThisWeek, avgTokensPerCall, estimatedCostUsd,
          rsvpRate } = data;

  const settings = team.team_settings?.[0];

  return (
    <div style={{ padding: '32px 36px', maxWidth: 780 }}>
      {/* Back + header */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: C.columbia,
        cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        ‹ All tenants
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        {/* Color swatch */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: settings?.primary_color ?? team.primary_color ?? '#1B3A5C',
          border: '2px solid rgba(255,255,255,0.15)',
        }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>
              {settings?.team_name ?? team.name}
            </h1>
            {!team.active && (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.red,
                background: 'rgba(224,82,82,0.15)', padding: '3px 8px',
                borderRadius: 5, letterSpacing: '0.06em' }}>INACTIVE</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            {team.slug ? `${team.slug}.mat-mind.com` : 'No subdomain'} ·{' '}
            {team.plan_tier} · created {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Athletes',          value: athleteCount  },
          { label: 'Parents',           value: parentCount   },
          { label: 'Coaches',           value: coachCount    },
          { label: 'Events (30d)',       value: eventCount30d  },
          { label: 'Messages (30d)',     value: messageCount30d},
          { label: 'RSVP rate',         value: rsvpRate != null ? `${rsvpRate}%` : '—' },
          { label: 'AI calls (7d)',      value: aiCallsThisWeek  },
          { label: 'Avg tokens / call',  value: avgTokensPerCall > 0 ? avgTokensPerCall.toLocaleString() : '—' },
          { label: 'Est. AI cost (7d)',  value: estimatedCostUsd > 0 ? `$${estimatedCostUsd.toFixed(4)}` : '$0.00' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: C.card, borderRadius: 10, padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: C.columbia }}>{label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.white }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        background: C.card, borderRadius: 12, padding: '20px 22px',
        display: 'flex', gap: 10, flexWrap: 'wrap',
      }}>
        <button onClick={handleOpenTeam} style={{
          padding: '9px 18px', borderRadius: 8,
          border: `1px solid rgba(107,173,228,0.4)`,
          background: 'transparent', color: C.columbia,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          ↗ Open team app
        </button>

        {team.active ? (
          <button onClick={handleDeactivate} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'rgba(224,82,82,0.15)', color: C.red,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Deactivate team
          </button>
        ) : (
          <button onClick={handleReactivate} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'rgba(82,201,124,0.15)', color: C.green,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Reactivate team
          </button>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Toast */}
      {toasting && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#0F2440', border: `1px solid rgba(107,173,228,0.3)`,
          borderRadius: 10, padding: '10px 20px',
          fontSize: 13, color: C.white, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 500,
        }}>
          {toasting}
        </div>
      )}
    </div>
  );
}

// ── Page router ───────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const [selectedId, setSelectedId] = useState(null);

  // Read teamId from URL path on mount for deep-link support
  useEffect(() => {
    const match = window.location.pathname.match(/\/admin\/tenants\/([^/]+)/);
    if (match) setSelectedId(match[1]);
  }, []);

  function handleSelect(id) {
    setSelectedId(id);
    window.history.pushState({}, '', `/admin/tenants/${id}`);
  }

  function handleBack() {
    setSelectedId(null);
    window.history.pushState({}, '', '/admin/tenants');
  }

  if (selectedId) return <TenantDetail teamId={selectedId} onBack={handleBack} />;
  return <TenantList onSelect={handleSelect} />;
}
