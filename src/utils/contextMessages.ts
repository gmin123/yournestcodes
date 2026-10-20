// ============================================
// 📝 상황별 환영 멘트 시스템
// ============================================

export interface ContextMessage {
  id: string;
  condition: string;
  message: string;
  priority: number; // 1=최우선(가중치), 2=날씨, 3=요일, 4=시간대
}

// 모든 조건부 메시지
const contextMessages: ContextMessage[] = [
  // ===== 날씨 조건 (Priority: 2) =====
  {
    id: 'BC-1',
    condition: '날씨: 맑음',
    message: '창밖으로 햇살이 들어오네요.\n오늘은 당신의 마음도 그만큼 환한가요?',
    priority: 2
  },
  {
    id: 'BC-2',
    condition: '날씨: 비',
    message: '빗소리가 들려오는 날이에요.\n지금 이 소리, 어떤 기분으로 듣고 계신가요?',
    priority: 2
  },
  {
    id: 'BC-3',
    condition: '날씨: 눈',
    message: '세상이 조용히 하얗게 물들어가고 있어요.\n이 고요함 속에서, 지금 어떤 마음이 드시나요?',
    priority: 2
  },
  {
    id: 'BC-4',
    condition: '날씨: 흐림',
    message: '하늘이 무겁게 내려앉은 날이에요.\n지금 당신의 기분은 어떤가요?',
    priority: 2
  },

  // ===== 요일 조건 (Priority: 3) =====
  {
    id: 'BC-5',
    condition: '요일: 월요일',
    message: '새로운 한 주가 시작됐어요.\n오늘, 어떤 마음으로 시작하고 싶으신가요?',
    priority: 3
  },
  {
    id: 'BC-6',
    condition: '요일: 수요일',
    message: '한 주의 한가운데에 서 있어요.\n여기까지 오면서, 지금 어떤 기분이 드시나요?',
    priority: 3
  },
  {
    id: 'BC-7',
    condition: '요일: 금요일',
    message: '일주일이 참 길었죠.\n지금, 어떤 마음으로 이 한 주를 마무리하고 싶으신가요?',
    priority: 3
  },
  {
    id: 'BC-8',
    condition: '요일: 일요일',
    message: '주말이 저물어가고 있어요.\n내일을 앞둔 지금, 마음은 어떠신가요?',
    priority: 3
  },

  // ===== 시간대 조건 (Priority: 4) =====
  {
    id: 'BC-9',
    condition: '시간대: 새벽',
    message: '아직 세상이 잠들어 있는 시간이에요.\n홀로 깨어있는 지금, 어떤 생각이 스치나요?',
    priority: 4
  },
  {
    id: 'BC-10',
    condition: '시간대: 오전',
    message: '하루가 움직이기 시작했어요.\n잠깐 멈춘 지금, 기분은 어떠신가요?',
    priority: 4
  },
  {
    id: 'BC-11',
    condition: '시간대: 오후',
    message: '오후의 나른함이 찾아왔어요.\n지금 당신에게 필요한 건 무엇인가요?',
    priority: 4
  },
  {
    id: 'BC-12',
    condition: '시간대: 저녁',
    message: '하루를 보내느라 수고했어요.\n오늘 하루, 마음에 남는 감정은 무엇인가요?',
    priority: 4
  },

  // ===== 가중치 조건 (Priority: 1 - 최우선) =====
  {
    id: 'BC-13',
    condition: '가중치: 월 10-14시',
    message: '한 주가 시작되었지만, 서두를 필요는 없어요.\n지금 이 순간, 당신의 마음은 어디쯤 있나요?',
    priority: 1
  },
  {
    id: 'BC-14',
    condition: '가중치: 화 11-14시',
    message: '오늘도 어제처럼 흘러가는 것 같지만,\n지금 당신 마음은 어떻게 달라지고 있나요?',
    priority: 1
  },
  {
    id: 'BC-15',
    condition: '가중치: 매일 21-24시',
    message: '하루를 마무리하는 시간이에요.\n지금 이 순간, 당신에게 필요한 감정은 무엇인가요?',
    priority: 1
  }
];

// ============================================
// 🌤️ 날씨 코드 변환
// ============================================
const getWeatherCondition = (weatherCode: number): string => {
  // Clear
  if (weatherCode === 1000) return '맑음';
  
  // Rain
  if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(weatherCode)) {
    return '비';
  }
  
  // Snow
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(weatherCode)) {
    return '눈';
  }
  
  // Cloudy/Overcast
  if ([1003, 1006, 1009, 1030, 1135, 1147].includes(weatherCode)) {
    return '흐림';
  }
  
  // Default
  return '흐림';
};

// ============================================
// 📅 요일 가져오기
// ============================================
const getDayOfWeek = (date: Date): string => {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[date.getDay()];
};

// ============================================
// 🕐 시간대 가져오기
// ============================================
// 원본 기준: 새벽 04:00~06:59, 오전 07:00~11:59, 오후 12:00~17:59, 저녁 18:00~다음날 03:59
const getTimeOfDay = (hour: number): string => {
  if (hour >= 4 && hour < 7) return '새벽';
  if (hour >= 7 && hour < 12) return '오전';
  if (hour >= 12 && hour < 18) return '오후';
  return '저녁'; // 18:00~23:59, 00:00~03:59
};

// ============================================
// ⚖️ 가중치 조건 체크
// ============================================
const checkWeightedCondition = (date: Date): ContextMessage | null => {
  const day = date.getDay(); // 0=일요일, 1=월요일, ...
  const hour = date.getHours();

  // BC-13: 월요일 10-14시
  if (day === 1 && hour >= 10 && hour < 14) {
    return contextMessages.find(m => m.id === 'BC-13') || null;
  }

  // BC-14: 화요일 11-14시
  if (day === 2 && hour >= 11 && hour < 14) {
    return contextMessages.find(m => m.id === 'BC-14') || null;
  }

  // BC-15: 매일 21-24시
  if (hour >= 21 && hour < 24) {
    return contextMessages.find(m => m.id === 'BC-15') || null;
  }

  return null;
};

// ============================================
// 🎯 메시지 선택 메인 함수
// ============================================
export const getContextMessage = (weatherCode?: number): ContextMessage => {
  const now = new Date();
  
  // 1순위: 가중치 조건 체크
  const weightedMessage = checkWeightedCondition(now);
  if (weightedMessage) {
    console.log('✅ 가중치 조건 메시지:', weightedMessage.id);
    return weightedMessage;
  }

  // 2순위: 날씨 조건
  if (weatherCode !== undefined) {
    const weather = getWeatherCondition(weatherCode);
    const weatherMessage = contextMessages.find(
      m => m.priority === 2 && m.condition.includes(weather)
    );
    if (weatherMessage) {
      console.log('✅ 날씨 조건 메시지:', weatherMessage.id, weather);
      return weatherMessage;
    }
  }

  // 3순위: 요일 조건
  const dayOfWeek = getDayOfWeek(now);
  const dayMessage = contextMessages.find(
    m => m.priority === 3 && m.condition.includes(dayOfWeek)
  );
  if (dayMessage) {
    console.log('✅ 요일 조건 메시지:', dayMessage.id, dayOfWeek);
    return dayMessage;
  }

  // 4순위: 시간대 조건
  const timeOfDay = getTimeOfDay(now.getHours());
  const timeMessage = contextMessages.find(
    m => m.priority === 4 && m.condition.includes(timeOfDay)
  );
  if (timeMessage) {
    console.log('✅ 시간대 조건 메시지:', timeMessage.id, timeOfDay);
    return timeMessage;
  }

  // 기본 메시지 (BC-10: 오전)
  console.log('⚠️ 기본 메시지 사용');
  return contextMessages.find(m => m.id === 'BC-10')!;
};

// ============================================
// 📊 디버깅용: 현재 상황 출력
// ============================================
export const getCurrentContext = (weatherCode?: number) => {
  const now = new Date();
  const weather = weatherCode ? getWeatherCondition(weatherCode) : 'N/A';
  const dayOfWeek = getDayOfWeek(now);
  const timeOfDay = getTimeOfDay(now.getHours());
  const hour = now.getHours();

  console.log('🌍 현재 상황:');
  console.log('  - 날씨:', weather, `(코드: ${weatherCode})`);
  console.log('  - 요일:', dayOfWeek);
  console.log('  - 시간대:', timeOfDay, `(${hour}시)`);
  
  const weighted = checkWeightedCondition(now);
  if (weighted) {
    console.log('  - 가중치 조건 적용:', weighted.id);
  }

  return { weather, dayOfWeek, timeOfDay, hour, weighted };
};

export default contextMessages;
