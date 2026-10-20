import { collection, getDocs, limit as fsLimit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { EVENT_LOG_COLLECTION } from './analyticsService';
import { SESSIONS_COLLECTION, USERS_COLLECTION } from './trackingService';

// 내부 전용 Admin API.
// 이 프로젝트엔 별도 서버가 없어서 Firestore를 직접 조회하는 "클라이언트 모듈" 형태이며,
// 모든 함수가 API Key를 받아 검증한 뒤에만 데이터를 돌려준다.
// ⚠️ 키 검증이 브라우저에서 이뤄지므로 진짜 보안 경계는 아님 - 실제 보호는 Firestore 보안 규칙/서버(Cloud Functions)가 필요.

// SHA-256 해시만 번들에 남김 (원문 키는 코드에 없음)
const ADMIN_KEY_SHA256 = '96cae35ce8a9b0244178bf28e4966c2ce1b8385723a96a6b838858cdd6ca0a1e';

export class AdminAuthError extends Error {
  constructor() {
    super('API Key가 올바르지 않습니다.');
    this.name = 'AdminAuthError';
  }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  return (await sha256Hex(apiKey)) === ADMIN_KEY_SHA256;
}

async function requireKey(apiKey: string): Promise<void> {
  if (!(await verifyApiKey(apiKey))) throw new AdminAuthError();
}

// ---------- 원천 데이터 ----------

export type Row = Record<string, string | number | null>;

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string' && value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// "2026-10-04 13:05:22" (로컬 시간)
export function formatDateTime(d: Date | null): string {
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface UserRecord {
  user_id: string;
  provider: string;
  kakao_ci: string | null;
  nickname: string;
  created_at: Date | null;
  last_login_at: Date | null;
}

export interface SessionRecord {
  session_id: string;
  visitor_id: string;
  user_id: string | null;
  session_start_time: Date | null;
  last_active_at: Date | null;
  page_view_count: number;
  landing_path: string;
  last_path: string;
}

export interface EventLogRecord {
  id: string;
  session_id: string;
  event_type: string;
  content_id: string;
  status: number;
  created_at: string;
}

export async function adminListUsers(apiKey: string): Promise<UserRecord[]> {
  await requireKey(apiKey);
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        user_id: String(data.user_id ?? d.id),
        provider: String(data.provider ?? ''),
        kakao_ci: typeof data.kakao_ci === 'string' ? data.kakao_ci : null,
        nickname: String(data.nickname ?? ''),
        created_at: toDate(data.created_at),
        last_login_at: toDate(data.last_login_at),
      };
    })
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
}

export async function adminListSessions(apiKey: string, sinceDays = 60): Promise<SessionRecord[]> {
  await requireKey(apiKey);
  const since = Timestamp.fromDate(new Date(Date.now() - sinceDays * DAY_MS));
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('session_start_time', '>=', since),
    orderBy('session_start_time', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      session_id: String(data.session_id ?? d.id),
      visitor_id: String(data.visitor_id ?? data.session_id ?? d.id),
      user_id: typeof data.user_id === 'string' ? data.user_id : null,
      session_start_time: toDate(data.session_start_time),
      last_active_at: toDate(data.last_active_at),
      page_view_count: Number(data.page_view_count ?? 0),
      landing_path: String(data.landing_path ?? ''),
      last_path: String(data.last_path ?? ''),
    };
  });
}

export async function adminListEventLogs(apiKey: string, maxDocs = 5000): Promise<EventLogRecord[]> {
  await requireKey(apiKey);
  const q = query(collection(db, EVENT_LOG_COLLECTION), orderBy('createdAt', 'desc'), fsLimit(maxDocs));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      session_id: String(data.session_id ?? ''),
      event_type: String(data.event_type ?? ''),
      content_id: String(data.content_id ?? ''),
      status: Number(data.status ?? 0),
      created_at: formatDateTime(toDate(data.created_at) ?? toDate(data.createdAt)),
    };
  });
}

// ---------- 지표 ----------

export interface DailyStat {
  date: string;
  visitors: number;
  sessions: number;
  pv: number;
  signups: number;
}

export interface AdminMetrics {
  generatedAt: Date;
  mau: number; // 최근 30일 고유 방문자(브라우저 기준, 비회원 포함)
  mauLoggedIn: number; // 최근 30일 로그인한 고유 회원
  pv30: number;
  pvPerMau: number;
  sessions30: number;
  totalUsers: number;
  newUsers7: number;
  newUsers30: number;
  usersWithKakaoCi: number;
  thisWeekVisitors: number;
  prevWeekVisitors: number;
  returnedVisitors: number; // 지난주 방문자 중 이번 주에도 방문한 수
  weeklyRevisitRate: number; // %
  daily: DailyStat[]; // 최근 30일, 최신순
}

function uniqueCount<T>(items: T[], key: (item: T) => string | null): number {
  return new Set(items.map(key).filter((k): k is string => Boolean(k))).size;
}

export function computeMetrics(users: UserRecord[], sessions: SessionRecord[], now = new Date()): AdminMetrics {
  const t = now.getTime();
  const within = (d: Date | null, fromDaysAgo: number, toDaysAgo = 0) =>
    Boolean(d && d.getTime() > t - fromDaysAgo * DAY_MS && d.getTime() <= t - toDaysAgo * DAY_MS);

  const last30 = sessions.filter((s) => within(s.session_start_time, 30));
  const thisWeek = sessions.filter((s) => within(s.session_start_time, 7));
  const prevWeek = sessions.filter((s) => within(s.session_start_time, 14, 7));

  const mau = uniqueCount(last30, (s) => s.visitor_id);
  const pv30 = last30.reduce((sum, s) => sum + s.page_view_count, 0);

  const thisWeekSet = new Set(thisWeek.map((s) => s.visitor_id));
  const prevWeekSet = new Set(prevWeek.map((s) => s.visitor_id));
  const returnedVisitors = [...prevWeekSet].filter((v) => thisWeekSet.has(v)).length;

  const daily: DailyStat[] = [];
  for (let i = 0; i < 30; i++) {
    const day = new Date(t - i * DAY_MS);
    const key = dateKey(day);
    const daySessions = sessions.filter((s) => s.session_start_time && dateKey(s.session_start_time) === key);
    daily.push({
      date: key,
      visitors: uniqueCount(daySessions, (s) => s.visitor_id),
      sessions: daySessions.length,
      pv: daySessions.reduce((sum, s) => sum + s.page_view_count, 0),
      signups: users.filter((u) => u.created_at && dateKey(u.created_at) === key).length,
    });
  }

  return {
    generatedAt: now,
    mau,
    mauLoggedIn: uniqueCount(last30, (s) => s.user_id),
    pv30,
    pvPerMau: mau > 0 ? Math.round((pv30 / mau) * 10) / 10 : 0,
    sessions30: last30.length,
    totalUsers: users.length,
    newUsers7: users.filter((u) => within(u.created_at, 7)).length,
    newUsers30: users.filter((u) => within(u.created_at, 30)).length,
    usersWithKakaoCi: users.filter((u) => u.kakao_ci).length,
    thisWeekVisitors: thisWeekSet.size,
    prevWeekVisitors: prevWeekSet.size,
    returnedVisitors,
    weeklyRevisitRate: prevWeekSet.size > 0 ? Math.round((returnedVisitors / prevWeekSet.size) * 1000) / 10 : 0,
    daily,
  };
}

export async function adminGetMetrics(apiKey: string): Promise<{ metrics: AdminMetrics; users: UserRecord[]; sessions: SessionRecord[] }> {
  const [users, sessions] = await Promise.all([adminListUsers(apiKey), adminListSessions(apiKey, 60)]);
  return { metrics: computeMetrics(users, sessions), users, sessions };
}

// ---------- CSV Export ----------

export function toCsv(rows: Row[], columns: string[]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => escape(r[c])).join(','))].join('\r\n');
}

// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙여서 다운로드
export function downloadCsv(filename: string, rows: Row[], columns: string[]): void {
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function userToRow(u: UserRecord): Row {
  return {
    user_id: u.user_id,
    provider: u.provider,
    kakao_ci: u.kakao_ci,
    nickname: u.nickname,
    created_at: formatDateTime(u.created_at),
    last_login_at: formatDateTime(u.last_login_at),
  };
}

export function sessionToRow(s: SessionRecord): Row {
  return {
    session_id: s.session_id,
    visitor_id: s.visitor_id,
    user_id: s.user_id,
    session_start_time: formatDateTime(s.session_start_time),
    last_active_at: formatDateTime(s.last_active_at),
    page_view_count: s.page_view_count,
    landing_path: s.landing_path,
    last_path: s.last_path,
  };
}

export const USER_COLUMNS = ['user_id', 'provider', 'kakao_ci', 'nickname', 'created_at', 'last_login_at'];
export const SESSION_COLUMNS = ['session_id', 'visitor_id', 'user_id', 'session_start_time', 'last_active_at', 'page_view_count', 'landing_path', 'last_path'];
export const EVENT_COLUMNS = ['id', 'session_id', 'event_type', 'content_id', 'status', 'created_at'];
