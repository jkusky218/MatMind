// AnalyticsPage.jsx — Usage Analytics for the CEO dashboard
// DAU/MAU, AI calls, token cost, cache hit rate, tool usage, feature events

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

// ── Stat tile ─────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: C.columbia, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? C.white, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── AI calls sparkline (SVG) ──────────────────────────────────────────────────
function AISparkline({ data, mode }) {
  if (!data?.length) return <p style={{ color: C.muted, fontSize: 12 }}>No AI calls logged yet</p>;

  const W = 580, H = 80, PAD = 4;
  const values = data.map(d => mode === 'cost' ? d.costUsd : d.calls);
  const max    = Math.max(...values, 0.001);
  const step   = (W - PAD * 2) / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => {
    const x = PAD + i * step;
    const y = PAD + (1 - values[i] / max) * (H - PAD * 2);
    return [x, y, d];
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Area fill */}
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={C.columbia} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.columbia} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon
        points={[
          `${PAD},${H - PAD}`,
          ...pts.map(([x, y]) => `${x},${y}`),
          `${W - PAD},${H - PAD}`,
        ].join(' ')}
        fill="url(#area-grad)"
      />
      {/* Line */}
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke={C.columbia} strokeWidth={2}
      />
      {/* Dots for days with activity */}
      {pts.filter(([,,d]) => (mode === 'cost' ? d.costUsd : d.calls) > 0).map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={C.columbia} />
      ))}
    </svg>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
function BarChart({ rows, labelKey, valueKey, color }) {
  if (!rows?.length) return <p style={{ color: C.muted, fontSize: 12 }}>No data yet</p>;
  const max = Math.max(...rows.map(r => r[valueKey]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.slice(0, 8).map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.muted, minWidth: 130,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row[labelKey]}
          </span>
          <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5 }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: `${(row[valueKey] / max) * 100}%`,
              background: color ?? C.columbia,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, color: C.white, minWidth: 32, textAlign: 'right' }}>
            {row[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [chartMode, setChartMode] = useState('calls'); // 'calls' | 'cost'

  useEffect(() => {
    apiFetch('/api/admin/analytics')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading analytics…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const noAIData = !data?.totalCalls30d;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>Usage Analytics</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Last 30 days</p>
      </div>

      {/* Top stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <Tile
          label="DAU"
          value={data.dau}
          sub="Active users today"
          color={data.dau > 0 ? C.green : C.muted}
        />
        <Tile
          label="MAU"
          value={data.mau}
          sub="Active users (30d)"
        />
        <Tile
          label="DAU / MAU"
          value={`${data.dauMauRatio}%`}
          sub="Stickiness"
          color={data.dauMauRatio >= 20 ? C.green : data.dauMauRatio >= 10 ? C.amber : C.muted}
        />
        <Tile
          label="Cache hit rate"
          value={data.cacheHitRate != null ? `${data.cacheHitRate}%` : '—'}
          sub="Prompt cache efficiency"
          color={data.cacheHitRate >= 80 ? C.green : data.cacheHitRate >= 50 ? C.amber : C.muted}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <Tile label="AI calls (30d)" value={data.totalCalls30d} />
        <Tile label="AI calls (7d)"  value={data.calls7d} />
        <Tile
          label="AI cost (7d)"
          value={`$${data.cost7dUsd?.toFixed(4) ?? '0.0000'}`}
          color={data.cost7dUsd > 1 ? C.amber : C.green}
        />
        <Tile
          label="AI cost (30d)"
          value={`$${data.cost30dUsd?.toFixed(4) ?? '0.0000'}`}
          sub="Haiku 4.5 pricing"
          color={data.cost30dUsd > 5 ? C.amber : C.green}
        />
      </div>

      {/* Sparkline card */}
      <div style={{ background: C.card, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: C.columbia, margin: 0, flex: 1 }}>
            {chartMode === 'calls' ? 'AI calls / day — 30d' : 'AI cost (USD) / day — 30d'}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {['calls', 'cost'].map(m => (
              <button key={m} onClick={() => setChartMode(m)} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: chartMode === m ? C.columbia : 'rgba(107,173,228,0.1)',
                color: chartMode === m ? '#fff' : C.muted,
              }}>{m === 'calls' ? 'Calls' : 'Cost'}</button>
            ))}
          </div>
        </div>
        {noAIData ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              No AI calls logged yet. Data appears here after the first conversation
              using the updated <code style={{ color: C.columbia }}>api/chat.js</code>.
            </p>
          </div>
        ) : (
          <AISparkline data={data.aiSparkline} mode={chartMode} />
        )}
      </div>

      {/* Tool usage + Feature events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Tool usage */}
        <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: C.columbia, margin: '0 0 16px' }}>
            AI tool usage (30d)
          </p>
          {data.toolBreakdown?.length ? (
            <BarChart rows={data.toolBreakdown} labelKey="tool" valueKey="count" color={C.gold} />
          ) : (
            <p style={{ fontSize: 12, color: C.muted }}>
              No tool calls logged yet — tool data populates after coaches use the AI command center.
            </p>
          )}
        </div>

        {/* Feature events */}
        <div style={{ background: C.card, borderRadius: 12, padding: '20px 22px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: C.columbia, margin: '0 0 16px' }}>
            Feature events (30d)
          </p>
          {data.featureBreakdown?.length ? (
            <BarChart rows={data.featureBreakdown} labelKey="feature" valueKey="count" color={C.columbia} />
          ) : (
            <p style={{ fontSize: 12, color: C.muted }}>
              No feature events yet — add <code style={{ color: C.columbia }}>trackFeature()</code> calls
              to key UI actions to populate this chart.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
