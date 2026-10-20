import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { useJourney } from '../contexts/JourneyContext';

export function WelcomePage() {
  const navigate = useNavigate();
  const { locationData, loadLocation, resetJourney } = useJourney();

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  // 스플래시 없이 바로 환영 화면 - 위치·날씨는 불러오는 대로 채워짐
  return (
    <WelcomeScreen
      locationData={locationData}
      onStart={() => {
        resetJourney();
        navigate('/emotion');
      }}
    />
  );
}
