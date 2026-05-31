import { BRAND, CHANNELS } from '../lib/constants';
import { Brain, Lock, ICON_MAP } from './Icons';

export default function ChannelList({ onSelect, channelMessages, userRole = 'coach' }) {
  const isParent = userRole === 'parent';

  const getLastMessage = (slug) => {
    const msgs = channelMessages[slug] ?? [];
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const getUnreadCount = (slug) => {
    if (slug === 'ai') return 0;
    const msgs = channelMessages[slug] ?? [];
    return msgs.some(m => m.role === 'parent') ? 1 : 0;
  };

  // Parents don't see the private AI channel
  const publicChannels = CHANNELS.filter(ch => ch.id !== 'ai');
  const visibleCount   = isParent ? publicChannels.length : CHANNELS.length;

  return (
    <div style={{ padding: '16px 12px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Messages</p>
        <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>{visibleCount} channels</p>
      </div>

      {/* AI channel — coaches only, featured card */}
      {!isParent && <div style={{ marginBottom: 16 }}>
        <button onClick={() => onSelect(CHANNELS[0])} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          border: `1px solid ${BRAND.columbia}30`, borderRadius: 14, padding: '14px 16px',
          background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navy} 100%)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(107,173,228,0.15)', border: '1px solid rgba(107,173,228,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {Brain(22, BRAND.columbia)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>MatMind AI</p>
            <p style={{ fontSize: 12, color: BRAND.columbiaMid, margin: '2px 0 0' }}>Ask me anything about the team</p>
          </div>
          <div style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(107,173,228,0.15)', fontSize: 10, fontWeight: 600, color: BRAND.columbia }}>
            Private
          </div>
        </button>
      </div>}

      <p style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px 4px' }}>
        Team channels
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {publicChannels.map(ch => {
          const ChIcon  = ICON_MAP[ch.icon] ?? ICON_MAP.hash;
          const last    = getLastMessage(ch.id);
          const unread  = getUnreadCount(ch.id);
          return (
            <button key={ch.id} onClick={() => onSelect(ch)} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              border: '1px solid #e8edf2', borderRadius: 12, padding: '12px 14px',
              background: '#fff', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: ch.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ChIcon(16, ch.color)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
                    {ch.private ? '' : '# '}{ch.label}
                  </p>
                  {ch.private && Lock(11, '#bbb')}
                </div>
                {last && (
                  <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 500, color: '#777' }}>{last.sender?.split(' ')[0]}:</span>{' '}
                    {last.text?.slice(0, 50)}{(last.text?.length ?? 0) > 50 ? '...' : ''}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: BRAND.columbia, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {unread}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
