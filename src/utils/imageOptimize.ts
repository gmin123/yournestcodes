// 외부(위키아트/미술관 사이트 등) 원본 이미지를 가로 720~1080px 범위의 WebP로 즉석 변환해서 받아오기 위한 헬퍼.
// 이 프로젝트엔 이미지 리사이즈/포맷변환을 해줄 자체 백엔드가 없어서,
// images.weserv.nl(무료 공개 이미지 프록시 - URL 파라미터로 리사이즈·포맷 지정)을 통해 우회함.
// 원본 URL 자체는 절대 바꾸지 않고, "화면에 실제로 그릴 때"만 이 함수를 거쳐서 사용함.

const IMAGE_PROXY_HOST = 'images.weserv.nl';

function isAlreadyOptimized(url: string): boolean {
  return url.includes(IMAGE_PROXY_HOST);
}

// 화면에 그리기 전에 미리 받아둘 때 사용 - ImageWithFallback 과 같은 URL 을 요청해야 브라우저 캐시가 그대로 재사용됨
const prefetched = new Set<string>();
export function prefetchImage(url: string | null | undefined, targetWidth: number = 1080): void {
  const optimized = getOptimizedImageUrl(url, targetWidth);
  if (!optimized || prefetched.has(optimized) || typeof Image === 'undefined') return;
  prefetched.add(optimized);
  const img = new Image();
  img.decoding = 'async';
  img.src = optimized;
}

/**
 * 원본 이미지 URL을 120~1080px 사이의 WebP URL로 변환.
 * - data: URL, 빈 값, 이미 프록시를 거친 URL은 그대로 반환
 * - 프록시가 처리 못 하는 형태(예: URL 파싱 실패)면 원본을 그대로 반환(추측해서 새 주소를 만들어내지 않음)
 */
export function getOptimizedImageUrl(url: string | null | undefined, targetWidth: number = 1080): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (isAlreadyOptimized(trimmed)) return trimmed;

  try {
    // weserv는 스킴(https://) 없는 형태의 url 파라미터를 기대함
    const bare = trimmed.replace(/^https?:\/\//i, '');
    // 작은 썸네일(달력 칸 등)까지 720px 로 받던 낭비를 줄이려고 하한을 120px 로 낮춤 - 큰 카드/모달은 기본 1080 그대로
    const width = Math.min(Math.max(Math.round(targetWidth), 120), 1080);
    const params = new URLSearchParams({
      url: bare,
      w: String(width),
      output: 'webp',
      q: '82', // 화질과 용량의 균형점
      we: '', // 원본 비율 유지, 지정 폭을 넘지 않게(upscale 방지)
    });
    return `https://${IMAGE_PROXY_HOST}/?${params.toString()}`;
  } catch {
    return trimmed;
  }
}
