import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SituationSelector } from '../components/SituationSelector';
import { EmotionSelector } from '../components/EmotionSelector';
import { useJourney } from '../contexts/JourneyContext';

// /emotion : 상황 선택 → 감정 선택. 완료되면 데이터를 컨텍스트에 담고 /result 로 이동.
export function EmotionPage() {
  const navigate = useNavigate();
  const {
    locationData,
    isLoadingLocation,
    selectedSituations,
    setSelectedSituations,
    setEmotionTags,
    startPreload,
  } = useJourney();

  const [step, setStep] = useState<'situation' | 'emotion'>(
    selectedSituations.length > 0 ? 'emotion' : 'situation',
  );

  // 새로고침 등으로 여정 데이터가 없으면 처음 페이지로
  // (위치·날씨를 아직 불러오는 중에 시작한 경우는 그대로 진행 - 결과 화면은 날씨 없이도 동작함)
  useEffect(() => {
    if (!locationData && !isLoadingLocation) navigate('/', { replace: true });
  }, [locationData, isLoadingLocation, navigate]);

  const handleSituationComplete = (situations: string[]) => {
    setSelectedSituations(situations);
    setStep('emotion');
  };

  const handleEmotionComplete = (emotions: string[]) => {
    setEmotionTags(emotions);
    startPreload([...selectedSituations, ...emotions]); // 결과 페이지용 백그라운드 로딩 시작
    navigate('/result');
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'situation' ? (
        <SituationSelector key="situation" onComplete={handleSituationComplete} />
      ) : (
        <EmotionSelector
          key="emotion"
          selectedSituations={selectedSituations}
          onComplete={handleEmotionComplete}
        />
      )}
    </AnimatePresence>
  );
}
