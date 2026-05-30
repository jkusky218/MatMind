// SettingsPage — Full-screen settings view (same pattern as ChannelThread)
// All users: Account info + personal notification prefs
// Admin only: Team Branding, Roster Groups, Notification Channels

import { useState } from 'react';
import { BRAND, GROUPS, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { ChevLeft, Settings, Shield, Plus, Trash } from './Icons';

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionLabel({ children, adminOnly }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 8px 4px' }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#8a96a3',
        textTransform: 'uppercase', letterSpacing: 0.8, margin: 0,
      }}>{children}</p>
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
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid #eef1f5', overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Row({ label, sublabel, icon, value, chevron, onClick, danger, last, tag }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', background: 'none', border: 'none',
        borderBottom: last ? 'none' : '1px solid #f0f2f5',
        cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      }}
    >
      {icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: danger ? '#fff1f1' : BRAND.columbiaLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, margin: 0,
          color: danger ? '#dc2626' : '#1a1a1a',
        }}>{label}</p>
        {sublabel && (
          <p style={{ fontSize: 12, color: '#8a96a3', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sublabel}
          </p>
        )}
      </div>
      {value && <p style={{ fontSize: 13, color: '#8a96a3', margin: 0, flexShrink: 0 }}>{value}</p>}
      {tag && (
        <span style={{
          fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 8px', flexShrink: 0,
          background: tag === 'Soon' ? '#f0f2f5' : BRAND.columbiaLight,
          color: tag === 'Soon' ? '#8a96a3' : BRAND.navy,
        }}>{tag}</span>
      )}
      {chevron && <span style={{ color: '#c8d0da', fontSize: 18, flexShrink: 0 }}>›</span>}
    </button>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const config = {
    admin:  { label: 'Admin',  bg: BRAND.goldLight,    color: BRAND.gold },
    coach:  { label: 'Coach',  bg: BRAND.columbiaLight, color: BRAND.navy },
    parent: { label: 'Parent', bg: '#f3f0ff',           color: '#7B5EA7' },
  };
  const c = config[role] ?? config.parent;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, borderRadius: 6,
      padding: '3px 9px', background: c.bg, color: c.color,
    }}>{c.label}</span>
  );
}

// ── Groups Manager (Admin) ────────────────────────────────────────────────────

const INITIAL_GROUPS = GROUPS.map(id => ({
  id,
  label: GROUP_LABELS[id] ?? id,
  color: GROUP_COLORS[id] ?? '#888',
}));

const COLOR_PRESETS = [
  '#1B3A5C', '#6BADE4', '#7B5EA7', '#C4A44A',
  '#16a34a', '#dc2626', '#ea580c', '#0891b2',
];

function GroupsManager() {
  const [groups, setGroups]       = useState(INITIAL_GROUPS);
  const [adding, setAdding]       = useState(false);
  const [newLabel, setNewLabel]   = useState('');
  const [newColor, setNewColor]   = useState(COLOR_PRESETS[0]);
  const [confirmDel, setConfirmDel] = useState(null); // group id to confirm delete

  function addGroup() {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    if (groups.some(g => g.id === id)) return;
    setGroups(prev => [...prev, { id, label: newLabel.trim(), color: newColor }]);
    setNewLabel('');
    setNewColor(COLOR_PRESETS[0]);
    setAdding(false);
  }

  function removeGroup(id) {
    setGroups(prev => prev.filter(g => g.id !== id));
    setConfirmDel(null);
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
                color: '#b0b8c2', fontSize: 16, padding: '0 2px', lineHeight: 1,
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
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: newLabel.trim() ? 'pointer' : 'not-allowed',
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
          border: 'none', borderTop: '1px solid #f0f2f5', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          color: BRAND.columbia, fontSize: 13, fontWeight: 600,
        }}>
          {Plus(14, BRAND.columbia)}
          Add Group
        </button>
      )}
    </div>
  );
}

// ── Notification Channel Row ──────────────────────────────────────────────────

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
            transition: 'left 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
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

// ── Main SettingsPage ─────────────────────────────────────────────────────────

export default function SettingsPage({ auth, teamSettings = {}, onClose }) {
  const teamName = teamSettings.teamName || 'My Team';
  const profile  = auth.profile;
  const isAdmin  = profile?.role === 'admin';
  const isCoach  = profile?.role === 'coach' || profile?.role === 'admin';
  const initials = (profile?.full_name ?? 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>Settings</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5,
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
          {/* Avatar + name row */}
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
          <Row icon="✉️" label="Email"
            sublabel={auth.user?.email ?? 'Not signed in'}
            last={false} />
          <Row icon="🏫" label="Team"
            sublabel={isAdmin ? `${teamName} · Admin access` : teamName}
            last />
        </Card>

        {/* ── My Notifications ── */}
        <SectionLabel>My Notifications</SectionLabel>
        <Card>
          <Row icon="📣" label="Announcements"    sublabel="Team-wide updates"  tag="Soon" />
          <Row icon="#️⃣" label="Advanced channel"  sublabel="Skill group chat"   tag="Soon" />
          <Row icon="#️⃣" label="Beginner channel"  sublabel="Skill group chat"   tag="Soon" />
          <Row icon="#️⃣" label="Tots channel"      sublabel="Youngest wrestlers" tag="Soon" last />
        </Card>
        <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
          Per-channel notification preferences will be available once push notifications are configured.
        </p>

        {/* ── ADMIN SECTIONS ── */}
        {isAdmin && (
          <>
            {/* Team Branding */}
            <SectionLabel adminOnly>Team Branding</SectionLabel>
            <Card>
              <Row icon="🏆" label="Team Name"   sublabel={teamName} chevron tag="Soon" />
              <Row icon="🎨" label="Logo"        sublabel="Upload team logo"  chevron tag="Soon" />
              <Row icon="🔵" label="Primary Color"   sublabel={teamSettings.primaryColor   || '#1B3A5C'} chevron tag="Soon" />
              <Row icon="🔷" label="Secondary Color"  sublabel={teamSettings.secondaryColor || '#6BADE4'} chevron tag="Soon" last />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Branding updates will apply across the entire app for all team members.
            </p>

            {/* Roster Groups */}
            <SectionLabel adminOnly>Roster Groups</SectionLabel>
            <Card>
              <GroupsManager />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Groups determine channel access and event filtering. The Coaches group cannot be removed.
              Changes will sync to the database in a future update.
            </p>

            {/* Push Notification Channels */}
            <SectionLabel adminOnly>Push Notification Channels</SectionLabel>
            <Card>
              <div style={{ padding: '10px 16px 4px', borderBottom: '1px solid #f0f2f5' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 4 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#8a96a3', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Coaches</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#8a96a3', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Parents</p>
                </div>
              </div>
              <NotifChannelRow icon="📣" label="Announcements" coachEnabled parentEnabled />
              <NotifChannelRow icon="#️⃣" label="Advanced"      coachEnabled parentEnabled />
              <NotifChannelRow icon="#️⃣" label="Beginner"      coachEnabled parentEnabled />
              <NotifChannelRow icon="#️⃣" label="Tots"          coachEnabled parentEnabled last />
            </Card>
            <p style={{ fontSize: 11, color: '#b0b8c2', margin: '6px 4px 0', lineHeight: 1.4 }}>
              Controls which roles receive push notifications when messages are posted to each channel.
            </p>

            {/* Member Management */}
            <SectionLabel adminOnly>Member Management</SectionLabel>
            <Card>
              <Row icon="👤" label="Promote to Admin"
                sublabel="Grant admin access to a coach or parent"
                chevron tag="Soon" />
              <Row icon="📋" label="View All Members"
                sublabel="Roster, roles, and invite status"
                chevron tag="Soon" last />
            </Card>
          </>
        )}

        {/* ── Sign Out ── */}
        <SectionLabel>Account Actions</SectionLabel>
        <Card>
          <Row
            icon="🚪"
            label="Sign Out"
            danger
            onClick={auth.signOut}
            last
          />
        </Card>

        <p style={{ fontSize: 11, color: '#c8d0da', textAlign: 'center', margin: '24px 0 0' }}>
          MatMind · {teamName}{isAdmin ? ' · Admin' : ''}
        </p>
      </div>
    </div>
  );
}
