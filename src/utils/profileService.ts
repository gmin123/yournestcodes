import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 로그인 제공자(카카오/네이버)가 매번 원본 닉네임·사진을 다시 내려주기 때문에,
// 사용자가 앱 안에서 수정한 값은 따로 Firestore에 저장해뒀다가 로그인 시 덮어씌워 복원한다.
const COLLECTION = 'profiles';

export interface ProfileOverride {
  nickname?: string;
  profileImage?: string;
}

export async function getProfileOverride(uid: string): Promise<ProfileOverride | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
      profileImage: typeof data.profileImage === 'string' ? data.profileImage : undefined,
    };
  } catch (error) {
    console.error('❌ 프로필 불러오기 실패:', error);
    return null;
  }
}

export async function saveProfileOverride(uid: string, fields: ProfileOverride): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, uid),
    {
      ...(fields.nickname !== undefined ? { nickname: fields.nickname } : {}),
      ...(fields.profileImage !== undefined ? { profileImage: fields.profileImage } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
