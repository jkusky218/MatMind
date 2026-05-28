const stroke = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
const svg = (d, s = 18, c = "currentColor", extra = {}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" {...stroke} {...extra}>{d}</svg>
);

export const Brain = (s = 18, c = "currentColor") => svg(<>
  <path d="M15.5 13a3.5 3.5 0 0 0-3.5-3.5 3.5 3.5 0 0 0-3.5 3.5"/>
  <path d="M8.5 13a3.5 3.5 0 0 1-.95 2.41A3.5 3.5 0 0 0 6 18.5a3.5 3.5 0 0 0 3.5 3.5h5a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-1.55-2.9A3.5 3.5 0 0 1 15.5 13"/>
  <path d="M12 2a3.5 3.5 0 0 0-3.5 3.5v.5"/><path d="M15.5 6v-.5A3.5 3.5 0 0 0 12 2"/>
  <path d="M8.5 6A3.5 3.5 0 0 0 5 9.5c0 .98.4 1.86 1.05 2.5"/>
  <path d="M15.5 6A3.5 3.5 0 0 1 19 9.5c0 .98-.4 1.86-1.05 2.5"/>
</>, s, c);

export const Send = (s = 18, c = "currentColor") => svg(<>
  <path d="M10 14L21 3"/>
  <path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1z"/>
</>, s, c);

export const Calendar = (s = 18, c = "currentColor") => svg(<>
  <rect x="3" y="4" width="18" height="18" rx="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</>, s, c);

export const Users = (s = 18, c = "currentColor") => svg(<>
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</>, s, c);

export const Check = (s = 18, c = "currentColor") => svg(<path d="M20 6L9 17l-5-5"/>, s, c);

export const Clock = (s = 14, c = "currentColor") => svg(<>
  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
</>, s, c);

export const MapPin = (s = 14, c = "currentColor") => svg(<>
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
  <circle cx="12" cy="10" r="3"/>
</>, s, c);

export const ChevDown = (s = 14, c = "currentColor") => svg(<polyline points="6 9 12 15 18 9"/>, s, c);

export const ChevLeft = (s = 18, c = "currentColor") => svg(<polyline points="15 18 9 12 15 6"/>, s, c);

export const Chat = (s = 18, c = "currentColor") => svg(
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  s, c
);

export const School = (s = 14, c = "currentColor") => svg(<>
  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
</>, s, c);

export const Phone = (s = 14, c = "currentColor") => svg(
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>,
  s, c
);

export const Mail = (s = 14, c = "currentColor") => svg(<>
  <rect x="2" y="4" width="20" height="16" rx="2"/>
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
</>, s, c);

export const UserIcon = (s = 14, c = "currentColor") => svg(<>
  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</>, s, c);

export const Star = (s = 14, c = "currentColor") => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const Megaphone = (s = 18, c = "currentColor") => svg(<>
  <path d="m3 11 18-5v12L3 13v-2z"/>
  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
</>, s, c);

export const Hash = (s = 16, c = "currentColor") => svg(<>
  <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
  <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
</>, s, c);

export const Lock = (s = 14, c = "currentColor") => svg(<>
  <rect x="3" y="11" width="18" height="11" rx="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</>, s, c);

export const Pin = (s = 12, c = "currentColor") => svg(<>
  <line x1="12" y1="17" x2="12" y2="22"/>
  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
</>, s, c);

// Map icon name strings to component functions (matches CHANNELS[].icon)
export const ICON_MAP = { brain: Brain, megaphone: Megaphone, hash: Hash, lock: Lock };
