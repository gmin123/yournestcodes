import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useReducedFx } from "../hooks/useReducedFx";

interface ResultAnalysisProps {
  tags: string[];
  onContinue: () => void;
}

interface AnswerParticle {
  id: number;
  color: string;
}

// 3초 동안 아래 3단계 문구가 순서대로 나오고, 끝나면 곧바로 결과(onContinue)로 넘어감. (모바일도 동일하게 3초)
const ANALYSIS_STEPS = [
  '당신의 감정을 시각적 언어로 번역하고 있습니다...',
  '당신의 내면과 가장 닮은 작가의 시선을 찾고 있습니다...',
  '당신과 공명할 단 하나의 작품을 발견했습니다.',
];
const TOTAL_DURATION_MS = 3000;
const STEP_DURATION_MS = TOTAL_DURATION_MS / ANALYSIS_STEPS.length;

export function ResultAnalysis({ tags: _tags, onContinue }: ResultAnalysisProps) {
  const [particles, setParticles] = useState<AnswerParticle[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const reducedFx = useReducedFx();

  useEffect(() => {
    const colors = ['#ff6b9d', '#c96dfd', '#fec260', '#6dd5ed', '#2193b0'];
    setParticles(colors.map((color, i) => ({ id: i, color })));

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, STEP_DURATION_MS);
    const timer = setTimeout(() => onContinue(), TOTAL_DURATION_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(stepTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 모바일/reduced-motion: 무거운 goo/blur 애니메이션 대신 가벼운 로딩 화면
  if (reducedFx) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg p-6 text-center">
        <div>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              border: '4px solid #ff6b9d',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <AnimatePresence mode="wait">
            <motion.h2
              key={stepIndex}
              className="text-glow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {ANALYSIS_STEPS[stepIndex]}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center gradient-bg p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 paint-blend pointer-events-none" />

      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(255, 107, 157, 0.3) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 70%, rgba(201, 109, 253, 0.3) 0%, transparent 50%)",
            "radial-gradient(circle at 40% 80%, rgba(254, 194, 96, 0.3) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 30%, rgba(255, 107, 157, 0.3) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{ mixBlendMode: 'screen', filter: 'blur(60px)' }}
      />

      {/* SVG filter for paint mixing effect */}
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Paint blobs that merge */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: 'url(#goo)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {particles.map((particle, index) => {
          const angle = (index / particles.length) * Math.PI * 2;
          return (
            <motion.div
              key={`paint-blob-${particle.id}`}
              className="absolute rounded-full"
              style={{ width: '100px', height: '100px', background: particle.color }}
              animate={{
                x: [
                  Math.cos(angle) * 200,
                  Math.cos(angle + Math.PI * 0.5) * 150,
                  Math.cos(angle + Math.PI) * 100,
                  Math.cos(angle + Math.PI * 1.5) * 50,
                  0,
                ],
                y: [
                  Math.sin(angle) * 200,
                  Math.sin(angle + Math.PI * 0.5) * 150,
                  Math.sin(angle + Math.PI) * 100,
                  Math.sin(angle + Math.PI * 1.5) * 50,
                  0,
                ],
                scale: [1, 1.3, 1.5, 1.2, 2],
              }}
              transition={{ duration: 6, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
            />
          );
        })}
      </motion.div>

      {/* Liquid ripple waves */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`ripple-${i}`}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: '50px',
            height: '50px',
            border: `8px solid ${particles[i % particles.length]?.color || '#ff6b9d'}`,
            x: '-25px',
            y: '-25px',
          }}
          animate={{ scale: [1, 12], opacity: [0.8, 0], borderWidth: ['8px', '2px'] }}
          transition={{ duration: 3, delay: i * 0.3, repeat: 1, ease: "easeOut" }}
        />
      ))}

      {/* Center text */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        <motion.div
          className="w-24 h-24 mx-auto mb-4 rounded-full relative"
          style={{
            background: "linear-gradient(135deg, #ff6b9d, #c96dfd, #fec260)",
            filter: 'url(#goo)',
          }}
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity },
          }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`inner-${i}`}
              className="absolute rounded-full"
              style={{ width: '30px', height: '30px', background: particles[i]?.color }}
              animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0] }}
              transition={{ duration: 3, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.h2
            key={stepIndex}
            className="text-glow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {ANALYSIS_STEPS[stepIndex]}
          </motion.h2>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
