import { collection, deleteDoc, deleteField, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import type { AppUser } from '../contexts/AuthContext';
import { deleteAllDiaryEntries } from './diaryService';
import { kakaoUnlink } from './kakaoAuth';
import { SESSIONS_COLLECTION, USERS_COLLECTION } from './trackingService';

export class RecentLoginRequiredError extends Error {
  constructor() {
    super('보안을 위해 다시 로그인한 뒤 탈퇴를 진행해주세요.');
    this.name = 'RecentLoginRequiredError';
  }
}

// 회원 탈퇴 - 탈퇴 후 데이터 처리:
// 1) 로그인 계정 해제 (이메일: Firebase Auth 계정 삭제 / 카카오: 앱 연결 끊기)
// 2) 아카이빙 기록(diaryEntries) · 프로필(profiles) · 회원 정보(users, kakao_ci 포함) 삭제
// 3) 방문 통계(sessions)는 지표 산출용으로 남기되 user_id 연결을 끊어 익명화
export async function deleteAccount(user: AppUser): Promise<{ deletedEntries: number }> {
  if (user.provider === 'email') {
    // 다른 도메인에서 로그인을 넘겨받은 경우 이 도메인엔 Firebase 세션이 없음 → 데이터만 지우고 계정이 남지 않도록 재로그인 요청
    const current = auth.currentUser;
    if (!current) throw new RecentLoginRequiredError();
    try {
      await deleteUser(current);
    } catch (error) {
      if ((error as { code?: string })?.code === 'auth/requires-recent-login') throw new RecentLoginRequiredError();
      throw error;
    }
  } else if (user.provider === 'kakao') {
    try {
      await kakaoUnlink();
    } catch (error) {
      // 연결 끊기에 실패해도 앱 데이터 삭제는 계속 진행 (사용자는 카카오 계정 설정에서도 연결 해제 가능)
      console.error('[탈퇴] 카카오 연결 끊기 실패', error);
    }
  }

  const deletedEntries = await deleteAllDiaryEntries(user.uid);
  await Promise.all([
    deleteDoc(doc(db, 'profiles', user.uid)),
    deleteDoc(doc(db, USERS_COLLECTION, user.uid)),
  ]);

  const sessions = await getDocs(query(collection(db, SESSIONS_COLLECTION), where('user_id', '==', user.uid)));
  await Promise.all(sessions.docs.map((d) => updateDoc(d.ref, { user_id: deleteField() })));

  return { deletedEntries };
}
