import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { ChevLeft, Plus, Trash, Check } from './Icons';
import { useEmailTemplates, SECTION_TYPE_LIBRARY, DEFAULT_TEMPLATE } from '../hooks/useEmailTemplates';

const SUPPORT_COLOR = '#059669';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Tag({ children, color = BRAND.navy }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: color + '18', color,
    }}>{children}</span>
  );
}

function Btn({ onClick, disabled, style = {}, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: 'none', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
      fontSize: 13, fontWeight: 600, padding: '10px 16px',
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}>{children}</button>
  );
}

// ── Section row (in builder) ──────────────────────────────────────────────────

function SectionRow({ section, index, total, onChange, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(false);
  const libEntry = SECTION_TYPE_LIBRARY.find(l => l.type === section.type) ?? SECTION_TYPE_LIBRARY.at(-1);

  return (
    <div style={{ border: '1px solid #e8edf2', borderRadius: 10, marginBottom: 8, background: '#fff', overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{libEntry.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{section.title}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{libEntry.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {section.auto_populate && <Tag color={BRAND.columbia}>Auto</Tag>}
          {section.is_required  && <Tag color={BRAND.navy}>Required</Tag>}
          {/* Up / Down */}
          <button onClick={e => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0}
            style={{ background: 'none', border: 'none', cursor: index ? 'pointer' : 'default', color: '#bbb', fontSize: 14, padding: '2px 4px' }}>▲</button>
          <button onClick={e => { e.stopPropagation(); onMove(index, 1); }} disabled={index === total - 1}
            style={{ background: 'none', border: 'none', cursor: index < total - 1 ? 'pointer' : 'default', color: '#bbb', fontSize: 14, padding: '2px 4px' }}>▼</button>
          <button onClick={e => { e.stopPropagation(); onRemove(index); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '2px 4px' }}>×</button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #f0f4f8' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginTop: 10, marginBottom: 3 }}>Section title</label>
          <input value={section.title} onChange={e => onChange(index, 'title', e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e6ed', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />

          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginTop: 10, marginBottom: 3 }}>
            AI guidance <span style={{ fontWeight: 400 }}>(instructions for filling this section)</span>
          </label>
          <textarea value={section.guidance} onChange={e => onChange(index, 'guidance', e.target.value)} rows={3}
            placeholder="e.g. Keep shoutouts to 2-3 athletes. Use first names only. Keep it warm."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0e6ed', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />

          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={section.is_required} onChange={e => onChange(index, 'is_required', e.target.checked)} />
              Required
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', cursor: 'pointer' }}>
              <input type="checkbox" checked={section.auto_populate} onChange={e => onChange(index, 'auto_populate', e.target.checked)} />
              Auto-populate from schedule data
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section picker modal ──────────────────────────────────────────────────────

function SectionPicker({ onAdd, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 430, background: '#fff', borderRadius: '16px 16px 0 0', padding: '16px 16px 32px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>Add a section</p>
        {SECTION_TYPE_LIBRARY.map(lib => (
          <button key={lib.type} onClick={() => { onAdd(lib); onClose(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: 'none', border: '1px solid #e8edf2', borderRadius: 10, cursor: 'pointer',
            marginBottom: 6, textAlign: 'left',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{lib.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{lib.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{lib.description}</p>
            </div>
            {lib.auto_populate && <Tag color={BRAND.columbia} style={{ marginLeft: 'auto' }}>Auto</Tag>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function TemplateList({ templates, onSelect, onCreate, onDelete, loading }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 13 }}>Loading templates…</p>
      ) : templates.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 13 }}>No templates yet.</p>
      ) : (
        templates.map(t => (
          <div key={t.id} onClick={() => onSelect(t)} style={{
            background: '#fff', border: '1px solid #e8edf2', borderRadius: 12,
            padding: '12px 14px', marginBottom: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>📧</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{t.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#888', marginTop: 2 }}>
                {t.sections?.length ?? 0} sections · {t.tone}
                {t.is_default ? ' · Default' : ''}
                {t.last_used_at ? ` · Used ${new Date(t.last_used_at).toLocaleDateString()}` : ''}
              </p>
            </div>
            {t.id !== '__default__' && (
              <button onClick={e => { e.stopPropagation(); onDelete(t.id); }} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '4px 6px',
              }}>×</button>
            )}
          </div>
        ))
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <Btn onClick={() => onCreate('paste')} style={{ background: BRAND.navy, color: '#fff', width: '100%' }}>
          📋 Paste &amp; Learn from existing email
        </Btn>
        <Btn onClick={() => onCreate('builder')} style={{ background: BRAND.columbiaLight, color: BRAND.navy, width: '100%' }}>
          ✏️ Build template from sections
        </Btn>
      </div>
    </div>
  );
}

function PasteAndLearn({ onBack, onSave, saving }) {
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [error,     setError]     = useState(null);

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setExtracted(data);
      setEditName(data.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async (setAsDefault) => {
    if (!extracted) return;
    await onSave({ ...extracted, name: editName, example_email: emailText, is_default: setAsDefault });
  };

  if (extracted) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <div style={{ background: SUPPORT_COLOR + '15', border: `1px solid ${SUPPORT_COLOR}40`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
          {Check(16, SUPPORT_COLOR)}
          <p style={{ margin: 0, fontSize: 13, color: '#065f46' }}>
            Found <strong>{extracted.sections.length} sections</strong> · Tone: <strong>{extracted.tone}</strong>
          </p>
        </div>

        <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Template name</label>
        <input value={editName} onChange={e => setEditName(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e0e6ed', fontSize: 14, boxSizing: 'border-box', marginBottom: 14, outline: 'none' }} />

        <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Extracted sections (tap to edit):</p>
        {extracted.sections.map((s, i) => {
          const lib = SECTION_TYPE_LIBRARY.find(l => l.type === s.type) ?? SECTION_TYPE_LIBRARY.at(-1);
          return (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #e8edf2', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>{lib.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</span>
                {s.auto_populate && <Tag color={BRAND.columbia}>Auto</Tag>}
              </div>
              {s.guidance && <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>{s.guidance}</p>}
            </div>
          );
        })}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <Btn onClick={() => handleSave(true)} disabled={saving} style={{ background: BRAND.navy, color: '#fff', width: '100%' }}>
            {saving ? 'Saving…' : 'Save as Default Template'}
          </Btn>
          <Btn onClick={() => handleSave(false)} disabled={saving} style={{ background: BRAND.columbiaLight, color: BRAND.navy, width: '100%' }}>
            Save (not default)
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
        Paste a previous weekly email below. MatMind AI will analyze its structure and
        extract a reusable template — sections, tone, guidance for the AI.
      </p>
      <textarea
        value={emailText}
        onChange={e => setEmailText(e.target.value)}
        placeholder="Paste your email here…"
        rows={12}
        style={{
          width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #e0e6ed',
          fontSize: 13, boxSizing: 'border-box', resize: 'vertical', outline: 'none',
          fontFamily: 'inherit', lineHeight: 1.6,
        }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</p>}
      <Btn onClick={handleAnalyze} disabled={!emailText.trim() || analyzing}
        style={{ background: BRAND.navy, color: '#fff', width: '100%', marginTop: 12 }}>
        {analyzing ? '🔍 Analyzing…' : '🔍 Analyze Email'}
      </Btn>
    </div>
  );
}

function SectionBuilder({ onBack, onSave, saving }) {
  const [name,        setName]        = useState('New Template');
  const [tone,        setTone]        = useState('friendly');
  const [sections,    setSections]    = useState([
    { ...SECTION_TYPE_LIBRARY[0], id: 'greeting', title: 'Opening Greeting', guidance: '', is_required: true, default_content: '' },
    { ...SECTION_TYPE_LIBRARY[1], id: 'schedule',  title: "This Week's Schedule", guidance: '', is_required: true, default_content: '' },
  ]);
  const [pickerOpen,  setPickerOpen]  = useState(false);

  const handleChange = (i, field, value) =>
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleMove = (i, dir) => {
    setSections(prev => {
      const arr = [...prev];
      const j   = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const handleRemove = (i) => setSections(prev => prev.filter((_, idx) => idx !== i));

  const handleAddSection = (lib) => {
    setSections(prev => [...prev, {
      id:              `${lib.type}_${Date.now()}`,
      type:            lib.type,
      title:           lib.label,
      description:     lib.description,
      guidance:        '',
      is_required:     false,
      auto_populate:   lib.auto_populate,
      default_content: '',
    }]);
  };

  const handleSave = async (setAsDefault) => {
    await onSave({ name, tone, sections, is_default: setAsDefault });
  };

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Template name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e0e6ed', fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }} />

        <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Email tone</label>
        <select value={tone} onChange={e => setTone(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e0e6ed', fontSize: 14, marginBottom: 16, outline: 'none', background: '#fff' }}>
          {['friendly', 'casual', 'formal', 'energetic'].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Sections</p>
        {sections.map((s, i) => (
          <SectionRow key={s.id} section={s} index={i} total={sections.length}
            onChange={handleChange} onRemove={handleRemove} onMove={handleMove} />
        ))}
        <button onClick={() => setPickerOpen(true)} style={{
          width: '100%', padding: '10px', border: `2px dashed ${BRAND.columbiaMid}`,
          borderRadius: 10, background: 'none', cursor: 'pointer',
          fontSize: 13, color: BRAND.navy, fontWeight: 600, marginBottom: 16,
        }}>
          + Add section
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn onClick={() => handleSave(true)} disabled={saving || sections.length === 0}
            style={{ background: BRAND.navy, color: '#fff', width: '100%' }}>
            {saving ? 'Saving…' : 'Save as Default Template'}
          </Btn>
          <Btn onClick={() => handleSave(false)} disabled={saving || sections.length === 0}
            style={{ background: BRAND.columbiaLight, color: BRAND.navy, width: '100%' }}>
            Save (not default)
          </Btn>
        </div>
      </div>
      {pickerOpen && <SectionPicker onAdd={handleAddSection} onClose={() => setPickerOpen(false)} />}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmailTemplateManager({ auth, onBack }) {
  const { templates, loading, saving, saveTemplate, deleteTemplate } = useEmailTemplates(auth);
  const [view,   setView]   = useState('list');   // 'list' | 'paste' | 'builder' | 'detail'
  const [detail, setDetail] = useState(null);
  const [toast,  setToast]  = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSave = async (templateData) => {
    const result = await saveTemplate(templateData);
    if (result.ok) { showToast('Template saved!'); setView('list'); }
    else showToast('Save failed: ' + result.error);
  };

  const handleDelete = async (id) => {
    await deleteTemplate(id);
    showToast('Template deleted.');
  };

  const viewTitle = view === 'paste' ? 'Paste & Learn' : view === 'builder' ? 'Section Builder' : view === 'detail' ? detail?.name : 'Email Templates';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`,
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button onClick={view === 'list' ? onBack : () => setView('list')} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
          padding: '5px 9px', cursor: 'pointer', color: BRAND.columbia, fontSize: 16,
        }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>📧 {viewTitle}</p>
          {view === 'list' && (
            <p style={{ fontSize: 11, color: BRAND.columbiaMid, margin: 0 }}>
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'list' && (
        <TemplateList
          templates={templates}
          loading={loading}
          onSelect={t => { setDetail(t); setView('detail'); }}
          onCreate={path => setView(path)}
          onDelete={handleDelete}
        />
      )}
      {view === 'paste' && (
        <PasteAndLearn onBack={() => setView('list')} onSave={handleSave} saving={saving} />
      )}
      {view === 'builder' && (
        <SectionBuilder onBack={() => setView('list')} onSave={handleSave} saving={saving} />
      )}
      {view === 'detail' && detail && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            Tone: <strong>{detail.tone}</strong> · {detail.sections?.length ?? 0} sections
          </p>
          {(detail.sections ?? []).map((s, i) => {
            const lib = SECTION_TYPE_LIBRARY.find(l => l.type === s.type) ?? SECTION_TYPE_LIBRARY.at(-1);
            return (
              <div key={s.id ?? i} style={{ background: '#fff', border: '1px solid #e8edf2', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <span>{lib.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</span>
                  {s.auto_populate && <Tag color={BRAND.columbia}>Auto</Tag>}
                  {s.is_required  && <Tag color={BRAND.navy}>Required</Tag>}
                </div>
                {s.guidance && <p style={{ fontSize: 11, color: '#666', margin: 0 }}>{s.guidance}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', borderRadius: 20, padding: '8px 18px',
          fontSize: 13, fontWeight: 600, zIndex: 300, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </div>
  );
}
