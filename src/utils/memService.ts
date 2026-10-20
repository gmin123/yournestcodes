import { getSessionId } from './session';
import { getArtistMessage, getArtworkMessage, type Artwork } from './artworkRecommendation';
import type { CurizmExhibition } from './curizmApi';
import type { MuseumGallery } from './museumRecommendation';

export interface MemPayload {
  sessionToken: string;
  cardType: 'ARTWORK' | 'TOUR' | 'MUSEUM';
  cardId: string;
  title: string;
  artistName: string;
  artworkDescription: string;
  artistDescription: string;
  imageUrl: string;
  emotionTag: string;
  situationTag: string;
  createdAt: string;
}

const memEndpoint = `${import.meta.env.VITE_MEM_API_BASE_URL ?? ''}/api/v1/mem/stub`;

export function mapArtworkToMemPayload(artwork: Artwork, situationTag = ''): MemPayload {
  return {
    sessionToken: getSessionId(),
    cardType: 'ARTWORK',
    cardId: artwork.id,
    title: artwork.title ?? '이름 없는 작품',
    artistName: artwork.artist_name ?? artwork.artist ?? '',
    artworkDescription: getArtworkMessage(artwork),
    artistDescription: getArtistMessage(artwork),
    imageUrl: artwork.image_url ?? '',
    emotionTag: [artwork.emotion_tag_1, artwork.emotion_tag_2].filter(Boolean).join(', '),
    situationTag,
    createdAt: new Date().toISOString(),
  };
}

export function mapTourToMemPayload(tour: CurizmExhibition, situationTag = ''): MemPayload {
  return {
    sessionToken: getSessionId(),
    cardType: 'TOUR',
    cardId: tour.id,
    title: tour.title ?? '이름 없는 전시',
    artistName: '',
    artworkDescription: tour.introduction ?? '',
    artistDescription: '',
    imageUrl: tour.coverImage ?? '',
    emotionTag: '',
    situationTag,
    createdAt: new Date().toISOString(),
  };
}

export function mapMuseumToMemPayload(museum: MuseumGallery, situationTag = ''): MemPayload {
  return {
    sessionToken: getSessionId(),
    cardType: 'MUSEUM',
    cardId: museum.id,
    title: museum.name ?? '이름 없는 공간',
    artistName: '',
    artworkDescription: museum.message ?? museum.address ?? '',
    artistDescription: '',
    imageUrl: museum.image_url ?? '',
    emotionTag: museum.emotion ?? '',
    situationTag,
    createdAt: new Date().toISOString(),
  };
}

export async function sendToMem(payload: MemPayload): Promise<void> {
  if (!import.meta.env.VITE_MEM_API_BASE_URL) {
    console.info('[MeM] API base URL이 없어 Stub 전송을 건너뜁니다.', payload.cardId);
    return;
  }

  const response = await fetch(memEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`MeM 저장 실패: ${response.status}`);
}
