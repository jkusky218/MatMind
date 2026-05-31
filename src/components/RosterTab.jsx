import { useState } from 'react';
import { BRAND, GROUPS, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { ChevDown, School, Mail, Phone, UserIcon, Star } from './Icons';

const PARENT_COLOR = '#0D9488'; // teal — distinct from all group colors

// ── Tappable contact link ─────────────────────────────────────────────────────
// Renders a full-row anchor (mailto: or tel:) with the appropriate icon.
// stopPropagation so tapping doesn't collapse the parent card.

function ContactLink({ type, value, icon }) {
  if (!value) return null;
  const href  = type === 'email' ? `mailto:${value}` : `tel:${value.replace(/\D/g, '')}`;
  const color = type === 'email' ? BRAND.navy : '#16A34A';
  return (
    <a
      href={href}
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8, margin: '2px 0',
        background: type === 'email' ? `${BRAND.navy}08` : '#16A34A0D',
        textDecoration: 'none', color,
        fontSize: 12, fontWeight: 500,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon(13, color)}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0 }}>
        {type === 'email' ? '✉' : '📞'}
      </span>
    </a>
  );
}

const AVATAR_COLORS = {
  coaches: BRAND.gold,
  tots: '#7B5EA7',
  beginner: BRAND.columbia,
  advanced: BRAND.navy,
  parents: PARENT_COLOR,
};

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Parent roster card ────────────────────────────────────────────────────────

function ParentCard({ parent, expanded, onToggle }) {
  const athleteLabel = parent.athletes?.length
    ? parent.athletes.map(a => a.name).join(', ')
    : 'athlete';

  return (
    <div
      onClick={onToggle}
      style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${PARENT_COLOR}30`,
      }}
    >
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: PARENT_COLOR,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0,
        }}>
          {getInitials(parent.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{parent.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#888' }}>Parent of</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: PARENT_COLOR }}>{athleteLabel}</span>
            {parent.athletes?.map(a => a.group).filter(Boolean).map((g, i) => (
              <span key={i} style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                background: (GROUP_COLORS[g] ?? '#888') + '18',
                color: GROUP_COLORS[g] ?? '#888',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {GROUP_LABELS[g] ?? g}
              </span>
            ))}
          </div>
        </div>
        <div style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          {ChevDown(14, '#ccc')}
        </div>
      </div>

      {/* Expanded contact info */}
      {expanded && (
        <div style={{ padding: '0 10px 10px', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          <ContactLink type="email" value={parent.email} icon={Mail} />
          <ContactLink type="phone" value={parent.phone} icon={Phone} />
          {!parent.email && !parent.phone && (
            <p style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic', margin: '4px 0 0' }}>No contact info on file</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Athlete / coach contact card (existing) ───────────────────────────────────

function AthleteCard({ member: m, expanded, onToggle }) {
  const isC = m.group === 'coaches';
  return (
    <div
      onClick={onToggle}
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
        <div style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          {ChevDown(14, '#ccc')}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          {m.school && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, color: '#888' }}>
              {School(13, '#aaa')}
              <span style={{ fontWeight: 500 }}>{m.school}</span>
            </div>
          )}
          {isC ? (
            m.parent1 && (
              <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', paddingLeft: 2 }}>{m.parent1.name}</p>
                <ContactLink type="email" value={m.parent1.email} icon={Mail} />
                <ContactLink type="phone" value={m.parent1.phone} icon={Phone} />
              </div>
            )
          ) : (
            <>
              {m.parent1 && (
                <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {UserIcon(13, '#888')}
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Parent / Guardian 1</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#1a1a1a', paddingLeft: 2 }}>{m.parent1.name}</p>
                  <ContactLink type="email" value={m.parent1.email} icon={Mail} />
                  <ContactLink type="phone" value={m.parent1.phone} icon={Phone} />
                </div>
              )}
              {m.parent2 && (
                <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {UserIcon(13, '#888')}
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Parent / Guardian 2</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#1a1a1a', paddingLeft: 2 }}>{m.parent2.name}</p>
                  <ContactLink type="email" value={m.parent2.email} icon={Mail} />
                  <ContactLink type="phone" value={m.parent2.phone} icon={Phone} />
                </div>
              )}
              {!m.parent1 && !m.parent2 && (
                <p style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic', margin: '4px 0 0', paddingLeft: 2 }}>
                  No parent/guardian on file
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        cursor: 'pointer',
        border: active ? 'none' : '1.5px solid #e0e5eb',
        background: active ? color : 'transparent',
        color: active ? '#fff' : '#888',
        transition: 'all 0.15s',
      }}
    >
      {label} {count != null ? `(${count})` : ''}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RosterTab({ roster, parents = [] }) {
  // All athlete groups on by default; parents off by default
  const [activeFilters, setActiveFilters] = useState(new Set(GROUPS));
  const [expandedId, setExpandedId] = useState(null);

  const toggleFilter = (group) => {
    setExpandedId(null); // collapse any open card when filter changes
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const showParents = activeFilters.has('parents');
  const filteredRoster = roster.filter(r => activeFilters.has(r.group));

  const sorted = [...filteredRoster].sort((a, b) => {
    if (a.group === 'coaches' && b.group !== 'coaches') return -1;
    if (b.group === 'coaches' && a.group !== 'coaches') return 1;
    if (a.group === 'coaches') return a.name.localeCompare(b.name);
    return parseInt(a.weight ?? '0', 10) - parseInt(b.weight ?? '0', 10);
  });

  const visibleCount = sorted.length + (showParents ? parents.length : 0);

  return (
    <div style={{ padding: '16px 12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Roster</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
          {visibleCount} {visibleCount === 1 ? 'member' : 'members'} shown
        </p>
      </div>

      {/* Multi-select filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {GROUPS.map(g => (
          <FilterPill
            key={g}
            label={GROUP_LABELS[g]}
            count={roster.filter(r => r.group === g).length}
            active={activeFilters.has(g)}
            color={GROUP_COLORS[g]}
            onClick={() => toggleFilter(g)}
          />
        ))}
        <FilterPill
          label="Parents"
          count={parents.length}
          active={showParents}
          color={PARENT_COLOR}
          onClick={() => toggleFilter('parents')}
        />
      </div>

      {/* Roster cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(m => (
          <AthleteCard
            key={m.id}
            member={m}
            expanded={expandedId === m.id}
            onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
          />
        ))}

        {/* Parents section — shown only when Parents pill is active */}
        {showParents && parents.length > 0 && (
          <>
            {sorted.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 2px' }}>
                <div style={{ flex: 1, height: 1, background: '#e8edf2' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: PARENT_COLOR, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Parents
                </span>
                <div style={{ flex: 1, height: 1, background: '#e8edf2' }} />
              </div>
            )}
            {parents.map(p => (
              <ParentCard
                key={p.id}
                parent={p}
                expanded={expandedId === `parent-${p.id}`}
                onToggle={() => setExpandedId(expandedId === `parent-${p.id}` ? null : `parent-${p.id}`)}
              />
            ))}
          </>
        )}

        {showParents && parents.length === 0 && (
          <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
            No parent accounts yet. Parents are invited automatically when athletes are added.
          </p>
        )}

        {sorted.length === 0 && !showParents && (
          <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
            No members match the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}
