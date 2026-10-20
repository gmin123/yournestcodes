import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { SITUATIONS as SITUATION_MASTER, ASK_SITUATION_MENTS } from "../data/emotionMaster";

interface SituationSelectorProps {
  onComplete: (situations: string[]) => void;
}

// 화면 표시명은 Master Data(SITUATIONS)의 name을 원본 그대로 사용
const SITUATIONS = SITUATION_MASTER.map((s) => s.name);

// 🔥 상황 선택 시 랜덤 멘트 (MS1~MS5, 원본 문구 그대로 - 임의 수정 금지)
const SITUATION_MESSAGES = ASK_SITUATION_MENTS.map((m) => m.text);

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const ACCENT = "#ff6b9d";
const EASE = [0.4, 0, 0.2, 1] as const;

export function SituationSelector({ onComplete }: SituationSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [randomMessage, setRandomMessage] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SITUATION_MESSAGES.length);
    setRandomMessage(SITUATION_MESSAGES[randomIndex]);
  }, []);

  const handleContinue = () => {
    if (selected) onComplete([selected]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5rem 1.5rem 3rem",
        background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(255,107,157,0.10), transparent 60%), #000000",
        fontFamily: APPLE_FONT,
        color: "#ffffff",
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: 680 }}>
        {/* Header */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ textAlign: "center", marginBottom: "2.75rem" }}
        >
          <p
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            감정 분석 · 1 / 2
          </p>

        

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.56)",
              maxWidth: 440,
              margin: "0 auto",
              whiteSpace: "pre-line",
            }}
          >
            {randomMessage}
          </p>

          <p
            style={{
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.34)",
              marginTop: "0.6rem",
            }}
          >
            하나만 선택할 수 있어요
          </p>
        </motion.div>

        {/* Situation Grid - 버튼(칩) 형태로 선택 */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.6rem",
            marginBottom: "2.25rem",
          }}
        >
          {SITUATIONS.map((situation, index) => {
            const isSelected = selected === situation;
            return (
              <motion.button
                key={situation}
                type="button"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.4 + index * 0.03,
                  type: "spring",
                  stiffness: 220,
                }}
                whileHover={
                  isSelected
                    ? { y: -3, scale: 1.02 }
                    : {
                        y: -3,
                        scale: 1.02,
                        boxShadow: "0 10px 26px rgba(255,107,157,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                      }
                }
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelected((prev) => (prev === situation ? null : situation))}
                aria-pressed={isSelected}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "14px",
                  fontFamily: APPLE_FONT,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: isSelected ? "#ffffff" : "rgba(255,255,255,0.88)",
                  background: isSelected ? ACCENT : "rgba(255,255,255,0.07)",
                  border: isSelected ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isSelected ? "0 8px 22px rgba(255,107,157,0.35)" : "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                }}
              >
                {situation}
                {isSelected && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: "0.4rem",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.25)",
                    }}
                  >
                    <Check size={11} strokeWidth={3} color="#ffffff" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
          style={{ display: "flex", justifyContent: "center" }}
        >
          <motion.button
            type="button"
            onClick={handleContinue}
            disabled={!selected}
            whileHover={selected ? { scale: 1.015 } : {}}
            whileTap={selected ? { scale: 0.98 } : {}}
            transition={{ duration: 0.15, ease: EASE }}
            style={{
              width: "100%",
              maxWidth: 300,
              padding: "0.95rem",
              borderRadius: "980px",
              border: "none",
              fontFamily: APPLE_FONT,
              fontSize: "1.02rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: selected ? "#ffffff" : "rgba(255,255,255,0.32)",
              background: selected ? ACCENT : "rgba(255,255,255,0.08)",
              cursor: selected ? "pointer" : "not-allowed",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            다음으로
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
