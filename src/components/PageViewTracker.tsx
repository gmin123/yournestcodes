import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ensureUserRecord, trackPageView } from '../utils/trackingService';

// 라우트가 바뀔 때마다 PV 1회 기록 (관리자 페이지는 지표에서 제외)
export function PageViewTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    // StrictMode의 이중 실행·같은 화면 재렌더로 두 번 세지 않도록
    if (lastKeyRef.current === location.key) return;
    lastKeyRef.current = location.key;
    trackPageView(location.pathname, user?.uid);
  }, [location.key, location.pathname, user?.uid]);

  useEffect(() => {
    if (user) void ensureUserRecord(user);
  }, [user]);

  return null;
}
