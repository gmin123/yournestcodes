import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Question {
  id: string;
  text: string;
  emoji: string;
  options: {
    text: string;
    emoji: string;
    tags: string[];
    value: number;
    color: string;
  }[];
}

// 🔥 감정 설문 시작 시 랜덤 멘트
const EMOTION_SURVEY_MESSAGES = [
  "그 상황 속에서 느껴지는 감정은 여러 가지일 거예요.\n가장 솔직하게 느껴지는 2가지를 골라주세요.",
  "그 상황에서 당신이 느끼는 감정을 찾아볼게요.\n마음에 가장 가까운 2가지를 선택해주세요.",
  "당신이 선택한 상황 안에는 여러 감정이 함께 있을 거예요.\n그중 가장 강하게 느껴지는 2가지를 알려주세요.",
  "좋아요, 이제 그 안에서 느껴지는 감정을 찾아볼게요.\n지금 당신 마음을 가장 솔직하게 담은 2가지를 골라주세요.",
  "이제 당신 안에 있는 감정을 우리 함께 봐요.\n느껴지는 대로, 2가지를 선택해 주세요.",
];

const questions: Question[] = [
  {
    id: "energy",
    text: "지금 당신의 에너지는?",
    emoji: "⚡",
    options: [
      { text: "불타오르는 에너지!", emoji: "🔥", tags: ["energetic", "dynamic"], value: 4, color: "#ff6b9d" },
      { text: "안정적인 흐름", emoji: "🌊", tags: ["calm", "peaceful"], value: 3, color: "#c96dfd" },
      { text: "고요한 평온", emoji: "🍃", tags: ["quiet", "serene"], value: 2, color: "#6dd5ed" },
      { text: "휴식이 필요해", emoji: "😴", tags: ["tired", "melancholic"], value: 1, color: "#2193b0" },
    ],
  },
  {
    id: "mood",
    text: "마음의 색깔은?",
    emoji: "🎨",
    options: [
      { text: "화사한 핑크!", emoji: "💖", tags: ["joyful", "happy"], value: 4, color: "#ff6b9d" },
      { text: "따뜻한 오렌지", emoji: "🧡", tags: ["content", "peaceful"], value: 3, color: "#fec260" },
      { text: "차분한 블루", emoji: "💙", tags: ["thoughtful", "contemplative"], value: 2, color: "#6dd5ed" },
      { text: "깊은 인디고", emoji: "💜", tags: ["sad", "melancholic"], value: 1, color: "#c96dfd" },
    ],
  },
  {
    id: "social",
    text: "지금 누구와 함께?",
    emoji: "👥",
    options: [
      { text: "모두와 파티!", emoji: "🎉", tags: ["social", "communal"], value: 4, color: "#ff6b9d" },
      { text: "소중한 사람과", emoji: "💑", tags: ["intimate", "warm"], value: 3, color: "#fec260" },
      { text: "나만의 시간", emoji: "🧘", tags: ["solitary", "introspective"], value: 2, color: "#c96dfd" },
      { text: "혼자가 편해", emoji: "🌙", tags: ["isolated", "lonely"], value: 1, color: "#2193b0" },
    ],
  },
  {
    id: "aesthetic",
    text: "끌리는 분위기는?",
    emoji: "✨",
    options: [
      { text: "눈부신 네온!", emoji: "🌈", tags: ["vibrant", "colorful"], value: 4, color: "#ff6b9d" },
      { text: "따스한 석양", emoji: "🌅", tags: ["warm", "soft"], value: 3, color: "#fec260" },
      { text: "미니멀 화이트", emoji: "⚪", tags: ["neutral", "minimalist"], value: 2, color: "#6dd5ed" },
      { text: "미드나잇 블랙", emoji: "⚫", tags: ["dark", "dramatic"], value: 1, color: "#1a0e2e" },
    ],
  },
  {
    id: "time",
    text: "시간의 감각은?",
    emoji: "⏰",
    options: [
      { text: "미래를 향해!", emoji: "🚀", tags: ["hopeful", "forward"], value: 4, color: "#ff6b9d" },
      { text: "지금 이 순간", emoji: "🎯", tags: ["present", "mindful"], value: 3, color: "#fec260" },
      { text: "추억 속으로", emoji: "📸", tags: ["nostalgic", "reflective"], value: 2, color: "#c96dfd" },
      { text: "시간 밖에서", emoji: "🌌", tags: ["timeless", "suspended"], value: 1, color: "#2193b0" },
    ],
  },
];

interface EmotionSurveyProps {
  onComplete: (tags: string[]) => void;
}

export function EmotionSurvey({ onComplete }: EmotionSurveyProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { tags: string[]; value: number }>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [randomMessage, setRandomMessage] = useState("");

  // 🔥 컴포넌트 마운트 시 랜덤 메시지 선택
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * EMOTION_SURVEY_MESSAGES.length);
    setRandomMessage(EMOTION_SURVEY_MESSAGES[randomIndex]);
    console.log('💖 감정 설문 메시지:', EMOTION_SURVEY_MESSAGES[randomIndex]);
  }, []);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    const option = question.options[optionIndex];
    setAnswers({
      ...answers,
      [question.id]: { tags: option.tags, value: option.value },
    });

    // Create explosion effect particles
    const particles = document.createElement('div');
    particles.style.position = 'fixed';
    particles.style.inset = '0';
    particles.style.pointerEvents = 'none';
    particles.style.zIndex = '9999';
    document.body.appendChild(particles);

    setTimeout(() => {
      particles.remove();
    }, 2000);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else {
      const allTags = Object.values(answers).flatMap((a) => a.tags);
      onComplete(allTags);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedOption(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center gradient-bg p-6 relative overflow-hidden"
    >
      {/* Paint blend layer */}
      <div className="absolute inset-0 paint-blend pointer-events-none" />

      {/* Animated color particles based on selection */}
      {selectedOption !== null && (
        <>
          {/* Paint splash effect */}
          {[...Array(30)].map((_, i) => {
            const angle = (Math.random() * Math.PI * 2);
            const distance = 100 + Math.random() * 400;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${20 + Math.random() * 60}px`,
                  height: `${20 + Math.random() * 60}px`,
                  background: `radial-gradient(circle, ${question.options[selectedOption].color}, transparent)`,
                  filter: `blur(${20 + Math.random() * 40}px)`,
                  mixBlendMode: 'screen',
                }}
                initial={{ 
                  x: window.innerWidth / 2, 
                  y: window.innerHeight / 2,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  x: window.innerWidth / 2 + Math.cos(angle) * distance,
                  y: window.innerHeight / 2 + Math.sin(angle) * distance,
                  opacity: [0, 0.8, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.02,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </>
      )}

      <div className="max-w-4xl w-full relative z-10 px-4 md:px-0">
        {/* 🔥 랜덤 환영 메시지 - 첫 질문일 때만 표시 */}
        {currentQuestion === 0 && randomMessage && (
          <motion.div
            className="max-w-2xl mx-auto glass-effect rounded-2xl p-6 mb-8 text-center"
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <p className="text-lg md:text-xl leading-relaxed whitespace-pre-line">
              {randomMessage}
            </p>
          </motion.div>
        )}

        {/* Progress Bar with fun animation */}
        <motion.div
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <motion.span 
              className="text-xs md:text-sm opacity-80 flex items-center gap-2"
              key={currentQuestion}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <span className="text-2xl md:text-4xl">{question.emoji}</span>
              <span className="hidden sm:inline">질문 {currentQuestion + 1} / {questions.length}</span>
              <span className="sm:hidden">{currentQuestion + 1}/{questions.length}</span>
            </motion.span>
            <motion.span 
              className="text-xl md:text-2xl font-bold"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              key={progress}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="h-2 md:h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(255, 255, 255, 0.1)" }}>
            <motion.div
              className="h-full relative"
              style={{
                background: "linear-gradient(90deg, #ff6b9d, #c96dfd, #fec260)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                }}
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
            transition={{ duration: 0.5 }}
            className="glass-effect rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 neon-border mb-6 md:mb-8"
          >
            {/* Color indicator */}
            <motion.div
              className="flex justify-center mb-6 md:mb-8 gap-2 md:gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {question.options.map((opt, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                  style={{ background: opt.color }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>

            <h2 className="mb-8 md:mb-12 text-center text-glow text-2xl md:text-3xl lg:text-4xl px-4 md:px-0">
              {question.text}
            </h2>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              {question.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleOptionSelect(index)}
                  onHoverStart={() => setHoveredOption(index)}
                  onHoverEnd={() => setHoveredOption(null)}
                  className="relative p-5 md:p-8 rounded-2xl md:rounded-3xl text-left transition-all overflow-hidden group"
                  style={{
                    background: selectedOption === index 
                      ? `linear-gradient(135deg, ${option.color}, ${option.color}dd)` 
                      : "rgba(255, 255, 255, 0.05)",
                    border: selectedOption === index 
                      ? `3px solid ${option.color}` 
                      : "3px solid rgba(255, 255, 255, 0.1)",
                    transform: selectedOption === index ? "scale(1.02)" : "scale(1)",
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Animated background blob */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl md:rounded-3xl"
                    style={{
                      background: `radial-gradient(circle at center, ${option.color}40, transparent)`,
                      opacity: hoveredOption === index || selectedOption === index ? 1 : 0,
                    }}
                    animate={hoveredOption === index ? {
                      scale: [1, 1.5, 1],
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-3 md:gap-4">
                    <motion.div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"
                      style={{ background: option.color }}
                      animate={selectedOption === index ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 360],
                      } : {}}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="text-base md:text-xl font-semibold flex-1">{option.text}</span>
                    
                    {/* Check mark */}
                    {selectedOption === index && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0"
                      >
                        <span className="text-lg md:text-2xl">✓</span>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          className="flex justify-between items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 rounded-full glass-effect disabled:opacity-30 text-sm md:text-base"
            whileHover={{ scale: currentQuestion === 0 ? 1 : 1.05, x: -5 }}
            whileTap={{ scale: currentQuestion === 0 ? 1 : 0.95 }}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            <span className="font-semibold hidden sm:inline">이전</span>
          </motion.button>

          <motion.button
            onClick={handleNext}
            disabled={selectedOption === null}
            className="relative flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-4 rounded-full disabled:opacity-30 overflow-hidden group text-sm md:text-base"
            style={{
              background: selectedOption !== null 
                ? "linear-gradient(135deg, #ff6b9d, #c96dfd)" 
                : "rgba(255, 255, 255, 0.1)",
            }}
            whileHover={{ scale: selectedOption === null ? 1 : 1.05, x: 5 }}
            whileTap={{ scale: selectedOption === null ? 1 : 0.95 }}
            animate={selectedOption !== null ? {
              boxShadow: [
                "0 0 20px rgba(255, 107, 157, 0.5)",
                "0 0 40px rgba(255, 107, 157, 0.8)",
                "0 0 20px rgba(255, 107, 157, 0.5)",
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="font-semibold md:text-lg relative z-10">
              {currentQuestion === questions.length - 1 ? "완료" : "다음"}
            </span>
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 relative z-10" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}