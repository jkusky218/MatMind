// SupportPage.jsx — Support queue for the CEO dashboard
// Queue view: open tickets sorted oldest-first with tier/status filters
// Detail view: full conversation thread + reply, close, escalate, promote-to-KB

import { useEffect, useState, useRef } from 'react';
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

const TIER_COLOR  = { T1: C.columbia, T2: C.amber, T3: C.red };
const STATUS_COLOR= { open: C.columbia, in_progress: C.amber, escalated: C.red, resolved: C.green };

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No session');
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const b = await res.json().catch(()=>({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return res.json();
}

async function apiPost(body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch('/api/admin/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const b = await res.json().catch(()=>({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return res.json();
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
      padding: '2px 7px', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}55`,
    }}>{label}</span>
  );
}

// ── Metric tiles ─────────────────────────────────────────────────────────────
function MetricBar({ metrics }) {
  if (!metrics) return null;
  const tiles = [
    { label: 'Open tickets',      value: metrics.openTotal,
      color: metrics.openTotal > 5 ? C.red : metrics.openTotal > 0 ? C.amber : C.green },
    { label: 'T1 (AI)',            value: metrics.byTier?.T1 ?? 0, color: C.columbia },
    { label: 'T2 (queued)',        value: metrics.byTier?.T2 ?? 0, color: C.amber },
    { label: 'T3 (escalated)',     value: metrics.byTier?.T3 ?? 0,
      color: (metrics.byTier?.T3 ?? 0) > 0 ? C.red : C.green },
    { label: 'AI resolution (7d)', value: metrics.aiResolutionRate != null ? `${metrics.aiResolutionRate}%` : '—', color: C.green },
    { label: 'Median response',    value: metrics.medianResponseMin != null ? `${metrics.medianResponseMin}m` : '—', color: C.muted },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
      {tiles.map(({ label, value, color }) => (
        <div key={label} style={{ background: C.card, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: C.columbia, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Queue view ────────────────────────────────────────────────────────────────
function SupportQueue({ onSelect }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filterTier,  setFilterTier]  = useState('all');
  const [filterStatus,setFilterStatus]= useState('all');

  useEffect(() => {
    apiFetch('/api/admin/support')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading queue…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const tickets = (data?.tickets ?? []).filter(t => {
    if (filterTier   !== 'all' && t.tier   !== filterTier)   return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ padding: '32px 36px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.white, margin: 0 }}>Support Queue</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Oldest tickets first · {data?.metrics?.openTotal ?? 0} open
          {data?.metrics?.oldestAgeHours != null && data.metrics.oldestAgeHours > 0 &&
            ` · oldest ${data.metrics.oldestAgeHours}h ago`}
        </p>
      </div>

      <MetricBar metrics={data?.metrics} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all','T1','T2','T3'].map(v => (
          <button key={v} onClick={() => setFilterTier(v)} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filterTier === v ? C.columbia : 'rgba(107,173,228,0.1)',
            color: filterTier === v ? '#fff' : C.muted,
          }}>{v === 'all' ? 'All tiers' : v}</button>
        ))}
        <div style={{ width: 1, background: C.border, margin: '0 4px' }} />
        {['all','open','in_progress','escalated'].map(v => (
          <button key={v} onClick={() => setFilterStatus(v)} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filterStatus === v ? C.columbia : 'rgba(107,173,228,0.1)',
            color: filterStatus === v ? '#fff' : C.muted,
          }}>{v === 'all' ? 'All status' : v.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Ticket rows */}
      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>✅</p>
          <p style={{ fontSize: 14 }}>No tickets match this filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tickets.map(ticket => {
            const lastMsg = ticket.conversation?.at(-1);
            return (
              <div
                key={ticket.id}
                onClick={() => onSelect(ticket.id)}
                style={{
                  background: C.card, borderRadius: 10, padding: '14px 18px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  borderLeft: `3px solid ${TIER_COLOR[ticket.tier] ?? C.muted}`,
                  transition: 'opacity 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {/* Tier + subject */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge label={ticket.tier}   color={TIER_COLOR[ticket.tier]}  />
                    <Badge label={ticket.status.replace('_','')} color={STATUS_COLOR[ticket.status]} />
                    {ticket.category && (
                      <span style={{ fontSize: 11, color: C.muted }}>{ticket.category}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.subject || 'No subject'}
                  </p>
                  {lastMsg && (
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastMsg.role === 'agent' ? '↩ You: ' : lastMsg.role === 'ai' ? '🤖 ' : ''}{lastMsg.content}
                    </p>
                  )}
                </div>

                {/* User + team */}
                <div style={{ fontSize: 12, color: C.muted, textAlign: 'right',
                  flexShrink: 0, minWidth: 140 }}>
                  <p style={{ margin: 0, color: C.white }}>{ticket.profiles?.full_name ?? 'Unknown'}</p>
                  <p style={{ margin: 0 }}>{ticket.teams?.name ?? 'No team'}</p>
                </div>

                {/* Age */}
                <span style={{ fontSize: 12, color: C.muted, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                  {timeAgo(ticket.created_at)}
                </span>

                <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ticket detail ─────────────────────────────────────────────────────────────
function TicketDetail({ ticketId, onBack }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [reply,     setReply]     = useState('');
  const [kbAnswer,  setKbAnswer]  = useState('');
  const [showKb,    setShowKb]    = useState(false);
  const [sending,   setSending]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const threadRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function reload() {
    const d = await apiFetch(`/api/admin/support?id=${ticketId}`);
    setData(d);
  }

  useEffect(() => {
    apiFetch(`/api/admin/support?id=${ticketId}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticketId]);

  // Scroll thread to bottom when new messages arrive
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [data?.ticket?.conversation?.length]);

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await apiPost({ action: 'reply', ticketId, message: reply });
      setReply('');
      await reload();
      showToast('Reply sent');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSending(false); }
  }

  async function handleClose() {
    setSending(true);
    try {
      await apiPost({ action: 'close', ticketId });
      await reload();
      showToast('Ticket closed');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSending(false); }
  }

  async function handleEscalate() {
    setSending(true);
    try {
      await apiPost({ action: 'escalate', ticketId });
      await reload();
      showToast('Ticket escalated to T3');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSending(false); }
  }

  async function handlePromoteKb() {
    if (!kbAnswer.trim()) return;
    setSending(true);
    try {
      await apiPost({ action: 'promote-kb', ticketId, answer: kbAnswer });
      setKbAnswer(''); setShowKb(false);
      showToast('Added to knowledge base ✅');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSending(false); }
  }

  if (loading) return <p style={{ color: C.muted, padding: 32 }}>Loading ticket…</p>;
  if (error)   return <p style={{ color: C.red,   padding: 32 }}>⚠️ {error}</p>;

  const { ticket } = data;
  const conversation = ticket.conversation ?? [];
  const isResolved = ticket.status === 'resolved';

  const ROLE_STYLE = {
    user:  { align: 'flex-start', bg: 'rgba(107,173,228,0.12)', color: C.white,   label: ticket.profiles?.full_name ?? 'User' },
    ai:    { align: 'flex-start', bg: 'rgba(196,164,74,0.1)',   color: C.gold,    label: 'MatMind Support AI' },
    agent: { align: 'flex-end',   bg: 'rgba(82,201,124,0.12)',  color: C.green,   label: 'You (agent)' },
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 780, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back + header */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: C.columbia,
        cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20,
      }}>‹ Support queue</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Badge label={ticket.tier}   color={TIER_COLOR[ticket.tier]} />
            <Badge label={ticket.status.replace('_',' ')} color={STATUS_COLOR[ticket.status]} />
            {ticket.category && <Badge label={ticket.category} color={C.muted} />}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.white, margin: 0 }}>
            {ticket.subject || 'No subject'}
          </h1>
          <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
            {ticket.profiles?.full_name} · {ticket.profiles?.email} ·{' '}
            {ticket.teams?.name ?? 'No team'} · opened {timeAgo(ticket.created_at)}
          </p>
        </div>
      </div>

      {/* Conversation thread */}
      <div
        ref={threadRef}
        style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          gap: 10, marginBottom: 20, maxHeight: 400,
          padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12,
        }}
      >
        {conversation.length === 0 && (
          <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', margin: 'auto' }}>
            No messages yet
          </p>
        )}
        {conversation.map((msg, i) => {
          const style = ROLE_STYLE[msg.role] ?? ROLE_STYLE.user;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column',
              alignItems: style.align, gap: 3 }}>
              <span style={{ fontSize: 10, color: C.muted, paddingLeft: 4 }}>
                {style.label} · {timeAgo(msg.ts)}
              </span>
              <div style={{
                background: style.bg, borderRadius: 10, padding: '10px 14px',
                maxWidth: '80%', fontSize: 13, color: style.color, lineHeight: 1.55,
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box + actions */}
      {!isResolved && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type a reply…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '12px 14px',
              color: C.white, fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleReply} disabled={sending || !reply.trim()} style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: C.columbia, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: sending || !reply.trim() ? 0.5 : 1,
            }}>Send reply</button>

            <button onClick={handleClose} disabled={sending} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: 'rgba(82,201,124,0.15)', color: C.green,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: sending ? 0.5 : 1,
            }}>Mark resolved</button>

            {ticket.tier !== 'T3' && (
              <button onClick={handleEscalate} disabled={sending} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: 'rgba(224,82,82,0.15)', color: C.red,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: sending ? 0.5 : 1,
              }}>Escalate to T3</button>
            )}

            <button onClick={() => setShowKb(v => !v)} style={{
              padding: '8px 18px', borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent', color: C.muted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto',
            }}>+ Add to KB</button>
          </div>
        </div>
      )}

      {/* Promote to KB panel */}
      {showKb && (
        <div style={{ marginTop: 12, background: C.card, borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 12, color: C.columbia, fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Promote resolution to Knowledge Base
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px' }}>
            Question: <strong style={{ color: C.white }}>{ticket.subject}</strong>
          </p>
          <textarea
            value={kbAnswer}
            onChange={e => setKbAnswer(e.target.value)}
            placeholder="Write the definitive answer to add to the KB…"
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0a1929', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 12px',
              color: C.white, fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none', marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePromoteKb} disabled={sending || !kbAnswer.trim()} style={{
              padding: '7px 18px', borderRadius: 8, border: 'none',
              background: C.gold, color: '#0F2440',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: sending || !kbAnswer.trim() ? 0.5 : 1,
            }}>Save to KB</button>
            <button onClick={() => { setShowKb(false); setKbAnswer(''); }} style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.muted, fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Resolved badge */}
      {isResolved && (
        <div style={{
          background: 'rgba(82,201,124,0.1)', border: `1px solid ${C.green}44`,
          borderRadius: 10, padding: '12px 16px',
          fontSize: 13, color: C.green, textAlign: 'center',
        }}>
          ✅ Ticket resolved · {timeAgo(ticket.resolved_at)}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '10px 20px',
          fontSize: 13, color: C.white, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 500,
        }}>{toast}</div>
      )}
    </div>
  );
}

// ── Page router ───────────────────────────────────────────────────────────────
export default function SupportPage() {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const match = window.location.pathname.match(/\/admin\/support\/([^/]+)/);
    if (match) setSelectedId(match[1]);
  }, []);

  function handleSelect(id) {
    setSelectedId(id);
    window.history.pushState({}, '', `/admin/support/${id}`);
  }

  function handleBack() {
    setSelectedId(null);
    window.history.pushState({}, '', '/admin/support');
  }

  if (selectedId) return <TicketDetail ticketId={selectedId} onBack={handleBack} />;
  return <SupportQueue onSelect={handleSelect} />;
}
