// 엑셀 업로드·외부 API 데이터에 섞여 들어오는 null / "null" / 빈 문자열을 한곳에서 정리

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return trimmed && lower !== 'null' && lower !== 'undefined' && lower !== '-' ? trimmed : '';
}

export function hasText(value: unknown): value is string {
  return cleanText(value) !== '';
}

// 외부 링크: 값이 없으면 '' (→ 버튼 자동 숨김), 프로토콜이 빠져 있으면 https:// 를 붙임
export function normalizeExternalUrl(value: unknown): string {
  const text = cleanText(value);
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^(javascript|data|vbscript):/i.test(text)) return ''; // 위험한 스킴은 링크로 쓰지 않음
  return `https://${text.replace(/^\/+/, '')}`;
}
