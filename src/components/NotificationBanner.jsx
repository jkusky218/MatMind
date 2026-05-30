// Shown in the Messages tab when push notifications haven't been enabled yet.
// Dismisses permanently once the user makes a choice.

import { useState } from 'react';
import { BRAND } from '../lib/constants';

export default function NotificationBanner({ push }) {
  const [dismissed, setDismiss] = useState(false);

  // Nothing to show if not supported, already granted/denied, or dismissed
  if (!push.supported || push.permission !== 'default' || dismissed) return null;

  return (
    <div style={{
      margin: '12px 12px 0',
      background: `linear-gradient(135deg, ${BRAND.navyDark}, ${BRAND.navy})`,
      borderRadius: 14, padding: '14px 14px 12px',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>
            Get notified instantly
          </p>
          <p style={{ fontSize: 12, color: BRAND.columbiaMid, margin: 0, lineHeight: 1.4 }}>
            Receive alerts for practice changes, tournament reminders, and team updates.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={async () => {
            const result = await push.subscribe();
            if (result.ok || result.error === 'Permission not granted') setDismiss(true);
          }}
          disabled={push.loading}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
            background: BRAND.columbia, color: BRAND.navyDark,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {push.loading ? 'Enabling…' : 'Enable Notifications'}
        </button>
        <button
          onClick={() => setDismiss(true)}
          style={{
            padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', color: BRAND.columbiaMid,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
