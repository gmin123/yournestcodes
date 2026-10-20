import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { getArtistMessage, getArtworkMessage, type Artwork } from './artworkRecommendation';
import type { CurizmExhibition } from './curizmApi';
import { normalizeExternalUrl } from './safeData';

export interface SavedArtworkRef {
  source: 'firestore' | 'curizm';
  refId: string;
  title: string;
  imageUrl: string;
  artistName?: string;
  artworkDescription?: string;
  artistDescription?: string;
  weather?: string;
  situationTags?: string[];
  emotionTag1?: string;
  emotionTag2?: string;
  savedAt: Timestamp;
}

export interface DiaryEntry {
  uid: string;
  date: string; // "YYYY-MM-DD" (로컬 기준)
  memo: string;
  savedArtworks: SavedArtworkRef[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION = 'diaryEntries';

export function hasUsableImageUrl(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

// 로컬(KST 등) 기준 YYYY-MM-DD - UTC 변환 시 날짜가 하루 밀리는 문제 방지
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(s: string): Date {
  const [year, month, day] = s.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function diaryDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

export async function getDiaryEntries(uid: string): Promise<DiaryEntry[]> {
  const q = query(collection(db, COLLECTION), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as DiaryEntry);
}

export async function getDiaryEntry(uid: string, date: string): Promise<DiaryEntry | null> {
  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as DiaryEntry) : null;
}

// 한 줄 메모 최대 글자 수 (화면 입력 제한 + 저장 시 한 번 더 잘라서 보장)
export const MEMO_MAX_LENGTH = 50;

export async function saveMemo(uid: string, date: string, rawMemo: string): Promise<void> {
  const memo = Array.from(rawMemo.trim()).slice(0, MEMO_MAX_LENGTH).join(''); // 이모지도 1글자로 세도록 code point 단위
  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      date,
      memo,
      savedArtworks: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { memo, updatedAt: serverTimestamp() });
  }
}

export async function deleteDiaryEntry(uid: string, date: string): Promise<void> {
  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  await deleteDoc(ref);
}

// 메모만 삭제 - 담아둔 작품이 없으면 그 날짜 기록 자체가 비게 되므로 문서를 지움
export async function deleteMemo(uid: string, date: string): Promise<void> {
  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entry = snap.data() as DiaryEntry;
  if ((entry.savedArtworks ?? []).length === 0) {
    await deleteDoc(ref);
    return;
  }
  await updateDoc(ref, { memo: '', updatedAt: serverTimestamp() });
}

// 회원 탈퇴 시 그 회원의 아카이빙(작품·메모·날씨) 기록 전체 삭제
export async function deleteAllDiaryEntries(uid: string): Promise<number> {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('uid', '==', uid)));
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  return snapshot.size;
}

export async function removeSavedArtwork(uid: string, date: string, refId: string): Promise<void> {
  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const entry = snap.data() as DiaryEntry;
  const nextArtworks = (entry.savedArtworks ?? []).filter((artwork) => artwork.refId !== refId);

  if (nextArtworks.length === 0) {
    await deleteDoc(ref);
    return;
  }

  await updateDoc(ref, {
    savedArtworks: nextArtworks,
    updatedAt: serverTimestamp(),
  });
}

export async function saveArtworkToDay(
  uid: string,
  date: string,
  artworkRef: Omit<SavedArtworkRef, 'savedAt'>
): Promise<void> {
  if (!hasUsableImageUrl(artworkRef.imageUrl)) {
    throw new Error('이미지 정보가 없어 저장할 수 없습니다.');
  }

  const ref = doc(db, COLLECTION, diaryDocId(uid, date));
  const snap = await getDoc(ref);
  const refWithTimestamp = Object.fromEntries(
    Object.entries({ ...artworkRef, savedAt: Timestamp.now() }).filter(([, value]) => value !== undefined),
  );

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      date,
      memo: '',
      savedArtworks: [refWithTimestamp],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      savedArtworks: arrayUnion(refWithTimestamp),
      updatedAt: serverTimestamp(),
    });
  }
}

export function artworkToRef(a: Artwork): Omit<SavedArtworkRef, 'savedAt'> {
  return {
    source: 'firestore',
    refId: a.id,
    title: a.title,
    imageUrl: a.image_url,
    artistName: a.artist_name ?? a.artist,
    artworkDescription: getArtworkMessage(a) || undefined,
    artistDescription: getArtistMessage(a) || undefined,
    emotionTag1: a.emotion_tag_1,
    emotionTag2: a.emotion_tag_2,
  };
}

// 담아둔 작품의 참고 링크 - 원본 작품 문서(firstdata/{refId})에 실제로 저장된 URL만 사용
// (저장 당시 ref 에는 링크가 없으므로 원본을 1회 조회 후 캐시. 링크를 새로 만들어내지 않음)
export interface SavedArtworkLink {
  label: string;
  url: string;
}

const savedArtworkLinksCache = new Map<string, Promise<SavedArtworkLink[]>>();

export function getSavedArtworkLinks(ref: Pick<SavedArtworkRef, 'source' | 'refId'>): Promise<SavedArtworkLink[]> {
  // 큐리즘 로컬 데이터에는 external_url/booking_url 값이 없음 → 링크 없음
  if (ref.source !== 'firestore' || !ref.refId) return Promise.resolve([]);
  const cached = savedArtworkLinksCache.get(ref.refId);
  if (cached) return cached;

  const promise = getDoc(doc(db, 'firstdata', ref.refId))
    .then((snap) => {
      if (!snap.exists()) return [];
      const data = snap.data() as Partial<Artwork>;
      const candidates: SavedArtworkLink[] = [
        { label: '작품 소장하기', url: normalizeExternalUrl(data.shop_url) },
        { label: '작품 홈페이지', url: normalizeExternalUrl(data.external_url) },
        { label: '소장처 홈페이지', url: normalizeExternalUrl(data.museum_url) },
      ];
      return candidates.filter((link, i) => link.url && candidates.findIndex((c) => c.url === link.url) === i);
    })
    .catch((error) => {
      savedArtworkLinksCache.delete(ref.refId); // 실패는 캐시하지 않음 - 다음에 다시 조회
      throw error;
    });

  savedArtworkLinksCache.set(ref.refId, promise);
  return promise;
}

export function curizmToRef(e: CurizmExhibition): Omit<SavedArtworkRef, 'savedAt'> {
  return {
    source: 'curizm',
    refId: e.id,
    title: e.title,
    imageUrl: e.coverImage,
    artworkDescription: e.introduction,
  };
}
