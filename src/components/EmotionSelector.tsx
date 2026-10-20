import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReducedFx } from "../hooks/useReducedFx";
import { ASK_EMOTION_MENTS, getEmotionsForSituationName } from "../data/emotionMaster";
import "./EmotionSelector.css";

interface EmotionSelectorProps {
  selectedSituations: string[];
  onComplete: (emotions: string[]) => void;
}

// 🔥 감정 선택 시 랜덤 멘트 (ME1~ME5, 원본 문구 그대로 - 임의 수정 금지)
const EMOTION_MESSAGES = ASK_EMOTION_MENTS.map((m) => m.text);

// 감정별 색상 매핑 (Master Data의 23개 감정 표시명 기준)
const EMOTION_COLORS: Record<string, string> = {
  "슬픔": "#6dd5ed",
  "피로": "#6dd5ed",
  "지침": "#5ba3bf",
  "불안": "#ff6b9d",
  "긴장": "#ff8fab",
  "혼란": "#ffb3c6",
  "성취감": "#fed89c",
  "억울함": "#ff6b9d",
  "용기": "#fec260",
  "희망": "#fed89c",
  "무기력": "#4a7c95",
  "외로움": "#c96dfd",
  "답답함": "#ff8fab",
  "자책": "#5ba3bf",
  "수치심": "#4a7c95",
  "소외감": "#9b7ddb",
  "공허함": "#8a9bd4",
  "고립감": "#7b68c7",
  "향수": "#b8a5d9",
  "설렘": "#ffb3c6",
  "의욕": "#fee5b8",
  "뭉클함": "#fec260",
  "기쁨/행복": "#fec260",
};

export function EmotionSelector({ selectedSituations, onComplete }: EmotionSelectorProps) {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [randomMessage, setRandomMessage] = useState("");
  const [availableEmotions, setAvailableEmotions] = useState<string[]>([]);
  const reducedFx = useReducedFx();

  // 선택된 상황들에서 가능한 감정들 추출 (Master Data의 Mapping_SituationEmotion 기준)
  useEffect(() => {
    const emotions = new Set<string>();
    selectedSituations.forEach((situation) => {
      getEmotionsForSituationName(situation).forEach((emotion) => emotions.add(emotion.name));
    });
    setAvailableEmotions(Array.from(emotions));
    
    console.log('🎭 선택된 상황:', selectedSituations);
    console.log('💫 가능한 감정:', Array.from(emotions));
  }, [selectedSituations]);

  // 랜덤 메시지 선택
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * EMOTION_MESSAGES.length);
    setRandomMessage(EMOTION_MESSAGES[randomIndex]);
    console.log('💖 감정 선택 메시지:', EMOTION_MESSAGES[randomIndex]);
  }, []);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(emotion)) {
        return prev.filter(e => e !== emotion);
      } else if (prev.length < 2) {
        return [...prev, emotion];
      } else {
        return [prev[1], emotion];
      }
    });
  };

  const handleContinue = () => {
    if (selectedEmotions.length === 2) {
      onComplete(selectedEmotions);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="emotion-selector-container"
    >
      {/* 배경 장식 레이어 - 모바일/reduced-motion 에서는 렌더 자체를 생략(렉 완화) */}
      {!reducedFx && (
      <div className="emotion-bg">
      {/* Paint blend background */}
      <div className="emotion-paint-blend" />

      {/* Animated background orbs */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="emotion-orb"
          style={{
            width: `${200 + Math.random() * 200}px`,
            height: `${200 + Math.random() * 200}px`,
            background:
              i % 3 === 0
                ? "radial-gradient(circle, rgba(255, 107, 157, 0.5) 0%, rgba(255, 107, 157, 0) 70%)"
                : i % 3 === 1
                ? "radial-gradient(circle, rgba(201, 109, 253, 0.5) 0%, rgba(201, 109, 253, 0) 70%)"
                : "radial-gradient(circle, rgba(254, 194, 96, 0.4) 0%, rgba(254, 194, 96, 0) 70%)",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 10 + Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Animated geometric shapes */}
      {[...Array(15)].map((_, i) => {
        const shapes = ['triangle', 'square', 'hexagon', 'circle', 'ring', 'pentagon'];
        const animations = ['shape-float', 'shape-drift', 'shape-spin', 'shape-pulse', 'shape-bounce'];
        const colors = ['#ff6b9d', '#c96dfd', '#fec260', '#6dd5ed', '#ffb3c6'];
        
        const shapeType = shapes[i % shapes.length];
        const animationType = animations[i % animations.length];
        const color = colors[i % colors.length];
        const duration = 8 + Math.random() * 12;
        const delay = Math.random() * 5;
        
        return (
          <div
            key={`shape-${i}`}
            className={`emotion-shape emotion-shape-${shapeType}`}
            style={{
              color: color,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `${animationType} ${duration}s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
      </div>
      )}

      <div className="emotion-content-wrapper">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="emotion-header"
        >
          {/* 랜덤 메시지 */}
          <motion.div
            className="emotion-message-box"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <p className="emotion-message-text">
              {randomMessage}
            </p>
          </motion.div>

          <motion.p
            className="emotion-counter-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {selectedEmotions.length}/2 선택됨
          </motion.p>
        </motion.div>

        {/* Emotions Grid */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="emotion-grid"
        >
          {availableEmotions.map((emotion, index) => {
            const isSelected = selectedEmotions.includes(emotion);
            const color = EMOTION_COLORS[emotion] || "#c96dfd";
            const colorShadow = color + "80";
            const colorDark = color + "dd";
            const colorGlow = color + "40";

            return (
              <motion.button
                key={emotion}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.6 + index * 0.05,
                  type: "spring",
                  stiffness: 200,
                }}
                onClick={() => toggleEmotion(emotion)}
                className={`emotion-button ${isSelected ? 'selected' : ''}`}
                style={{
                  '--emotion-color': color,
                  '--emotion-color-shadow': colorShadow,
                  '--emotion-color-dark': colorDark,
                  '--emotion-color-glow': colorGlow,
                  background: isSelected
                    ? `linear-gradient(135deg, ${colorShadow}, ${colorGlow})`
                    : undefined,
                } as React.CSSProperties}
              >
                {/* Glow effect */}
                {isSelected && (
                  <div className="emotion-glow" />
                )}

                {/* Color indicator dot */}
                <div className="emotion-dot" />

                <span className="emotion-text">
                  {emotion}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="emotion-button-container"
        >
          <button
            onClick={handleContinue}
            disabled={selectedEmotions.length !== 2}
            className={`emotion-continue-button ${selectedEmotions.length === 2 ? 'active' : ''}`}
          >
            {/* Button glow effect */}
            {selectedEmotions.length === 2 && (
              <div className="emotion-button-glow" />
            )}

            <span className="emotion-button-content">
              <span>다음으로</span>
              {selectedEmotions.length === 2 && (
                <span className="emotion-button-arrow">
                  →
                </span>
              )}
            </span>
          </button>
        </motion.div>

        {/* Helper text */}
        {selectedEmotions.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="emotion-helper-text"
          >
            <p>하나 더 선택해주세요 💫</p>
          </motion.div>
        )}

        {selectedEmotions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="emotion-selected-text"
          >
            <p>
              선택한 감정: {selectedEmotions.join(", ")}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}