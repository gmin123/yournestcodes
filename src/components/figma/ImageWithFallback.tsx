import React, { useEffect, useState } from 'react'
import { getOptimizedImageUrl } from '../../utils/imageOptimize'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  // src(+fallbackSrc)까지 전부 로드 실패했을 때 호출 - 플레이스홀더 대신 다른 걸 보여주고 싶은 경우(예: 다음 후보로 넘기기) 사용
  onImageError?: () => void;
  // 최적화(WebP 변환·리사이즈) 목표 가로폭(120~1080px 범위로 클램프됨). 기본 1080 - 카드/모달처럼 큰 이미지 기준
  optimizeWidth?: number;
  // true면 대체 화면에 글자 없이 CSS 그라데이션 배경만 표시 (카드에 제목 오버레이가 따로 있는 경우)
  plainFallback?: boolean;
}

// null/undefined/빈 문자열/"null" 같은 문자열은 "이미지 없음"으로 취급
export function cleanImageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'undefined' ? trimmed : ''
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const { src, alt, style, className, fallbackSrc, fallbackTitle, fallbackSubtitle, onImageError, optimizeWidth, plainFallback, ...rest } = props
  const primary = cleanImageUrl(src)
  const fallback = cleanImageUrl(fallbackSrc)
  // 원본이 없으면 처음부터 대체 이미지로 시작
  const [currentSrc, setCurrentSrc] = useState(primary || fallback)

  useEffect(() => {
    setCurrentSrc(primary || fallback)
  }, [primary, fallback])

  const handleError = () => {
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback)
    } else {
      setCurrentSrc('')
      onImageError?.()
    }
  }

  if (!currentSrc && plainFallback) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background:
            'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.3), transparent 55%), linear-gradient(135deg, #ff6b9d 0%, #c96dfd 55%, #fec260 100%)',
        }}
        role="img"
        aria-label={alt}
      />
    )
  }

  if (!currentSrc) {
    const fallbackText = fallbackTitle || alt || '추천 콘텐츠'

    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-pink-900 via-purple-900 to-yellow-800 ${className ?? ''}`}
        style={{
          ...style,
          backgroundImage: 'linear-gradient(135deg, rgba(255,107,157,.9), rgba(105,61,145,.95) 55%, rgba(254,194,96,.85))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_58%)]" />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1 px-3 py-2 text-center text-white">
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] text-white/80 uppercase">
            이미지 없음
          </span>
          <strong className="max-w-full break-words text-[0.9rem] font-semibold leading-snug tracking-[-0.02em]">
            {fallbackText}
          </strong>
          {fallbackSubtitle && (
            <span className="max-w-full break-words text-[0.62rem] text-white/75">
              {fallbackSubtitle}
            </span>
          )}
        </div>
      </div>
    )
  }

  // decoding="async" 기본값 - 메인 스레드 디코딩 부담을 줄임(호출부에서 loading="lazy" 등을 넘기면 그대로 존중)
  // 실제로 화면에 그릴 때만 720~1080px WebP로 최적화 - currentSrc(원본)는 그대로 두고 렌더링 시점에만 변환
  // image-rendering의 crisp-edges/-webkit-optimize-contrast 이중 선언(브라우저별 폴백)은 인라인 style 객체로는
  // 같은 key가 덮어써져서 재현이 안 되므로, 실제 CSS 규칙(globals.css의 .ynt-crisp-img)을 통해 적용함
  return (
    <img
      decoding="async"
      src={getOptimizedImageUrl(currentSrc, optimizeWidth ?? 1080)}
      alt={alt}
      className={`ynt-crisp-img${className ? ` ${className}` : ''}`}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
