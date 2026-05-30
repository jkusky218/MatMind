import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { Brain, Chat, Calendar, Users, UserIcon, BookOpen } from '../components/Icons';
import { useTeamData } from '../hooks/useTeamData';
import ChannelList       from '../components/ChannelList';
import ChannelThread     from '../components/ChannelThread';
import ScheduleTab       from '../components/ScheduleTab';
import RosterTab         from '../components/RosterTab';
import AdminPanel        from '../components/AdminPanel';
import KnowledgeBaseTab  from '../components/KnowledgeBaseTab';

const TABS = [
  { id: 'messages',  label: 'Messages', Icon: Chat },
  { id: 'schedule',  label: 'Schedule', Icon: Calendar },
  { id: 'roster',    label: 'Roster',   Icon: Users },
  { id: 'kb',        label: 'KB',       Icon: BookOpen },
];

export default function MainApp({ auth }) {
  const [tab, setTab]                 = useState('messages');
  const [activeChannel, setActiveChannel] = useState(null);
  const [adminOpen, setAdminOpen]     = useState(false);

  const {
    roster, setRoster,
    events, setEvents,
    availability, setAvailability,
    attendance, recordAttendance,
    channelMessages, sendMessage,
    createEvent, updateAvailabilityEntry,
    loading, isDemo,
  } = useTeamData(auth);

  const isCoach = auth.profile?.role === 'coach' || auth.profile?.role === 'admin' || !auth.profile;

  function handleMemberAdded({ type, data }) {
    if (type === 'coach' && data) {
      // The admin API returns the coaches row; the profile has the full_name but
      // we don't get it back here — just push a placeholder so the count updates.
      // The name will be correct on next page load / data refresh.
      setRoster(prev => {
        // Avoid duplicates if the person was already in the list
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, {
          id: data.id,
          name: 'New Coach',         // refreshed on next load when profile is fetched
          weight: null, grade: null,
          school: 'Lovett',
          group: data.roster_group ?? 'coaches',
          role: data.title ?? 'Coach',
          parent1: null, parent2: null,
        }];
      });
    }
    // Athletes: the API returns the new row ID but we'd need a full refetch to get
    // parent data. A page refresh will show the new athlete correctly.
  }

  if (loading) {
    return (
      <div style={{
        maxWidth: 430, margin: '0 auto', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(145deg, ${BRAND.navyDark}, ${BRAND.navy})`,
      }}>
        <div style={{ textAlign: 'center' }}>
          {Brain(32, BRAND.columbia)}
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginTop: 12 }}>MatMind</p>
          <p style={{ color: BRAND.columbiaMid, fontSize: 12 }}>Loading team data…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth: 430, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#f8fafb', color: '#1a1a1a', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        input:focus { outline: none; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* ── App header (hidden inside channel thread) ── */}
      {!activeChannel && (
        <div style={{
          background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`,
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(107,173,228,0.15)', border: '1px solid rgba(107,173,228,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {Brain(20, BRAND.columbia)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0, letterSpacing: -0.3 }}>MatMind</p>
            <p style={{ fontSize: 11, color: BRAND.columbiaMid, margin: 0 }}>
              Lovett Wrestling{isDemo ? ' · Demo' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: BRAND.columbiaMid, display: 'flex', alignItems: 'center', gap: 4 }}>
              {UserIcon(12, BRAND.columbiaMid)}
              <span style={{ textTransform: 'capitalize' }}>{auth.profile?.role ?? 'coach'}</span>
            </div>
            {isCoach && (
              <button onClick={() => setAdminOpen(true)} title="Add team member" style={{
                background: 'rgba(107,173,228,0.18)', border: '1px solid rgba(107,173,228,0.3)',
                borderRadius: 8, padding: '5px 9px', fontSize: 16, color: BRAND.columbia,
                cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center',
              }}>
                +
              </button>
            )}
            <button onClick={auth.signOut} style={{
              marginLeft: 2, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              padding: '5px 10px', fontSize: 11, color: BRAND.columbiaMid, cursor: 'pointer',
            }}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Tab bar (hidden inside channel thread) ── */}
      {!activeChannel && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e8edf2', background: '#fff', flexShrink: 0 }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontSize: 12, fontWeight: 600,
              color: tab === id ? BRAND.navy : '#aab4c0',
              borderBottom: tab === id ? `2px solid ${BRAND.navy}` : '2px solid transparent',
            }}>
              {Icon(15, tab === id ? BRAND.navy : '#bcc5d0')}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Admin panel ── */}
      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onMemberAdded={handleMemberAdded}
      />

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeChannel ? (
          <ChannelThread
            channel={activeChannel}
            messages={channelMessages[activeChannel.id] ?? []}
            onBack={() => setActiveChannel(null)}
            onSendMessage={sendMessage}
            roster={roster}
            events={events}
            availability={availability}
            attendance={attendance}
            setRoster={setRoster}
            setEvents={setEvents}
            setAvailability={setAvailability}
            createEvent={createEvent}
            updateAvailabilityEntry={updateAvailabilityEntry}
            senderName={auth.profile?.full_name}
            userRole={auth.profile?.role ?? 'coach'}
          />
        ) : (
          <>
            {tab === 'messages' && (
              <ChannelList
                onSelect={setActiveChannel}
                channelMessages={channelMessages}
              />
            )}
            {tab === 'schedule' && (
              <ScheduleTab
                events={events}
                availability={availability}
                attendance={attendance}
                recordAttendance={recordAttendance}
                roster={roster}
                isCoach={isCoach}
              />
            )}
            {tab === 'roster' && (
              <RosterTab roster={roster} />
            )}
            {tab === 'kb' && (
              <KnowledgeBaseTab isCoach={isCoach} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
