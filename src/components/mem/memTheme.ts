import { useEffect } from 'react';

// MeM 디자인 토큰 - 참고 사이트(chic-cupcake-be1292.netlify.app)의 색상·타이포그래피 그대로
export const MEM = {
  pageBg: '#EFECE6',
  appBg: '#F4F1EA',
  border: '#E0DCD3',
  text: '#1C1C1E',
  textSub: '#3A3A3C',
  textMuted: '#8E8E93',
  textDate: '#636366',
  cardBg: '#FAF8F5',
  tagBg: '#E8E3DA',
  tagBorder: '#D8D2C5',
  accent: '#7E57C2',
  memoAccent: '#D97724',
  memoBg: '#FFFDF9',
  badge: '#FF3B30',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

// 모달·메뉴가 열려 있는 동안 배경 스크롤 잠금 (중첩돼도 원래 값으로 복원)
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

// ESC 로 닫기
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}
