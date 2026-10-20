import * as XLSX from 'xlsx';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// 🔥 작품 데이터가 저장되는 파이어스토어 컬렉션(클래스)명
export const ARTWORK_COLLECTION = 'data';
// 🔥 임시/검수용으로 따로 넣어보고 싶을 때 선택할 수 있는 두 번째 컬렉션
export const ARTWORK_COLLECTION_ALT = 'firstdata';

// 앱(artworkRecommendation 등)이 실제로 읽는 핵심 필드
export interface ArtworkRecord {
  index: number | null; // id → 정수
  title: string; // artwork_title
  description: string; // artwork_description
  reason: string; // reason (엑셀에 없으면 빈 값)
  image_url: string; // image_url
  emotion_tag_1: string;
  emotion_tag_2: string;
  emotion_tag_3: string;
  // 원본 엑셀 A~AP 컬럼도 헤더명 그대로 함께 저장됨 (아래 인덱스 시그니처)
  [key: string]: unknown;
}

export interface ArtworkParseResult {
  records: ArtworkRecord[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  totalRows: number;
}

const norm = (value: unknown): string =>
  String(value ?? '').replace(/\s+/g, '').toLowerCase().trim();

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toIntOrNull = (value: unknown): number | null => {
  const text = toText(value);
  if (!text) return null;
  const n = parseInt(text.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

// 실제 헤더명(잘리지 않은 원본)에서 원하는 값을 순서대로 탐색
function pick(row: Record<string, unknown>, aliases: string[]): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = norm(alias);
    const hit = entries.find(([key]) => norm(key) === target);
    if (hit && toText(hit[1])) return toText(hit[1]);
  }
  return '';
}

const CANONICAL_ALIASES: Record<'title' | 'description' | 'reason' | 'image_url' | 'emotion_tag_1' | 'emotion_tag_2' | 'emotion_tag_3' | 'index', string[]> = {
  title: ['artwork_title', 'title', '작품명', '제목'],
  description: ['artwork_description', 'artwork_desc', 'description', 'artwork_description_en', 'artwork_desc_en', 'artwork_description_ko'],
  reason: ['reason', '추천이유', 'recommend_reason'],
  image_url: ['image_url', 'image_url_large', 'image_url_l', 'imageurl', 'img_url'],
  emotion_tag_1: ['emotion_tag_1', 'emotion_tag1', 'emotiontag1'],
  emotion_tag_2: ['emotion_tag_2', 'emotion_tag2', 'emotiontag2'],
  emotion_tag_3: ['emotion_tag_3', 'emotion_tag3', 'emotiontag3'],
  index: ['index', 'id', 'idx'],
};

/**
 * 📄 작품 엑셀(A~AP)을 파싱해 ArtworkRecord 배열로 변환
 * - 첫 시트, 1행을 헤더로 사용
 * - 원본 컬럼은 헤더명 그대로 전부 보존하고, 앱이 읽는 8개 핵심 필드를 덮어씀
 */
export function parseArtworkWorkbook(buffer: ArrayBuffer): ArtworkParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { records: [], matchedHeaders: [], unmatchedHeaders: [], totalRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', blankrows: false });
  if (rows.length === 0) {
    return { records: [], matchedHeaders: [], unmatchedHeaders: [], totalRows: 0 };
  }

  const headerKeys = Object.keys(rows[0]);
  const matchedHeaders: string[] = [];
  (Object.entries(CANONICAL_ALIASES) as [string, string[]][]).forEach(([field, aliases]) => {
    const source = headerKeys.find((key) => aliases.some((alias) => norm(alias) === norm(key)));
    if (source) matchedHeaders.push(`${source} → ${field}`);
  });
  const matchedSources = new Set(matchedHeaders.map((m) => norm(m.split(' → ')[0])));
  const unmatchedHeaders = headerKeys.filter((key) => !matchedSources.has(norm(key)));

  const records: ArtworkRecord[] = [];

  for (const row of rows) {
    // 원본 값들을 trim해서 보존
    const preserved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      preserved[key] = typeof value === 'string' ? value.trim() : value;
    }

    const title = pick(row, CANONICAL_ALIASES.title);
    const idText = pick(row, CANONICAL_ALIASES.index);
    if (!title && !idText) continue; // 빈 줄 건너뜀

    records.push({
      ...preserved,
      title,
      description: pick(row, CANONICAL_ALIASES.description),
      reason: pick(row, CANONICAL_ALIASES.reason),
      image_url: pick(row, CANONICAL_ALIASES.image_url),
      emotion_tag_1: pick(row, CANONICAL_ALIASES.emotion_tag_1),
      emotion_tag_2: pick(row, CANONICAL_ALIASES.emotion_tag_2),
      emotion_tag_3: pick(row, CANONICAL_ALIASES.emotion_tag_3),
      index: toIntOrNull(idText),
    });
  }

  return { records, matchedHeaders, unmatchedHeaders, totalRows: rows.length };
}

/**
 * 🔥 작품 레코드를 파이어스토어 컬렉션에 저장 (배치 커밋)
 * @param targetCollection 저장할 컬렉션명 - 기본은 'data', 필요하면 'firstdata' 등 다른 컬렉션 지정 가능
 * @returns 저장된 문서 수
 */
export async function saveArtworkRecords(
  records: ArtworkRecord[],
  onProgress?: (saved: number, total: number) => void,
  targetCollection: string = ARTWORK_COLLECTION,
): Promise<number> {
  const col = collection(db, targetCollection);
  const CHUNK = 400;
  let saved = 0;

  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const batch = writeBatch(db);

    slice.forEach((record) => {
      const ref = doc(col);
      batch.set(ref, { ...record, uploadedAt: serverTimestamp() });
    });

    await batch.commit();
    saved += slice.length;
    onProgress?.(saved, records.length);
  }

  return saved;
}
