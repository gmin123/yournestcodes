import { doc, getDoc, increment, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getSessionId } from './session';
import type { AppUser } from '../contexts/AuthContext';

// 관리자 지표(MAU·신규 가입자·재방문율·PV)의 원천 데이터
// - users    : 회원 1명당 1문서 (user_id, kakao_ci, created_at ...)
// - sessions : 브라우저 세션(탭) 1개당 1문서 (session_start_time, page_view_count ...)
export const USERS_COLLECTION = 'users';
export const SESSIONS_COLLECTION = 'sessions';

const VISITOR_KEY = 'rheina_visitor_id';
const SESSION_STARTED_KEY = 'rheina_session_started';

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 로그인하지 않은 방문자도 MAU·재방문율에 잡히도록 브라우저 단위 고정 id (localStorage)
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return getSessionId();
  }
}

// 페이지 이동 1번 = PV 1. 세션 문서가 없으면 만들고(session_start_time 기록), 있으면 page_view_count만 +1
export function trackPageView(path: string, userId?: string | null): void {
  const sessionId = getSessionId();
  let isFirst = false;
  try {
    isFirst = sessionStorage.getItem(SESSION_STARTED_KEY) !== sessionId;
    if (isFirst) sessionStorage.setItem(SESSION_STARTED_KEY, sessionId);
  } catch {
    // 스토리지를 못 쓰는 환경이면 시작 시간은 건드리지 않고 카운트만 올림
  }

  const data: Record<string, unknown> = {
    session_id: sessionId,
    visitor_id: getVisitorId(),
    page_view_count: increment(1),
    last_path: path,
    last_active_at: serverTimestamp(),
  };
  if (userId) data.user_id = userId;
  if (isFirst) {
    data.session_start_time = serverTimestamp();
    data.landing_path = path;
  }

  void setDoc(doc(db, SESSIONS_COLLECTION, sessionId), data, { merge: true }).catch((error) =>
    console.error('[tracking] 세션 기록 실패', error),
  );
}

// 로그인/가입 시 회원 문서 기록. created_at은 문서가 처음 생길 때 한 번만 저장
export async function recordUserLogin(user: AppUser, extra: { kakaoCi?: string | null } = {}): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // 이메일 회원은 Firebase Auth의 실제 가입 시각을 사용 (이 기능 도입 전 가입자도 정확하게)
      const authCreated = user.provider === 'email' && auth.currentUser?.metadata.creationTime;
      await setDoc(ref, {
        user_id: user.uid,
        provider: user.provider,
        provider_id: user.providerId,
        kakao_ci: extra.kakaoCi ?? null,
        nickname: user.nickname,
        created_at: authCreated ? Timestamp.fromDate(new Date(authCreated)) : serverTimestamp(),
        last_login_at: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        last_login_at: serverTimestamp(),
        nickname: user.nickname,
        ...(extra.kakaoCi ? { kakao_ci: extra.kakaoCi } : {}),
      });
    }
  } catch (error) {
    console.error('[tracking] 회원 기록 실패', error);
  }
}

// 이 기능 도입 전부터 로그인 상태가 유지되던 회원도 users에 들어가도록 세션당 1번 확인
const ensuredUsers = new Set<string>();
export async function ensureUserRecord(user: AppUser): Promise<void> {
  if (ensuredUsers.has(user.uid)) return;
  ensuredUsers.add(user.uid);
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (!snap.exists()) await recordUserLogin(user);
  } catch (error) {
    console.error('[tracking] 회원 확인 실패', error);
  }
}
