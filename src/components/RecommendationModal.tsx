import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ExternalLink, Heart, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { getArtistMessage, getArtworkMessage, type Artwork } from '../utils/artworkRecommendation';
import type { CurizmExhibition } from '../utils/curizmApi';
import type { MuseumGallery } from '../utils/museumRecommendation';
import { EVENT_TYPES, logEvent } from '../utils/analyticsService';
import { mapArtworkToMemPayload, mapTourToMemPayload, sendToMem } from '../utils/memService';
import { cleanText, normalizeExternalUrl } from '../utils/safeData';

interface RecommendationModalProps {
  artwork?: Artwork | null;
  tour?: CurizmExhibition | null;
  museum?: MuseumGallery | null;
  situationTag?: string;
  // 감정 처방 메시지 (선택한 감정 조합의 클로징 멘트). 없으면 작품의 추천 이유로 대체
  emotionMessage?: string;
  // 작품 모달에서 "함께 가볼 만한 오프라인 공간"으로 보여줄 추천 공간
  relatedSpace?: MuseumGallery | null;
  // 저장 상태·동작은 부모(Recommendations)가 관리 → 카드 버튼과 항상 동기화, 중복 저장 방지
  saveStatus?: 'saving' | 'saved' | 'error';
  onRequestSave?: () => void;
  onImageClick?: () => void;
  onClose: () => void;
  openedAt?: number; // 카드를 클릭한 시각(performance.now()) - 진입 속도 측정용
}

// 모달 진입 시간 기록 - 이번 세션 평균을 콘솔에 남김 (검수 시 "평균 300ms 이내" 확인용)
const modalOpenTimes: number[] = [];
function recordModalOpenTime(ms: number) {
  modalOpenTimes.push(ms);
  const avg = Math.round(modalOpenTimes.reduce((a, b) => a + b, 0) / modalOpenTimes.length);
  console.info(`[Rheina] modal open ${ms}ms (평균 ${avg}ms / ${modalOpenTimes.length}회)${avg > 300 ? ' ⚠️ 300ms 초과' : ''}`);
}

function limitText(value: unknown, maxLength: number): string {
  const text = cleanText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function RecommendationModal({
  artwork,
  tour,
  museum,
  situationTag = '',
  emotionMessage: emotionMessageProp,
  relatedSpace,
  saveStatus,
  onRequestSave,
  onImageClick,
  onClose,
  openedAt,
}: RecommendationModalProps) {
  const scrollPosition = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState('');
  const saved = saveStatus === 'saved';

  const itemId = artwork?.id ?? tour?.id ?? museum?.id ?? '';
  const title = cleanText(artwork?.title) || cleanText(tour?.title) || cleanText(museum?.name) || '추천 콘텐츠';
  const imageUrl = cleanText(artwork?.image_url) || cleanText(tour?.coverImage) || cleanText(museum?.image_url);
  const fallbackImageUrl = cleanText(artwork?.image_fallback_url);

  // 작품 설명(최대 150자) / 작가명 / 작가 소개(최대 300자) - 값이 없으면 섹션 자체를 숨김
  const description = limitText(artwork ? getArtworkMessage(artwork) : museum?.message, 150);
  const artistName = cleanText(artwork?.artist_name) || cleanText(artwork?.artist);
  const artistDescription = limitText(getArtistMessage(artwork), 300);

  // 콘텐츠 종류에 맞는 외부 링크 - null/"null"/빈 값은 '' 로 정리되어 버튼이 자동으로 숨겨짐
  const shopUrl = normalizeExternalUrl(artwork?.shop_url);
  const bookingUrl = normalizeExternalUrl(tour?.booking_url);
  const websiteUrl =
    normalizeExternalUrl(artwork?.external_url) ||
    normalizeExternalUrl(artwork?.museum_url) ||
    normalizeExternalUrl(museum?.website) ||
    normalizeExternalUrl(tour?.external_url) ||
    (tour ? `https://www.curizm.io/exhibition/${tour.id}` : '');

  // 하단 액션 버튼: MeM 저장은 항상 노출, 두 번째 버튼은 콘텐츠 타입에 따라 딱 하나만 - 없으면 [돌아가기]로 대체(50:50)
  // 작품 → 소장하기 > 홈페이지 / 아트투어 → 예약하기 > 홈페이지 / 공간 → 홈페이지
  const secondaryAction: { label: string; url: string; eventType: (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] } | null =
    shopUrl
      ? { label: '소장하기', url: shopUrl, eventType: EVENT_TYPES.ART_PURCHASE_CLICK }
      : bookingUrl
      ? { label: '예약하기', url: bookingUrl, eventType: EVENT_TYPES.BOOKING_CLICK }
      : websiteUrl
      ? { label: '홈페이지 방문', url: websiteUrl, eventType: EVENT_TYPES.WEBSITE_CLICK }
      : null;

  const artworkTags = [cleanText(artwork?.emotion_tag_1), cleanText(artwork?.emotion_tag_2)].filter(Boolean);
  const emotionMessage =
    cleanText(emotionMessageProp) ||
    (artwork
      ? cleanText(artwork.reason) || `${artworkTags.join('·') || '현재의 감정'}을 위한 작품입니다.`
      : museum
      ? '이 공간에서 잠시 마음을 쉬어가세요.'
      : '오늘의 감정과 어울리는 예술 여정을 준비했습니다.');

  // 오프라인 공간 정보 - 공간 모달은 그 공간 자체, 작품 모달은 함께 추천된 공간, 투어는 온라인 전시 안내
  const space = museum ?? relatedSpace ?? null;
  const spaceInfoTitle = museum
    ? cleanText(museum.category) || '공간 정보'
    : relatedSpace
    ? `함께 가볼 만한 공간 · ${cleanText(relatedSpace.name)}`
    : '공간 정보';
  const spaceInfoLines = space
    ? [space.address, space.operatingHours, space.phone].map(cleanText).filter(Boolean)
    : tour
    ? [`${tour.title} 온라인 전시${tour.durationTime ? ` · 감상 시간 ${tour.durationTime}` : ''}`]
    : [];

  useEffect(() => {
    scrollPosition.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    logEvent(EVENT_TYPES.MODAL_OPEN, itemId, 200);
    // 진입 속도 측정: 카드 클릭 시각 → 모달 첫 프레임이 그려진 시각 (목표 평균 300ms 이내)
    const clickedAt = openedAt ?? performance.now();
    requestAnimationFrame(() => {
      const ms = Math.round(performance.now() - clickedAt);
      recordModalOpenTime(ms);
    });

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      document.body.style.overflow = '';
      window.scrollTo({ top: scrollPosition.current, behavior: 'auto' });
      logEvent(EVENT_TYPES.MODAL_CLOSE, itemId, 200);
    };
  }, [itemId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 부모의 저장 결과에 맞춰 토스트 표시 (카드에서 먼저 저장했어도 동일하게 반영)
  useEffect(() => {
    if (saveStatus !== 'saved' && saveStatus !== 'error') return;
    setToast(saveStatus === 'saved' ? '맴 속에 안전하게 저장되었습니다' : '저장에 실패했어요. 다시 시도해주세요.');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), saveStatus === 'saved' ? 1500 : 2000);
  }, [saveStatus]);

  function handleSaveClick() {
    onRequestSave?.(); // 실제 저장(오늘의 기록/맴)은 부모가 수행 - 카드 버튼과 동일한 동작·상태
    if (museum) return; // 공간 저장은 부모의 saveMuseum()이 로그·MeM 전송까지 전부 처리함 - 중복 방지
    logEvent(EVENT_TYPES.MEM_SAVE_CLICK, itemId, 200);
    const payload = artwork ? mapArtworkToMemPayload(artwork, situationTag) : tour ? mapTourToMemPayload(tour, situationTag) : null;
    if (payload) {
      void sendToMem(payload).catch((error) => {
        console.error('[MeM] 저장 실패', error);
        logEvent(EVENT_TYPES.MEM_SAVE_CLICK, itemId, 500);
      });
    }
  }

  function handleExternalAction(url: string, eventType: typeof EVENT_TYPES[keyof typeof EVENT_TYPES]) {
    if (!url) return;
    logEvent(eventType, itemId, 200);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // 닫기는 onClose()만 호출 - MODAL_CLOSE 로그는 아래 useEffect의 cleanup에서 닫힌 경로(X/오버레이/돌아가기/ESC)와 무관하게 한 번만 남김
  function handleBack() {
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // 뒤 추천 화면과 확실히 구분되도록 딤 + 흐림
        style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={handleBack}
        role="presentation"
      >
        <motion.div
          className="recommendation-modal relative overflow-hidden rounded-3xl border border-white/20 bg-[#21182a] text-white shadow-2xl"
          style={{ height: 'min(680px, 84vh)' }}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} 상세 정보`}
        >
          <button type="button" aria-label="닫기" onClick={handleBack} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100">
            <X size={20} />
          </button>

          {/* 1. 이미지 - 카드가 이미 갖고 있던 URL을 그대로 사용(재조회 없음). 모달 진입 즉시 보여야 하므로 lazy 아님 */}
          <div
            className="recommendation-modal__image relative bg-[#120d18]"
            onClick={onImageClick}
            style={{ cursor: onImageClick && (imageUrl || fallbackImageUrl) ? 'zoom-in' : undefined }}
          >
            <ImageWithFallback
              src={imageUrl}
              fallbackSrc={fallbackImageUrl}
              fallbackTitle={title}
              fallbackSubtitle={artwork?.emotion_tag_1}
              alt={title}
              className="recommendation-modal__image-content"
              decoding="async"
              loading="eager"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)', pointerEvents: 'none' }} />
          </div>

          <div className="recommendation-modal__details min-h-0 overflow-y-auto p-5 md:p-6">
            <button type="button" onClick={handleBack} className="mb-4 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-white/70 hover:text-white" style={{ background: 'transparent', border: 'none' }}>
              <ArrowLeft size={16} /> 돌아가기
            </button>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
              {tour ? 'Art tour' : museum ? museum.category?.trim() || 'Space' : 'Artwork'}
            </p>

            {/* 2. 작품명(공간/투어명) */}
            <h2 className="break-words text-2xl font-semibold leading-tight md:text-3xl">{title}</h2>

            {artworkTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {artworkTags.map((tag) => <span key={tag} className="rounded-full border border-white/20 px-3 py-1 text-sm">{tag}</span>)}
              </div>
            )}

            {/* 3. 작품 설명 (최대 150자 - 화면 표시만 자르고 원본 데이터는 그대로 둠). 값이 없으면 섹션 숨김 */}
            {description && (
              <section className="mt-5">
                <h3 className="mb-2 text-lg font-semibold">{artwork ? '작품 설명' : '소개'}</h3>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white/75">{description}</p>
              </section>
            )}

            {/* 4~5. 작가명 → 작가 소개 (최대 300자) - 작품일 때만, 값이 있는 것만 표시 */}
            {artwork && (artistName || artistDescription) && (
              <section className="mt-6">
                <h3 className="mb-2 text-lg font-semibold">{artistName || '작가 정보'}</h3>
                {artistDescription && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-white/75">{artistDescription}</p>}
              </section>
            )}

            {spaceInfoLines.length > 0 && (
              <section className="mt-6">
                <h3 className="mb-2 text-lg font-semibold">{spaceInfoTitle}</h3>
                {spaceInfoLines.map((line, i) => (
                  <p key={i} className="break-words text-sm leading-7 text-white/75">{line}</p>
                ))}
              </section>
            )}

            <section className="mt-5 rounded-2xl border border-pink-200/15 bg-pink-200/10 p-4">
              <h3 className="mb-2 text-sm font-semibold text-pink-100">지금의 감정 메시지</h3>
              <p className="break-words text-sm leading-6 text-white/80">{limitText(emotionMessage, 300)}</p>
            </section>

            {/* 액션 버튼: MeM 저장은 항상, 두 번째는 콘텐츠에 맞는 것 하나 - 없으면 돌아가기로 대체 (항상 50:50 - 유틸리티 클래스 유무와 무관하게 보장하기 위해 인라인으로 grid 지정) */}
            <div
              className="mt-8 border-t border-white/15 pt-5"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem' }}
            >
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={saveStatus === 'saving' || saved}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 font-semibold disabled:opacity-60"
              >
                {saved ? <Check size={18} /> : <Heart size={18} fill="none" />}
                {saveStatus === 'saving' ? '저장 중...' : saved ? '맴에 저장됨' : '맴에 저장'}
              </button>
              {secondaryAction ? (
                <button
                  type="button"
                  onClick={() => handleExternalAction(secondaryAction.url, secondaryAction.eventType)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 px-4 py-3 font-semibold"
                >
                  <ExternalLink size={18} />
                  {secondaryAction.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/25 px-4 py-3 font-semibold"
                >
                  <ArrowLeft size={18} />
                  돌아가기
                </button>
              )}
            </div>
            {toast && <p role="status" className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-pink-100">{toast}</p>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
