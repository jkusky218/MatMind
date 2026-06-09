// HealthPage.jsx — System Health dashboard section
// Polls /api/ops?route=health every 60 seconds.
// Shows uptime %, p50/p95 latency, current status, and a 48-hour history sparkline.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  card:    '#0F2440',
  green:   '#52C97C',
  amber:   '#C4A44A',
  red:     '#E05252',
  grey:    '#4A5568',
  columbia:'#6BADE4',
};

const STATUS_COLOR = { ok: C.green, degraded: C.amber, down: C.red, unknown: C.grey };
const STATUS_LABEL = { ok: 'Operational', degraded: 'Degraded', down: 'Down', unknown: 'No data' };

// ── Tiny sparkline (SVG, no deps) ─────────────────────────────────────────────
function Sparkline({ history }) {
  if (!history?.length) return (
    <p style={{ fontSize: 12, color: C.muted }}>No history yet — checks log every 5 min</p>
  );

  const W = 520, H = 48, PAD = 2;
  const latencies = history.map(r => r.latency_ms ?? 0);
  const max = Math.max(...latencies, 1);
  const step = (W - PAD * 2) / Math.max(history.length - 1, 1);

  const points = history.map((r, i) => {
    const x = PAD + i * step;
    const y = PAD + (1 - (r.latency_ms ?? 0) / max) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
        Response time — last 48 h ({history.length} checks)
      </p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Status-colored dots per check */}
        {history.map((r, i) => (
          <circle
            key={i}
            cx={PAD + i * step}
            cy={PAD + (1 - (r.latency_ms ?? 0) / max) * (H - PAD * 2)}
            r={3}
            fill={STATUS_COLOR[r.status] ?? C.grey}
            opacity={0.8}
          />
        ))}
        {/* Polyline connecting the dots */}
        <polyline
          points={points}
          fill="none"
          stroke={C.columbia}
          strokeWidth={1.5}
          opacity={0.4}
        />
      </svg>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, unit, color }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: 10,
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: C.columbia }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: color ?? C.white, lineHeight: 1 }}>
        {value ?? '—'}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, color: C.muted, marginLeft: 4 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const intervalRef = useRef(null);

  async function fetchHealth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No session');

      const res = await fetch('/api/ops?route=health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    // Poll every 60 seconds
    intervalRef.current = setInterval(fetchHealth, 60_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const statusColor = STATUS_COLOR[data?.status ?? 'unknown'];
  const statusLabel = STATUS_LABEL[data?.status ?? 'unknown'];

  return (
    <div style={{ padding: '32px 36px', maxWidth: 780 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: loading ? C.grey : statusColor,
          boxShadow: loading ? 'none' : `0 0 8px ${statusColor}`,
          flexShrink: 0,
        }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>
            System Health
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>
            {loading ? 'Checking…' : statusLabel}
            {lastFetch && !loading && (
              <span style={{ marginLeft: 10, fontSize: 11, opacity: 0.6 }}>
                · checked {lastFetch.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          style={{
            marginLeft: 'auto', padding: '7px 16px', borderRadius: 8,
            border: `1px solid rgba(107,173,228,0.3)`, background: 'transparent',
            color: C.columbia, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(224,82,82,0.15)', border: '1px solid #E05252',
          borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          color: '#E05252', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatTile
          label="Uptime (48 h)"
          value={data?.uptimePct != null ? data.uptimePct : '—'}
          unit={data?.uptimePct != null ? '%' : undefined}
          color={data?.uptimePct >= 99 ? C.green : data?.uptimePct >= 95 ? C.amber : C.red}
        />
        <StatTile
          label="Latest latency"
          value={data?.latency_ms ?? '—'}
          unit={data?.latency_ms != null ? 'ms' : undefined}
          color={data?.latency_ms < 300 ? C.green : data?.latency_ms < 800 ? C.amber : C.red}
        />
        <StatTile
          label="p50 latency"
          value={data?.p50_ms ?? '—'}
          unit={data?.p50_ms != null ? 'ms' : undefined}
        />
        <StatTile
          label="p95 latency"
          value={data?.p95_ms ?? '—'}
          unit={data?.p95_ms != null ? 'ms' : undefined}
          color={data?.p95_ms > 1000 ? C.amber : undefined}
        />
      </div>

      {/* Sparkline card */}
      <div style={{
        background: C.card, borderRadius: 12,
        padding: '22px 24px', marginBottom: 24,
      }}>
        <Sparkline history={data?.history} />
      </div>

      {/* Uptime monitor note */}
      <div style={{
        background: 'rgba(107,173,228,0.07)',
        border: '1px solid rgba(107,173,228,0.2)',
        borderRadius: 10,
        padding: '14px 18px',
        fontSize: 12,
        color: C.muted,
        lineHeight: 1.6,
      }}>
        <strong style={{ color: C.columbia }}>Uptime monitor endpoint</strong>
        <br />
        Point UptimeRobot or BetterUptime at:{' '}
        <code style={{ color: C.white, background: 'rgba(0,0,0,0.3)',
          padding: '2px 6px', borderRadius: 4 }}>
          GET {window.location.origin}/api/ops?route=health
        </code>
        <br />
        No authentication required. Returns HTTP 200 when operational, 503 when down.
        Vercel cron logs a check every 5 minutes automatically.
      </div>
    </div>
  );
}
