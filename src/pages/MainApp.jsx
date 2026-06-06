import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { Brain, Chat, Calendar, Users, UserIcon } from '../components/Icons';
import { useTeamData } from '../hooks/useTeamData';
import ChannelList   from '../components/ChannelList';
import ChannelThread from '../components/ChannelThread';
import ScheduleTab   from '../components/ScheduleTab';
import RosterTab     from '../components/RosterTab';

const TABS = [
  { id: 'messages', label: 'Messages', Icon: Chat },
  { id: 'schedule', label: 'Schedule', Icon: Calendar },
  { id: 'roster',   label: 'Roster',   Icon: Users },
];

export default function MainApp({ auth, team }) {
  const [tab, setTab]                 = useState('messages');
  const [activeChannel, setActiveChannel] = useState(null);

  const {
    roster, setRoster,
    events, setEvents,
    availability, setAvailability,
    channelMessages, sendMessage,
    loading, isDemo,
  } = useTeamData(auth);

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
              {team?.name ?? 'Lovett Wrestling'}{isDemo ? ' · Demo' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: BRAND.columbiaMid, display: 'flex', alignItems: 'center', gap: 4 }}>
              {UserIcon(12, BRAND.columbiaMid)}
              <span style={{ textTransform: 'capitalize' }}>{auth.profile?.role ?? 'coach'}</span>
            </div>
            <button onClick={auth.signOut} style={{
              marginLeft: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
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
            setRoster={setRoster}
            setEvents={setEvents}
            setAvailability={setAvailability}
            senderName={auth.profile?.full_name}
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
                roster={roster}
              />
            )}
            {tab === 'roster' && (
              <RosterTab roster={roster} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
