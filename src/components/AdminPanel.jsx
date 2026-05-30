import { useState } from 'react';
import { BRAND, GROUPS, GROUP_LABELS } from '../lib/constants';

const ADMIN_API = '/api/admin';

const INPUT_STYLE = {
  width: '100%', padding: '10px 12px', border: '1px solid #dde3ea',
  borderRadius: 10, fontSize: 14, color: '#1a1a1a',
  background: '#fff', boxSizing: 'border-box',
};

const LABEL_STYLE = {
  fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4, display: 'block',
};

const SECTION_STYLE = {
  background: '#f8fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 12,
};

function Field({ label, id, required, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={LABEL_STYLE}>
        {label}{required && <span style={{ color: BRAND.columbia, marginLeft: 2 }}>*</span>}
      </label>
      <input id={id} style={INPUT_STYLE} {...props} />
    </div>
  );
}

function SelectField({ label, id, required, children, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={LABEL_STYLE}>
        {label}{required && <span style={{ color: BRAND.columbia, marginLeft: 2 }}>*</span>}
      </label>
      <select id={id} value={value} onChange={onChange} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
        {children}
      </select>
    </div>
  );
}

// ── Add Coach Form ────────────────────────────────────────────────────────────

function AddCoachForm({ onSuccess, teamId }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', title: '', group: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // {ok, message}

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_coach', data: form, teamId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResult({ ok: true, message: json.message });
        setForm({ name: '', email: '', phone: '', title: '', group: '' });
        onSuccess?.({ type: 'coach', data: json.coach });
      } else {
        setResult({ ok: false, message: json.error || 'Something went wrong.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error — check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field
        label="Full Name" id="coach-name" required
        placeholder="e.g. Jordan Smith"
        value={form.name} onChange={set('name')}
        autoComplete="name"
      />
      <Field
        label="Email" id="coach-email" type="email" required
        placeholder="coach@example.com"
        value={form.email} onChange={set('email')}
        autoComplete="email"
      />
      <Field
        label="Phone" id="coach-phone" type="tel"
        placeholder="(404) 555-0100"
        value={form.phone} onChange={set('phone')}
        autoComplete="tel"
      />
      <Field
        label="Title" id="coach-title"
        placeholder="e.g. Assistant Coach, Tots Coach"
        value={form.title} onChange={set('title')}
      />
      <SelectField label="Roster Group" id="coach-group" value={form.group} onChange={set('group')}>
        <option value="">No specific group</option>
        {GROUPS.filter(g => g !== 'coaches').map(g => (
          <option key={g} value={g}>{GROUP_LABELS[g] ?? g}</option>
        ))}
      </SelectField>

      {result && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13,
          background: result.ok ? '#ecfdf5' : '#fff5f5',
          border: `1px solid ${result.ok ? '#a7f3d0' : '#fca5a5'}`,
          color: result.ok ? '#065f46' : '#b91c1c',
        }}>
          {result.ok ? '✅ ' : '⚠️ '}{result.message}
        </div>
      )}

      <button type="submit" disabled={loading || !form.name.trim() || !form.email.trim()} style={{
        width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
        background: loading ? '#aab4c0' : `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navy})`,
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
      }}>
        {loading ? 'Adding…' : 'Add Coach'}
      </button>
    </form>
  );
}

// ── Add Athlete Form ──────────────────────────────────────────────────────────

function ParentSection({ label, value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div style={SECTION_STYLE}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </p>
      <Field
        label="Parent Name" id={`${label}-name`}
        placeholder="Full name"
        value={value.name} onChange={set('name')}
      />
      <Field
        label="Email" id={`${label}-email`} type="email"
        placeholder="parent@example.com"
        value={value.email} onChange={set('email')}
      />
      <Field
        label="Phone" id={`${label}-phone`} type="tel"
        placeholder="(404) 555-0100"
        value={value.phone} onChange={set('phone')}
        style={{ marginBottom: 0 }}
      />
    </div>
  );
}

function AddAthleteForm({ onSuccess, teamId, defaultSchool = '' }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', weight: '', grade: '', school: defaultSchool, group: '',
  });
  const [parent1, setParent1] = useState({ name: '', email: '', phone: '' });
  const [parent2, setParent2] = useState({ name: '', email: '', phone: '' });
  const [showP2, setShowP2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.group) return;
    setLoading(true);
    setResult(null);

    const payload = {
      ...form,
      parent1: parent1.email.trim() ? parent1 : null,
      parent2: showP2 && parent2.email.trim() ? parent2 : null,
    };

    try {
      const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_athlete', data: payload, teamId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const warningNote = json.warnings?.length
          ? ` (${json.warnings.length} parent invite warning${json.warnings.length > 1 ? 's' : ''})`
          : '';
        setResult({ ok: true, message: json.message + warningNote, warnings: json.warnings });
        setForm({ firstName: '', lastName: '', weight: '', grade: '', school: defaultSchool, group: '' });
        setParent1({ name: '', email: '', phone: '' });
        setParent2({ name: '', email: '', phone: '' });
        setShowP2(false);
        onSuccess?.({ type: 'athlete', data: json.athlete });
      } else {
        setResult({ ok: false, message: json.error || 'Something went wrong.' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error — check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
        <Field
          label="First Name" id="ath-first" required
          placeholder="First"
          value={form.firstName} onChange={set('firstName')}
        />
        <Field
          label="Last Name" id="ath-last" required
          placeholder="Last"
          value={form.lastName} onChange={set('lastName')}
        />
      </div>

      <SelectField label="Roster Group" id="ath-group" required value={form.group} onChange={set('group')}>
        <option value="">Select group…</option>
        {GROUPS.filter(g => g !== 'coaches').map(g => (
          <option key={g} value={g}>{GROUP_LABELS[g] ?? g}</option>
        ))}
      </SelectField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field
          label="Weight (lbs)" id="ath-weight" type="number"
          placeholder="75"
          value={form.weight} onChange={set('weight')}
          min="40" max="400"
        />
        <Field
          label="Grade" id="ath-grade"
          placeholder="5th"
          value={form.grade} onChange={set('grade')}
        />
        <Field
          label="School" id="ath-school"
          placeholder={defaultSchool || 'School name'}
          value={form.school} onChange={set('school')}
        />
      </div>

      {/* Parent 1 */}
      <ParentSection label="Parent / Guardian 1" value={parent1} onChange={setParent1} />

      {/* Parent 2 toggle */}
      {!showP2 ? (
        <button type="button" onClick={() => setShowP2(true)} style={{
          width: '100%', padding: '10px 0', border: `1px dashed ${BRAND.columbia}`,
          borderRadius: 10, background: 'none', color: BRAND.columbia,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14,
        }}>
          + Add Second Parent / Guardian
        </button>
      ) : (
        <ParentSection label="Parent / Guardian 2" value={parent2} onChange={setParent2} />
      )}

      {result && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13,
          background: result.ok ? '#ecfdf5' : '#fff5f5',
          border: `1px solid ${result.ok ? '#a7f3d0' : '#fca5a5'}`,
          color: result.ok ? '#065f46' : '#b91c1c',
        }}>
          {result.ok ? '✅ ' : '⚠️ '}{result.message}
          {result.warnings?.length > 0 && (
            <ul style={{ marginTop: 6, paddingLeft: 16, fontSize: 12 }}>
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.firstName.trim() || !form.lastName.trim() || !form.group}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
          background: loading ? '#aab4c0' : `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navy})`,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Adding…' : 'Add Athlete'}
      </button>
    </form>
  );
}

// ── AdminPanel (bottom sheet) ─────────────────────────────────────────────────

export default function AdminPanel({ open, onClose, onMemberAdded, teamId, defaultSchool }) {
  const [activeTab, setActiveTab] = useState('athlete');

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 900, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: '#fff', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        zIndex: 901,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#dde3ea' }} />
        </div>

        {/* Header */}
        <div style={{
          padding: '8px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #eef1f5',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a', margin: 0 }}>Add Team Member</p>
            <p style={{ fontSize: 12, color: '#8a96a3', margin: 0 }}>Invite will be sent by email</p>
          </div>
          <button onClick={onClose} style={{
            background: '#f0f2f5', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#4a5568',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eef1f5', background: '#fff', flexShrink: 0 }}>
          {[['athlete', 'Athlete'], ['coach', 'Coach']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: activeTab === id ? BRAND.navy : '#aab4c0',
              borderBottom: activeTab === id ? `2px solid ${BRAND.navy}` : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable form area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px' }}>
          {activeTab === 'coach'
            ? <AddCoachForm onSuccess={onMemberAdded} teamId={teamId} />
            : <AddAthleteForm onSuccess={onMemberAdded} teamId={teamId} defaultSchool={defaultSchool} />
          }
        </div>
      </div>
    </>
  );
}
