// 모든 커스텀 CSS를 인라인 스타일로 정의

import type { CSSProperties } from 'react';

/**
 * 글래스모피즘 효과
 */
export const glassEffect: CSSProperties = {
  background: 'rgba(42, 31, 74, 0.4)',
  backdropFilter: 'blur(30px)',
  WebkitBackdropFilter: 'blur(30px)',
  border: '2px solid rgba(255, 107, 157, 0.2)',
  boxShadow: '0 8px 32px rgba(255, 107, 157, 0.1)',
};

/**
 * 그라데이션 배경
 */
export const gradientBg: CSSProperties = {
  background: 'radial-gradient(circle at 20% 30%, rgba(255, 107, 157, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(201, 109, 253, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(254, 194, 96, 0.1) 0%, transparent 50%), #0f0a1e',
};

/**
 * 텍스트 글로우 (핑크)
 */
export const textGlow: CSSProperties = {
  textShadow: '0 0 20px rgba(255, 107, 157, 0.5), 0 0 40px rgba(255, 107, 157, 0.3), 0 0 60px rgba(255, 107, 157, 0.2)',
};

/**
 * 페인트 블렌드 효과
 */
export const paintBlend: CSSProperties = {
  background: 'radial-gradient(circle at 50% 50%, rgba(255, 107, 157, 0.1), transparent 70%)',
  filter: 'blur(100px)',
};

/**
 * 네온 보더 (핑크)
 */
export const neonBorder: CSSProperties = {
  boxShadow: '0 0 20px rgba(255, 107, 157, 0.4), inset 0 0 20px rgba(255, 107, 157, 0.1)',
};

/**
 * 카드 샤인 효과 (부모 요소에 적용)
 */
export const cardShine: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
};

/**
 * 네온 텍스트 - 핑크
 */
export const neonTextPink: CSSProperties = {
  color: '#ff6b9d',
  textShadow: '0 0 20px rgba(255, 107, 157, 0.6), 0 0 40px rgba(255, 107, 157, 0.4), 0 0 60px rgba(255, 107, 157, 0.3)',
};

/**
 * 네온 텍스트 - 퍼플
 */
export const neonTextPurple: CSSProperties = {
  color: '#c96dfd',
  textShadow: '0 0 20px rgba(201, 109, 253, 0.6), 0 0 40px rgba(201, 109, 253, 0.4), 0 0 60px rgba(201, 109, 253, 0.3)',
};

/**
 * 네온 텍스트 - 옐로우
 */
export const neonTextYellow: CSSProperties = {
  color: '#fec260',
  textShadow: '0 0 20px rgba(254, 194, 96, 0.6), 0 0 40px rgba(254, 194, 96, 0.4), 0 0 60px rgba(254, 194, 96, 0.3)',
};

/**
 * 로딩 스피너
 */
export const loadingSpinner: CSSProperties = {
  width: '4rem',
  height: '4rem',
  border: '4px solid #ec4899',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 1rem',
};

/**
 * 백드롭 블러 XL
 */
export const backdropBlurXl: CSSProperties = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

/**
 * 스타일 합치기 헬퍼 함수
 */
export function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
}

/**
 * 그라데이션 텍스트 (핑크-퍼플-옐로우)
 */
export const gradientText: CSSProperties = {
  background: 'linear-gradient(135deg, #ff6b9d 0%, #c96dfd 50%, #fec260 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/**
 * 그라데이션 버튼 배경
 */
export const gradientButton: CSSProperties = {
  background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
};

/**
 * 페인트 플로우 애니메이션
 */
export const paintFlow: CSSProperties = {
  backgroundSize: '200% 200%',
  animation: 'paint-flow 8s ease infinite',
};
