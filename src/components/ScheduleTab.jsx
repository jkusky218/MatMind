import { useState } from 'react';
import { BRAND, GROUP_LABELS, GROUP_COLORS } from '../lib/constants';
import { Clock, MapPin, ChevDown } from './Icons';

const TYPE_STYLE = {
  practice:   { bg: '#EAF3DE', color: '#3B6D11',      label: 'Practice' },
  tournament: { bg: BRAND.goldLight, color: BRAND.goldDark, label: 'Tournament' },
  match:      { bg: BRAND.columbiaLight, color: BRAND.navy,  label: 'Match' },
};

function formatDate(ds) {
  const d = new Date(ds + 'T12:00:00');
  return {
    day:   ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
    date:  d.getDate(),
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
  };
}

export default function ScheduleTab({ events, availability, roster }) {
  const [expandedId, setExpandedId] = useState(null);
  const athletes = roster.filter(r => r.group !== 'coaches');

  const getAvailability = (event) => {
    const suffix   = `-${event.id}`;
    const confirmed = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'confirmed').length;
    const declined  = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'declined').length;
    const eligible  = event.group === 'all' ? athletes : athletes.filter(r => r.group === event.group);
    return { confirmed, declined, pending: eligible.length - confirmed - declined, total: eligible.length };
  };

  return (
    <div style={{ padding: '16px 12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Schedule</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{events.length} upcoming</p>
      </div>

      {events.length === 0 && (
        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginTop: 40 }}>No upcoming events</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map(ev => {
          const ts  = TYPE_STYLE[ev.type] ?? TYPE_STYLE.practice;
          const d   = formatDate(ev.date);
          const av  = getAvailability(ev);
          const exp = expandedId === ev.id;

          return (
            <div key={ev.id}
              onClick={() => setExpandedId(exp ? null : ev.id)}
              style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8edf2', overflow: 'hidden', cursor: 'pointer' }}
            >
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

                <div style={{ transform: exp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  {ChevDown(16, '#ccc')}
                </div>
              </div>

              {/* Expanded availability */}
              {exp && (
                <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: '0 0 8px' }}>
                    Availability ({av.confirmed}/{av.total})
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <div style={{ flex: 1, background: BRAND.columbiaLight, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, margin: 0 }}>{av.confirmed}</p>
                      <p style={{ fontSize: 10, color: BRAND.navyLight, margin: 0 }}>Confirmed</p>
                    </div>
                    <div style={{ flex: 1, background: '#FEE2E2', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', margin: 0 }}>{av.declined}</p>
                      <p style={{ fontSize: 10, color: '#991B1B', margin: 0 }}>Declined</p>
                    </div>
                    <div style={{ flex: 1, background: BRAND.goldLight, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: BRAND.goldDark, margin: 0 }}>{av.pending}</p>
                      <p style={{ fontSize: 10, color: BRAND.goldDark, margin: 0 }}>Pending</p>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(av.confirmed / Math.max(av.total, 1)) * 100}%`, background: BRAND.navy, transition: 'width 0.3s' }} />
                    <div style={{ width: `${(av.declined  / Math.max(av.total, 1)) * 100}%`, background: '#EF4444' }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
