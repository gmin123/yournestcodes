import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit as fsLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { getSessionId } from './session';

export const EVENT_TYPES = {
  MODAL_OPEN: 'MODAL_OPEN',
  MODAL_CLOSE: 'MODAL_CLOSE',
  MEM_SAVE_CLICK: 'MEM_SAVE_CLICK',
  BOOKING_CLICK: 'BOOKING_CLICK',
  WEBSITE_CLICK: 'WEBSITE_CLICK',
  ART_PURCHASE_CLICK: 'ART_PURCHASE_CLICK',
} as const;

type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// 검수 증빙용 익명 세션 이벤트 로그 - 이 프로젝트엔 별도 백엔드 서버가 없어서
// (Firebase 클라이언트 SDK로 Firestore를 직접 호출하는 구조), "서버 로그 파일" 대신
// 이 Firestore 컬렉션을 원천 로그 저장소로 씀. status 200/500 카운트로 작동 성공률을 계산함.
export const EVENT_LOG_COLLECTION = 'eventLogs';

const analyticsEndpoint = `${import.meta.env.VITE_MEM_API_BASE_URL ?? ''}/api/v1/events`;

export interface EventLogEntry {
  session_id: string;
  event_type: EventType;
  content_id: string;
  status: number;
  created_at: string;
}

export function logEvent(eventType: EventType, contentId: string, status: number): void {
  const event: EventLogEntry = {
    session_id: getSessionId(),
    event_type: eventType,
    content_id: contentId,
    status,
    created_at: new Date().toISOString(),
  };

  console.info('[Rheina event]', event);

  // 검수 증빙 원천 로그 - Firestore에 익명 세션 단위로 누적 저장(Fire-and-Forget, UI 흐름을 막지 않음)
  void addDoc(collection(db, EVENT_LOG_COLLECTION), {
    ...event,
    createdAt: serverTimestamp(),
  }).catch((error) => console.error('[Rheina event] Firestore 로그 저장 실패', error));

  // 별도 백엔드(VITE_MEM_API_BASE_URL)가 설정된 경우에는 그쪽으로도 함께 전송(기존 동작 유지)
  if (import.meta.env.VITE_MEM_API_BASE_URL) {
    void fetch(analyticsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch((error) => console.error('[Rheina event] 전송 실패', error));
  }
}

export interface EventLogSummary {
  total: number;
  successCount: number; // status === 200
  failCount: number; // status !== 200
  successRate: number; // 0~100, total이 0이면 0
  byType: Record<string, { total: number; success: number; fail: number }>;
  sampleSize: number; // 실제로 조회한 문서 수(최대 조회 개수 제한이 걸려있을 수 있음)
}

// 검수 증빙용 성공률 집계 - 최근 maxDocs개 이벤트를 기준으로 계산(기본 5000개)
export async function getEventLogSummary(maxDocs = 5000): Promise<EventLogSummary> {
  const q = query(collection(db, EVENT_LOG_COLLECTION), orderBy('createdAt', 'desc'), fsLimit(maxDocs));
  const snap = await getDocs(q);

  const byType: Record<string, { total: number; success: number; fail: number }> = {};
  let successCount = 0;

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Partial<EventLogEntry>;
    const type = data.event_type ?? 'UNKNOWN';
    const status = data.status ?? 0;
    if (!byType[type]) byType[type] = { total: 0, success: 0, fail: 0 };
    byType[type].total += 1;
    if (status === 200) {
      byType[type].success += 1;
      successCount += 1;
    } else {
      byType[type].fail += 1;
    }
  });

  const total = snap.size;
  return {
    total,
    successCount,
    failCount: total - successCount,
    successRate: total > 0 ? Math.round((successCount / total) * 1000) / 10 : 0,
    byType,
    sampleSize: total,
  };
}

// 검수용 원천 로그 데이터셋 추출 - 최근 maxDocs개를 그대로 반환(다운로드/제출용)
export async function exportEventLogs(maxDocs = 5000): Promise<(EventLogEntry & { id: string })[]> {
  const q = query(collection(db, EVENT_LOG_COLLECTION), orderBy('createdAt', 'desc'), fsLimit(maxDocs));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as EventLogEntry) }));
}
