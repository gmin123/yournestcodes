import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getLocationData, type LocationData } from '../utils/location';
import { getAllArtworks, getRecommendedArtworks, type Artwork } from '../utils/artworkRecommendation';
import { getAllMuseums, type MuseumGallery } from '../utils/museumRecommendation';
import { prefetchImage } from '../utils/imageOptimize';
import { cleanImageUrl } from '../components/figma/ImageWithFallback';

// 결과 화면 첫 카드(작품 2개) + 이미지가 안 뜰 때 바로 넘어갈 예비 후보 2개
const PREFETCH_ARTWORK_IMAGES = 4;

// 감정 분석 여정(/, /emotion, /result)에서 공유하는 상태.
// 페이지를 라우트로 쪼개도 이 Provider는 계속 마운트되어 데이터가 유지됨.
interface JourneyValue {
  locationData: LocationData | null;
  isLoadingLocation: boolean;
  loadLocation: () => void; // WelcomePage 진입 시 1회 호출

  selectedSituations: string[];
  setSelectedSituations: (situations: string[]) => void;
  emotionTags: string[];
  setEmotionTags: (emotions: string[]) => void;

  preloadedArtworks: Artwork[];
  preloadedMuseums: MuseumGallery[];
  startPreload: (tags: string[]) => void; // 감정 선택 완료 시 호출

  resetJourney: () => void; // 처음부터 다시 시작할 때
  saveJourneySnapshot: () => void; // 카카오 로그인처럼 페이지를 떠났다 돌아올 때, 떠나기 직전에 호출
}

const SNAPSHOT_KEY = 'yournest_journey_snapshot';

interface JourneySnapshot {
  locationData: LocationData | null;
  selectedSituations: string[];
  emotionTags: string[];
  preloadedArtworks: Artwork[];
  preloadedMuseums: MuseumGallery[];
}

// 저장된 스냅샷은 한 번 복원하면 바로 지움 (새로고침마다 예전 여정이 되살아나지 않도록)
function takeSnapshot(): JourneySnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    sessionStorage.removeItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as JourneySnapshot) : null;
  } catch {
    return null;
  }
}

// StrictMode 에서 useState 초기화 함수가 두 번 불려도 스냅샷을 잃지 않도록 페이지 로드 시 한 번만 읽음
const restoredSnapshot = typeof window !== 'undefined' ? takeSnapshot() : null;

const JourneyContext = createContext<JourneyValue | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const snapshot = restoredSnapshot;

  const [locationData, setLocationData] = useState<LocationData | null>(snapshot?.locationData ?? null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const locationStarted = useRef(Boolean(snapshot?.locationData));

  const [selectedSituations, setSelectedSituations] = useState<string[]>(snapshot?.selectedSituations ?? []);
  const [emotionTags, setEmotionTags] = useState<string[]>(snapshot?.emotionTags ?? []);

  const [preloadedArtworks, setPreloadedArtworks] = useState<Artwork[]>(snapshot?.preloadedArtworks ?? []);
  const [preloadedMuseums, setPreloadedMuseums] = useState<MuseumGallery[]>(snapshot?.preloadedMuseums ?? []);
  const preloadStarted = useRef(Boolean(snapshot?.preloadedArtworks?.length));

  // 공간·작품 원본 목록은 사용자가 뭘 고르든 항상 같은 데이터라, 상황/감정 선택을 기다리지 않고
  // 앱 진입 시점에 미리 네트워크 요청을 던져 캐시를 데워둠 (아래 getAllMuseums/getAllArtworks가
  // 요청을 캐시하므로, 실제 매칭 시점엔 이미 도착해 있는 응답을 그대로 재사용하게 됨)
  useEffect(() => {
    void getAllMuseums();
    void getAllArtworks();
  }, []);

  const loadLocation = useCallback(() => {
    if (locationStarted.current) return;
    locationStarted.current = true;
    setIsLoadingLocation(true);
    getLocationData()
      .then(setLocationData)
      .catch((error) => console.error('위치 정보 로딩 실패:', error))
      .finally(() => setIsLoadingLocation(false));
  }, []);

  const startPreload = useCallback((tags: string[]) => {
    if (preloadStarted.current || tags.length < 3) return;
    preloadStarted.current = true;
    (async () => {
      try {
        // 공간·작품 조회는 서로 무관하니 순서대로 기다리지 않고 동시에 실행 → 대기 시간이 둘 중 더 느린 쪽 하나로 줄어듦
        // 8개를 미리 받아둠 - 이미지가 실제로 안 뜨는 후보가 섞여 있어도 결과 화면에서 다음 후보로 바로 넘길 수 있도록
        const [museums, artworks] = await Promise.all([getAllMuseums(), getRecommendedArtworks(tags, 8)]);
        setPreloadedMuseums(museums);
        setPreloadedArtworks(artworks);
        // 이미지 프록시 응답이 1초 이상 걸려서, 감정 분석 애니메이션(약 3초) 동안 첫 작품 이미지를 미리 받아둠
        artworks
          .filter((a) => cleanImageUrl(a.image_url))
          .slice(0, PREFETCH_ARTWORK_IMAGES)
          .forEach((a) => prefetchImage(cleanImageUrl(a.image_url)));
        console.log('✅ 백그라운드 로딩 완료!', artworks.length, '개 작품, 공간 후보:', museums.length);
      } catch (error) {
        console.error('❌ 백그라운드 로딩 실패:', error);
      }
    })();
  }, []);

  const resetJourney = useCallback(() => {
    setSelectedSituations([]);
    setEmotionTags([]);
    setPreloadedArtworks([]);
    setPreloadedMuseums([]);
    preloadStarted.current = false;
  }, []);

  const saveJourneySnapshot = useCallback(() => {
    if (selectedSituations.length === 0 && emotionTags.length === 0) return;
    try {
      const next: JourneySnapshot = { locationData, selectedSituations, emotionTags, preloadedArtworks, preloadedMuseums };
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('여정 상태 저장 실패:', error);
    }
  }, [locationData, selectedSituations, emotionTags, preloadedArtworks, preloadedMuseums]);

  return (
    <JourneyContext.Provider
      value={{
        locationData,
        isLoadingLocation,
        loadLocation,
        selectedSituations,
        setSelectedSituations,
        emotionTags,
        setEmotionTags,
        preloadedArtworks,
        preloadedMuseums,
        startPreload,
        resetJourney,
        saveJourneySnapshot,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney(): JourneyValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
}
