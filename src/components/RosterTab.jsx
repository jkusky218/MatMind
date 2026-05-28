import { useState } from 'react';
import { BRAND, GROUPS, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { ChevDown, School, Mail, Phone, UserIcon, Star } from './Icons';

const AVATAR_COLORS = { coaches: BRAND.gold, tots: '#7B5EA7', beginner: BRAND.columbia, advanced: BRAND.navy };

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

function ParentCard({ parent, label }) {
  if (!parent) return null;
  return (
    <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {UserIcon(13, '#888')}
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#1a1a1a' }}>{parent.name}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>{Mail(12, '#aaa')}<span style={{ color: BRAND.navyLight }}>{parent.email}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>{Phone(12, '#aaa')}<span style={{ color: '#555' }}>{parent.phone}</span></div>
      </div>
    </div>
  );
}

export default function RosterTab({ roster }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filter === 'all' ? roster : roster.filter(r => r.group === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (a.group === 'coaches' && b.group !== 'coaches') return -1;
    if (b.group === 'coaches' && a.group !== 'coaches') return 1;
    if (a.group === 'coaches') return a.name.localeCompare(b.name);
    return parseInt(a.weight ?? '0', 10) - parseInt(b.weight ?? '0', 10);
  });

  return (
    <div style={{ padding: '16px 12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Roster</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{roster.length} members</p>
      </div>

      {/* Group filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
          cursor: 'pointer', border: 'none',
          background: filter === 'all' ? BRAND.navy : '#edf1f5',
          color: filter === 'all' ? '#fff' : '#666',
        }}>
          All ({roster.length})
        </button>
        {GROUPS.map(g => (
          <button key={g} onClick={() => setFilter(g)} style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filter === g ? GROUP_COLORS[g] : '#edf1f5',
            color: filter === g ? '#fff' : '#666',
          }}>
            {GROUP_LABELS[g]} ({roster.filter(r => r.group === g).length})
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(m => {
          const exp = expandedId === m.id;
          const isC = m.group === 'coaches';
          return (
            <div key={m.id}
              onClick={() => setExpandedId(exp ? null : m.id)}
              style={{
                background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                border: isC ? `1px solid ${BRAND.gold}40` : '1px solid #e8edf2',
              }}
            >
              {/* Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: AVATAR_COLORS[m.group] ?? '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0,
                }}>
                  {isC ? Star(16, '#fff') : getInitials(m.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{m.name}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    {isC ? (
                      <span style={{ fontSize: 11, color: BRAND.goldDark, fontWeight: 500 }}>{m.role}</span>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>{m.weight} lbs</span>
                        <span style={{ fontSize: 11, color: '#ccc' }}>•</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{m.grade}</span>
                      </>
                    )}
                    <span style={{ fontSize: 11, color: '#ccc' }}>•</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: (GROUP_COLORS[m.group] ?? '#888') + '18',
                      color: GROUP_COLORS[m.group] ?? '#888',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {GROUP_LABELS[m.group] ?? m.group}
                    </span>
                  </div>
                </div>
                <div style={{ transform: exp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  {ChevDown(14, '#ccc')}
                </div>
              </div>

              {/* Expanded contact info */}
              {exp && (
                <div style={{ padding: '0 14px 12px', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, color: '#888' }}>
                    {School(13, '#aaa')}
                    <span style={{ fontWeight: 500 }}>{m.school}</span>
                  </div>
                  {isC ? (
                    <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>{m.parent1?.name}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>{Mail(12, '#aaa')}<span style={{ color: BRAND.navyLight }}>{m.parent1?.email}</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>{Phone(12, '#aaa')}<span style={{ color: '#555' }}>{m.parent1?.phone}</span></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ParentCard parent={m.parent1} label="Parent / Guardian 1" />
                      <ParentCard parent={m.parent2} label="Parent / Guardian 2" />
                      {!m.parent2 && (
                        <p style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic', margin: '4px 0 0', paddingLeft: 2 }}>
                          No second parent/guardian on file
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
