import { useState } from 'react';

// TODO: Migrate full MainApp components from prototype
// This is the shell that will hold Messages, Schedule, and Roster tabs

export default function MainApp({ auth }) {
  const [tab, setTab] = useState('messages');

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', background: '#f8fafb',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2440, #1B3A5C)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>MatMind</p>
          <p style={{ fontSize: 11, color: '#A5D0F0', margin: 0 }}>Lovett Wrestling</p>
        </div>
        <button onClick={auth.signOut} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
          padding: '6px 12px', fontSize: 11, color: '#A5D0F0', cursor: 'pointer',
        }}>
          Sign out
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8edf2', background: '#fff' }}>
        {['messages', 'schedule', 'roster'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
            color: tab === t ? '#1B3A5C' : '#aab4c0',
            borderBottom: tab === t ? '2px solid #1B3A5C' : '2px solid transparent',
          }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <p style={{ fontSize: 14, color: '#888', textAlign: 'center', marginTop: 40 }}>
          Welcome, {auth.profile?.full_name || 'Coach'}!
        </p>
        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 8 }}>
          {auth.isDemo ? '🟡 Demo mode — connect Supabase to enable real data' : '🟢 Connected to Supabase'}
        </p>
        <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 4 }}>
          Role: {auth.profile?.role} | Tab: {tab}
        </p>
      </div>
    </div>
  );
}
