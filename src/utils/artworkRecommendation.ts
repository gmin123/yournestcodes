import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { buildMatchProfile, scoreMatch, splitTagList } from './masterMatching';

// Artwork 데이터 타입 정의
export interface Artwork {
  id: string;
  title: string;
  description: string;
  emotion_tag_1: string;
  emotion_tag_2: string;
  image_url: string;
  index: number;
  reason: string;
  artist_name?: string;
  artist?: string;
  artist_description?: string;
  content_type?: 'LIVING' | 'MASTERPIECE' | string;
  recommendation_type?: 'LIVING' | 'MASTERPIECE' | string;
  shop_url?: string | null;
  external_url?: string | null;
  museum_url?: string | null;
  image_fallback_url?: string | null;
  // 문서엔 있지만 지금까지 화면에 안 쓰이던 필드들 - 카드에 "있는 데이터 다 보여주기" 위해 타입에 추가
  emotion_tag_3?: string;
  emotion_tag_4?: string;
  art_movement?: string; // 사조/장르
  production_year?: string | number; // 제작연도
  medium?: string; // 재료/기법
  artwork_size?: string; // 크기
  // 큐레이션 DB v2 엑셀 원본 컬럼 - 작가 메시지(artist_bio_ko) / 작품 메시지(artwork_description_ko)
  artist_bio_ko?: string;
  artwork_description_ko?: string;
  // 상황 태그 (Master 상황명, 여러 개면 쉼표로 구분된 문자열)
  situation_tag_1?: string;
  situation_tag_2?: string;
  situation_tag_3?: string;
  situation_tag_4?: string;
}

// 작가 메시지: 실제 데이터는 artist_bio_ko 에 있고 artist_description 은 대부분 비어 있음
export function getArtistMessage(a: Pick<Artwork, 'artist_description' | 'artist_bio_ko'> | null | undefined): string {
  return String(a?.artist_description ?? '').trim() || String(a?.artist_bio_ko ?? '').trim();
}

// 작품 메시지: description(= artwork_description) 우선, 없으면 artwork_description_ko
// ⚠️ 두 메시지는 서로 대체하지 않음 - 한쪽이 없으면 빈 값 그대로
export function getArtworkMessage(a: Pick<Artwork, 'description' | 'artwork_description_ko'> | null | undefined): string {
  return String(a?.description ?? '').trim() || String(a?.artwork_description_ko ?? '').trim();
}

// 같은 세션(탭) 안에서 매칭을 여러 번 돌려도 같은 500개를 매번 다시 안 받아오도록 캐시
// (예: "다시 하기"로 재시도할 때 두 번째부터는 네트워크 왕복 없이 즉시 매칭 시작)
const artworksCache = new Map<number, Promise<Artwork[]>>();

// Firestore에서 제한된 수의 작품 가져오기 (성능 최적화)
// 기본 상한 1000 - firstdata 가 574건이라 예전 상한(500)에서는 74건이 추천 후보에서 아예 빠졌음
export async function getAllArtworks(maxCount: number = 1000): Promise<Artwork[]> {
  const cached = artworksCache.get(maxCount);
  if (cached) return cached;

  const fetchPromise = (async () => {
    try {
      const dataCollection = collection(db, 'firstdata');
      // limit 추가하여 최대 500개만 가져오기
      const q = query(dataCollection, limit(maxCount));
      const querySnapshot = await getDocs(q);

      const artworks: Artwork[] = querySnapshot.docs.map(doc => ({
        // ⚠️ 순서 중요: 엑셀의 id 컬럼이 비어있던 흔적으로 문서 데이터 안에 값이 빈 문자열인
        // 'id' 필드를 그대로 가진 문서가 있음. ...doc.data()를 먼저 펼치고 실제 Firestore
        // 문서 ID(doc.id)를 마지막에 덮어써야 진짜 ID가 빈 문자열로 가려지지 않음.
        ...doc.data(),
        id: doc.id,
      } as Artwork));

      console.log(`✅ Firestore에서 ${artworks.length}개의 작품을 가져왔습니다 (최대 ${maxCount}개)`);
      return artworks;
    } catch (error) {
      console.error('❌ Firestore 작품 가져오기 오류:', error);
      artworksCache.delete(maxCount); // 실패한 요청은 캐시에 남기지 않음 - 다음 시도가 재요청하도록
      return [];
    }
  })();

  artworksCache.set(maxCount, fetchPromise);
  return fetchPromise;
}

// 배열 셔플 함수 (Fisher-Yates 알고리즘)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 가중치 랜덤 정렬 (Efraimidis-Spirakis) - 점수가 높을수록 앞쪽에 나올 "확률"이 높을 뿐,
// 매번 완전히 같은 순서로 고정되지는 않는다. (점수로만 정렬하면 같은 태그를 고를 때마다
// 항상 똑같은 1~2개만 반복 노출되는 문제가 있어서, 균등 셔플 대신 이 방식을 사용)
function weightedShuffle<T>(items: { item: T; weight: number }[]): T[] {
  return items
    .map(({ item, weight }) => ({ item, key: Math.pow(Math.random(), 1 / Math.max(weight, 0.0001)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

// 점수 상위 구간(최고점의 TOP_BAND_RATIO 이상)을 먼저, 그 안에서만 가중치 랜덤 → 나머지 매칭 작품 순
// 매칭된 작품이 수백 개라 전체를 한 번에 가중 랜덤하면 저점 작품이 대부분을 차지하는 문제가 있었음
const TOP_BAND_RATIO = 0.6;
function rankByScore<T>(items: { item: T; score: number }[]): T[] {
  const matched = items.filter((x) => x.score > 0);
  if (matched.length === 0) return [];
  const maxScore = Math.max(...matched.map((x) => x.score));
  const threshold = maxScore * TOP_BAND_RATIO;
  const top = matched.filter((x) => x.score >= threshold);
  const rest = matched.filter((x) => x.score < threshold);
  return [
    ...weightedShuffle(top.map((x) => ({ item: x.item, weight: x.score }))),
    ...weightedShuffle(rest.map((x) => ({ item: x.item, weight: x.score }))),
  ];
}

// 중복 제거 함수 (같은 작품 여러 번 추천 방지)
// index 필드로 구분하면 엑셀에 id가 비어 있던 행들이 전부 index=null이라 서로 충돌해서
// 2번째 추천 슬롯이 통째로 비어버리는 문제가 있었음 → 항상 고유한 Firestore 문서 id로 구분
function removeDuplicates(artworks: Artwork[]): Artwork[] {
  const seen = new Set<string>();
  return artworks.filter(artwork => {
    if (seen.has(artwork.id)) {
      return false;
    }
    seen.add(artwork.id);
    return true;
  });
}

// 감정 태그 기반 작품 추천
export async function getRecommendedArtworks(
  userEmotionTags: string[], 
  count: number = 3
): Promise<Artwork[]> {
  try {
    // 1. 모든 작품 가져오기
    const fetchedArtworks = await getAllArtworks();

    // 🖼️ 이미지 없는 작품(고전 명화 포함)은 추천에서 제외
    const hasImage = (a: Artwork) =>
      (typeof a.image_url === 'string' && a.image_url.trim() !== '') ||
      (typeof a.image_fallback_url === 'string' && (a.image_fallback_url ?? '').trim() !== '');
    const allArtworks = fetchedArtworks.filter(hasImage);

    if (allArtworks.length === 0) {
      console.warn('⚠️ 이미지 있는 작품이 없습니다 (전체', fetchedArtworks.length, '개)');
      return [];
    }
    console.log(`🖼️ 이미지 있는 작품만 사용: ${allArtworks.length} / ${fetchedArtworks.length}`);

    // 2. Master v2.5 기준 점수: 상황 일치 + 감정(Mirror) + 긍정 감정(Balance), 비율은 클로징 매칭 유형
    const profile = buildMatchProfile(userEmotionTags);
    console.log('🎯 사용자 태그:', userEmotionTags, '→ 상황', profile.situations, '감정', profile.emotions,
      '매칭 유형', profile.matchingType ? `${profile.matchingType.code} ${profile.matchingType.kind} ${profile.matchingType.percent}%` : '없음');

    // LIVING 작품을 먼저 탐색하고, 부족한 수량은 MASTERPIECE로 보충한다.
    const scoredArtworks = allArtworks.map(artwork => ({
      artwork,
      score: scoreMatch(profile, {
        emotionTags: [artwork.emotion_tag_1, artwork.emotion_tag_2, artwork.emotion_tag_3, artwork.emotion_tag_4].map((t) => String(t ?? '')),
        situationTags: [artwork.situation_tag_1, artwork.situation_tag_2, artwork.situation_tag_3, artwork.situation_tag_4].flatMap(splitTagList),
      }),
    }));

    const livingArtworks = scoredArtworks.filter(({ artwork }) =>
      artwork.content_type?.toUpperCase() === 'LIVING' || artwork.recommendation_type?.toUpperCase() === 'LIVING'
    );
    const masterpieceArtworks = scoredArtworks.filter(({ artwork }) =>
      artwork.content_type?.toUpperCase() === 'MASTERPIECE' || artwork.recommendation_type?.toUpperCase() === 'MASTERPIECE'
    );
    const hasTieredData = livingArtworks.length > 0 || masterpieceArtworks.length > 0;
    
    // 3. 점수 상위 구간 안에서 가중치 랜덤 (완전 고정 정렬 금지 - 같은 태그여도 매번 같은 1~2개만 나오지 않도록)
    const matchedArtworks = rankByScore(scoredArtworks.map(item => ({ item: item.artwork, score: item.score })));

    const unmatchedArtworks = shuffleArray(
      scoredArtworks
        .filter(item => item.score === 0)
        .map(item => item.artwork)
    );
    
    console.log('✅ 매칭된 작품:', matchedArtworks.length, '개');
    console.log('🎲 매칭 안된 작품:', unmatchedArtworks.length, '개');
    
    // 4. 추천 작품 선택 (생존작가 우선 → 결과 없을 때만 명화로 대체. 두 티어를 섞어서 점수 정렬하지 않음)
    let recommendations: Artwork[] = [];

    if (hasTieredData) {
      // 점수가 높을수록 앞에 나올 확률이 높은 가중치 랜덤 (완전 고정 정렬 X) - 같은 태그를 골라도 매번 같은 1~2개만 나오는 문제 방지
      const livingMatched = rankByScore(livingArtworks.map(item => ({ item: item.artwork, score: item.score })));
      const livingAll = livingArtworks.map(item => item.artwork);
      const masterpieceMatched = rankByScore(masterpieceArtworks.map(item => ({ item: item.artwork, score: item.score })));
      const masterpieceAll = masterpieceArtworks.map(item => item.artwork);

      if (livingMatched.length > 0) {
        // 1순위: 감정 태그와 매칭되는 생존작가 작품이 있으면 생존작가 작품만 사용
        console.log('🟢 생존작가 매칭 결과 존재 → 생존작가 작품 사용:', livingMatched.length, '개');
        const livingRest = shuffleArray(livingAll.filter((a) => !livingMatched.includes(a)));
        recommendations = [...livingMatched, ...livingRest];
        // 생존작가 작품 수가 요청 개수보다 적으면 부족한 만큼만 명화로 채움 (생존작가가 항상 앞에 옴)
        if (recommendations.length < count) {
          recommendations.push(...masterpieceMatched, ...shuffleArray(masterpieceAll.filter((a) => !masterpieceMatched.includes(a))));
        }
      } else if (masterpieceAll.length > 0) {
        // 2순위: 생존작가 매칭 결과가 없을 때만 명화로 대체 (fallback)
        console.log('🟡 생존작가 매칭 결과 없음 → 명화로 대체:', masterpieceAll.length, '개');
        recommendations = [
          ...masterpieceMatched,
          ...shuffleArray(masterpieceAll.filter((a) => !masterpieceMatched.includes(a))),
        ];
      } else {
        // 명화 데이터도 없으면 생존작가 중 랜덤
        recommendations = shuffleArray(livingAll);
      }
    } else {
      // LIVING/MASTERPIECE 구분이 없는 데이터 - 기존 방식 그대로 유지
      if (matchedArtworks.length > 0) {
        recommendations.push(...matchedArtworks.slice(0, count));
      }
      if (recommendations.length < count && unmatchedArtworks.length > 0) {
        const needed = count - recommendations.length;
        recommendations.push(...unmatchedArtworks.slice(0, needed));
        console.log('🎲 랜덤 작품 추가:', needed, '개');
      }
    }

    // 5. 중복 제거
    recommendations = removeDuplicates(recommendations);
    
    // 6. 최종적으로 요청한 개수만큼만 반환
    const finalRecommendations = recommendations.slice(0, count);
    
    console.log('🎨 최종 추천 작품:', finalRecommendations.length, '개');
    finalRecommendations.forEach(artwork => {
      console.log(`  - ${artwork.title} (태그: ${artwork.emotion_tag_1}, ${artwork.emotion_tag_2})`);
    });
    
    return finalRecommendations;
  } catch (error) {
    console.error('❌ 작품 추천 중 오류:', error);
    return [];
  }
}

// 전시회와 아틀리에용 Mock 데이터 생성기
export function getMockExhibitions(tags: string[]) {
  const isEnergetic = tags.some((t) => ['energetic', 'dynamic', 'joyful', 'vibrant'].includes(t));
  const isCalm = tags.some((t) => ['calm', 'peaceful', 'serene', 'muted'].includes(t));
  const isMelancholic = tags.some((t) => ['melancholic', 'sad', 'thoughtful', 'past'].includes(t));

  return [
    {
      id: 1,
      title: "현대 추상의 울림",
      description: "역동적인 색채와 형태로 감정을 표현한 현대 추상 작품전",
      location: "서울시립미술관",
      date: "2025.11.01 - 2026.02.28",
      image: "https://images.unsplash.com/photo-1719935115623-4857df23f3c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBtdXNldW0lMjBleGhpYml0aW9ufGVufDF8fHx8MTc2Mzk0MDc1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
      tags: isEnergetic ? ["역동적", "현대미술", "에너지"] : ["평온", "현대미술", "조화"],
    },
    {
      id: 2,
      title: "인상주의의 빛",
      description: "빛과 색채의 조화를 탐구한 인상주의 거장들의 작품",
      location: "국립현대미술관",
      date: "2025.12.15 - 2026.03.30",
      image: "https://images.unsplash.com/photo-1647792845543-a8032c59cbdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcnQlMjBnYWxsZXJ5fGVufDF8fHx8MTc2Mzk0MDc1OHww&ixlib=rb-4.1.0&q=80&w=1080",
      tags: isCalm ? ["부드러움", "고전미술", "빛"] : ["생동감", "고전미술", "색채"],
    },
    {
      id: 3,
      title: "내면의 풍경",
      description: "자연과 인간의 내면을 탐구하는 동양화 특별전",
      location: "리움미술관",
      date: "2025.11.20 - 2026.01.31",
      image: "https://images.unsplash.com/photo-1713779490284-a81ff6a8ffae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBleGhpYml0aW9uJTIwaGFsbHxlbnwxfHx8fDE3NjM5NDA3NTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      tags: isMelancholic ? ["사색적", "동양미술", "자연"] : ["조화", "동양미술", "평화"],
    },
  ];
}

export function getMockAteliers(tags: string[]) {
  const isEnergetic = tags.some((t) => ['energetic', 'dynamic', 'joyful', 'vibrant'].includes(t));
  const isCalm = tags.some((t) => ['calm', 'peaceful', 'serene', 'muted'].includes(t));

  return [
    {
      id: 1,
      artist: "김환기 아틀리에",
      description: "한국 추상미술의 거장 김환기의 작업실과 작품 세계를 경험",
      location: "서울 종로구",
      duration: "2시간",
      image: "https://images.unsplash.com/photo-1613746011089-6a89f373d232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3QlMjBzdHVkaW8lMjBhdGVsaWVyfGVufDF8fHx8MTc2Mzk0MDc1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
      tags: ["추상미술", "한국미술", "체험"],
    },
    {
      id: 2,
      artist: "현대 도예 공방",
      description: "전통과 현대가 만나는 도예 작가의 작업 과정 체험",
      location: "경기 이천",
      duration: "3시간",
      image: "https://images.unsplash.com/photo-1613746011089-6a89f373d232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3QlMjBzdHVkaW8lMjBhdGVsaWVyfGVufDF8fHx8MTc2Mzk0MDc1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
      tags: isCalm ? ["평온", "공예", "전통"] : ["창의적", "공예", "현대"],
    },
    {
      id: 3,
      artist: "서양화 아틀리에",
      description: "유화 기법과 색채 이론을 배우는 작가와의 만남",
      location: "서울 성북구",
      duration: "2.5시간",
      image: "https://images.unsplash.com/photo-1613746011089-6a89f373d232?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3QlMjBzdHVkaW8lMjBhdGVsaWVyfGVufDF8fHx8MTc2Mzk0MDc1N3ww&ixlib=rb-4.1.0&q=80&w=1080",
      tags: isEnergetic ? ["역동적", "회화", "기법"] : ["표현적", "회화", "색채"],
    },
  ];
}