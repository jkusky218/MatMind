import { useState, useEffect, useRef } from 'react';
import { BRAND } from '../lib/constants';
import { Brain, Check, Pin } from './Icons';

function Bold({ text }) {
  return text.split(/(\*\*.*?\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function ChatBubble({ msg, isOwn, canModerate, selected, onSelect, onSaveEdit, onDelete }) {
  const isBot = msg.role === 'ai';

  // Local edit state — lives here so we don't push textarea value up to the channel list
  const [editing,  setEditing]  = useState(false);
  const [editText, setEditText] = useState(msg.text ?? '');
  const textareaRef = useRef(null);

  // Keep editText in sync if the message is updated from outside (realtime)
  useEffect(() => { setEditText(msg.text ?? ''); }, [msg.text]);

  // Auto-focus the textarea when editing starts
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditText(msg.text ?? '');
    setEditing(true);
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    const trimmed = editText.trim();
    if (trimmed && trimmed !== msg.text) {
      onSaveEdit(msg.id, trimmed);
    }
    setEditing(false);
    onSelect(null);
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditText(msg.text ?? '');
    setEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(msg.id);
    onSelect(null);
  };

  const showActions = selected && !editing && !isBot && (isOwn || canModerate);

  return (
    <div
      onClick={() => onSelect(selected ? null : msg.id)}
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        marginBottom: 12, cursor: showActions || isOwn || canModerate ? 'pointer' : 'default',
      }}
    >
      {/* Avatar */}
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

      <div style={{ maxWidth: '82%' }}>
        {/* Sender name */}
        <p style={{
          fontSize: 10, fontWeight: 600, margin: '0 0 3px 2px',
          color: msg.role === 'coach' ? BRAND.goldDark : isBot ? BRAND.navyLight : '#888',
        }}>
          {msg.sender}{msg.role === 'coach' && !isBot ? ' • Coach' : ''}
        </p>

        {/* Pinned badge */}
        {msg.pinned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 2 }}>
            {Pin(10, BRAND.gold)}
            <span style={{ fontSize: 10, color: BRAND.goldDark, fontWeight: 600 }}>Pinned</span>
          </div>
        )}

        {/* Image attachments (above bubble) */}
        {msg.attachments?.filter(a => a.type?.startsWith('image/')).map((att, i) => (
          <img
            key={i} src={att.url} alt={att.name}
            onClick={(e) => { e.stopPropagation(); window.open(att.url, '_blank'); }}
            style={{ display: 'block', width: '100%', maxWidth: 240, borderRadius: 12, marginBottom: 4, cursor: 'pointer', objectFit: 'cover' }}
          />
        ))}

        {/* Message bubble */}
        {(msg.text?.trim() || msg.actions?.length || msg.followUp || !msg.attachments?.length) && (
          <div style={{
            background: isBot ? '#f0f4f8' : selected ? '#f0f4f8' : '#fff',
            color: '#1a1a1a',
            borderRadius: '4px 14px 14px 14px',
            padding: editing ? '10px 12px' : '10px 14px',
            fontSize: 13, lineHeight: 1.6,
            border: selected && !isBot ? `1px solid ${BRAND.columbia}50` : isBot ? 'none' : '1px solid #e8edf2',
            transition: 'border-color 0.15s, background 0.15s',
          }}>
            {editing ? (
              /* Inline edit UI */
              <div onClick={e => e.stopPropagation()}>
                <textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(e); }
                    if (e.key === 'Escape') cancelEdit(e);
                  }}
                  rows={Math.max(2, (editText.match(/\n/g) || []).length + 1)}
                  style={{
                    width: '100%', border: 'none', outline: 'none', resize: 'none',
                    fontSize: 13, lineHeight: 1.6, background: 'transparent',
                    fontFamily: 'inherit', color: '#1a1a1a',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={saveEdit} style={{
                    padding: '5px 14px', borderRadius: 8, border: 'none',
                    background: BRAND.navy, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>Save</button>
                  <button onClick={cancelEdit} style={{
                    padding: '5px 14px', borderRadius: 8, border: '1px solid #e0e6ee',
                    background: '#fff', color: '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <Bold text={msg.text ?? ''} />
                {msg.actions?.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {msg.actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {Check(13, BRAND.navy)}
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.followUp && (
                  <div style={{
                    marginTop: 10, padding: '8px 12px',
                    background: 'rgba(27,58,92,0.06)', borderRadius: 8, fontSize: 12, color: '#555',
                  }}>
                    {msg.followUp}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Non-image file attachments */}
        {msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, i) => (
          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
              background: '#f0f4f8', border: '1px solid #e0e6ee',
            }}
          >
            <span style={{ fontSize: 18 }}>📄</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {att.name}
            </span>
            <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>
              {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}
            </span>
          </a>
        ))}

        {/* Timestamp + edited badge */}
        <p style={{ fontSize: 10, color: '#bbb', margin: '3px 0 0 2px' }}>
          {msg.time}
          {msg.editedAt && <span style={{ marginLeft: 6, color: '#ccc' }}>· edited</span>}
        </p>

        {/* Action row — appears on tap for own messages or coach moderation */}
        {showActions && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }} onClick={e => e.stopPropagation()}>
            {isOwn && msg.text && (
              <button onClick={startEdit} style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid #e0e6ee',
                background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#555',
              }}>
                ✏️ Edit
              </button>
            )}
            {(isOwn || canModerate) && (
              <button onClick={handleDelete} style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca',
                background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#DC2626',
              }}>
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
