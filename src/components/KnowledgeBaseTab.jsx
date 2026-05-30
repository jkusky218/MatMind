import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { BookOpen, Upload, Trash } from './Icons';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',        label: 'All',       color: BRAND.navy,     emoji: '📚' },
  { id: 'tournament', label: 'Tournament', color: '#C4A44A',      emoji: '🏆' },
  { id: 'policy',     label: 'Policy',    color: BRAND.navy,     emoji: '📋' },
  { id: 'faq',        label: 'FAQ',       color: BRAND.columbia, emoji: '❓' },
  { id: 'other',      label: 'Other',     color: '#7B5EA7',      emoji: '📌' },
];

const catById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

// ── CategoryBadge ─────────────────────────────────────────────────────────────

function CategoryBadge({ categoryId, small = false }) {
  const cat = catById[categoryId];
  if (!cat) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 20,
      background: cat.color + '18', color: cat.color,
      fontSize: small ? 10 : 11, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      {cat.emoji} {cat.label}
    </span>
  );
}

// ── Add Entry Sheet ───────────────────────────────────────────────────────────

function AddEntrySheet({ onClose, onAdd }) {
  const [step,     setStep]     = useState('choose');
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('tournament');
  const [content,  setContent]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const cats = CATEGORIES.filter(c => c.id !== 'all');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    const result = await onAdd({ title: title.trim(), category, content: content.trim() });
    setSaving(false);
    if (result?.ok === false) {
      setError(result.error ?? 'Could not save entry. Try again.');
    } else {
      onClose();
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #e0e6ee', fontSize: 14, color: '#1a1a1a',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '20px 16px 36px', maxWidth: 430, width: '100%', margin: '0 auto',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: '#dde3ea', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* ── Step: choose method ── */}
        {step === 'choose' && (<>
          <p style={{ fontSize: 17, fontWeight: 700, color: BRAND.navy, marginBottom: 4 }}>Add to Knowledge Base</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Choose how you want to add content.</p>

          <p style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>TITLE</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Wolfpack Takedown Hammer"
            style={{ ...inputStyle, marginBottom: 16 }} />

          <p style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>CATEGORY</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
            {cats.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid',
                borderColor: category === cat.id ? cat.color : '#e0e6ee',
                background: category === cat.id ? cat.color + '18' : 'transparent',
                color: category === cat.id ? cat.color : '#aaa',
              }}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setStep('type')} style={{
              padding: '18px 12px', borderRadius: 14, border: '1.5px solid #e0e6ee',
              background: '#f8fafb', cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✏️</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, marginBottom: 2 }}>Type Content</p>
              <p style={{ fontSize: 11, color: '#aaa' }}>Paste or type directly</p>
            </button>
            <button onClick={() => setStep('upload')} style={{
              padding: '18px 12px', borderRadius: 14, border: '1.5px solid #e0e6ee',
              background: '#f8fafb', cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, marginBottom: 2 }}>Upload File</p>
              <p style={{ fontSize: 11, color: '#aaa' }}>PDF or image</p>
            </button>
          </div>
        </>)}

        {/* ── Step: type content ── */}
        {step === 'type' && (<>
          <button onClick={() => setStep('choose')} style={{
            background: 'none', border: 'none', fontSize: 13, color: BRAND.columbia,
            cursor: 'pointer', padding: 0, marginBottom: 16, fontWeight: 600,
          }}>← Back</button>
          <p style={{ fontSize: 17, fontWeight: 700, color: BRAND.navy, marginBottom: 16 }}>Type or Paste Content</p>

          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Paste tournament info, policy text, FAQ answers, or any notes here…"
            rows={10}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, marginBottom: 16 }} />

          {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim()} style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: (!saving && title.trim() && content.trim()) ? BRAND.navy : '#ccd5de',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save to Knowledge Base'}
          </button>
        </>)}

        {/* ── Step: upload (coming soon) ── */}
        {step === 'upload' && (<>
          <button onClick={() => setStep('choose')} style={{
            background: 'none', border: 'none', fontSize: 13, color: BRAND.columbia,
            cursor: 'pointer', padding: 0, marginBottom: 16, fontWeight: 600,
          }}>← Back</button>
          <p style={{ fontSize: 17, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Upload a File</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            MatMind will read the file and extract the text automatically.
          </p>
          <div style={{
            border: '2px dashed #c8d6e5', borderRadius: 14, padding: '36px 20px',
            textAlign: 'center', background: '#f8fafb', marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy, marginBottom: 4 }}>Drop a PDF or image here</p>
            <p style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>or</p>
            <div style={{
              display: 'inline-block', padding: '9px 20px', borderRadius: 20,
              background: BRAND.columbiaLight, color: BRAND.navy, fontSize: 13, fontWeight: 600,
            }}>Browse files</div>
          </div>
          <div style={{
            background: '#FFF9E6', border: '1px solid #F0D97A', borderRadius: 10,
            padding: '10px 14px', display: 'flex', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <p style={{ fontSize: 12, color: '#92710A', lineHeight: 1.5 }}>
              File upload is coming soon. For now use <strong>Type Content</strong> and paste the text directly.
            </p>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Entry Detail ──────────────────────────────────────────────────────────────

function EntryDetail({ entry, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navy})`,
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
          padding: '6px 10px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600,
        }}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setConfirmDelete(true)} style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#fca5a5', fontSize: 12, fontWeight: 600,
        }}>
          {Trash(13, '#fca5a5')} Delete
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <CategoryBadge categoryId={entry.category} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy, margin: '10px 0 16px', lineHeight: 1.3 }}>
          {entry.title}
        </h2>

        <div style={{
          background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e8edf2',
          fontSize: 13, color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap',
          fontFamily: 'inherit', marginBottom: 16,
        }}>
          {entry.content}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {entry.fileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>📄</span>
              <span style={{ fontSize: 12, color: '#888' }}>{entry.fileName}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>🕐</span>
            <span style={{ fontSize: 12, color: '#888' }}>Added {entry.createdAt}</span>
          </div>
        </div>

        <button style={{
          width: '100%', padding: '13px 0', borderRadius: 12,
          background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.navyLight})`,
          border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span>🤖</span> Ask AI to generate a message from this
        </button>
        <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 8 }}>
          Opens the MatMind AI channel with this entry in context — coming soon
        </p>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setConfirmDelete(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '24px 16px 32px', maxWidth: 430, width: '100%',
          }}>
            <div style={{ width: 36, height: 4, background: '#dde3ea', borderRadius: 2, margin: '0 auto 20px' }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Delete this entry?</p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
              "{entry.title}" will be removed. This cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{
                padding: '13px 0', borderRadius: 12, border: '1.5px solid #e0e6ee',
                background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => { onDelete(entry.id); onClose(); }} style={{
                padding: '13px 0', borderRadius: 12, border: 'none',
                background: '#EF4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, onClick }) {
  const preview = entry.content.slice(0, 110).replace(/\n/g, ' ') + '…';
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: '#fff',
      border: '1px solid #e8edf2', borderRadius: 14, padding: 14,
      cursor: 'pointer', display: 'block',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <CategoryBadge categoryId={entry.category} small />
        <span style={{ fontSize: 11, color: '#bbb' }}>{entry.createdAt}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, marginBottom: 6, lineHeight: 1.3 }}>
        {entry.title}
      </p>
      <p style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{preview}</p>
      {entry.fileName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <span style={{ fontSize: 11 }}>📄</span>
          <span style={{ fontSize: 11, color: '#aaa' }}>{entry.fileName}</span>
        </div>
      )}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// Props come from MainApp via useKnowledgeBase hook — no local mock data.

export default function KnowledgeBaseTab({ entries = [], loading = false, onAdd, onDelete, isCoach = true }) {
  const [activeFilter, setFilter]    = useState('all');
  const [selectedEntry, setSelected] = useState(null);
  const [showAdd, setShowAdd]        = useState(false);

  const filtered = activeFilter === 'all'
    ? entries
    : entries.filter(e => e.category === activeFilter);

  if (selectedEntry) {
    return (
      <EntryDetail
        entry={selectedEntry}
        onClose={() => setSelected(null)}
        onDelete={(id) => { onDelete(id); setSelected(null); }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sub-header */}
      <div style={{ padding: '12px 16px 0', background: '#fff', borderBottom: '1px solid #e8edf2', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {BookOpen(16, BRAND.navy)}
            <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy }}>Knowledge Base</span>
            <span style={{
              background: BRAND.columbiaLight, color: BRAND.navy,
              fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            }}>{entries.length}</span>
          </div>
          {isCoach && (
            <button onClick={() => setShowAdd(true)} style={{
              background: BRAND.navy, border: 'none', borderRadius: 8,
              padding: '7px 13px', fontSize: 12, fontWeight: 700,
              color: '#fff', cursor: 'pointer',
            }}>+ Add</button>
          )}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map(cat => {
            const isActive = activeFilter === cat.id;
            const count = cat.id === 'all' ? null : entries.filter(e => e.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setFilter(cat.id)} style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: isActive ? cat.color : '#e0e6ee',
                background: isActive ? cat.color + '15' : 'transparent',
                color: isActive ? cat.color : '#aab4c0', whiteSpace: 'nowrap',
              }}>
                {cat.id !== 'all' && cat.emoji + ' '}{cat.label}
                {count != null && <span style={{ marginLeft: 4, opacity: 0.7 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 13, color: '#aaa' }}>Loading knowledge base…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: BRAND.navy, marginBottom: 6 }}>No entries yet</p>
            <p style={{ fontSize: 13, color: '#aaa' }}>
              {isCoach ? 'Tap "+ Add" to add your first knowledge base entry.' : 'Your coach hasn\'t added any entries yet.'}
            </p>
          </div>
        ) : (
          filtered.map(entry => (
            <EntryCard key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
          ))
        )}

        {!loading && entries.length > 0 && (
          <div style={{
            background: BRAND.columbiaLight, borderRadius: 12, padding: '12px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <p style={{ fontSize: 12, color: BRAND.navy, lineHeight: 1.5 }}>
              MatMind AI reads your Knowledge Base automatically. Ask it to generate parent messages, answer questions, or summarize any entry.
            </p>
          </div>
        )}
      </div>

      {showAdd && <AddEntrySheet onClose={() => setShowAdd(false)} onAdd={onAdd} />}
    </div>
  );
}
