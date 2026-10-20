// 큐리즘 전시회 데이터 (로컬 파일 import)
import { curizmExhibitions, totalCurizmExhibitions } from '../data/curizm-artworks';

export interface CurizmExhibition {
  id: string;
  title: string;
  sound: string;
  coverImage: string;
  likes: number;
  introduction: string;
  thoughts: number;
  durationTime: string;
  external_url?: string | null;
  booking_url?: string | null;
}

/**
 * 큐리즘 전시회 데이터 가져오기 (로컬 import)
 * CORS 문제 해결을 위해 로컬 파일 사용
 */
export function fetchCurizmExhibitions(): CurizmExhibition[] {
  try {
    console.log('🎨 큐리즘 전시회 데이터 로딩 중...');
    console.log(`✅ 큐리즘 전시회 ${curizmExhibitions.length}개 로드 완료 (총 ${totalCurizmExhibitions}개 중)`);
    return curizmExhibitions;
  } catch (error) {
    console.error('❌ 큐리즘 전시회 로드 실패:', error);
    return [];
  }
}

/**
 * 랜덤으로 큐리즘 전시회 1개 선택
 */
export function getRandomCurizmExhibition(exhibitions: CurizmExhibition[]): CurizmExhibition | null {
  if (exhibitions.length === 0) {
    console.warn('⚠️ 큐리즘 전시회 데이터가 없습니다');
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * exhibitions.length);
  const selected = exhibitions[randomIndex];
  
  console.log(`🎲 랜덤 큐리즘 전시회 선택: "${selected.title}"`);
  
  return selected;
}

/**
 * 큐리즘 전시회 URL 생성
 */
export function getCurizmExhibitionUrl(exhibitionId: string): string {
  return `https://www.curizm.io/exhibition/${exhibitionId}`;
}