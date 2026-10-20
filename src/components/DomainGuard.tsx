import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { authHandoffHash, useAuth } from '../contexts/AuthContext';
import { crossSiteUrl } from '../utils/siteDomain';

// MeM 도메인에서 Rheina 감정 여정으로, Rheina 도메인에서 MeM 으로 가면 화면을 그리지 않고 상대 도메인으로 보냄
// (WelcomePage 가 잠깐이라도 렌더링되면 위치 권한 요청 등이 MeM 도메인에서 뜨기 때문에 children 자체를 막음)
// 로그인 상태는 도메인마다 따로 저장되므로, 로그인한 경우 주소 # 뒤에 실어 보내 상대 도메인에서도 이어지게 함
export function DomainGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const redirectUrl = crossSiteUrl(location.pathname, location.search);

  useEffect(() => {
    if (redirectUrl) window.location.replace(redirectUrl + (user ? authHandoffHash(user) : ''));
  }, [redirectUrl, user]);

  return redirectUrl ? null : <>{children}</>;
}
