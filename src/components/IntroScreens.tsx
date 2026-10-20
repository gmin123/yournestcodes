import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarHeart, Palette } from 'lucide-react';

const BG =
  'radial-gradient(circle at 20% 30%, rgba(255, 107, 157, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(201, 109, 253, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(254, 194, 96, 0.1) 0%, transparent 50%), #0f0a1e';

const ONBOARDED_KEY = 'rheina_onboarded';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return true; // 저장소를 못 쓰는 환경에선 매번 온보딩을 띄우지 않음
  }
}

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // 무시
  }
}

// 스플래시: 앱 진입 시(위치·날씨를 불러오는 동안) 브랜드 화면
export function SplashScreen() {
  return (
    <div
      style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      role="status"
      aria-label="불러오는 중"
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.55)' }}>RHEINA × MeM</p>
        <h1
          style={{
            margin: '0.6rem 0 0.4rem',
            fontSize: 'clamp(2.2rem, 9vw, 3.2rem)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ff6b9d 0%, #c96dfd 50%, #fec260 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          My Emotional Museum
        </h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>오늘의 감정이 예술이 되는 곳</p>
        <motion.div
          style={{ width: 44, height: 3, borderRadius: 999, background: 'linear-gradient(90deg, #ff6b9d, #c96dfd)', margin: '1.75rem auto 0' }}
          animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}

const STEPS = [
  {
    icon: Palette,
    color: '#ff6b9d',
    title: '지금의 감정을 골라주세요',
    body: '상황과 감정을 고르면, 지금 마음에 어울리는 작품과 가볼 만한 공간을 추천해드려요.',
  },
  {
    icon: CalendarHeart,
    color: '#c96dfd',
    title: '마음에 든 작품은 MeM에',
    body: '맴(MeM)에 담은 작품은 날짜별 갤러리로 쌓여요. 그날의 날씨와 한 줄 메모도 함께 남겨보세요.',
  },
];

// 온보딩 1·2: 첫 방문에서만 1회 노출 (건너뛰기 가능)
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  function finish() {
    markOnboardingSeen();
    onDone();
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', display: 'flex', flexDirection: 'column', padding: '1.25rem 16px 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={finish}
          style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', padding: '0.5rem', cursor: 'pointer' }}
        >
          건너뛰기
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', maxWidth: 360 }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                margin: '0 auto 1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${current.color}, ${current.color}aa)`,
                boxShadow: `0 0 40px ${current.color}66`,
              }}
            >
              <Icon size={44} color="#fff" />
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>
              {step + 1} / {STEPS.length}
            </p>
            <h2 style={{ margin: '0 0 0.85rem', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', wordBreak: 'keep-all' }}>{current.title}</h2>
            <p style={{ margin: 0, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', wordBreak: 'keep-all' }}>{current.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.25rem' }} aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 999, background: i === step ? '#ff6b9d' : 'rgba(255,255,255,0.25)', transition: 'width 0.25s' }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          style={{
            width: '100%',
            padding: '0.95rem',
            borderRadius: 999,
            border: 'none',
            background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  );
}
