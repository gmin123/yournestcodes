import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SituationSelector } from "./components/SituationSelector";
import { EmotionSelector } from "./components/EmotionSelector";
import { ResultAnalysis } from "./components/ResultAnalysis";
import { Recommendations } from "./components/Recommendations";
import { getLocationData, type LocationData } from "./utils/location";
import { getRecommendedArtworks, type Artwork } from "./utils/artworkRecommendation";
import { getAllMuseums, type MuseumGallery } from "./utils/museumRecommendation";

type Stage = "welcome" | "situation" | "emotion" | "analysis" | "recommendations";

export default function App() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [selectedSituations, setSelectedSituations] = useState<string[]>([]);
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  
  // 🚀 미리 가져온 추천 데이터 (백그라운드 로딩)
  const [preloadedArtworks, setPreloadedArtworks] = useState<Artwork[]>([]);
  const [preloadedMuseums, setPreloadedMuseums] = useState<MuseumGallery[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    // Get real location, weather, and time data
    async function fetchLocationData() {
      setIsLoadingLocation(true);
      const data = await getLocationData();
      setLocationData(data);
      setIsLoadingLocation(false);
    }

    fetchLocationData();
  }, []);

  // 🎯 태그가 선택될 때마다 백그라운드에서 작품 미리 로딩
  useEffect(() => {
    // 상황 태그 1개 + 감정 태그 2개 = 최소 3개가 선택되면 미리 로딩 시작
    const allTags = [...selectedSituations, ...emotionTags];
    
    if (allTags.length >= 3 && !isPreloading) {
      console.log('🚀 백그라운드 작품 로딩 시작! 태그:', allTags);
      setIsPreloading(true);
      
      // 백그라운드에서 작품 가져오기
      async function preloadArtworks() {
        try {
          // 1. 내 Museumgallery 데이터 전체 (추천 화면에서 태그 순위 매겨 여러 곳 넘겨봄)
          const museums = await getAllMuseums();
          setPreloadedMuseums(museums);

          // 2. Firestore 작품 2개 (첫 칸은 미술관/갤러리가 차지)
          const artworks = await getRecommendedArtworks(allTags, 2);
          setPreloadedArtworks(artworks);

          console.log('✅ 백그라운드 로딩 완료!', artworks.length, '개 작품, 공간 후보:', museums.length);
        } catch (error) {
          console.error('❌ 백그라운드 로딩 실패:', error);
        }
      }
      
      preloadArtworks();
    }
  }, [selectedSituations, emotionTags, isPreloading]);

  const handleSituationComplete = (situations: string[]) => {
    setSelectedSituations(situations);
    setStage("emotion");
  };

  const handleEmotionComplete = (emotions: string[]) => {
    setEmotionTags(emotions);
    setStage("analysis");

    // Automatically move to recommendations after 30 seconds
    setTimeout(() => {
      setStage("recommendations");
    }, 30000);
  };

  const handleAnalysisComplete = () => {
    setStage("recommendations");
  };

  // Show loading state while fetching location
  if (isLoadingLocation || !locationData) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at 20% 30%, rgba(255, 107, 157, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(201, 109, 253, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(254, 194, 96, 0.1) 0%, transparent 50%), #0f0a1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}
      >
        <div className="text-center">
          <div 
            style={{
              width: '4rem',
              height: '4rem',
              border: '4px solid #ec4899',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} 
          />
          <p className="text-lg opacity-70">위치 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {stage === "welcome" && (
          <WelcomeScreen
            key="welcome"
            onStart={() => setStage("situation")}
            locationData={locationData}
          />
        )}
        {stage === "situation" && (
          <SituationSelector 
            key="situation" 
            onComplete={handleSituationComplete} 
          />
        )}
        {stage === "emotion" && (
          <EmotionSelector 
            key="emotion" 
            selectedSituations={selectedSituations}
            onComplete={handleEmotionComplete} 
          />
        )}
        {stage === "analysis" && (
          <ResultAnalysis
            key="analysis"
            tags={[...selectedSituations, ...emotionTags]}
            onContinue={handleAnalysisComplete}
          />
        )}
        {stage === "recommendations" && (
          <Recommendations
            key="recommendations"
            tags={[...selectedSituations, ...emotionTags]}
            preloadedArtworks={preloadedArtworks}
            preloadedMuseums={preloadedMuseums}
            weather={locationData.weather}
            situationTags={selectedSituations}
          />
        )}
      </AnimatePresence>
    </div>
  );
}