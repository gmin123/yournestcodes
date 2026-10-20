import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { MUSEUM_GALLERY_COLLECTION } from './museumGalleryService';
import { buildMatchProfile, scoreMatch, splitTagList, type MatchProfile } from './masterMatching';

// /upload 에서 저장한 'Museumgallery' 컬렉션 문서 형태
export interface MuseumGallery {
  id: string;
  category: string; // 구분
  name: string; // 이름
  phone: string; // 전화번호
  address: string; // 주소
  latitude: number | null; // 위도
  longitude: number | null; // 경도
  operatingHours: string; // 운영시간
  website: string; // 웹사이트
  situation: string; // 상황
  emotion: string; // 감정
  message: string; // 메시지
  image_url?: string; // 대표 이미지 (없으면 카드에서 그라데이션 커버로 대체)
  rawJson?: string;
  jsonData?: unknown;
}

// 기관 종류(category = 구분)에 맞는 추천 결과 제목 - 갤러리/미술관/박물관 외(빈 값 등)는 기존처럼 "추천 공간"
export function getInstitutionHeading(category: unknown): string {
  const text = typeof category === 'string' ? category.trim() : '';
  if (!text) return '추천 공간';
  if (text.includes('박물관')) return '추천 박물관';
  if (text.includes('미술관')) return '추천 미술관';
  if (text.includes('갤러리') || /gallery/i.test(text)) return '추천 갤러리';
  return `추천 ${text}`;
}

// 두 좌표 사이 거리(km) - Haversine
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 같은 세션(탭) 안에서는 한 번 받아온 공간 목록을 재사용 - "다시 하기"로 재시도할 때
// 매번 800개 가까운 문서를 다시 내려받지 않고 바로 매칭을 시작하기 위함
const museumsCache = new Map<number, Promise<MuseumGallery[]>>();

/**
 * 🔥 'Museumgallery' 컬렉션 전체 불러오기 (최대 maxCount개)
 */
// 기본 상한 1500 - Museumgallery 가 879곳이라 예전 상한(500)에서는 379곳이 추천 후보에서 빠졌음
export async function getAllMuseums(maxCount = 1500): Promise<MuseumGallery[]> {
  const cached = museumsCache.get(maxCount);
  if (cached) return cached;

  const fetchPromise = (async () => {
    try {
      const col = collection(db, MUSEUM_GALLERY_COLLECTION);
      const snapshot = await getDocs(query(col, limit(maxCount)));
      const museums = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as MuseumGallery[];
      console.log(`✅ "${MUSEUM_GALLERY_COLLECTION}" 컬렉션에서 ${museums.length}개 불러옴`);
      return museums;
    } catch (error) {
      console.error(`❌ "${MUSEUM_GALLERY_COLLECTION}" 불러오기 실패:`, error);
      museumsCache.delete(maxCount); // 실패한 요청은 캐시에 남기지 않음
      return [];
    }
  })();

  museumsCache.set(maxCount, fetchPromise);
  return fetchPromise;
}

// 사용자가 고른 상황·감정과 미술관/갤러리의 상황·감정 태그를 Master v2.5 기준으로 점수화 (작품 추천과 같은 규칙)
// 예전 방식(문자열 포함 여부)은 "긴장"이 "창작/도전 앞의 긴장" 상황에 걸리거나 "기쁨/행복"이 쪼개지는 문제가 있었음
function scoreMuseum(profile: MatchProfile, museum: MuseumGallery): number {
  return scoreMatch(profile, {
    emotionTags: splitTagList(museum.emotion),
    situationTags: splitTagList(museum.situation),
  });
}

/**
 * 🎯 선택한 태그에 맞는 미술관/갤러리를 "여러 곳" 순위대로 반환 (동기)
 * - 점수 높은 순, 같은 점수끼리는 매번 섞어서 → 동점 그룹이 여러 개여도 첫 번째만 고정되지 않음
 * - 매칭된 곳(점수 > 0)을 앞에 두고, 그 뒤에 나머지도 섞어 붙여 사용자가 계속 넘겨볼 수 있게 함
 * @param tags 상황 + 감정 한국어 태그
 * @param museums getAllMuseums() 결과
 * @param maxCandidates 최대 후보 수
 */
export interface UserCoords {
  latitude: number;
  longitude: number;
}

// 가중치 랜덤 정렬 (Efraimidis-Spirakis) - 가중치가 높을수록 앞에 나올 확률이 높을 뿐, 매번 고정된 순서는 아님
function weightedShuffle<T>(items: { item: T; weight: number }[]): T[] {
  return items
    .map(({ item, weight }) => ({ item, key: Math.pow(Math.random(), 1 / Math.max(weight, 0.0001)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

// 점수가 같은 곳들 사이에서: 위치 권한이 있으면 가까울수록 나올 확률이 높은 가중치 랜덤(완전 고정 X), 없으면 매번 랜덤 섞기
// (감정 매칭 점수 자체는 건드리지 않음. 예전엔 "제일 가까운 곳"으로 거의 고정돼서 매번 같은 1곳만 나오는 문제가 있었음)
function orderWithinBucket(museums: MuseumGallery[], userLocation?: UserCoords): MuseumGallery[] {
  if (!userLocation) return shuffle(museums);
  const withDistance = museums.map((museum) => ({
    museum,
    distanceKm:
      museum.latitude != null && museum.longitude != null
        ? getDistanceKm(userLocation.latitude, userLocation.longitude, museum.latitude, museum.longitude)
        : null,
  }));
  const withCoords = withDistance.filter((m) => m.distanceKm !== null);
  const proximityWeighted = weightedShuffle(
    withCoords.map((m) => ({ item: m.museum, weight: 1 / Math.max(m.distanceKm!, 0.1) })),
  );
  const withoutCoords = shuffle(withDistance.filter((m) => m.distanceKm === null).map((m) => m.museum));
  return [...proximityWeighted, ...withoutCoords];
}

export function rankMuseumsForTags(
  tags: string[],
  museums: MuseumGallery[],
  maxCandidates = 12,
  userLocation?: UserCoords,
): MuseumGallery[] {
  // 🖼️ 이미지 URL 없는 곳은 추천에서 제외
  const withImage = (museums ?? []).filter(
    (m) => typeof m.image_url === 'string' && m.image_url.trim() !== '',
  );
  if (withImage.length === 0) return [];

  const profile = buildMatchProfile(tags);
  const scored = withImage.map((museum) => ({ museum, score: scoreMuseum(profile, museum) }));

  // 점수별 버킷 → 버킷 안에서 정렬(위치 있으면 가까운 순, 없으면 셔플) → 점수 내림차순으로 이어붙임
  // Master 점수는 소수점이 나오므로 정수로 반올림해 묶음 - 거의 같은 점수끼리는 거리/랜덤으로 순서를 정함
  const byScore = new Map<number, MuseumGallery[]>();
  for (const { museum, score: rawScore } of scored) {
    const score = Math.round(rawScore);
    if (!byScore.has(score)) byScore.set(score, []);
    byScore.get(score)!.push(museum);
  }

  const matchedScores = [...byScore.keys()].filter((s) => s > 0).sort((a, b) => b - a);
  const ordered: MuseumGallery[] = [];
  for (const s of matchedScores) ordered.push(...orderWithinBucket(byScore.get(s)!, userLocation));

  // 매칭된 곳 뒤에 나머지(점수 0)도 같은 방식으로 붙임 → 후보가 항상 넉넉하게
  const rest = orderWithinBucket(byScore.get(0) ?? [], userLocation);
  ordered.push(...rest);

  return ordered.slice(0, maxCandidates);
}

/**
 * 🎯 선택한 태그에 가장 잘 맞는 미술관/갤러리 1곳 (rankMuseumsForTags 의 첫 번째)
 */
export function pickMuseumForTags(tags: string[], museums: MuseumGallery[]): MuseumGallery | null {
  return rankMuseumsForTags(tags, museums)[0] ?? null;
}

/**
 * 미리 불러온 목록이 있으면 그걸로, 없으면 새로 불러와서 1곳 추천
 */
export async function getRecommendedMuseum(
  tags: string[],
  preloadedMuseums?: MuseumGallery[],
): Promise<MuseumGallery | null> {
  const museums =
    preloadedMuseums && preloadedMuseums.length > 0 ? preloadedMuseums : await getAllMuseums();
  return pickMuseumForTags(tags, museums);
}

/**
 * 주소 기반 지도 링크 (좌표가 있으면 좌표 우선)
 */
export function getMuseumMapUrl(museum: MuseumGallery): string {
  if (museum.latitude != null && museum.longitude != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(museum.name)},${museum.latitude},${museum.longitude}`;
  }
  const queryText = museum.address?.trim() || museum.name;
  return `https://map.kakao.com/?q=${encodeURIComponent(queryText)}`;
}
