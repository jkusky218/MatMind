// DevPage.jsx — Development view for the CEO dashboard
// Recent commits, open bugs, QA result, deploy history, branch protection

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const C = {
  white:    '#FFFFFF',
  muted:    'rgba(255,255,255,0.45)',
  card:     '#0F2440',
  columbia: '#6BADE4',
  gold:     '#C4A44A',
  green:    '#52C97C',
  amber:    '#C4A44A',
  red:      '#E05252',
  border:   'rgba(255,255,255,0.08)',
};

async function apiFetch(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No session');
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const b = await res.json().catch(()=>({})); throw new Error(b.error||`HTTP ${res.status}`); }
  return res.json();
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

function StatusDot({ ok, unknown }) {
  const color = unknown ? C.muted : ok ? C.green : C.red;
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, marginRight: 7, flexShrink: 0,
      boxShadow: unknown ? 'none' : `0 0 6px ${color}`,
    }} />
  );
}

function SectionHeader({ title, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: C.columbia, margin: 0 }}>{title}</p>
      {count != null && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: count > 0 ? `${color ?? C.red}22` : 'rgba(82,201,124,0.15)',
          color: count > 0 ? (color ?? C.red) : C.green,
        }}>{count}</span>
      )}
    </div>
  );
}

function ExternalLink({ href, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 14px', borderRadius: 8,
      border: `1px solid rgba(107,173,228,0.3)`,
      background: 'transparent', color: C.columbia,
      fontSize: 12, fontWeight: 600, textDecoration: 'none',
      transition: 'opacity 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {label} ↗
    </a>
  );
}

const DEPLOY_STATE_COLOR = {
  READY:    C.green,
  ERROR:    C.red,
  BUILDING: C.amber,
  CANCELED: C.muted,
};

export default function DevPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiFetch('/api/admin/?route=dev')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading dev info…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const { commits, issues, branchProtected, requiresPR,
          deploys, lastDeploy, qa, flags, links } = data;

  const noGitHub = !commits?.length && !issues;
  const noVercel = !deploys?.length;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>Development</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Sprint status, bugs, QA, and deploys</p>
        </div>
        {/* Quick links */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ExternalLink href={links?.github}  label="GitHub" />
          <ExternalLink href={links?.issues}  label="Issues" />
          <ExternalLink href={links?.vercel}  label="Vercel" />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 28,
      }}>
        {[
          {
            label: 'Last deploy',
            ok: flags?.lastDeployOk,
            value: lastDeploy ? lastDeploy.state : 'Unknown',
            sub: lastDeploy ? timeAgo(lastDeploy.created) : '—',
          },
          {
            label: 'Open bugs',
            ok: !flags?.hasOpenBugs,
            value: issues?.filter(i => i.labels.includes('bug')).length ?? '—',
            sub: 'GitHub issues · bug label',
          },
          {
            label: 'Last QA run',
            ok: qa ? qa.fails === 0 : null,
            value: qa ? (qa.fails === 0 ? '✅ Pass' : `❌ ${qa.fails} fail`) : 'No data',
            sub: qa ? qa.date : 'Run QA to populate',
          },
          {
            label: 'Branch protection',
            ok: branchProtected,
            value: branchProtected == null ? 'Unknown' : branchProtected ? 'Protected' : 'Unprotected',
            sub: requiresPR ? 'PR required on main' : 'Check GitHub settings',
          },
        ].map(({ label, ok, value, sub }) => (
          <div key={label} style={{ background: C.card, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <StatusDot ok={ok} unknown={ok == null} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', color: C.columbia }}>{label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: ok == null ? C.muted : ok ? C.green : C.red }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Recent commits */}
        <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px' }}>
          <SectionHeader title="Recent commits · main" count={commits?.length} color={C.columbia} />
          {noGitHub ? (
            <MissingEnvNote vars={['GITHUB_TOKEN', 'GITHUB_REPO']} />
          ) : commits?.length === 0 ? (
            <p style={{ fontSize: 12, color: C.muted }}>No commits found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {commits.map(c => (
                <a key={c.sha} href={c.url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(107,173,228,0.05)',
                    transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,173,228,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(107,173,228,0.05)'}
                  >
                    <code style={{ fontSize: 11, color: C.columbia, flexShrink: 0,
                      background: 'rgba(107,173,228,0.15)', padding: '2px 5px', borderRadius: 4 }}>
                      {c.sha}
                    </code>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: C.white, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.message}
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                        {c.author} · {timeAgo(c.date)}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Open bug issues */}
        <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px' }}>
          <SectionHeader
            title="Open bugs"
            count={issues?.filter(i => i.labels.includes('bug')).length}
            color={C.red}
          />
          {noGitHub ? (
            <MissingEnvNote vars={['GITHUB_TOKEN']} />
          ) : !issues?.filter(i => i.labels.includes('bug')).length ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: 22, margin: '0 0 6px' }}>🎉</p>
              <p style={{ fontSize: 13, color: C.green, margin: 0 }}>No open bugs</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issues.filter(i => i.labels.includes('bug')).map(issue => (
                <a key={issue.number} href={issue.url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 10px', borderRadius: 8,
                    background: 'rgba(224,82,82,0.05)',
                    transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.05)'}
                  >
                    <span style={{ fontSize: 11, color: C.red, flexShrink: 0,
                      background: 'rgba(224,82,82,0.15)', padding: '2px 6px', borderRadius: 4,
                      fontWeight: 700 }}>#{issue.number}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: C.white, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {issue.title}
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                        {issue.labels.filter(l => l !== 'bug').join(', ') || 'bug'} · {timeAgo(issue.created)}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QA report preview */}
      {qa && (
        <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
          <SectionHeader title={`QA Report — ${qa.date}`} />
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { label: `${qa.passes} pass`,    color: C.green },
              { label: `${qa.fails} fail`,     color: qa.fails > 0 ? C.red    : C.muted },
              { label: `${qa.warnings} warn`,  color: qa.warnings > 0 ? C.amber : C.muted },
            ].map(({ label, color }) => (
              <span key={label} style={{
                fontSize: 12, fontWeight: 700, color,
                background: `${color}22`, padding: '4px 12px', borderRadius: 6,
              }}>{label}</span>
            ))}
          </div>
          <pre style={{
            fontSize: 11, color: C.muted, lineHeight: 1.6, margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 180, overflow: 'auto',
            background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '12px 14px',
          }}>
            {qa.preview}
          </pre>
        </div>
      )}

      {/* Deploy history */}
      <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px' }}>
        <SectionHeader title="Deploy history" />
        {noVercel ? (
          <MissingEnvNote vars={['VERCEL_TOKEN', 'VERCEL_PROJECT_ID']} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {deploys.map((d, i) => (
              <div key={d.uid ?? i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 10px', borderRadius: 8,
                background: i === 0 ? 'rgba(107,173,228,0.06)' : 'transparent',
              }}>
                <StatusDot ok={d.state === 'READY'} unknown={d.state === 'BUILDING'} />
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 72,
                  color: DEPLOY_STATE_COLOR[d.state] ?? C.muted,
                }}>
                  {d.state}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  background: d.target === 'production'
                    ? 'rgba(82,201,124,0.15)' : 'rgba(107,173,228,0.1)',
                  color: d.target === 'production' ? C.green : C.columbia,
                  fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {d.target ?? 'preview'}
                </span>
                <span style={{ fontSize: 12, color: C.muted, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.meta || d.url || '—'}
                </span>
                <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
                  {timeAgo(d.created)}
                </span>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: C.columbia, textDecoration: 'none',
                      flexShrink: 0 }}>↗</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Missing env var note ──────────────────────────────────────────────────────
function MissingEnvNote({ vars }) {
  return (
    <div style={{
      background: 'rgba(196,164,74,0.08)', border: `1px solid rgba(196,164,74,0.25)`,
      borderRadius: 8, padding: '12px 14px', fontSize: 12, color: C.amber, lineHeight: 1.6,
    }}>
      <strong>Env vars not configured:</strong>{' '}
      {vars.map(v => (
        <code key={v} style={{ background: 'rgba(0,0,0,0.25)',
          padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>{v}</code>
      ))}
      <br />
      Add these to your Vercel project environment variables to enable this panel.
    </div>
  );
}
