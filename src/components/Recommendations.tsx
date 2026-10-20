import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Clock, Palette, ExternalLink, Star, Sparkles, Phone, RefreshCw, X } from "lucide-react";
import { ImageWithFallback, cleanImageUrl } from "./figma/ImageWithFallback";
import { RecommendationModal } from "./RecommendationModal";
import { cleanText, hasText, normalizeExternalUrl } from "../utils/safeData";
import { useRef, useState, useEffect, useMemo, useCallback, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getRecommendedArtworks, getMockExhibitions, getMockAteliers, getArtistMessage, getArtworkMessage, type Artwork } from "../utils/artworkRecommendation";
import { getAllMuseums, rankMuseumsForTags, getMuseumMapUrl, getInstitutionHeading, type MuseumGallery, type UserCoords } from "../utils/museumRecommendation";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { artworkToRef, getTodayDateString, saveArtworkToDay } from "../utils/diaryService";
import { useReducedFx } from "../hooks/useReducedFx";
import { mapArtworkToMemPayload, mapMuseumToMemPayload, sendToMem } from "../utils/memService";
import { EVENT_TYPES, logEvent } from "../utils/analyticsService";
import { useJourney } from "../contexts/JourneyContext";
import { getClosingMessage } from "../data/closingMents";

// 이미지 크게보기(라이트박스)에 필요한 최소 정보만 - 다른 데이터는 카드에 이미 다 있음
interface LightboxImage {
  src: string;
  fallbackSrc?: string;
  alt: string;
}

function ImageLightbox({ image, onClose }: { image: LightboxImage; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    // 상세 모달 위에서 열릴 수 있으므로, 닫을 때 원래 값(모달이 잠근 hidden)을 그대로 되돌림
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        // ⚠️ z-[100]/bg-black/92 같은 임의값 클래스는 이 프로젝트 CSS에 정의돼 있지 않아 조용히 무시됨
        // (z-index도, 배경도 안 먹혀서 다른 카드에 묻혀 보이는 원인) → 인라인 스타일로 확실히 강제
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(5, 2, 10, 0.96)",
          padding: "1rem",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="presentation"
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          style={{
            position: "absolute",
            right: "1rem",
            top: "1rem",
            zIndex: 1,
            display: "flex",
            height: "2.75rem",
            width: "2.75rem",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            background: "#ffffff",
            color: "#000000",
            border: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>
        <motion.img
          src={image.src || image.fallbackSrc || ""}
          alt={image.alt}
          onError={(e) => {
            // 원본이 깨지면 대체 이미지로 한 번만 교체
            const img = e.currentTarget;
            if (image.fallbackSrc && img.src !== image.fallbackSrc) img.src = image.fallbackSrc;
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "96vw", maxHeight: "94vh", width: "auto", height: "auto", objectFit: "contain", borderRadius: "0.75rem", position: "relative", zIndex: 1 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// 비로그인 저장 시도 → 로그인 후 결과 화면으로 돌아와 이어서 저장하기 위한 대기 정보
const PENDING_SAVE_KEY = 'rheina_pending_save';
interface PendingSave {
  kind: 'artwork' | 'museum';
  id: string;
}

export function hasPendingSave(): boolean {
  try {
    return Boolean(sessionStorage.getItem(PENDING_SAVE_KEY));
  } catch {
    return false;
  }
}

function takePendingSave(): PendingSave | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SAVE_KEY);
    sessionStorage.removeItem(PENDING_SAVE_KEY);
    return raw ? (JSON.parse(raw) as PendingSave) : null;
  } catch {
    return null;
  }
}

// 문자열 필드의 "null"/"undefined"/공백 값을 빈 문자열로 정리 → 화면의 `값 && <표시>` 조건에서 자동으로 숨겨짐
function sanitizeStrings<T extends object>(item: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    out[key] = typeof value === 'string' ? cleanText(value) : value;
  }
  return out as T;
}

// null 항목이나 핵심 정보(id·제목/이름)가 없는 항목은 화면에 내보내지 않음
function validArtworks(list: (Artwork | null | undefined)[] | null | undefined): Artwork[] {
  return (list ?? [])
    .filter((a): a is Artwork => Boolean(a && hasText(a.id) && hasText(a.title)))
    .map(sanitizeStrings);
}

function validMuseums(list: (MuseumGallery | null | undefined)[] | null | undefined): MuseumGallery[] {
  return (list ?? [])
    .filter((m): m is MuseumGallery => Boolean(m && hasText(m.id) && hasText(m.name)))
    .map(sanitizeStrings);
}

// 원본 → 대체 이미지 중 실제 값이 있는 쪽으로 라이트박스를 엶 (둘 다 없으면 열지 않음)
function toLightboxImage(src: unknown, fallbackSrc: unknown, alt: string): LightboxImage | null {
  const primary = cleanImageUrl(src);
  const fallback = cleanImageUrl(fallbackSrc);
  if (!primary && !fallback) return null;
  return { src: primary || fallback, fallbackSrc: fallback || undefined, alt };
}

// 정식 오픈일(2026.10.30) 전/후로 안내 문구가 자동 전환됨
const LAUNCH_DATE = new Date(2026, 9, 30);
function getPreviewNotice(): string {
  return new Date() < LAUNCH_DATE
    ? '지금은 프리뷰(1.9)예요. 구매·예약은 10.30 정식 오픈에서 만나요.'
    : '구매·예약은 상품이 있는 경우에만 연결돼요';
}

interface RecommendationsProps {
  tags: string[];
  emotionTags?: string[]; // 사용자가 "선택한 순서 그대로" 고른 감정 2개 - 클로징 멘트 코드(A-B) 조회용
  preloadedArtworks?: Artwork[];
  preloadedMuseums?: MuseumGallery[];
  weather?: string;
  situationTags?: string[];
  userLocation?: UserCoords; // 위치 권한 허용 시 가까운 공간 우선 정렬용 (없으면 기존과 동일하게 랜덤)
}

export function Recommendations({ tags, emotionTags = [], preloadedArtworks = [], preloadedMuseums = [], weather, situationTags = [], userLocation }: RecommendationsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { resetJourney } = useJourney();

  // 클로징 멘트: 선택한 두 감정의 클러스터 조합(A-B, 순서 유지)으로 정적 데이터에서 조회.
  // Firebase 호출 없음 - props가 바뀌면 즉시 새로 계산되므로 "이전 멘트가 잠깐 보이는" 상태가 생기지 않음.
  const closingMessageResult = useMemo(() => getClosingMessage(emotionTags[0], emotionTags[1]), [emotionTags]);
  useEffect(() => {
    if (closingMessageResult.error) {
      console.error('[클로징 멘트]', closingMessageResult.error, '입력 감정:', emotionTags);
    }
  }, [closingMessageResult, emotionTags]);
  const reducedFx = useReducedFx();
  // 이미지는 원본 → 대체 이미지 → CSS 배경 순으로 처리되므로 이미지 실패로 후보를 건너뛰지 않음
  // (null/제목 없는 작품은 setArtworkPool 단계에서 이미 걸러짐)
  const [artworkPool, setArtworkPool] = useState<Artwork[]>([]);
  const artwork0 = artworkPool[0];
  const artwork1 = artworkPool[1];

  const [museumPool, setMuseumPool] = useState<MuseumGallery[]>([]);
  const [museumIdx, setMuseumIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  // 카드 클릭 시 페이지 이동 없이 띄우는 상세 모달 (카드 목록·정렬 상태는 그대로 유지됨)
  const [detail, setDetail] = useState<({ kind: 'artwork'; artwork: Artwork } | { kind: 'museum'; museum: MuseumGallery }) & { openedAt: number } | null>(null);
  // 작품 저장 상태를 id별로 한 곳에서 관리 → 카드마다 항상 같은 상태를 보게 함
  const [artworkSave, setArtworkSave] = useState<Record<string, "saving" | "saved" | "error">>({});
  const savingRef = useRef<Set<string>>(new Set()); // 빠른 연타(카드+모달) race 방지용 동기 가드
  const containerRef = useRef<HTMLDivElement>(null);

  // 비로그인 상태에서 저장을 누르면: 저장하려던 항목을 기억해두고 로그인 → 이 화면으로 돌아와 자동 저장
  function requireLoginFor(pending: PendingSave) {
    try {
      sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(pending));
    } catch {
      // 저장 못 해도 로그인 이동은 그대로 진행
    }
    navigate('/login', { state: { from: '/result' } });
  }

  async function saveArtwork(artwork?: Artwork) {
    if (!artwork) return;
    if (!user) {
      requireLoginFor({ kind: 'artwork', id: artwork.id });
      return;
    }
    const id = artwork.id;
    if (artworkSave[id] === 'saving' || artworkSave[id] === 'saved') return; // 이미 저장됨/진행중 → 중복 저장 방지
    if (savingRef.current.has(id)) return; // 렌더 전 연타 방지
    savingRef.current.add(id);
    if (!artwork.image_url?.trim()) {
      setArtworkSave((prev) => ({ ...prev, [id]: 'error' }));
      savingRef.current.delete(id);
      return;
    }
    const date = getTodayDateString();
    setArtworkSave((prev) => ({ ...prev, [id]: 'saving' }));
    try {
      // 이메일 회원인데 이 브라우저의 Firebase 세션이 다른 계정이면 저장 막기
      // (카카오 회원·다른 도메인에서 로그인을 넘겨받은 회원은 Firebase 세션이 없으므로 '없음'은 막지 않음)
      if (user.provider === 'email' && auth.currentUser && auth.currentUser.uid !== user.providerId) {
        throw new Error('로그인 정보가 일치하지 않습니다. 다시 로그인해주세요.');
      }
      await saveArtworkToDay(user.uid, date, { ...artworkToRef(artwork), weather, situationTags });
      setArtworkSave((prev) => ({ ...prev, [id]: 'saved' }));
      setSaveNotice(`${artwork.title}이(가) 오늘(${date}) 기록에 저장되었습니다.`);
    } catch (error) {
      console.error('작품 저장 실패:', error);
      setArtworkSave((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      savingRef.current.delete(id);
    }
  }

  // 공간(미술관/갤러리)은 "맴 저장"만 지원 - 즉시 UI 피드백 후 백그라운드로 전송(기존 MeM 저장 흐름 재사용)
  function saveMuseum(museum?: MuseumGallery) {
    if (!museum) return;
    if (!user) {
      requireLoginFor({ kind: 'museum', id: museum.id });
      return;
    }
    const key = `museum:${museum.id}`;
    if (artworkSave[key] === 'saved') return; // 중복 저장 방지
    setArtworkSave((prev) => ({ ...prev, [key]: 'saved' })); // 낙관적 업데이트 - 기다리게 하지 않음
    setSaveNotice(`${museum.name}이(가) 맴에 저장되었습니다.`);
    logEvent(EVENT_TYPES.MEM_SAVE_CLICK, museum.id, 200);
    const payload = mapMuseumToMemPayload(museum, situationTags[0] ?? '');
    void sendToMem(payload).catch((error) => {
      console.error('공간 MeM 저장 실패:', error);
      logEvent(EVENT_TYPES.MEM_SAVE_CLICK, museum.id, 500);
    });
  }

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1, 1, 0.5]);

  // Museumgallery(내 데이터) + Firestore 추천 작품 가져오기
  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      setMuseumIdx(0); // 태그가 바뀌면 첫 후보부터
      try {
        // 🚀 미리 로딩된 데이터가 있으면 즉시 사용!
        if (preloadedArtworks && preloadedArtworks.length > 0) {
          console.log('⚡ 미리 로딩된 작품 사용!', preloadedArtworks.length, '개');
          setArtworkPool(validArtworks(preloadedArtworks));
          setMuseumPool(rankMuseumsForTags(tags, validMuseums(preloadedMuseums), 12, userLocation));
          setLoading(false);
          return;
        }

        // 미리 로딩된 데이터가 없으면 여기서 가져오기 (폴백)
        // 공간·작품은 서로 무관한 조회라 동시에 실행 → 순서대로 기다릴 때보다 최대 절반 가까이 빨라짐
        // 작품은 8개를 받아둠 - 이미지가 실제로 안 뜨는 후보가 있어도 화면에서 바로 다음 후보로 넘어가도록
        console.log('⚠️ 미리 로딩된 데이터 없음 → 지금 로딩 시작 (공간+작품 동시 조회)');
        const [museums, recommendedArtworks] = await Promise.all([
          getAllMuseums(),
          getRecommendedArtworks(tags, 8),
        ]);
        setMuseumPool(rankMuseumsForTags(tags, validMuseums(museums), 12, userLocation));
        setArtworkPool(validArtworks(recommendedArtworks));
      } catch (error) {
        console.error('❌ 추천 데이터 가져오기 실패:', error);

        // 에러 발생 시에도 Firestore 작품은 표시
        try {
          console.log('🔥 에러 복구: Firestore 작품 로딩...');
          const fallbackArtworks = await getRecommendedArtworks(tags, 8);
          setArtworkPool(validArtworks(fallbackArtworks));
          setMuseumPool([]);
        } catch (fallbackError) {
          console.error('❌ Firestore 작품도 가져오기 실패:', fallbackError);
          setArtworkPool([]);
          setMuseumPool([]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [tags, preloadedArtworks, preloadedMuseums]);

  // 로그인하고 돌아온 경우: 로그인 전에 누른 저장을 이어서 실행 (페이지 새로고침 없음)
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || loading || !user) return;
    resumedRef.current = true;
    const pending = takePendingSave();
    if (!pending) return;
    if (pending.kind === 'artwork') {
      const target = artworkPool.find((a) => a.id === pending.id);
      if (target) void saveArtwork(target);
    } else {
      const target = museumPool.find((m) => m.id === pending.id);
      if (target) saveMuseum(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, artworkPool, museumPool]);

  // 현재 보여줄 공간 + 다음 공간으로 넘기기
  const museum = museumPool.length > 0 ? museumPool[museumIdx % museumPool.length] : null;
  const showNextMuseum = () =>
    setMuseumIdx((i) => (museumPool.length > 0 ? (i + 1) % museumPool.length : 0));

  // 모달 닫기 - 스크롤 위치 복원은 RecommendationModal이 처리
  const closeDetail = useCallback(() => setDetail(null), []);

  const exhibitions = getMockExhibitions(tags);
  const ateliers = getMockAteliers(tags);

  const goToCalendar = () => {
    window.location.href = '/mem';
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen gradient-bg relative"
    >
      {/* Paint blend layer */}
      <div className="absolute inset-0 paint-blend pointer-events-none" />

      {/* Parallax background - 모바일/reduced-motion 에서는 통째로 생략 (렉 완화) */}
      {!reducedFx && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ y: backgroundY, opacity }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${50 + Math.random() * 150}px`,
                height: `${50 + Math.random() * 150}px`,
                background: i % 3 === 0
                  ? "radial-gradient(circle, rgba(255, 107, 157, 0.3) 0%, transparent 70%)"
                  : i % 3 === 1
                  ? "radial-gradient(circle, rgba(201, 109, 253, 0.3) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(254, 194, 96, 0.3) 0%, transparent 70%)",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 200}%`,
                filter: 'blur(80px)',
                mixBlendMode: 'screen',
              }}
              animate={{
                y: [0, -30, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Hero Section with 3D effect */}
      <div className="relative pt-20 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 text-center overflow-hidden">
        {!reducedFx && (
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                "radial-gradient(circle at 30% 30%, rgba(255, 107, 157, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 70% 70%, rgba(201, 109, 253, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 70%, rgba(254, 194, 96, 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 30%, rgba(255, 107, 157, 0.3) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
            }}
          />
        )}

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
            className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 rounded-full mb-6 md:mb-10 glass-effect"
          >
            
            <span className="text-sm md:text-lg font-semibold">당신의 감정이 예술이 되는 순간</span>
   
          </motion.div>

          {/* 클로징 멘트 2줄 - 선택한 감정 2개의 클러스터 조합(A-B, 선택 순서 유지)으로 결정됨 */}
          <motion.div
            className="max-w-3xl mx-auto px-3 py-4 md:px-6 md:py-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 0 35px rgba(255, 107, 157, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {closingMessageResult.message ? (
              <>
                <p
                  className="text-xl md:text-3xl font-black tracking-[-0.04em]"
                  style={{
                    lineHeight: 1.4,
                    wordBreak: 'keep-all',
                    textShadow: '0 0 22px rgba(255, 107, 157, 0.6), 0 0 42px rgba(201, 109, 253, 0.28)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #ffd6ea 30%, #f7d4ff 65%, #fff5d1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {closingMessageResult.message.line1}
                </p>
                <p
                  className="mt-3 text-base md:text-xl font-medium opacity-90"
                  style={{
                    lineHeight: 1.6,
                    wordBreak: 'keep-all',
                    letterSpacing: '-0.02em',
                    color: '#f7f2ff',
                    textShadow: '0 0 18px rgba(201, 109, 253, 0.18)',
                  }}
                >
                  {closingMessageResult.message.line2}
                </p>
              </>
            ) : (
              <p className="text-base md:text-lg opacity-70" style={{ lineHeight: 1.6, wordBreak: 'keep-all' }}>
                감정 조합을 확인하지 못했어요. 처음부터 다시 선택해주세요.
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-32 relative z-10">
        {saveNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mb-6"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '1rem',
                padding: '0.9rem 1rem',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{saveNotice}</span>
              <button
                type="button"
                onClick={goToCalendar}
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '0.5rem 0.8rem',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                내 기록 보기
              </button>
            </div>
          </motion.div>
        )}

        {/* Single Row Layout */}
        <motion.div
          className="mb-12 md:mb-20"
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* 첫 번째 칸: 내 Museumgallery 데이터에서 감정/상황에 맞는 공간 */}
            <div>
              <motion.div
                className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #ff6b9d, #ff6b9ddd)" }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  animate={{
                    boxShadow: [
                      "0 0 20px #ff6b9d40",
                      "0 0 40px #ff6b9d80",
                      "0 0 20px #ff6b9d40",
                    ],
                  }}
                >
                  <MapPin className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-pink-400 text-base md:text-lg">{getInstitutionHeading(museum?.category)}</h3>
                </div>
              </motion.div>
              <MuseumCard
                museum={museum}
                loading={loading}
                index={0}
                total={museumPool.length}
                position={museumPool.length > 0 ? (museumIdx % museumPool.length) + 1 : 0}
                onNext={showNextMuseum}
                saveStatus={museum ? artworkSave[`museum:${museum.id}`] : undefined}
                onRequestSave={() => saveMuseum(museum ?? undefined)}
                // 이미지 클릭 = 이미지 전용 확대 모달 / 카드 나머지 영역 클릭 = 기존 상세 모달
                onImageClick={() => museum && setLightboxImage(toLightboxImage(museum.image_url, null, museum.name))}
                onOpenDetail={() => museum && setDetail({ kind: 'museum', museum, openedAt: performance.now() })}
              />
            </div>

            {/* Firestore 작품 1번 - 로딩이 끝났는데 데이터가 없으면 칸 자체를 숨김 */}
            {(loading || artwork0) && (
            <div>
              <motion.div
                className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #c96dfd, #c96dfddd)" }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  animate={{
                    boxShadow: [
                      "0 0 20px #c96dfd40",
                      "0 0 40px #c96dfd80",
                      "0 0 20px #c96dfd40",
                    ],
                  }}
                >
                  <Palette className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-purple-400 text-base md:text-lg">추천 명화</h3>
                </div>
              </motion.div>
              <ArtworkCard
                artwork={artwork0}
                index={1}
                situationTag={situationTags[0]}
                saveStatus={artwork0 ? artworkSave[artwork0.id] : undefined}
                onRequestSave={() => saveArtwork(artwork0)}
                onImageClick={() => artwork0 && setLightboxImage(toLightboxImage(artwork0.image_url, artwork0.image_fallback_url, artwork0.title))}
                onOpenDetail={() => artwork0 && setDetail({ kind: 'artwork', artwork: artwork0, openedAt: performance.now() })}
              />
            </div>
            )}

            {/* Firestore 작품 2번 */}
            {(loading || artwork1) && (
            <div>
              <motion.div
                className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #fec260, #fec260dd)" }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  animate={{
                    boxShadow: [
                      "0 0 20px #fec26040",
                      "0 0 40px #fec26080",
                      "0 0 20px #fec26040",
                    ],
                  }}
                >
                  <Palette className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-yellow-400 text-base md:text-lg">추천 명화</h3>
                </div>
              </motion.div>
              <ArtworkCard
                artwork={artwork1}
                index={2}
                situationTag={situationTags[0]}
                saveStatus={artwork1 ? artworkSave[artwork1.id] : undefined}
                onRequestSave={() => saveArtwork(artwork1)}
                onImageClick={() => artwork1 && setLightboxImage(toLightboxImage(artwork1.image_url, artwork1.image_fallback_url, artwork1.title))}
                onOpenDetail={() => artwork1 && setDetail({ kind: 'artwork', artwork: artwork1, openedAt: performance.now() })}
              />
            </div>
            )}
          </div>
        </motion.div>

        {/* 프리뷰/정식 오픈 안내 + 다시 하기 */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {getPreviewNotice()}
          </p>
          <button
            type="button"
            onClick={() => {
              resetJourney();
              navigate('/');
            }}
            style={{
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              borderRadius: '999px',
              padding: '0.75rem 1.75rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            다시 하기
          </button>
        </div>
      </div>
      {detail?.kind === 'artwork' && (
        <RecommendationModal
          artwork={detail.artwork}
          situationTag={situationTags[0]}
          emotionMessage={closingMessageResult.message ? `${closingMessageResult.message.line1} ${closingMessageResult.message.line2}` : undefined}
          relatedSpace={museum}
          saveStatus={artworkSave[detail.artwork.id]}
          onRequestSave={() => saveArtwork(detail.artwork)}
          onImageClick={() =>
            setLightboxImage(toLightboxImage(detail.artwork.image_url, detail.artwork.image_fallback_url, detail.artwork.title))
          }
          onClose={closeDetail}
          openedAt={detail.openedAt}
        />
      )}
      {detail?.kind === 'museum' && (
        <RecommendationModal
          museum={detail.museum}
          situationTag={situationTags[0]}
          emotionMessage={closingMessageResult.message ? `${closingMessageResult.message.line1} ${closingMessageResult.message.line2}` : undefined}
          saveStatus={artworkSave[`museum:${detail.museum.id}`]}
          onRequestSave={() => saveMuseum(detail.museum)}
          onImageClick={() => setLightboxImage(toLightboxImage(detail.museum.image_url, null, detail.museum.name))}
          onClose={closeDetail}
          openedAt={detail.openedAt}
        />
      )}
      {lightboxImage && <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </motion.div>
  );
}

function ExhibitionCard({ exhibition, index }: { exhibition: any; index: number }) {
  return (
    <motion.div
      className="glass-effect rounded-[2rem] overflow-hidden group cursor-pointer card-shine relative"
      initial={{ opacity: 0, y: 50, rotateY: -20 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -15, scale: 1.02 }}
    >
      <div className="relative h-72 overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.2 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          <ImageWithFallback
            src={exhibition.image}
            alt={exhibition.title}
            fallbackTitle={exhibition.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        
        {/* Floating badge */}
        <motion.div
          className="absolute top-4 right-4 px-4 py-2 rounded-full glass-effect flex items-center gap-2"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">추천</span>
        </motion.div>

        {/* Hover link */}
        <motion.div
          className="absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
          style={{ background: "linear-gradient(135deg, #ff6b9d, #c96dfd)" }}
          whileHover={{ scale: 1.2, rotate: 90 }}
          transition={{ type: "spring" }}
        >
          <ExternalLink className="w-6 h-6 text-white" />
        </motion.div>

        {/* Title overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <h3 className="text-white mb-2">{exhibition.title}</h3>
        </div>
      </div>

      <div className="p-6">
        <p className="opacity-70 mb-6 text-sm leading-relaxed">{exhibition.description}</p>
        
        <div className="space-y-3 mb-6">
          <motion.div 
            className="flex items-center gap-3 text-sm"
            whileHover={{ x: 5 }}
          >
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-pink-400" />
            </div>
            <span className="opacity-80">{exhibition.location}</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-3 text-sm"
            whileHover={{ x: 5 }}
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <span className="opacity-80">{exhibition.date}</span>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2">
          {exhibition.tags.map((tag: string, i: number) => (
            <motion.span
              key={tag}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(255, 107, 157, 0.2)",
                border: "1px solid rgba(255, 107, 157, 0.3)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ scale: 1.1, background: "rgba(255, 107, 157, 0.3)" }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function limitText(value: string | undefined | null, maxLength: number): string {
  const text = value?.trim() ?? '';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function ArtworkCard({
  artwork,
  index,
  situationTag,
  saveStatus,
  onRequestSave,
  onImageClick,
  onOpenDetail,
  onImageError,
}: {
  artwork: Artwork | undefined;
  index: number;
  situationTag?: string;
  // 저장 상태·저장 동작은 부모(Recommendations)가 id별로 관리
  saveStatus?: "saving" | "saved" | "error";
  onRequestSave?: () => void;
  // 이미지 클릭 → 이미지 전용 확대 모달
  onImageClick?: () => void;
  // 카드(이미지 외 영역) 클릭 → 상세 모달
  onOpenDetail?: () => void;
  // 이미지(원본+대체 모두)가 실제로 로드 실패했을 때 - 부모가 다음 후보로 넘김
  onImageError?: () => void;
}) {
  function handleSaveClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRequestSave?.();
    if (artwork) {
      logEvent(EVENT_TYPES.MEM_SAVE_CLICK, artwork.id, 200);
      void sendToMem(mapArtworkToMemPayload(artwork, situationTag)).catch((error) => {
        console.error('[MeM] 저장 실패', error);
        logEvent(EVENT_TYPES.MEM_SAVE_CLICK, artwork.id, 500);
      });
    }
  }

  function handleImageClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onImageClick?.();
  }

  function handleOpenDetail(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onOpenDetail?.();
  }

  function handleExternalAction(e: MouseEvent, url: string, eventType: (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]) {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;
    logEvent(eventType, artwork!.id, 200);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // artwork가 없으면 로딩 상태 표시
  if (!artwork) {
    return (
      <motion.div
        className="glass-effect rounded-[2rem] overflow-hidden card-shine h-[600px] flex items-center justify-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center p-6">
          <motion.div
            className="w-16 h-16 rounded-full mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #c96dfd, #ff6b9d)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="opacity-60">추천 작품을 찾고 있습니다...</p>
        </div>
      </motion.div>
    );
  }

  // 작품 메시지 / 작가 메시지는 각각 자기 필드만 사용 (한쪽이 없어도 다른 쪽으로 채우지 않음)
  const description = limitText(getArtworkMessage(artwork), 150);
  const artistName = artwork.artist_name ?? artwork.artist ?? '';
  const artistDescription = limitText(getArtistMessage(artwork), 300);
  // 있는 데이터는 다 보여주기 - 연도·재료·크기·사조 중 실제로 값이 있는 것만 " · "로 이어붙임
  const metaLine = [
    artwork.production_year ? `${artwork.production_year}` : '',
    artwork.medium,
    artwork.artwork_size,
    artwork.art_movement,
  ]
    .filter((v) => v && String(v).trim())
    .join(' · ');
  const emotionTagsAll = [artwork.emotion_tag_1, artwork.emotion_tag_2, artwork.emotion_tag_3, artwork.emotion_tag_4].filter(
    (v): v is string => Boolean(v && v.trim()),
  );

  // 두 번째 버튼: 소장하기(shop_url) > 홈페이지 방문(external_url/museum_url) > 없음(버튼 숨김)
  const shopUrl = normalizeExternalUrl(artwork.shop_url);
  const homepageUrl = normalizeExternalUrl(artwork.external_url) || normalizeExternalUrl(artwork.museum_url);
  const secondaryAction: { label: string; url: string; eventType: (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] } | null =
    shopUrl
      ? { label: '소장하기', url: shopUrl, eventType: EVENT_TYPES.ART_PURCHASE_CLICK }
      : homepageUrl
      ? { label: '홈페이지 방문', url: homepageUrl, eventType: EVENT_TYPES.WEBSITE_CLICK }
      : null;

  return (
    <motion.div
      className="glass-effect rounded-[2rem] overflow-hidden group card-shine cursor-pointer"
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -15, scale: 1.02 }}
      onClick={handleOpenDetail}
    >
      <div className="relative h-96 overflow-hidden" onClick={handleImageClick} style={{ cursor: 'zoom-in' }}>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 2 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          <ImageWithFallback
            src={artwork.image_url}
            alt={artwork.title}
            fallbackSrc={artwork.image_fallback_url}
            fallbackTitle={artwork.title}
            fallbackSubtitle={artwork.emotion_tag_1}
            className="w-full h-full object-cover"
            onImageError={onImageError}
          />
        </motion.div>

        {/* Frame effect */}
        <div className="absolute inset-4 border-4 border-white/20 pointer-events-none" />

        {/* 크게보기 힌트 */}
        <motion.div
          className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={{ scale: 0 }}
          whileHover={{ scale: 1 }}
        >
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </motion.div>
      </div>

      <div className="p-6">
        <h3 className="mb-2 text-glow">{artwork.title}</h3>
        {metaLine && (
          <p className="opacity-60 text-xs mb-3" style={{ letterSpacing: '0.01em' }}>
            {metaLine}
          </p>
        )}
        {emotionTagsAll.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {emotionTagsAll.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(201, 109, 253, 0.2)', border: '1px solid rgba(201, 109, 253, 0.3)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {artistName && <p className="text-sm font-semibold mb-3">{artistName}</p>}

        {/* 작가 메시지 + 작품 메시지 동시 노출 - 값이 있는 항목만 */}
        {artistDescription && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold mb-1 opacity-60">작가 메시지</p>
            <p className="text-xs leading-relaxed opacity-80">{artistDescription}</p>
          </div>
        )}
        {description && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold mb-1 opacity-60">작품 메시지</p>
            <p className="text-xs leading-relaxed opacity-80">{description}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: secondaryAction ? '1fr 1fr' : '1fr', gap: '0.6rem' }}>
          <motion.button
            type="button"
            onClick={handleSaveClick}
            disabled={saveStatus === 'saving' || saveStatus === 'saved' || !artwork.image_url?.trim()}
            className="rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white"
            style={{
              background: saveStatus === 'saved' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
              opacity: !artwork.image_url?.trim() || saveStatus === 'saving' ? 0.55 : 1,
            }}
            whileHover={{ scale: !saveStatus ? 1.01 : 1 }}
            whileTap={{ scale: !saveStatus ? 0.98 : 1 }}
          >
            {!artwork.image_url?.trim()
              ? '이미지 없음'
              : saveStatus === 'saving'
              ? '저장 중...'
              : saveStatus === 'saved'
              ? '기록에 저장됨'
              : '❤ 맴(MeM )에 저장'}
          </motion.button>

          {secondaryAction && (
            <motion.button
              type="button"
              onClick={(e) => handleExternalAction(e, secondaryAction.url, secondaryAction.eventType)}
              className="flex items-center justify-center gap-1.5 rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-4 h-4" /> {secondaryAction.label}
            </motion.button>
          )}
        </div>

        {saveStatus === 'error' && (
          <p className="mt-3 text-xs" style={{ color: '#ff8fab' }}>
            저장에 실패했어요. 다시 시도해주세요.
          </p>
        )}
      </div>
    </motion.div>
  );
}

function AtelierCard({ atelier, index }: { atelier: any; index: number }) {
  return (
    <motion.div
      className="glass-effect rounded-[2rem] overflow-hidden group cursor-pointer card-shine"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -15, scale: 1.02 }}
    >
      <div className="relative h-72 overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.15 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          <ImageWithFallback
            src={atelier.image}
            alt={atelier.artist}
            fallbackTitle={atelier.artist}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Artist name overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <motion.h3 
            className="text-white text-glow"
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {atelier.artist}
          </motion.h3>
        </div>
      </div>

      <div className="p-6">
        <p className="opacity-70 mb-6 text-sm leading-relaxed">{atelier.description}</p>
        
        <div className="space-y-3 mb-6">
          <motion.div 
            className="flex items-center gap-3 text-sm"
            whileHover={{ x: 5 }}
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="opacity-80">{atelier.location}</span>
          </motion.div>
          <motion.div 
            className="flex items-center gap-3 text-sm"
            whileHover={{ x: 5 }}
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="opacity-80">{atelier.duration}</span>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2">
          {atelier.tags.map((tag: string, i: number) => (
            <motion.span
              key={tag}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(254, 194, 96, 0.2)",
                border: "1px solid rgba(254, 194, 96, 0.3)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ scale: 1.1, background: "rgba(254, 194, 96, 0.3)" }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MuseumCard({
  museum,
  loading,
  index,
  total = 0,
  position = 0,
  onNext,
  saveStatus,
  onRequestSave,
  onImageClick,
  onOpenDetail,
}: {
  museum: MuseumGallery | null;
  loading: boolean;
  index: number;
  total?: number;
  position?: number;
  onNext?: () => void;
  saveStatus?: "saving" | "saved" | "error";
  onRequestSave?: () => void;
  // 이미지 클릭 → 이미지 전용 확대 모달
  onImageClick?: () => void;
  // 카드(이미지 외 영역) 클릭 → 상세 모달
  onOpenDetail?: () => void;
}) {
  function handleImageClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onImageClick?.();
  }

  function handleOpenDetail(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onOpenDetail?.();
  }

  function handleSaveClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRequestSave?.();
  }

  // 아직 데이터가 없으면 로딩/안내 상태 표시
  if (!museum) {
    return (
      <motion.div
        className="glass-effect rounded-[2rem] overflow-hidden card-shine h-[600px] flex items-center justify-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center p-6">
          {loading ? (
            <>
              <motion.div
                className="w-16 h-16 rounded-full mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #ff6b9d, #c96dfd)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="opacity-60">어울리는 공간을 찾고 있습니다...</p>
            </>
          ) : (
            <p className="opacity-60 leading-relaxed">
              추천할 공간 데이터가 아직 없어요.
              <br />
              /upload 에서 엑셀을 올려주세요.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  const normalizedWebsite = normalizeExternalUrl(museum.website);
  const mapUrl = getMuseumMapUrl(museum);

  const matchTags = [
    ...String(museum.situation ?? "").split(/[,/·]/),
    ...String(museum.emotion ?? "").split(/[,/·]/),
  ]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .slice(0, 6);

  return (
    <motion.div
      className="glass-effect rounded-[2rem] overflow-hidden group card-shine cursor-pointer"
      initial={{ opacity: 0, y: 50, rotateX: 20 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -15, scale: 1.02 }}
      onClick={handleOpenDetail}
    >
      <div
        className="relative h-96 overflow-hidden"
        onClick={handleImageClick}
        style={{ cursor: cleanImageUrl(museum.image_url) ? 'zoom-in' : undefined }}
      >
        {/* 이미지가 없거나 로드 실패하면 브랜드 그라데이션 CSS 배경으로 채움 (기관명은 이미지 바로 아래에 표시) */}
        <ImageWithFallback
          src={museum.image_url}
          alt={museum.name}
          className="w-full h-full object-cover"
          plainFallback
        />

        {/* 구분 배지 */}
        <motion.div
          className="absolute top-4 left-4 px-4 py-2 rounded-full glass-effect flex items-center gap-2"
          initial={{ scale: 0, x: -20 }}
          whileInView={{ scale: 1, x: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <MapPin className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-semibold">{getInstitutionHeading(museum.category)}</span>
        </motion.div>
      </div>

      <div className="p-6">
        {/* 기관명: 이미지와 같은 museum 레코드의 name (이미지 바로 아래) */}
        <h3 className="text-white text-glow mb-4">{museum.name}</h3>
        <div className="space-y-3 mb-4">
          {museum.address?.trim() && (
            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-pink-400" />
              </div>
              <span className="opacity-80 leading-relaxed">{museum.address}</span>
            </div>
          )}
          {museum.operatingHours?.trim() && (
            <div className="flex items-start gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <span className="opacity-80 leading-relaxed">{museum.operatingHours}</span>
            </div>
          )}
          {museum.phone?.trim() && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="opacity-80">{museum.phone}</span>
            </div>
          )}
        </div>

        {museum.message?.trim() && (
          <p className="text-sm opacity-70 mb-4 leading-relaxed">{museum.message}</p>
        )}

        <motion.button
          type="button"
          onClick={handleSaveClick}
          disabled={saveStatus === 'saving' || saveStatus === 'saved'}
          className="mb-2 w-full rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white"
          style={{
            background: saveStatus === 'saved' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
            opacity: saveStatus === 'saving' ? 0.55 : 1,
          }}
          whileHover={{ scale: !saveStatus ? 1.01 : 1 }}
          whileTap={{ scale: !saveStatus ? 0.98 : 1 }}
        >
          {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '기록에 저장됨' : '❤ 맴(MeM )에 저장'}
        </motion.button>

        <div className="flex gap-2">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 px-3 py-3 text-sm font-semibold text-white"
            style={{ textDecoration: "none" }}
          >
            <MapPin className="w-4 h-4" /> 지도 보기
          </a>
          {normalizedWebsite ? (
            <a
              href={normalizedWebsite}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              // 강조 배경색 제거 - "지도 보기"와 같은 무색 테두리 버튼
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 px-3 py-3 text-sm font-semibold text-white"
              style={{ textDecoration: "none" }}
            >
              <ExternalLink className="w-4 h-4" /> 홈페이지
            </a>
          ) : (
            <span className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 py-3 text-sm font-semibold text-white/40">
              홈페이지 없음
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}