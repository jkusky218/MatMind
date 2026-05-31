import { BRAND } from '../lib/constants';
import { Brain, Check, Pin } from './Icons';

function Bold({ text }) {
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function ChatBubble({ msg, isUser }) {
  const isBot = msg.role === 'ai';
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: isBot ? BRAND.navy : msg.role === 'coach' ? BRAND.gold : BRAND.columbiaLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
          color: isBot || msg.role === 'coach' ? '#fff' : BRAND.navy,
        }}>
          {isBot
            ? Brain(14, BRAND.columbia)
            : msg.sender?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      )}
      <div style={{ maxWidth: '82%' }}>
        {!isUser && (
          <p style={{
            fontSize: 10, fontWeight: 600, margin: '0 0 3px 2px',
            color: msg.role === 'coach' ? BRAND.goldDark : isBot ? BRAND.navyLight : '#888',
          }}>
            {msg.sender}{msg.role === 'coach' && !isBot ? ' • Coach' : ''}
          </p>
        )}
        {msg.pinned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 2 }}>
            {Pin(10, BRAND.gold)}
            <span style={{ fontSize: 10, color: BRAND.goldDark, fontWeight: 600 }}>Pinned</span>
          </div>
        )}
        {/* Attachments — images render above the text bubble; files render as chips */}
        {msg.attachments?.filter(a => a.type?.startsWith('image/')).map((att, i) => (
          <img
            key={i}
            src={att.url}
            alt={att.name}
            onClick={() => window.open(att.url, '_blank')}
            style={{
              display: 'block', width: '100%', maxWidth: 240,
              borderRadius: 12, marginBottom: 4, cursor: 'pointer',
              objectFit: 'cover',
            }}
          />
        ))}

        {/* Text + actions bubble — skip if empty and we have attachments */}
        {(msg.text?.trim() || msg.actions?.length || msg.followUp || !msg.attachments?.length) && (
          <div style={{
            background: isUser ? BRAND.navy : isBot ? '#f0f4f8' : '#fff',
            color: isUser ? '#fff' : '#1a1a1a',
            borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-line',
            border: isUser || isBot ? 'none' : '1px solid #e8edf2',
          }}>
            <Bold text={msg.text ?? ''} />
            {msg.actions?.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {msg.actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {Check(13, isUser ? BRAND.columbiaMid : BRAND.navy)}
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
            {msg.followUp && (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: isUser ? 'rgba(107,173,228,0.15)' : 'rgba(27,58,92,0.06)',
                borderRadius: 8, fontSize: 12,
                color: isUser ? BRAND.columbiaMid : '#555',
              }}>
                {msg.followUp}
              </div>
            )}
          </div>
        )}

        {/* Non-image attachments (PDFs etc.) — download chips */}
        {msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, i) => (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
              background: isUser ? 'rgba(255,255,255,0.12)' : '#f0f4f8',
              border: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e0e6ee',
            }}
          >
            <span style={{ fontSize: 18 }}>📄</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: isUser ? '#fff' : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {att.name}
            </span>
            <span style={{ fontSize: 11, color: isUser ? BRAND.columbiaMid : '#999', flexShrink: 0 }}>
              {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}
            </span>
          </a>
        ))}
        {!isUser && (
          <p style={{ fontSize: 10, color: '#bbb', margin: '3px 0 0 2px' }}>{msg.time}</p>
        )}
      </div>
    </div>
  );
}
