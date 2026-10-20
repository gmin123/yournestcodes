import { loadScript } from './loadScript';
import type { AppUser } from '../contexts/AuthContext';

declare global {
  interface Window {
    Kakao: any;
  }
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_API_URL = 'https://kapi.kakao.com';

// 로그인한 페이지 세션 동안만 메모리에 보관 (새로고침하면 사라짐)
let kakaoAccessToken: string | null = null;

// SDK 의 API.request 는 KA 헤더를 붙여 "JavaScript SDK 도메인" 검사를 받는데(domain mismatched 오류),
// 토큰만 붙여 kapi 를 직접 호출하면 그 검사 없이 동작하므로 SDK 대신 fetch 로 호출함
async function kakaoApi(path: string, method: 'GET' | 'POST' = 'GET'): Promise<any> {
  if (!kakaoAccessToken) throw new Error('카카오 로그인 토큰이 없습니다.');
  const res = await fetch(`${KAKAO_API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${kakaoAccessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

export function isKakaoConfigured(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_JS_KEY);
}

async function ensureKakaoInit(): Promise<void> {
  const jsKey = import.meta.env.VITE_KAKAO_JS_KEY;
  if (!jsKey) {
    throw new Error('카카오 로그인 키가 아직 설정되지 않아 카카오 로그인을 사용할 수 없습니다. 이메일 로그인을 이용해주세요.');
  }

  await loadScript(KAKAO_SDK_URL, 'kakao-sdk');

  if (!window.Kakao) {
    throw new Error('카카오 SDK를 불러오지 못했습니다.');
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(jsKey);
  }
}

// 카카오가 인가 코드를 붙여 돌려보낼 주소. 카카오 개발자 콘솔 > 카카오 로그인 > Redirect URI 에 똑같이 등록돼 있어야 함
function kakaoRedirectUri(): string {
  return `${window.location.origin}/login`;
}

// SDK 2.x 에는 팝업 로그인(Auth.login)이 없어서, 카카오 로그인 페이지로 이동했다가
// /login?code=...&state=<돌아갈 경로> 로 돌아오는 리다이렉트 방식만 가능함
export async function startKakaoLogin(returnTo: string): Promise<void> {
  await ensureKakaoInit();
  window.Kakao.Auth.authorize({
    redirectUri: kakaoRedirectUri(),
    state: returnTo,
  });
}

// kakaoCi: 카카오 비즈 앱 + CI 동의항목 승인이 있어야 내려옴(없으면 undefined). localStorage에는 저장하지 않음
export async function completeKakaoLogin(code: string): Promise<AppUser & { kakaoCi?: string }> {
  await ensureKakaoInit();

  // JavaScript 키로 교환하면 클라이언트 시크릿 없이 브라우저에서 바로 토큰을 받을 수 있음 (어드민 키는 절대 프론트에 두지 말 것)
  const tokenRes = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: import.meta.env.VITE_KAKAO_JS_KEY,
      redirect_uri: kakaoRedirectUri(),
      code,
    }),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) {
    throw new Error('카카오 로그인에 실패했습니다: ' + (token.error_description ?? JSON.stringify(token)));
  }
  kakaoAccessToken = token.access_token;

  const profile = await kakaoApi('/v2/user/me').catch((err: Error) => {
    throw new Error('카카오 프로필 조회에 실패했습니다: ' + err.message);
  });

  const providerId = String(profile.id);
  const kakaoAccount = profile.kakao_account ?? {};
  const kakaoProfile = kakaoAccount.profile ?? {};

  return {
    provider: 'kakao',
    providerId,
    uid: `kakao:${providerId}`,
    nickname: kakaoProfile.nickname ?? '카카오 사용자',
    profileImage: kakaoProfile.profile_image_url,
    kakaoCi: typeof kakaoAccount.ci === 'string' ? kakaoAccount.ci : undefined,
  };
}

// 회원 탈퇴 시 카카오 계정과 앱 연결 끊기 (다음 로그인 때 다시 동의 화면이 뜨는 신규 가입 상태가 됨)
export async function kakaoUnlink(): Promise<void> {
  if (!kakaoAccessToken) return; // 이미 토큰이 없으면 끊을 연결도 없음
  await kakaoApi('/v1/user/unlink', 'POST').catch((err: Error) => {
    throw new Error('카카오 연결 끊기에 실패했습니다: ' + err.message);
  });
  kakaoAccessToken = null;
}

export function kakaoLogout(): void {
  if (!kakaoAccessToken) return;
  // 로그아웃 실패는 무시 (세션은 어차피 로컬에서 지워짐)
  void kakaoApi('/v1/user/logout', 'POST').catch(() => {});
  kakaoAccessToken = null;
}
