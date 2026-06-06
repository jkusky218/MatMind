import { useAuth } from './hooks/useAuth';
import { TeamProvider, useTeam } from './lib/TeamContext';
import LoginScreen from './pages/LoginScreen';
import MainApp from './pages/MainApp';

function AppInner() {
  const auth = useAuth();
  const { team, teamLoading, teamNotFound } = useTeam();

  if (teamLoading || auth.loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F2440 0%, #1B3A5C 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>MatMind</p>
          <p style={{ fontSize: 13, color: '#A5D0F0' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (teamNotFound) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F2440 0%, #1B3A5C 100%)',
        padding: '0 32px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>🤼</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Team not found</p>
        <p style={{ fontSize: 14, color: '#A5D0F0', maxWidth: 300 }}>
          The team at this address doesn't exist. Check the URL or contact your coach.
        </p>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginScreen auth={auth} team={team} />;
  }

  return <MainApp auth={auth} team={team} />;
}

export default function App() {
  return (
    <TeamProvider>
      <AppInner />
    </TeamProvider>
  );
}
