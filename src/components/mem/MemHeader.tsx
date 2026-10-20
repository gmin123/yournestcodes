import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { siteHomePath } from '../../utils/siteDomain';
import { MEM, useBodyScrollLock, useEscapeKey } from './memTheme';

// MeM 상단 헤더: 브랜드(MeM / My Emotional Museum) + 햄버거 메뉴
// 참고 사이트는 햄버거 버튼(≡)만 있고 메뉴 항목이 정의돼 있지 않아,
// 메뉴 항목은 이 프로젝트에 실제로 존재하는 경로만 사용함
export function MemHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useBodyScrollLock(open);
  useEscapeKey(open, close);

  // 경로가 바뀌면 메뉴 닫기
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const items: { label: string; to: string; state?: unknown }[] = [
    { label: 'MeM 홈', to: '/mem' },
    { label: '오늘의 마음 남기기 (Rheina)', to: '/' },
    ...(user ? [{ label: '마이페이지', to: '/profile' }] : []),
    { label: '개인정보처리방침', to: '/privacy' },
  ];

  const itemStyle = {
    display: 'block',
    width: '100%',
    padding: '14px 4px',
    border: 'none',
    borderBottom: `1px solid ${MEM.border}`,
    color: MEM.text,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'left' as const,
    background: 'none',
    cursor: 'pointer',
    fontFamily: MEM.font,
  };

  return (
    <>
      <header style={{ height: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: MEM.text }}>MeM</span>
          <span style={{ fontSize: 10, color: MEM.textMuted, fontWeight: 400 }}>My Emotional Museum</span>
        </div>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={{
            width: 40,
            height: 40,
            marginRight: -8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: MEM.text,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {/* 글자(≡) 대신 SVG 3줄 아이콘 - 폰트에 따라 굵기·위치가 달라지지 않도록 */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="19" y2="6" />
            <line x1="3" y1="11" x2="19" y2="11" />
            <line x1="3" y1="16" x2="19" y2="16" />
          </svg>
        </button>
      </header>

      {open && (
        <div
          onClick={close}
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
        >
          <nav
            aria-label="MeM 메뉴"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(280px, 80vw)',
              height: '100%',
              background: MEM.appBg,
              borderLeft: `1px solid ${MEM.border}`,
              padding: '20px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: MEM.font,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48, marginBottom: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: MEM.text }}>MeM</span>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={close}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: 'none',
                  color: MEM.text,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {items.map((item) => (
              <Link key={item.to} to={item.to} onClick={close} style={itemStyle}>
                {item.label}
              </Link>
            ))}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  close();
                  // 로그아웃하면 MeM 도메인은 로그인 화면(/mem → 로그인)으로, 그 외는 Rheina 첫 화면으로
                  navigate(siteHomePath(), { replace: true });
                  logout();
                }}
                style={{ ...itemStyle, color: MEM.textMuted }}
              >
                로그아웃
              </button>
            ) : (
              <Link to="/login" state={{ from: '/mem' }} onClick={close} style={itemStyle}>
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
