import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../firebase';
import type { AppUser } from '../contexts/AuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '가입되지 않은 이메일입니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/operation-not-allowed': '이메일 로그인이 아직 활성화되지 않았습니다. Firebase 콘솔에서 이메일/비밀번호 로그인을 켜주세요.',
};

function toAppUser(cred: UserCredential): AppUser {
  const firebaseUser = cred.user;
  return {
    provider: 'email',
    providerId: firebaseUser.uid,
    uid: firebaseUser.uid,
    nickname: firebaseUser.email?.split('@')[0] ?? '사용자',
  };
}

function mapError(e: unknown): Error {
  const code = (e as { code?: string })?.code;
  return new Error((code && ERROR_MESSAGES[code]) || '이메일 로그인 중 오류가 발생했습니다.');
}

export async function signUpWithEmail(email: string, password: string): Promise<AppUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return toAppUser(cred);
  } catch (e) {
    throw mapError(e);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return toAppUser(cred);
  } catch (e) {
    throw mapError(e);
  }
}
