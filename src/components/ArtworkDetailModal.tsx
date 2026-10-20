import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Sparkles, Loader2, Check } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { translateToKorean } from "../utils/translation";
import { useAuth } from "../contexts/AuthContext";
import { artworkToRef, saveArtworkToDay } from "../utils/diaryService";
import { SaveDatePicker } from "./SaveDatePicker";
import type { Artwork } from "../utils/artworkRecommendation";

interface ArtworkDetailModalProps {
  artwork: Artwork;
  onClose: () => void;
}

export function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
  const [translatedDescription, setTranslatedDescription] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saveState, setSaveState] = useState<"idle" | "picking" | "saving" | "saved" | "error" | "login-required">("idle");

  function handleSaveClick() {
    if (!user) {
      setSaveState("login-required");
      navigate("/login");
      return;
    }
    setSaveState("picking");
  }

  async function handleConfirmDate(date: string) {
    if (!artwork.image_url?.trim()) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    try {
      await saveArtworkToDay(user!.uid, date, artworkToRef(artwork));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  useEffect(() => {
    // 영어 description을 한글로 번역
    async function translate() {
      setIsTranslating(true);
      const translated = await translateToKorean(artwork.description);
      setTranslatedDescription(translated);
      setIsTranslating(false);
    }

    translate();
  }, [artwork.description]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        onClick={onClose}
      >
        {/* Backdrop with blur */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Paint blend overlay */}
        <div className="absolute inset-0 paint-blend pointer-events-none opacity-30" />

        {/* Modal content */}
        <motion.div
          className="relative rounded-3xl"
          style={{
            width: 'min(92vw, 1100px)',
            maxHeight: '82vh',
            overflow: 'hidden',
            display: 'block',
            background: 'linear-gradient(135deg, rgba(18, 14, 22, 0.96), rgba(57, 33, 62, 0.94))',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          }}
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6" />
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-0" style={{ maxHeight: '82vh' }}>
            {/* Left: Image */}
            <div
              className="relative overflow-hidden rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none"
              style={{
                aspectRatio: '4 / 5',
                minHeight: '260px',
                maxHeight: '82vh',
                background: '#111111',
              }}
            >
              <motion.div
                className="w-full h-full"
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <ImageWithFallback
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r" />

              {/* Floating sparkle */}
              <motion.div
                className="absolute top-8 right-8"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
            </div>

            {/* Right: Details */}
            <div
              className="p-6 md:p-8 flex flex-col"
              style={{
                overflowY: 'auto',
                maxHeight: '82vh',
                background: 'linear-gradient(135deg, rgba(92, 52, 95, 0.96), rgba(67, 41, 81, 0.9))',
                color: '#fff',
              }}
            >
              {/* Title */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2
                  className="mb-4 text-3xl md:text-4xl font-semibold leading-tight"
                  style={{
                    color: '#fff',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {artwork.title}
                </h2>
              </motion.div>

              {/* Emotion Tags */}
              <motion.div
                className="flex flex-wrap gap-2 mb-6"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {artwork.emotion_tag_1 && (
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      color: '#fff',
                    }}
                  >
                    {artwork.emotion_tag_1}
                  </span>
                )}
                {artwork.emotion_tag_2 && (
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: '#fff',
                    }}
                  >
                    {artwork.emotion_tag_2}
                  </span>
                )}
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

              <div style={{ marginBottom: '0.75rem', color: 'rgba(255,255,255,0.72)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Artwork note
              </div>

              {/* Description (Translated) */}
              <motion.div
                className="mb-6"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#fff' }}>
                  <div className="w-2 h-2 rounded-full bg-pink-300" />
                  작품 설명
                </h3>
                {isTranslating ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="opacity-60">번역 중...</span>
                  </div>
                ) : (
                  <p className="opacity-80 leading-relaxed text-base">
                    {translatedDescription}
                  </p>
                )}
              </motion.div>

              {/* Why Recommended */}
              <motion.div
                className="mb-6"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: '#fff' }}>
                  <Heart className="w-5 h-5 text-pink-300" />
                  추천 이유
                </h3>
                <p className="opacity-80 leading-relaxed text-base">
                  {artwork.reason}
                </p>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

              {/* Original Description */}
              <motion.div
                className="mt-auto"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <details className="group">
                  <summary className="text-sm opacity-60 cursor-pointer hover:opacity-100 transition-opacity list-none flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    원문 보기
                  </summary>
                  <p className="mt-3 text-sm opacity-70 leading-relaxed pl-6">
                    {artwork.description}
                  </p>
                </details>
              </motion.div>

              {/* Action Button */}
              {saveState === "picking" ? (
                <div style={{ marginTop: "1.5rem" }}>
                  <SaveDatePicker onConfirm={handleConfirmDate} onCancel={() => setSaveState("idle")} />
                </div>
              ) : (
                <motion.button
                  onClick={handleSaveClick}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="mt-6 w-full py-4 rounded-2xl font-semibold text-lg relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #ff6b9d, #c96dfd)",
                    opacity: saveState === "saving" ? 0.7 : 1,
                  }}
                  whileHover={{ scale: saveState === "idle" ? 1.02 : 1 }}
                  whileTap={{ scale: saveState === "idle" ? 0.98 : 1 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, #c96dfd, #ff6b9d)",
                    }}
                    initial={{ x: "-100%" }}
                    whileHover={{ x: saveState === "idle" ? "0%" : "-100%" }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {saveState === "saved" ? (
                      <>
                        <Check className="w-5 h-5" />
                        담았어요
                      </>
                    ) : saveState === "saving" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        담는 중...
                      </>
                    ) : (
                      <>
                        <Heart className="w-5 h-5" />
                        마음에 담기
                      </>
                    )}
                  </span>
                </motion.button>
              )}
              {saveState === "login-required" && (
                <p style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.85rem", color: "#ffd8e5" }}>
                  로그인이 필요합니다. 로그인 후 저장할 수 있어요.
                </p>
              )}
              {saveState === "error" && (
                <p style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.85rem", color: "#ff8fab" }}>
                  저장에 실패했어요. 다시 시도해주세요.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
