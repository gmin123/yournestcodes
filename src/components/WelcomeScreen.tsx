import { motion } from "framer-motion";
import { MapPin, Cloud, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import type { LocationData } from "../utils/location";
import { getContextMessage } from "../utils/contextMessages";
import { useReducedFx } from "../hooks/useReducedFx";

interface WelcomeScreenProps {
  onStart: () => void;
  locationData: LocationData | null; // 위치·날씨를 불러오는 중이면 null - 스플래시 없이 화면을 먼저 띄우고 받아지는 대로 채움
}

const LOADING_TEXT = '불러오는 중…';

export function WelcomeScreen({ onStart, locationData }: WelcomeScreenProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [contextMessage, setContextMessage] = useState("");
  const reducedFx = useReducedFx();

  const weatherCode = locationData?.weatherCode;
  useEffect(() => {
    if (weatherCode === undefined) return;
    // 날씨 코드를 기반으로 상황별 메시지 가져오기
    const message = getContextMessage(weatherCode);
    setContextMessage(message.message);
    console.log('📝 환영 메시지:', message.id, message.condition);
  }, [weatherCode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex items-center justify-center gradient-bg p-4 pb-8 pt-16 md:p-8 md:pt-8 relative overflow-hidden"
    >
      {/* Paint blend background layer */}
      <div className="absolute inset-0 paint-blend pointer-events-none opacity-50" />

      {/* Animated floating orbs - 모바일/reduced-motion 에서는 생략 */}
      {!reducedFx && [...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${150 + Math.random() * 100}px`,
            height: `${150 + Math.random() * 100}px`,
            background: i % 3 === 0 
              ? "radial-gradient(circle, rgba(255, 107, 157, 0.3) 0%, rgba(255, 107, 157, 0) 70%)" 
              : i % 3 === 1 
              ? "radial-gradient(circle, rgba(201, 109, 253, 0.3) 0%, rgba(201, 109, 253, 0) 70%)" 
              : "radial-gradient(circle, rgba(254, 194, 96, 0.3) 0%, rgba(254, 194, 96, 0) 70%)",
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            filter: 'blur(80px)',
            mixBlendMode: 'screen',
          }}
          animate={{
            x: [0, Math.random() * 50 - 25, 0],
            y: [0, Math.random() * 50 - 25, 0],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="w-full max-w-5xl mx-auto relative z-10 flex flex-col min-h-[calc(100vh-2rem)]">
        {/* Title with animated gradient */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.h1
            className="mb-6 text-glow"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 2.625rem)",
              background: "linear-gradient(135deg, #ff6b9d 0%, #c96dfd 50%, #fec260 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
        당신의 감정이
            <br />
            예술이 되는 순간
          </motion.h1>

          {/* 🔥 상황별 환영 메시지 */}
          <motion.div
            className="max-w-xl mx-auto mb-8 glass-effect rounded-2xl p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p
              className="leading-relaxed whitespace-pre-line text-center"
              style={{ fontSize: "clamp(1.35rem, 2.5vw, 1.5rem)" }}
            >
              {contextMessage}
            </p>
          </motion.div>

          <motion.p
            className="text-base md:text-lg opacity-70 max-w-2xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
    
          </motion.p>
        </motion.div>

        {/* Location & Weather Info */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-4 mb-12 max-w-4xl mx-auto"
        >
          <motion.div
            className="glass-effect rounded-2xl p-6 relative overflow-hidden group cursor-pointer flex-1 min-w-[240px] max-w-[300px]"
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative z-10 text-center">
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto"
                style={{ background: "linear-gradient(135deg, #ff6b9d, #ff8fab)" }}
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                <MapPin className="w-7 h-7 text-white" />
              </motion.div>
              <p className="opacity-60 text-sm mb-1">현재 위치</p>
              <p className="text-xl">{locationData ? locationData.city : LOADING_TEXT}</p>
            </div>
          </motion.div>

          <motion.div
            className="glass-effect rounded-2xl p-6 relative overflow-hidden group cursor-pointer flex-1 min-w-[240px] max-w-[300px]"
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative z-10 text-center">
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto"
                style={{ background: "linear-gradient(135deg, #c96dfd, #db8cff)" }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                <Cloud className="w-7 h-7 text-white" />
              </motion.div>
              <p className="opacity-60 text-sm mb-1">날씨 정보</p>
              <p className="text-xl">{locationData ? `${locationData.weather} ${locationData.temperature}°C` : LOADING_TEXT}</p>
            </div>
          </motion.div>

          <motion.div
            className="glass-effect rounded-2xl p-6 relative overflow-hidden group cursor-pointer flex-1 min-w-[240px] max-w-[300px]"
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative z-10 text-center">
              <motion.div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto"
                style={{ background: "linear-gradient(135deg, #fec260, #ffd480)" }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Clock className="w-7 h-7 text-white" />
              </motion.div>
              <p className="opacity-60 text-sm mb-1">시간대</p>
              <p className="text-xl">{locationData ? locationData.time : LOADING_TEXT}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Start Button */}
        <motion.div
          className="mt-auto pt-8 text-center flex flex-col md:flex-row gap-4 justify-center items-center w-full max-w-sm mx-auto"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <motion.button
            onClick={onStart}
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            className="relative w-full px-10 py-5 rounded-full text-white text-lg uppercase tracking-wider overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #ff6b9d, #c96dfd)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #c96dfd, #ff6b9d)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: isHovering ? "0%" : "-100%" }}
              transition={{ duration: 0.3 }}
            />

            <span className="relative z-10">
              감정 분석 시작하기
            </span>
          </motion.button>
        </motion.div>

        <motion.p
          className="mt-6 text-sm opacity-60 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.8 }}
        >
          2개의 질문
        </motion.p>
      </div>
    </motion.div>
  );
}