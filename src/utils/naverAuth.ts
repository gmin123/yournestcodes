import { loadScript } from './loadScript';
import type { AppUser } from '../contexts/AuthContext';

declare global {
  interface Window {
    naver: any;
  }
}

const NAVER_SDK_URL = 'https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js';
const NAVER_CONTAINER_ID = 'naverIdLogin';

let naverLoginInstance: any = null;

// 네이버 SDK가 로그인 버튼을 렌더링할 숨김 컨테이너.
// LoginPage 마운트 시 미리 만들어둬야 함 (클릭 시점에 즉석으로 만들면 SDK가 못 찾음).
export function ensureNaverContainer(): void {
  if (document.getElementById(NAVER_CONTAINER_ID)) return;

  const container = document.createElement('div');
  container.id = NAVER_CONTAINER_ID;
  container.style.position = 'absolute';
  container.style.width = '1px';
  container.style.height = '1px';
  container.style.overflow = 'hidden';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);
}

export async function initNaverLogin(): Promise<any> {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
  if (!clientId) {
    throw new Error('네이버 로그인 키(VITE_NAVER_CLIENT_ID)가 아직 설정되지 않았습니다.');
  }

  ensureNaverContainer();
  await loadScript(NAVER_SDK_URL, 'naver-sdk');

  if (!window.naver) {
    throw new Error('네이버 SDK를 불러오지 못했습니다.');
  }

  if (!naverLoginInstance) {
    naverLoginInstance = new window.naver.LoginWithNaverId({
      clientId,
      callbackUrl: `${window.location.origin}/login`,
      isPopup: true,
      callbackHandle: true,
    });
    naverLoginInstance.init();
  }

  return naverLoginInstance;
}

function waitForLoginStatus(instance: any, timeoutMs = 60000, intervalMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      instance.getLoginStatus((status: boolean) => {
        if (status) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, intervalMs);
      });
    };

    check();
  });
}

// 네이버 SDK는 실제 DOM 버튼(#naverIdLogin 안의 <a>)을 통해서만 로그인 팝업을 띄울 수 있음.
// 팝업 로그인 완료 시점은 SDK가 콜백을 직접 안 주기 때문에 getLoginStatus를 폴링해서 감지한다.
// ⚠️ 실제 키 발급 전에는 이 흐름의 정확한 타이밍을 검증할 수 없음 - 키 발급 후 반드시 실제 테스트 필요.
export async function naverLogin(): Promise<AppUser> {
  const instance = await initNaverLogin();

  const button = document.querySelector<HTMLAnchorElement>(`#${NAVER_CONTAINER_ID} a`);
  if (!button) {
    throw new Error('네이버 로그인 버튼을 찾을 수 없습니다.');
  }
  button.click();

  const success = await waitForLoginStatus(instance);
  if (!success) {
    throw new Error('네이버 로그인에 실패했거나 시간이 초과되었습니다.');
  }

  const providerId = instance.user.getId();

  return {
    provider: 'naver',
    providerId,
    uid: `naver:${providerId}`,
    nickname: instance.user.getNickName() || instance.user.getName() || '네이버 사용자',
    profileImage: instance.user.getProfileImage(),
  };
}
