import { useRef, useEffect } from 'react';
import { BRAND } from '../lib/constants';
import { ChevLeft, Send, ShieldCheck } from './Icons';
import { useSupportChat } from '../hooks/useSupportChat';

// MatMind Support uses emerald green — clearly distinct from team navy
const SUPPORT_COLOR  = '#059669';
const SUPPORT_BG     = '#ECFDF5';
const SUPPORT_LIGHT  = '#D1FAE5';
const ESCALATED_BG   = '#FEF3C7';
const ESCALATED_TEXT = '#92400E';

// ── Bold text renderer (same pattern as ChatBubble) ──────────────────────────

function Bold({ text }) {
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ── Support avatar ────────────────────────────────────────────────────────────

function SupportAvatar({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: SUPPORT_COLOR,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {ShieldCheck(size * 0.5, '#fff')}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function SupportBubble({ msg }) {
  const isUser    = msg.role === 'user';
  const isSupport = msg.role === 'support';

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
    }}>
      {!isUser && <SupportAvatar />}
      <div style={{ maxWidth: '82%' }}>
        {!isUser && (
          <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 3px 2px', color: SUPPORT_COLOR }}>
            MatMind Support
          </p>
        )}
        <div style={{
          background:   isUser ? BRAND.navy : SUPPORT_BG,
          color:        isUser ? '#fff' : '#1a1a1a',
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          padding:      '10px 14px',
          fontSize:     13,
          lineHeight:   1.6,
          whiteSpace:   'pre-line',
          border:       isUser ? 'none' : `1px solid ${SUPPORT_LIGHT}`,
        }}>
          <Bold text={msg.text ?? ''} />
        </div>
        {/* Escalation confirmation badge */}
        {msg.escalated && (
          <div style={{
            marginTop: 6, padding: '7px 12px', borderRadius: 8,
            background: ESCALATED_BG, border: `1px solid #FDE68A`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>🎫</span>
            <p style={{ fontSize: 11, color: ESCALATED_TEXT, margin: 0 }}>
              Support ticket created — a team member will follow up within 1 business day.
            </p>
          </div>
        )}
        {/* SafeSport redirect notice */}
        {msg.safesport && (
          <div style={{
            marginTop: 6, padding: '8px 12px', borderRadius: 8,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🔗</span>
            <p style={{ fontSize: 11, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
              <strong>safesport.org</strong> — U.S. Center for SafeSport
            </p>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#bbb', margin: '3px 0 0 2px' }}>{msg.time}</p>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function SupportTyping() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
      <SupportAvatar />
      <div style={{
        background: SUPPORT_BG, border: `1px solid ${SUPPORT_LIGHT}`,
        borderRadius: '4px 14px 14px 14px',
        padding: '10px 16px', display: 'flex', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: SUPPORT_COLOR,
            animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SupportChat({ auth, onBack }) {
  const {
    messages, input, setInput, loading, quickPrompts, sendMessage,
  } = useSupportChat({ auth });

  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  const handlePrompt = (prompt) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: SUPPORT_COLOR,
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
          cursor: 'pointer', padding: 5, display: 'flex', color: '#fff',
        }}>
          {ChevLeft(18, '#fff')}
        </button>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ShieldCheck(18, '#fff')}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
            MatMind Support
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
            Private · Help &amp; troubleshooting
          </p>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px',
        }}>
          Private
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 12px',
          WebkitOverflowScrolling: 'touch',
          background: '#f8fafb',
        }}
      >
        {messages.map(m => <SupportBubble key={m.id} msg={m} />)}
        {loading && <SupportTyping />}

        {/* Quick-prompt chips — visible only on the first/greeting message */}
        {messages.length === 1 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingLeft: 36 }}>
            <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 2px' }}>Common questions:</p>
            {quickPrompts.map((q, i) => (
              <button key={i} onClick={() => handlePrompt(q)} style={{
                textAlign: 'left', background: 'none',
                border: `1px dashed ${SUPPORT_COLOR}`, borderRadius: 10,
                padding: '8px 12px', fontSize: 12, color: SUPPORT_COLOR,
                cursor: 'pointer',
              }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 12px', borderTop: `1px solid ${SUPPORT_LIGHT}`,
        display: 'flex', gap: 8, alignItems: 'center', background: '#fff',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask MatMind Support..."
          style={{
            flex: 1, background: '#f0f4f8', border: 'none', borderRadius: 20,
            padding: '10px 16px', fontSize: 14, outline: 'none', color: '#1a1a1a',
          }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: input.trim() && !loading ? SUPPORT_COLOR : '#ccd5de',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: input.trim() && !loading ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}>
          {Send(15, '#fff')}
        </button>
      </div>
    </div>
  );
}
