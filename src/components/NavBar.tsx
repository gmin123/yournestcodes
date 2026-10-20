import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // MeM 화면은 자체 헤더(햄버거 메뉴)를 쓰므로 Rheina 공용 NavBar 를 띄우지 않음
  if (
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/mem' ||
    location.pathname === '/calendar'
  ) {
    return null;
  }

  return (
    <div
      className="glass-effect"
      style={{
        position: 'fixed',
        top: 'max(1rem, env(safe-area-inset-top))',
        right: '1rem',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        borderRadius: '999px',
      }}
    >
      {user ? (
        <>
          <Link
            to="/mem"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              opacity: 0.95,
              padding: '0.35rem 0.7rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            MeM
          </Link>
          <button
            onClick={logout}
            aria-label="로그아웃"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              opacity: 0.75,
              padding: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </>
      ) : (
        <Link to="/login" style={{ color: '#ff6b9d', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
          로그인
        </Link>
      )}
    </div>
  );
}
