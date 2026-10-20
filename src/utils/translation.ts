// 영어 -> 한글 번역 유틸리티

// 번역 캐시 (같은 텍스트는 재번역 안함)
const translationCache = new Map<string, string>();

/**
 * MyMemory Translation API를 사용한 무료 번역
 * @param text 번역할 영어 텍스트
 * @returns 한글 번역 결과
 */
export async function translateToKorean(text: string): Promise<string> {
  // 빈 텍스트 처리
  if (!text || text.trim() === '') {
    return '';
  }

  // 캐시 확인
  if (translationCache.has(text)) {
    console.log('✅ 번역 캐시 사용:', text.substring(0, 30) + '...');
    return translationCache.get(text)!;
  }

  try {
    // MyMemory Translation API (무료, API 키 불필요)
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|ko`;
    
    console.log('🌐 번역 API 호출:', text.substring(0, 30) + '...');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      
      // 캐시 저장
      translationCache.set(text, translated);
      
      console.log('✅ 번역 완료:', translated.substring(0, 30) + '...');
      return translated;
    } else {
      console.warn('⚠️ 번역 실패, 원문 반환');
      return text; // 번역 실패 시 원문 반환
    }
  } catch (error) {
    console.error('❌ 번역 오류:', error);
    return text; // 오류 시 원문 반환
  }
}

/**
 * 여러 텍스트를 한 번에 번역
 * @param texts 번역할 텍스트 배열
 * @returns 번역된 텍스트 배열
 */
export async function translateMultiple(texts: string[]): Promise<string[]> {
  const promises = texts.map(text => translateToKorean(text));
  return Promise.all(promises);
}

/**
 * 번역 캐시 초기화
 */
export function clearTranslationCache() {
  translationCache.clear();
  console.log('🗑️ 번역 캐시 초기화');
}
