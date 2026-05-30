import { useState, useCallback } from 'react';
import { BRAND, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { Clock, MapPin, ChevDown } from './Icons';

const TYPE_STYLE = {
  practice:   { bg: '#EAF3DE', color: '#3B6D11',       label: 'Practice' },
  tournament: { bg: BRAND.goldLight, color: BRAND.goldDark, label: 'Tournament' },
  match:      { bg: BRAND.columbiaLight, color: BRAND.navy,  label: 'Match' },
};

// practice / meeting / other → 'practice' bucket; match / tournament → 'competition'
const COMPETITION_TYPES = new Set(['match', 'tournament']);

const TYPE_FILTERS = [
  { id: 'all',         label: 'All',         emoji: '' },
  { id: 'practice',    label: 'Practice',    emoji: '💪' },
  { id: 'competition', label: 'Competition', emoji: '🏆' },
];

const GROUP_FILTERS = [
  { id: 'all',      label: 'All Groups' },
  { id: 'advanced', label: 'Advanced'   },
  { id: 'beginner', label: 'Beginner'   },
  { id: 'tots',     label: 'Tots'       },
];

function formatDate(ds) {
  const d = new Date(ds + 'T12:00:00');
  return {
    day:   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
    date:  d.getDate(),
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
  };
}

// ── Availability summary ─────────────────────────────────────────────────────

function AvailabilitySection({ event, availability, athletes }) {
  const suffix    = `-${event.id}`;
  const eligible  = event.group === 'all' ? athletes : athletes.filter(r => r.group === event.group);
  const confirmed = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'confirmed').length;
  const declined  = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'declined').length;
  const total     = eligible.length;
  const pending   = total - confirmed - declined;

  return (
    <>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
        Availability
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { val: confirmed, label: 'Confirmed', bg: BRAND.columbiaLight, fg: BRAND.navy,    sub: BRAND.navyLight },
          { val: declined,  label: 'Declined',  bg: '#FEE2E2',           fg: '#DC2626',     sub: '#991B1B' },
          { val: pending,   label: 'Pending',   bg: BRAND.goldLight,     fg: BRAND.goldDark, sub: BRAND.goldDark },
        ].map(({ val, label, bg, fg, sub }) => (
          <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: fg, margin: 0 }}>{val}</p>
            <p style={{ fontSize: 10, color: sub, margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>
      <div style={{ width: '100%', height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 14 }}>
        <div style={{ width: `${(confirmed / Math.max(total, 1)) * 100}%`, background: BRAND.navy, transition: 'width 0.3s' }} />
        <div style={{ width: `${(declined  / Math.max(total, 1)) * 100}%`, background: '#EF4444' }} />
      </div>
    </>
  );
}

// ── Attendance section ───────────────────────────────────────────────────────

function AttendanceSection({ event, attendance, recordAttendance, athletes }) {
  const [open, setOpen] = useState(false);

  const eligible  = event.group === 'all' ? athletes : athletes.filter(r => r.group === event.group);
  const suffix    = `-${event.id}`;
  const present   = Object.entries(attendance).filter(([k, v]) => k.endsWith(suffix) && v === 'present').length;
  const absent    = Object.entries(attendance).filter(([k, v]) => k.endsWith(suffix) && v === 'absent').length;
  const marked    = present + absent;
  const total     = eligible.length;
  const remaining = total - marked;

  const handleMark = useCallback((e, athleteId, status) => {
    e.stopPropagation();
    const current = attendance[`${athleteId}-${event.id}`];
    // Tapping the active status deselects it (clears) — but we'll just toggle for simplicity
    recordAttendance(athleteId, event.id, status);
  }, [attendance, event.id, recordAttendance]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen(v => !v);
  };

  // ── Summary bar (always visible when any attendance exists) ──────────────
  const hasSome = marked > 0;

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasSome ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11 }}>📋</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Attendance
          </span>
          {hasSome && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
              background: marked === total ? '#DCFCE7' : BRAND.goldLight,
              color: marked === total ? '#16A34A' : BRAND.goldDark,
            }}>
              {marked}/{total}
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          style={{
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: open ? `1px solid ${BRAND.navy}` : `1px solid ${BRAND.columbia}`,
            background: open ? BRAND.navy : BRAND.columbia,
            color: '#fff',
          }}
        >
          {open ? 'Done' : hasSome ? 'Edit' : 'Take Attendance'}
        </button>
      </div>

      {/* Progress bar (when some marked and checklist closed) */}
      {hasSome && !open && (
        <div>
          <div style={{ width: '100%', height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
            <div style={{ width: `${(present / Math.max(total, 1)) * 100}%`, background: '#22C55E', transition: 'width 0.3s' }} />
            <div style={{ width: `${(absent  / Math.max(total, 1)) * 100}%`, background: '#EF4444' }} />
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
            {present > 0 && <span style={{ color: '#16A34A', fontWeight: 600 }}>{present} present</span>}
            {present > 0 && absent > 0 && ' · '}
            {absent  > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>{absent} absent</span>}
            {remaining > 0 && <span style={{ color: '#888' }}>{present > 0 || absent > 0 ? ' · ' : ''}{remaining} unmarked</span>}
          </p>
        </div>
      )}

      {/* Roster checklist */}
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 10 }}>
          {/* Mini progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 5, background: '#eee', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(present / Math.max(total, 1)) * 100}%`, background: '#22C55E', transition: 'width 0.2s' }} />
              <div style={{ width: `${(absent  / Math.max(total, 1)) * 100}%`, background: '#EF4444' }} />
            </div>
            <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
              {marked}/{total} marked
            </span>
          </div>

          {/* Athlete rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {eligible.length === 0 && (
              <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>No athletes in this group</p>
            )}
            {eligible.map(athlete => {
              const status = attendance[`${athlete.id}-${event.id}`];
              const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const groupColor = GROUP_COLORS[athlete.group] ?? BRAND.navy;

              return (
                <div key={athlete.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 8px', borderRadius: 8,
                  background: status === 'present' ? '#F0FDF4' : status === 'absent' ? '#FEF2F2' : '#fafafa',
                  transition: 'background 0.15s',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: status === 'present' ? '#22C55E' : status === 'absent' ? '#EF4444' : groupColor + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: status ? '#fff' : groupColor,
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                    {initials}
                  </div>

                  {/* Name + weight */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{athlete.name}</p>
                    {athlete.weight && (
                      <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{athlete.weight} lbs</p>
                    )}
                  </div>

                  {/* P / A buttons */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {[
                      { s: 'present', label: 'P', active: '#22C55E', activeTxt: '#fff', inactiveBg: '#f0f0f0', inactiveTxt: '#aaa' },
                      { s: 'absent',  label: 'A', active: '#EF4444', activeTxt: '#fff', inactiveBg: '#f0f0f0', inactiveTxt: '#aaa' },
                    ].map(({ s, label, active, activeTxt, inactiveBg, inactiveTxt }) => (
                      <button
                        key={s}
                        onClick={e => handleMark(e, athlete.id, s)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 700,
                          background: status === s ? active : inactiveBg,
                          color: status === s ? activeTxt : inactiveTxt,
                          transition: 'background 0.12s, color 0.12s',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({ ev, availability, attendance, recordAttendance, athletes, isCoach }) {
  const [expanded, setExpanded] = useState(false);
  const ts = TYPE_STYLE[ev.type] ?? TYPE_STYLE.practice;
  const d  = formatDate(ev.date);

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf2', overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center' }}>
        {/* Date block */}
        <div style={{ width: 44, textAlign: 'center', flexShrink: 0, borderRadius: 10, padding: '6px 0', background: ev.type === 'tournament' ? BRAND.goldLight : '#f5f7fa' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#999', margin: 0, textTransform: 'uppercase' }}>{d.day}</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, margin: 0 }}>{d.date}</p>
          <p style={{ fontSize: 9, color: '#aaa', margin: 0 }}>{d.month}</p>
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: ts.bg, color: ts.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {ts.label}
            </span>
            {ev.group !== 'all' && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: (GROUP_COLORS[ev.group] ?? '#888') + '18', color: GROUP_COLORS[ev.group] ?? '#888', textTransform: 'uppercase' }}>
                {GROUP_LABELS[ev.group] ?? ev.group}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{ev.title}</p>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#888' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{Clock(12, '#aaa')} {ev.time}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{MapPin(12, '#aaa')} {ev.location}</span>
          </div>
        </div>

        <div style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          {ChevDown(16, '#ccc')}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0f0f0' }}
        >
          <AvailabilitySection event={ev} availability={availability} athletes={athletes} />

          {isCoach && (
            <AttendanceSection
              event={ev}
              attendance={attendance}
              recordAttendance={recordAttendance}
              athletes={athletes}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── ScheduleTab ──────────────────────────────────────────────────────────────

export default function ScheduleTab({ events, availability, attendance = {}, recordAttendance, roster, isCoach = false }) {
  const athletes = roster.filter(r => r.group !== 'coaches');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const filtered = events.filter(ev => {
    const typeMatch = typeFilter === 'all'
      ? true
      : typeFilter === 'competition'
        ? COMPETITION_TYPES.has(ev.type)
        : !COMPETITION_TYPES.has(ev.type);

    // Group: show event if it targets the selected group OR is open to all groups
    const groupMatch = groupFilter === 'all'
      ? true
      : ev.group === groupFilter || ev.group === 'all';

    return typeMatch && groupMatch;
  });

  const chipStyle = (active, color) => ({
    padding: '5px 13px', borderRadius: 20, border: 'none',
    background: active ? (color ?? BRAND.navy) : '#f0f4f8',
    color: active ? '#fff' : '#666',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{ padding: '16px 12px', overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Schedule</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
          {filtered.length === events.length
            ? `${events.length} upcoming`
            : `${filtered.length} of ${events.length} upcoming`}
        </p>
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {TYPE_FILTERS.map(({ id, label, emoji }) => (
          <button key={id} onClick={() => setTypeFilter(id)}
            style={chipStyle(typeFilter === id, BRAND.navy)}>
            {emoji ? `${emoji} ${label}` : label}
          </button>
        ))}
      </div>

      {/* Group filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {GROUP_FILTERS.map(({ id, label }) => (
          <button key={id} onClick={() => setGroupFilter(id)}
            style={chipStyle(groupFilter === id, id === 'all' ? BRAND.navy : GROUP_COLORS[id])}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 40 }}>
          {events.length === 0 ? 'No upcoming events' : 'No events match this filter'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(ev => (
          <EventCard
            key={ev.id}
            ev={ev}
            availability={availability}
            attendance={attendance}
            recordAttendance={recordAttendance ?? (() => {})}
            athletes={athletes}
            isCoach={isCoach}
          />
        ))}
      </div>
    </div>
  );
}
