import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ResultAnalysis } from '../components/ResultAnalysis';
import { Recommendations } from '../components/Recommendations';
import { useJourney } from '../contexts/JourneyContext';

// /result : 감정 분석 애니메이션 → 추천 결과.
export function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locationData, selectedSituations, emotionTags, preloadedArtworks, preloadedMuseums } = useJourney();

  const ready = selectedSituations.length > 0 && emotionTags.length > 0;
  const tags = [...selectedSituations, ...emotionTags];
  // 로그인하고 돌아온 경우엔 분석 애니메이션을 다시 보여주지 않고 바로 추천 결과로
  const resumed = Boolean((location.state as { resumed?: boolean } | null)?.resumed);
  const [phase, setPhase] = useState<'analysis' | 'recommendations'>(resumed ? 'recommendations' : 'analysis');

  // 여정 데이터 없이 직접 들어온 경우 처음으로
  useEffect(() => {
    if (!ready) navigate('/', { replace: true });
  }, [ready, navigate]);

  // 분석 애니메이션(약 3초) 후 추천 결과로. ResultAnalysis 가 onContinue 를 호출하지 못한 경우의 안전장치.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setPhase('recommendations'), 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!ready) return null;

  return (
    <AnimatePresence mode="wait">
      {phase === 'analysis' ? (
        <ResultAnalysis key="analysis" tags={tags} onContinue={() => setPhase('recommendations')} />
      ) : (
        <Recommendations
          key="recommendations"
          tags={tags}
          emotionTags={emotionTags}
          preloadedArtworks={preloadedArtworks}
          preloadedMuseums={preloadedMuseums}
          // 날씨 API가 실패해 임시값이 들어간 경우엔 저장하지 않음 (가짜 "맑음"이 기록되는 것 방지)
          weather={locationData && !locationData.weatherIsFallback ? locationData.weather : undefined}
          situationTags={selectedSituations}
          userLocation={
            locationData ? { latitude: locationData.latitude, longitude: locationData.longitude } : undefined
          }
        />
      )}
    </AnimatePresence>
  );
}
