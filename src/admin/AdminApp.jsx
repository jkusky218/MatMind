// AdminApp.jsx — CEO Operations Dashboard shell
// Fixed 220px sidebar + flex-1 main content area.
// Sub-routes D03–D10 slot in here when built; stubs shown until then.

import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import OverviewPage  from './pages/OverviewPage';
import HealthPage    from './pages/HealthPage';
import TenantsPage   from './pages/TenantsPage';
import SupportPage   from './pages/SupportPage';

// ── Brand tokens (matching main app) ─────────────────────────────────────────
const C = {
  sidebarBg:   '#0F2440',
  mainBg:      '#1B3A5C',
  columbia:    '#6BADE4',
  gold:        '#C4A44A',
  white:       '#FFFFFF',
  muted:       'rgba(255,255,255,0.45)',
  activeOverlay: 'rgba(107,173,228,0.12)',
};

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { path: '/admin',           label: 'Overview',   icon: '⚙️',  exact: true },
  { path: '/admin/health',    label: 'Health',     icon: '🟢'  },
  { path: '/admin/tenants',   label: 'Tenants',    icon: '🏟️'  },
  { path: '/admin/analytics', label: 'Analytics',  icon: '📊'  },
  { path: '/admin/support',   label: 'Support',    icon: '🎫'  },
  { path: '/admin/dev',       label: 'Dev',        icon: '🚀'  },
  { path: '/admin/marketing', label: 'Marketing',  icon: '📣'  },
  { path: '/admin/finance',   label: 'Finance',    icon: '💰'  },
];

// ── Stub page for sections not yet built ─────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12, opacity: 0.6,
    }}>
      <p style={{ fontSize: 32, margin: 0 }}>🔧</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
        Coming in a future sprint
      </p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: C.sidebarBg,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('/admin')}
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: 0 }}>
          MatMind
        </p>
        <p style={{ fontSize: 11, color: C.columbia, margin: '2px 0 0', letterSpacing: '0.06em' }}>
          OPS DASHBOARD
        </p>
      </div>

      {/* Nav links */}
      <nav style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map(({ path, label, icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? C.white : C.muted,
              background: isActive ? C.activeOverlay : 'transparent',
              borderLeft: isActive ? `3px solid ${C.columbia}` : '3px solid transparent',
              transition: 'all 0.1s',
            })}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
      }}>
        MatMind · super_admin
      </div>
    </aside>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.mainBg }}>
      <Sidebar />

      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <Routes>
          <Route index element={<OverviewPage />} />
          <Route path="health"    element={<HealthPage />} />
          <Route path="tenants/*" element={<TenantsPage />} />
          <Route path="analytics" element={<ComingSoon label="Usage Analytics" />} />
          <Route path="support/*" element={<SupportPage />} />
          <Route path="dev"       element={<ComingSoon label="Development" />} />
          <Route path="marketing" element={<ComingSoon label="Marketing" />} />
          <Route path="finance"   element={<ComingSoon label="Finance" />} />
        </Routes>
      </main>
    </div>
  );
}
