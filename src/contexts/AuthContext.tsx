import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { signOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { startKakaoLogin, completeKakaoLogin, kakaoLogout } from '../utils/kakaoAuth';
import { naverLogin } from '../utils/naverAuth';
import { signInWithEmail, signUpWithEmail } from '../utils/emailAuth';
import { getProfileOverride, saveProfileOverride } from '../utils/profileService';
import { recordUserLogin } from '../utils/trackingService';

export interface AppUser {
  provider: 'kakao' | 'naver' | 'email';
  providerId: string;
  uid: string; // `${provider}:${providerId}` - Firestore 문서 키로 사용
  nickname: string;
  profileImage?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loginWithKakao: (returnTo: string) => Promise<void>; // 카카오 로그인 페이지로 이동 (돌아오면 finishKakaoLogin)
  finishKakaoLogin: (code: string) => Promise<void>;
  loginWithNaver: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  updateUserProfile: (fields: { nickname?: string; profileImage?: string }) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'yournest_auth_user';

const AuthContext = createContext<AuthContextValue | null>(null);

// MeM ↔ Rheina 도메인 이동 시 로그인 이어주기 - 주소 # 뒤(서버로 전송되지 않음)에 1분짜리 로그인 정보를 실어 보냄
const HANDOFF_PREFIX = '#yn_auth=';
const HANDOFF_TTL_MS = 60_000;

export function authHandoffHash(user: AppUser): string {
  return HANDOFF_PREFIX + encodeURIComponent(JSON.stringify({ user, exp: Date.now() + HANDOFF_TTL_MS }));
}

// 앱 첫 로드 시(AuthProvider 생성 전) 한 번 호출 - 넘겨받은 로그인 정보를 이 도메인 세션으로 저장하고 주소에서 바로 지움
export function consumeAuthHandoff(): void {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith(HANDOFF_PREFIX)) return;
  window.history.replaceState(null, '', pathname + search);
  try {
    const { user, exp } = JSON.parse(decodeURIComponent(hash.slice(HANDOFF_PREFIX.length)));
    const valid =
      typeof exp === 'number' && exp > Date.now() &&
      ['kakao', 'naver', 'email'].includes(user?.provider) &&
      typeof user.uid === 'string' && typeof user.providerId === 'string' && typeof user.nickname === 'string';
    if (valid) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // 형식이 잘못된 값은 무시 (로그인 화면이 대신 뜸)
  }
}

function loadStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as AppUser;
    if (stored.provider === 'email' && stored.uid.startsWith('email:')) {
      const normalized = { ...stored, uid: stored.providerId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
    return stored;
  } catch {
    return null;
  }
}

// 카카오/네이버는 로그인할 때마다 제공자 원본 닉네임·사진을 다시 내려주므로,
// 사용자가 프로필 페이지에서 바꾼 값이 있으면 여기서 덮어씌워 복원한다.
async function applyProfileOverride(appUser: AppUser): Promise<AppUser> {
  const override = await getProfileOverride(appUser.uid);
  if (!override) return appUser;
  return {
    ...appUser,
    nickname: override.nickname?.trim() || appUser.nickname,
    profileImage: override.profileImage ?? appUser.profileImage,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => loadStoredUser());

  const persist = useCallback((next: AppUser | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loginWithKakao = useCallback(async (returnTo: string) => {
    await startKakaoLogin(returnTo);
  }, []);

  const finishKakaoLogin = useCallback(async (code: string) => {
    // kakaoCi는 관리자 지표용 users 문서에만 저장하고 localStorage 세션에는 넣지 않음
    const { kakaoCi, ...appUser } = await completeKakaoLogin(code);
    void recordUserLogin(appUser, { kakaoCi });
    persist(await applyProfileOverride(appUser));
  }, [persist]);

  const loginWithNaver = useCallback(async () => {
    const appUser = await naverLogin();
    void recordUserLogin(appUser);
    persist(await applyProfileOverride(appUser));
  }, [persist]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const appUser = await signInWithEmail(email, password);
    void recordUserLogin(appUser);
    persist(await applyProfileOverride(appUser));
  }, [persist]);

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    const appUser = await signUpWithEmail(email, password);
    void recordUserLogin(appUser);
    persist(await applyProfileOverride(appUser));
  }, [persist]);

  // 로그인한 사람이 스스로 닉네임/프로필 사진을 수정 (프로필 페이지에서 사용)
  const updateUserProfile = useCallback(
    async (fields: { nickname?: string; profileImage?: string }) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const nickname = fields.nickname?.trim();
      const next: AppUser = {
        ...user,
        ...(nickname ? { nickname } : {}),
        ...(fields.profileImage !== undefined ? { profileImage: fields.profileImage } : {}),
      };

      persist(next);

      await saveProfileOverride(user.uid, {
        nickname: next.nickname,
        profileImage: next.profileImage,
      });

      // 이메일 로그인은 실제 Firebase Auth 세션이 있으니 그쪽 프로필도 함께 갱신 (실패해도 무시)
      if (user.provider === 'email' && auth.currentUser) {
        try {
          await updateFirebaseProfile(auth.currentUser, {
            displayName: next.nickname,
            photoURL: next.profileImage ?? null,
          });
        } catch (error) {
          console.error('❌ Firebase Auth 프로필 업데이트 실패:', error);
        }
      }
    },
    [user, persist],
  );

  const logout = useCallback(() => {
    if (user?.provider === 'kakao') {
      kakaoLogout();
    }
    // 이메일 회원은 Firebase Auth 세션도 함께 종료 (안 하면 다음 사람이 같은 브라우저에서 이전 세션으로 저장될 수 있음)
    if (auth.currentUser) {
      void signOut(auth).catch((error) => console.error('Firebase 로그아웃 실패:', error));
    }
    persist(null);
  }, [user, persist]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithKakao,
        finishKakaoLogin,
        loginWithNaver,
        loginWithEmail,
        signupWithEmail,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }
  return ctx;
}
