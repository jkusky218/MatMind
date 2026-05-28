import { useAuth } from './hooks/useAuth';
import LoginScreen from './pages/LoginScreen';
import MainApp from './pages/MainApp';

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
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

  if (!auth.user) {
    return <LoginScreen auth={auth} />;
  }

  return <MainApp auth={auth} />;
}
