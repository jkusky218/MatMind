// SettingsPage — Full-screen settings view
// All users:  Account info, personal notification prefs (Soon)
// Admin only: Team Branding, Roster Groups, Member Management

import { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND, GROUPS, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { ChevLeft, Shield, Plus, Trash } from './Icons';
import { uploadTeamLogo } from '../lib/storage';

// ── Shared UI primitives ──────────────────────────────────────────────────────

function SectionLabel({ children, adminOnly }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 8px 4px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#8a96a3', textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>
        {children}
      </p>
      {adminOnly && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: BRAND.gold,
          background: BRAND.goldLight, borderRadius: 4,
          padding: '1px 6px', border: `1px solid ${BRAND.gold}50`,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>Admin</span>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eef1f5', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#f0f2f5' }} />;
}

function SaveCancelRow({ onSave, onCancel, saving, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #f0f2f5' }}>
      <button onClick={onSave} disabled={saving || disabled} style={{
        flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
        background: (saving || disabled) ? '#ccd5de' : BRAND.navy,
        color: '#fff', fontSize: 13, fontWeight: 700,
        cursor: (saving || disabled) ? 'not-allowed' : 'pointer',
      }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={onCancel} disabled={saving} style={{
        padding: '10px 18px', borderRadius: 10, border: '1px solid #e0e6ee',
        background: 'none', color: '#666', fontSize: 13, cursor: 'pointer',
      }}>Cancel</button>
    </div>
  );
}

function RoleBadge({ role }) {
  const config = {
    admin:  { label: 'Admin',  bg: BRAND.goldLight,    color: BRAND.gold },
    coach:  { label: 'Coach',  bg: BRAND.columbiaLight, color: BRAND.navy },
    parent: { label: 'Parent', bg: '#f3f0ff',           color: '#7B5EA7' },
  };
  const c = config[role] ?? config.parent;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px', background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 7px',
      background: status === 'active' ? '#dcfce7' : '#fef9c3',
      color: status === 'active' ? '#16a34a' : '#a16207',
    }}>
      {status === 'active' ? 'Active' : 'Pending'}
    </span>
  );
}

// ── Team Name editor ──────────────────────────────────────────────────────────

function TeamNameEditor({ teamName, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(teamName);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { setValue(teamName); }, [teamName]);

  async function handleSave() {
    if (!value.trim() || value.trim() === teamName) { setEditing(false); return; }
    setSaving(true);
    await onSave({ teamName: value.trim() });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', gap: 12 }}>
        <span style={{ fontSize: 18, width: 32, textAlign: 'center', flexShrink: 0 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: '#8a96a3', margin: '0 0 1px', fontWeight: 500 }}>Team Name</p>
          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 14,
                border: `1.5px solid ${BRAND.columbia}`, outline: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{teamName}</p>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            fontSize: 12, fontWeight: 600, color: BRAND.columbia,
            background: BRAND.columbiaLight, border: 'none', borderRadius: 8,
            padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
          }}>Edit</button>
        )}
      </div>
      {editing && (
        <SaveCancelRow
          onSave={handleSave}
          onCancel={() => { setEditing(false); setValue(teamName); }}
          saving={saving}
          disabled={!value.trim()}
        />
      )}
    </div>
  );
}

// ── Color picker ──────────────────────────────────────────────────────────────

const BRAND_PRESETS = [
  '#1B3A5C', '#0F2440', '#2A4F7A', '#6BADE4',
  '#C4A44A', '#7B5EA7', '#16a34a', '#dc2626',
  '#ea580c', '#0891b2', '#0f766e', '#7c3aed',
];

function ColorPickerRow({ icon, label, colorKey, currentColor, onSave }) {
  const [editing, setEditing] = useState(false);
  const [hex,     setHex]     = useState(currentColor);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { setHex(currentColor); }, [currentColor]);

  async function handleSave() {
    setSaving(true);
    await onSave({ [colorKey]: hex });
    setSaving(false);
    setEditing(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: currentColor, border: '1px solid rgba(0,0,0,0.08)',
        }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: '#8a96a3', margin: '0 0 1px', fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#1a1a1a', fontFamily: 'monospace' }}>
            {currentColor}
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            fontSize: 12, fontWeight: 600, color: BRAND.columbia,
            background: BRAND.columbiaLight, border: 'none', borderRadius: 8,
            padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
          }}>Edit</button>
        )}
      </div>

      {editing && (
        <div style={{ padding: '0 16px 4px' }}>
          {/* Preset swatches */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8a96a3', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Presets</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {BRAND_PRESETS.map(c => (
              <button key={c} onClick={() => setHex(c)} style={{
                width: 30, height: 30, borderRadius: '50%', background: c,
                border: 'none', cursor: 'pointer', flexShrink: 0,
                boxShadow: hex === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : '0 1px 2px rgba(0,0,0,0.15)',
              }} />
            ))}
          </div>

          {/* Custom hex input */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8a96a3', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Custom</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: hex,
              border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
            }} />
            <input
              value={hex}
              onChange={e => setHex(e.target.value)}
              placeholder="#1B3A5C"
              maxLength={7}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 14,
                border: `1.5px solid ${BRAND.columbia}`, outline: 'none',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>
      )}

      {editing && (
        <SaveCancelRow
          onSave={handleSave}
          onCancel={() => { setEditing(false); setHex(currentColor); }}
          saving={saving}
        />
      )}
    </div>
  );
}

// ── Groups Manager ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#1B3A5C', '#6BADE4', '#7B5EA7', '#C4A44A',
  '#16a34a', '#dc2626', '#ea580c', '#0891b2',
];

function GroupsManager({ initialGroups, onSave }) {
  const [groups,     setGroups]     = useState(initialGroups);
  const [dirty,      setDirty]      = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [newLabel,   setNewLabel]   = useState('');
  const [newColor,   setNewColor]   = useState(COLOR_PRESETS[0]);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { setGroups(initialGroups); setDirty(false); }, [initialGroups]);

  function addGroup() {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    if (groups.some(g => g.id === id)) return;
    const next = [...groups, { id, label: newLabel.trim(), color: newColor }];
    setGroups(next);
    setDirty(true);
    setNewLabel('');
    setNewColor(COLOR_PRESETS[0]);
    setAdding(false);
  }

  function removeGroup(id) {
    const next = groups.filter(g => g.id !== id);
    setGroups(next);
    setDirty(true);
    setConfirmDel(null);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ groups });
    setSaving(false);
    setDirty(false);
  }

  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: i < groups.length - 1 || adding ? '1px solid #f0f2f5' : 'none',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{g.label}</p>
          <span style={{ fontSize: 11, color: '#b0b8c2', fontFamily: 'monospace' }}>/{g.id}</span>
          {g.id !== 'coaches' && (
            confirmDel === g.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => removeGroup(g.id)} style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: '#dc2626', border: 'none', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer',
                }}>Delete</button>
                <button onClick={() => setConfirmDel(null)} style={{
                  fontSize: 11, color: '#666', background: '#f0f2f5',
                  border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(g.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#b0b8c2', fontSize: 18, padding: '0 2px', lineHeight: 1,
              }}>×</button>
            )
          )}
        </div>
      ))}

      {adding ? (
        <div style={{ padding: '14px 16px', borderTop: '1px solid #f0f2f5' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8a96a3', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>New Group</p>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Group name (e.g. Intermediate)"
            autoFocus
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1.5px solid #e0e6ee', fontSize: 14, outline: 'none',
              boxSizing: 'border-box', marginBottom: 10,
            }}
          />
          <p style={{ fontSize: 11, fontWeight: 600, color: '#8a96a3', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Color</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: 26, height: 26, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: newColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addGroup} disabled={!newLabel.trim()} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: newLabel.trim() ? BRAND.navy : '#ccd5de',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: newLabel.trim() ? 'pointer' : 'not-allowed',
            }}>Add Group</button>
            <button onClick={() => { setAdding(false); setNewLabel(''); }} style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid #e0e6ee',
              background: 'none', color: '#666', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          width: '100%', padding: '12px 16px', background: 'none',
          border: 'none', borderTop: groups.length ? '1px solid #f0f2f5' : 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          color: BRAND.columbia, fontSize: 13, fontWeight: 600,
        }}>
          {Plus(14, BRAND.columbia)} Add Group
        </button>
      )}

      {dirty && !adding && (
        <div style={{ padding: '0 16px 14px' }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
            background: saving ? '#ccd5de' : BRAND.navy,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Member Management ─────────────────────────────────────────────────────────

function MemberCard({ member, currentUserId, teamId, onRoleChange, onResetPassword }) {
  const [saving,    setSaving]    = useState(false);
  const [localRole, setLocalRole] = useState(member.role);
  const [resetState, setResetState] = useState('idle'); // idle | sending | sent | error
  const isMe = member.id === currentUserId;

  async function handleRoleChange(newRole) {
    if (newRole === localRole || isMe) return;
    setSaving(true);
    await onRoleChange(member.id, newRole);
    setLocalRole(newRole);
    setSaving(false);
  }

  async function handleReset() {
    if (resetState === 'sending' || !member.email) return;
    setResetState('sending');
    const res = await onResetPassword(member.email);
    setResetState(res?.ok ? 'sent' : 'error');
    if (res?.ok) setTimeout(() => setResetState('idle'), 4000);
  }

  const initials = (member.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Which roles can this member be assigned?
  const availableRoles = member.role === 'parent' || localRole === 'parent'
    ? ['parent', 'admin']
    : ['coach', 'admin'];

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid #f0f2f5',
    }}>
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: localRole === 'admin' ? BRAND.goldLight
          : localRole === 'coach' ? BRAND.columbiaLight : '#f3f0ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        color: localRole === 'admin' ? BRAND.goldDark
          : localRole === 'coach' ? BRAND.navy : '#7B5EA7',
      }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{member.name}</p>
          {isMe && <span style={{ fontSize: 10, color: '#8a96a3', fontStyle: 'italic' }}>you</span>}
        </div>
        <p style={{ fontSize: 11, color: '#8a96a3', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.email}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={member.status} />
          {/* Role pills */}
          {!isMe && availableRoles.map(r => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              disabled={saving}
              style={{
                fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px',
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: localRole === r
                  ? (r === 'admin' ? BRAND.goldLight : r === 'coach' ? BRAND.columbiaLight : '#f3f0ff')
                  : '#f0f2f5',
                color: localRole === r
                  ? (r === 'admin' ? BRAND.goldDark : r === 'coach' ? BRAND.navy : '#7B5EA7')
                  : '#8a96a3',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          {isMe && <RoleBadge role={localRole} />}

          {/* Send password reset — admin convenience */}
          {!isMe && member.email && (
            <button
              onClick={handleReset}
              disabled={resetState === 'sending'}
              title={`Send a password reset link to ${member.email}`}
              style={{
                fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 9px',
                border: '1px solid #e0e6ee', cursor: resetState === 'sending' ? 'default' : 'pointer',
                background: resetState === 'sent' ? '#dcfce7' : '#fff',
                color: resetState === 'sent' ? '#16a34a' : resetState === 'error' ? '#dc2626' : '#6b7280',
              }}
            >
              {resetState === 'sending' ? 'Sending…'
                : resetState === 'sent' ? '✓ Sent'
                : resetState === 'error' ? 'Failed — retry'
                : '🔑 Reset PW'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberManagement({ auth, teamId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_members', teamId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setMembers(data.members ?? []);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [teamId]);

  async function handleRoleChange(userId, role) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_role', data: { userId, role }, teamId }),
    });
    const data = await res.json();
    if (data.error) console.error('Role change failed:', data.error);
    else setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
  }

  const filtered = members.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    admin:  members.filter(m => m.role === 'admin').length,
    coach:  members.filter(m => m.role === 'coach').length,
    parent: members.filter(m => m.role === 'parent').length,
    pending: members.filter(m => m.status === 'pending').length,
  };

  if (loading) return (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8a96a3', fontSize: 13 }}>
      Loading members…
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', color: '#dc2626', fontSize: 13 }}>
      Error: {error}
    </div>
  );

  return (
    <div>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f0f2f5', flexWrap: 'wrap' }}>
        {[
          { label: 'Admins',  count: counts.admin,  color: BRAND.goldDark,  bg: BRAND.goldLight },
          { label: 'Coaches', count: counts.coach,  color: BRAND.navy,      bg: BRAND.columbiaLight },
          { label: 'Parents', count: counts.parent, color: '#7B5EA7',       bg: '#f3f0ff' },
          { label: 'Pending', count: counts.pending, color: '#a16207',      bg: '#fef9c3' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 8, padding: '4px 10px', display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f2f5' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
            border: '1.5px solid #e0e6ee', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <p style={{ padding: '20px', textAlign: 'center', color: '#b0b8c2', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
          {search ? 'No members match your search.' : 'No members found.'}
        </p>
      ) : (
        filtered.map((m, i) => (
          <MemberCard
            key={m.id}
            member={m}
            currentUserId={auth?.user?.id}
            teamId={teamId}
            onRoleChange={handleRoleChange}
            onResetPassword={(email) => auth.resetPassword(email)}
          />
        ))
      )}
    </div>
  );
}

// ── Notification Channel Row (toggles — UI only until push prefs table built) ─

function NotifChannelRow({ label, icon, coachEnabled, parentEnabled, last }) {
  const [coach,  setCoach]  = useState(coachEnabled);
  const [parent, setParent] = useState(parentEnabled);

  function Toggle({ on, onToggle, label: lbl }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <p style={{ fontSize: 9, fontWeight: 600, color: '#8a96a3', margin: 0, textTransform: 'uppercase' }}>{lbl}</p>
        <button onClick={onToggle} style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: on ? BRAND.navy : '#dde3ea',
          position: 'relative', transition: 'background 0.15s',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2, left: on ? 18 : 2,
            transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid #f0f2f5',
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{label}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Toggle on={coach}  onToggle={() => setCoach(p => !p)}  label="Coach" />
        <Toggle on={parent} onToggle={() => setParent(p => !p)} label="Parent" />
      </div>
    </div>
  );
}

// ── Test Notification button ──────────────────────────────────────────────────
// Sends a push only to the current user's devices so they can verify delivery
// without a second device (channel-message notifications exclude the sender).

function TestNotifButton({ teamId, userId }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | none | error

  async function send() {
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🦁 MatMind',
          body:  'Test notification — push is working!',
          teamId,
          targetUserId: userId,
        }),
      });
      const data = await res.json();
      setState(res.ok && data.sent > 0 ? 'sent' : 'none');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 6000);
  }

  const label = {
    idle:    'Send a test notification',
    sending: 'Sending…',
    sent:    '✓ Sent — check your lock screen',
    none:    'No device registered — re-enable above',
    error:   'Failed — try again',
  }[state];

  return (
    <button onClick={send} disabled={state === 'sending'} style={{
      width: '100%', padding: '11px 0', borderRadius: 10, marginTop: 8,
      border: `1px solid ${state === 'sent' ? '#16a34a' : '#e0e6ee'}`,
      background: state === 'sent' ? '#dcfce7' : '#fff',
      color: state === 'sent' ? '#16a34a' : state === 'none' || state === 'error' ? '#dc2626' : BRAND.navy,
      fontSize: 13, fontWeight: 700, cursor: state === 'sending' ? 'default' : 'pointer',
    }}>
      {label}
    </button>
  );
}

// ── Logo Uploader ─────────────────────────────────────────────────────────────

function LogoUploader({ logoUrl, teamId, onSave }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const url = await uploadTeamLogo(file, teamId);
      await onSave({ logoUrl: url });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function handleRemove() {
    setBusy(true); setError(null);
    await onSave({ logoUrl: null });
    setBusy(false);
  }

  return (
    <div style={{ padding: '13px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Preview */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: logoUrl ? '#fff' : '#f0f2f5', border: '1px solid #e6eaef',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="Team logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: 20 }}>🖼️</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: '#8a96a3', margin: '0 0 1px', fontWeight: 500 }}>Team Logo</p>
          <p style={{ fontSize: 13, color: '#1a1a1a', margin: 0 }}>
            {logoUrl ? 'Shown on login & header' : 'PNG, JPG, or SVG · up to 2 MB'}
          </p>
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          style={{ display: 'none' }} onChange={handleFile} />

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {logoUrl && !busy && (
            <button onClick={handleRemove} style={{
              fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '6px 10px',
              border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer',
            }}>Remove</button>
          )}
          <button onClick={() => inputRef.current?.click()} disabled={busy} style={{
            fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 12px',
            border: 'none', background: busy ? '#ccd5de' : BRAND.navy, color: '#fff',
            cursor: busy ? 'default' : 'pointer',
          }}>
            {busy ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
          </button>
        </div>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 11, margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}

// ── AI channel mode (admin) ───────────────────────────────────────────────────

function AiChannelModeRow({ mode = 'smart', onSave }) {
  const [saving, setSaving] = useState(false);
  const opts = [
    { v: 'off',      label: 'Off',      desc: 'The AI never replies in group channels.' },
    { v: 'mentions', label: 'Mentions', desc: 'The AI replies only when someone tags @MatMind.' },
    { v: 'smart',    label: 'Smart',    desc: 'The AI replies to genuine questions and @MatMind mentions, and stays out of normal conversation.' },
  ];
  async function pick(v) { if (v === mode || saving) return; setSaving(true); await onSave({ aiChannelMode: v }); setSaving(false); }
  const current = opts.find(o => o.v === mode) || opts[2];
  return (
    <div style={{ padding: '13px 16px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => pick(o.v)} disabled={saving} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer', border: '1.5px solid',
            borderColor: mode === o.v ? BRAND.navy : '#e0e6ee',
            background: mode === o.v ? BRAND.navy : '#fff',
            color: mode === o.v ? '#fff' : '#8a96a3', transition: 'all 0.12s',
          }}>{o.label}</button>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: '#8a96a3', margin: 0, lineHeight: 1.45 }}>{current.desc}</p>
    </div>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────────────────────

export default function SettingsPage({ auth, teamSettings = {}, onUpdateSettings, onClose, push }) {
  const teamName       = teamSettings.teamName    || 'My Team';
  const primaryColor   = teamSettings.primaryColor   || '#1B3A5C';
  const secondaryColor = teamSettings.secondaryColor || '#6BADE4';
  const groups         = teamSettings.groups || [];

  // Channels available for push notification prefs — dynamic: Announcements + one per non-coach group
  const notifChannels = [
    { slug: 'announcements', label: 'Announcements', icon: '📣' },
    ...groups
      .filter(g => g.id !== 'coaches')
      .map(g => ({ slug: g.id, label: g.label, icon: '#️⃣' })),
  ];

  const profile = auth.profile;
  const isAdmin = profile?.role === 'admin';
  const teamId  = profile?.team_id;
  const initials = (profile?.full_name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: '#f4f6f8', display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`,
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        paddingBottom: '14px', paddingLeft: '16px', paddingRight: '16px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          {ChevLeft(18, '#fff')}
        </button>
        <p style={{ flex: 1, fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>Settings</p>
        {isAdmin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${BRAND.gold}25`, borderRadius: 8, padding: '4px 10px',
            border: `1px solid ${BRAND.gold}40`,
          }}>
            {Shield(12, BRAND.gold)}
            <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.gold }}>Admin</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 48px', flex: 1 }}>

        {/* ── Account ── */}
        <SectionLabel>Account</SectionLabel>
        <Card>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 16px 14px', borderBottom: '1px solid #f0f2f5',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navy})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>
              {initials}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>
                {profile?.full_name ?? 'Coach'}
              </p>
              <RoleBadge role={profile?.role ?? 'coach'} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #f0f2f5' }}>
            <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>✉️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#8a96a3', margin: '0 0 1px', fontWeight: 500 }}>Email</p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a1a' }}>{auth.user?.email ?? 'Not signed in'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
            <span style={{ fontSize: 18, width: 32, textAlign: 'center' }}>🏫</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#8a96a3', margin: '0 0 1px', fontWeight: 500 }}>Team</p>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#1a1a1a' }}>
                {isAdmin ? `${teamName} · Admin access` : teamName}
              </p>
            </div>
          </div>
        </Card>

        {/* ── My Notifications ── */}
        <SectionLabel>My Notifications</SectionLabel>
        {!push?.supported ? (
          <Card>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                Push notifications are not supported in this browser. Install the app to your home screen to enable them.
              </p>
            </div>
          </Card>
        ) : !push?.subscribed ? (
          <Card>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#555', margin: '0 0 12px' }}>
                Enable push notifications to get alerted when messages are posted to team channels — even when the app is closed.
              </p>
              <button
                onClick={push?.subscribe}
                disabled={push?.loading}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  background: push?.loading ? '#ccd5de' : BRAND.navy,
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: push?.loading ? 'default' : 'pointer',
                }}
              >
                {push?.loading ? 'Enabling…' : '🔔 Enable Notifications'}
              </button>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              {notifChannels.map((ch, i) => {
                const isOn = push.channelPrefs?.includes(ch.slug) ?? true;
                return (
                  <div key={ch.slug} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    borderBottom: i < notifChannels.length - 1 ? '1px solid #f0f2f5' : 'none',
                  }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{ch.icon}</span>
                    <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{ch.label}</p>
                    <button onClick={() => push.updateChannelPref(ch.slug, !isOn)} style={{
                      width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: isOn ? BRAND.navy : '#dde3ea', position: 'relative', transition: 'background 0.15s',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, left: isOn ? 21 : 3,
                        transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                );
              })}
            </Card>
            <TestNotifButton teamId={teamId} userId={profile?.id} />
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Toggle channels on or off. You can also tap 🔔 in any channel header to quickly mute it.
              You won't get notified for messages you send yourself — use the test button to verify your device.
            </p>
          </>
        )}

        {/* ── ADMIN SECTIONS ── */}
        {isAdmin && (
          <>
            {/* Team Branding */}
            <SectionLabel adminOnly>Team Branding</SectionLabel>
            <Card>
              <TeamNameEditor teamName={teamName} onSave={onUpdateSettings} />
              <Divider />
              <ColorPickerRow
                icon="🔵" label="Primary Color"
                colorKey="primaryColor" currentColor={primaryColor}
                onSave={onUpdateSettings}
              />
              <Divider />
              <ColorPickerRow
                icon="🔷" label="Secondary Color"
                colorKey="secondaryColor" currentColor={secondaryColor}
                onSave={onUpdateSettings}
              />
              <Divider />
              <LogoUploader logoUrl={teamSettings.logoUrl} teamId={teamId} onSave={onUpdateSettings} />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Branding updates apply immediately across the entire app for all team members.
            </p>

            {/* Roster Groups */}
            <SectionLabel adminOnly>Roster Groups</SectionLabel>
            <Card>
              <GroupsManager initialGroups={groups} onSave={onUpdateSettings} />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Groups control channel access and event filtering. The Coaches group cannot be removed.
            </p>

            {/* AI Assistant */}
            <SectionLabel adminOnly>AI Assistant</SectionLabel>
            <Card>
              <AiChannelModeRow mode={teamSettings.aiChannelMode} onSave={onUpdateSettings} />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Controls how the AI replies in group channels. The private MatMind AI coach
              channel is always fully active regardless of this setting.
            </p>

            {/* Member Management */}
            <SectionLabel adminOnly>Member Management</SectionLabel>
            <Card>
              {teamId
                ? <MemberManagement auth={auth} teamId={teamId} />
                : <p style={{ padding: '16px', color: '#8a96a3', fontSize: 13, margin: 0 }}>Team ID not available.</p>
              }
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Tap a role pill to change a member's access level. Pending members have not yet signed in.
            </p>
          </>
        )}

        {/* ── Sign Out ── */}
        <SectionLabel>Account Actions</SectionLabel>
        <Card>
          <button
            onClick={auth.signOut}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🚪</div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#dc2626' }}>Sign Out</p>
          </button>
        </Card>

        <p style={{ fontSize: 11, color: '#c8d0da', textAlign: 'center', margin: '24px 0 0' }}>
          MatMind · {teamName}{isAdmin ? ' · Admin' : ''}
        </p>
      </div>
    </div>
  );
}
