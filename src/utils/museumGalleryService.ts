import * as XLSX from 'xlsx';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// 🔥 파이어스토어 컬렉션(클래스)명
export const MUSEUM_GALLERY_COLLECTION = 'Museumgallery';

export interface MuseumGalleryRecord {
  category: string; // 구분 (갤러리 / 미술관 / 박물관)
  name: string; // 이름
  phone: string; // 전화번호
  address: string; // 주소
  latitude: number | null; // 위도
  longitude: number | null; // 경도
  operatingHours: string; // 운영시간
  website: string; // 웹사이트
  situation: string; // 상황
  emotion: string; // 감정
  rawJson: string; // JSON 원본 문자열
  jsonData: unknown | null; // 파싱된 JSON (실패 시 null)
  message: string; // 메시지
  image_url: string; // 이미지URL (카드에 바로 표시됨)
  imageSource: string; // 이미지출처
  imageResolution: string; // 이미지해상도
  imageSearchQuery: string; // 이미지검색어
  sourceUrl: string; // 원문URL
  imageConfidence: string; // 이미지신뢰도
  imageStatus: string; // 이미지상태
}

export interface ParseResult {
  records: MuseumGalleryRecord[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  totalRows: number;
}

type FieldKey = keyof Omit<MuseumGalleryRecord, 'jsonData'>;

// 엑셀 헤더 → 내부 필드 매핑 (공백/대소문자 무시)
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  category: ['구분', 'category', '분류', '종류'],
  name: ['이름', '명칭', '기관명', 'name', 'title'],
  phone: ['전화번호', '전화', '연락처', 'phone', 'tel'],
  address: ['주소', 'address', '위치'],
  latitude: ['위도', 'lat', 'latitude'],
  longitude: ['경도', 'lng', 'lon', 'long', 'longitude'],
  operatingHours: ['운영시간', '운영 시간', '이용시간', 'hours', 'time'],
  website: ['웹사이트', '홈페이지', 'website', 'homepage', 'site'],
  situation: ['상황', 'situation'],
  emotion: ['감정', 'emotion', 'feeling'],
  rawJson: ['json', 'json데이터', 'jsondata'],
  message: ['메시지', 'message', 'msg', '문구'],
  image_url: ['이미지url', '이미지주소', '대표이미지', 'imageurl', 'image_url', 'img_url', '사진url'],
  imageSource: ['이미지출처', 'imagesource', '이미지 출처', '사진출처'],
  imageResolution: ['이미지해상도', 'imageresolution', '해상도', 'resolution'],
  imageSearchQuery: ['이미지검색어', 'imagesearchquery', '검색어', 'searchquery'],
  sourceUrl: ['원문url', '원문주소', 'sourceurl', 'source_url', '출처url'],
  imageConfidence: ['이미지신뢰도', 'imageconfidence', '신뢰도', 'confidence'],
  imageStatus: ['이미지상태', 'imagestatus', '이미지 상태'],
};

const normalize = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();

function buildHeaderIndex(headerRow: unknown[]): {
  fieldToCol: Partial<Record<FieldKey, number>>;
  matched: string[];
  unmatched: string[];
} {
  const fieldToCol: Partial<Record<FieldKey, number>> = {};
  const matched: string[] = [];
  const unmatched: string[] = [];

  headerRow.forEach((rawHeader, colIndex) => {
    const header = String(rawHeader ?? '').trim();
    if (!header) return;

    const normalized = normalize(header);
    let hit: FieldKey | null = null;

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [FieldKey, string[]][]) {
      if (aliases.some((alias) => normalize(alias) === normalized || normalized.includes(normalize(alias)))) {
        hit = field;
        break;
      }
    }

    if (hit && fieldToCol[hit] === undefined) {
      fieldToCol[hit] = colIndex;
      matched.push(`${header} → ${hit}`);
    } else {
      unmatched.push(header);
    }
  });

  return { fieldToCol, matched, unmatched };
}

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function tryParseJson(raw: string): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 📄 엑셀 파일(ArrayBuffer)을 MuseumGalleryRecord 배열로 변환
 */
export function parseMuseumGalleryWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { records: [], matchedHeaders: [], unmatchedHeaders: [], totalRows: 0 };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
  if (rows.length < 2) {
    return { records: [], matchedHeaders: [], unmatchedHeaders: [], totalRows: 0 };
  }

  const [headerRow, ...dataRows] = rows;
  const { fieldToCol, matched, unmatched } = buildHeaderIndex(headerRow);

  const get = (row: unknown[], field: FieldKey): unknown => {
    const col = fieldToCol[field];
    return col === undefined ? '' : row[col];
  };

  const records: MuseumGalleryRecord[] = [];

  for (const row of dataRows) {
    const name = toText(get(row, 'name'));
    const category = toText(get(row, 'category'));
    // 이름·구분이 모두 비어 있으면 빈 줄로 간주하고 건너뜀
    if (!name && !category) continue;

    const rawJson = toText(get(row, 'rawJson'));

    records.push({
      category,
      name,
      phone: toText(get(row, 'phone')),
      address: toText(get(row, 'address')),
      latitude: toNumber(get(row, 'latitude')),
      longitude: toNumber(get(row, 'longitude')),
      operatingHours: toText(get(row, 'operatingHours')),
      website: toText(get(row, 'website')),
      situation: toText(get(row, 'situation')),
      emotion: toText(get(row, 'emotion')),
      rawJson,
      jsonData: tryParseJson(rawJson),
      message: toText(get(row, 'message')),
      image_url: toText(get(row, 'image_url')),
      imageSource: toText(get(row, 'imageSource')),
      imageResolution: toText(get(row, 'imageResolution')),
      imageSearchQuery: toText(get(row, 'imageSearchQuery')),
      sourceUrl: toText(get(row, 'sourceUrl')),
      imageConfidence: toText(get(row, 'imageConfidence')),
      imageStatus: toText(get(row, 'imageStatus')),
    });
  }

  return {
    records,
    matchedHeaders: matched,
    unmatchedHeaders: unmatched,
    totalRows: dataRows.length,
  };
}

/**
 * 🔥 변환된 레코드를 파이어스토어 'Museumgallery' 컬렉션에 저장 (배치 커밋)
 * @returns 저장된 문서 수
 */
export async function saveMuseumGalleryRecords(
  records: MuseumGalleryRecord[],
  onProgress?: (saved: number, total: number) => void,
): Promise<number> {
  const col = collection(db, MUSEUM_GALLERY_COLLECTION);
  const CHUNK = 400; // 파이어스토어 배치 한도(500) 이내
  let saved = 0;

  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);
    const batch = writeBatch(db);

    slice.forEach((record) => {
      const ref = doc(col);
      batch.set(ref, {
        ...record,
        className: MUSEUM_GALLERY_COLLECTION,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    saved += slice.length;
    onProgress?.(saved, records.length);
  }

  return saved;
}
