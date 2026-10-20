import { useState } from 'react';
import { motion } from 'framer-motion';
import { getTodayDateString } from '../utils/diaryService';

interface SaveDatePickerProps {
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

// 작품을 "담을 때" 어느 날짜의 기록에 저장할지 고르는 작은 팝오버.
// 기본값은 오늘이지만 캘린더의 다른 날짜로 바꿔서 저장할 수 있음.
export function SaveDatePicker({ onConfirm, onCancel }: SaveDatePickerProps) {
  const [date, setDate] = useState(getTodayDateString());

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={(e) => e.stopPropagation()}
      className="glass-effect"
      style={{
        borderRadius: '1rem',
        padding: '0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
    >
      <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>어느 날의 기록에 담을까요?</label>
      <input
        type="date"
        value={date}
        max={getTodayDateString()}
        onChange={(e) => setDate(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          fontSize: '0.85rem',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm(date);
          }}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem',
            background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
          }}
        >
          이 날짜에 저장
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: '#fff',
            fontSize: '0.8rem',
          }}
        >
          취소
        </button>
      </div>
    </motion.div>
  );
}
