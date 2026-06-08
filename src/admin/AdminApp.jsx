// AdminApp.jsx — CEO Operations Dashboard stub
// D02 will replace this with the full shell + sidebar + overview page.
// This stub exists purely to verify code splitting and AdminGuard work end-to-end.

export default function AdminApp() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, #0F2440 0%, #1B3A5C 100%)',
      flexDirection: 'column',
      gap: 12,
    }}>
      <p style={{ fontSize: 28 }}>⚙️</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
        MatMind Ops Dashboard
      </p>
      <p style={{ fontSize: 13, color: '#6BADE4', margin: 0 }}>
        D02 shell coming next session
      </p>
    </div>
  );
}
