# 🎨 감정으로 만나는 예술의 순간

AI 기반 감정 분석을 통해 사용자에게 맞춤 예술 작품을 추천하는 인터랙티브 웹 애플리케이션입니다.

## ✨ 주요 기능

### 📍 **위치 기반 컨텍스트 분석**
- GPS 또는 IP 기반 실시간 위치 감지
- 현재 날씨 정보 연동 (WeatherAPI.com)
- 시간대별 맞춤 환영 메시지

### 🧠 **5단계 심리학 기반 감정 설문**
1. **에너지 레벨**: 활기찬 / 차분한 / 지친
2. **현재 기분**: 행복한 / 슬픈 / 불안한 / 평온한
3. **사회적 욕구**: 사교적 / 혼자 있고 싶은 / 친밀감 원하는
4. **미적 취향**: 생동감 있는 / 차분한 / 추상적 / 사실적
5. **시간 감각**: 과거 / 현재 / 미래

### 🎭 **스마트 작품 추천 시스템**
- **Firestore 기반 실시간 데이터**: 3000+ 명화 데이터베이스
- **감정 태그 매칭 알고리즘**: 영어-한국어 자동 번역 (50+ 감정 단어)
- **중복 방지 및 다양성 보장**: 매번 다른 추천 제공
- **3개 카테고리 추천**: 전시회 / 명화 / 아틀리에 투어

## 🎨 디자인 시스템

### **다크 테마 + 네온 효과**
- **컬러 팔레트**:
  - 핑크 (#ff6b9d)
  - 퍼플 (#c96dfd)
  - 옐로우 (#fec260)
- **유기적 디자인**: 물감이 섞이는 듯한 그라디언트
- **애니메이션**: Framer Motion 기반 인터랙티브 요소
- **순수 CSS**: Tailwind 없이 300+ 유틸리티 클래스

## 🚀 설치 및 실행

### 1. **프로젝트 클론**
```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. **의존성 설치**
```bash
npm install
```

### 3. **환경 변수 설정** (선택사항)
`.env` 파일 생성:
```env
# WeatherAPI.com API Key (이미 코드에 포함되어 있음)
VITE_WEATHER_API_KEY=99da4188aaf34c43a81183135251911

# Firebase Config (이미 코드에 포함되어 있음)
VITE_FIREBASE_API_KEY=AIzaSyDQgm4ey4FKH2ieB7LmLxoWwAdA3jLg-sc
```

### 4. **개발 서버 시작**
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 5. **프로덕션 빌드**
```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## 📁 프로젝트 구조

```
├── /components              # React 컴포넌트
│   ├── WelcomeScreen.tsx   # 웰컴 화면 (위치/날씨/시간)
│   ├── SituationSelection.tsx  # 상황 선택
│   ├── EmotionSurvey.tsx   # 5단계 감정 설문
│   ├── ResultsAnalysis.tsx # 감정 분석 결과
│   └── Recommendations.tsx # 작품 추천 (Firestore 연동)
│
├── /utils                   # 유틸리티 함수
│   ├── location.ts         # GPS/IP 위치 감지 + 날씨 API
│   ├── contextMessages.ts  # 날씨별 환영 메시지
│   └── artworkRecommendation.ts  # Firestore 추천 알고리즘
│
├── /styles                  # 스타일시트
│   └── globals.css         # 300+ 유틸리티 클래스 정의
│
├── firebase.ts              # Firebase/Firestore 설정
├── App.tsx                  # 메인 앱 컴포넌트
└── README.md                # 이 파일
```

## 🔥 Firebase 설정

### **Firestore 데이터 구조**

#### **Collection: `data`** ✅ (올바른 컬렉션명)
```typescript
{
  title: string;           // 작품 제목
  description: string;     // 작품 설명
  emotion_tag_1: string;   // 감정 태그 1 (한국어)
  emotion_tag_2: string;   // 감정 태그 2 (한국어)
  image_url: string;       // 작품 이미지 URL
  index: number;           // 고유 인덱스
  reason: string;          // 추천 이유
}
```

#### **데이터 예시**
```json
{
  "title": "Entree de l'atelier Rousseau et la Maison de Millet",
  "description": "Gift of Leonard C. Hanna Jr.",
  "emotion_tag_1": "외로움",
  "emotion_tag_2": "향수",
  "image_url": "https://openaccess-cdn.clevelandart.org/1921.1379/1921.1379_web.jpg",
  "index": 3014,
  "reason": "고요한 시골 골목과 빈 집 풍경이 쓸쓸하고 오래된 기억을 떠올리게 함."
}
```

#### **✅ 현재 코드 상태**
```typescript
// /utils/artworkRecommendation.ts (62번째 줄)
const dataCollection = collection(db, 'data');  // ✅ 올바른 컬렉션명 사용 중!

// /firebase.ts
export const dataCollection = collection(db, 'data');  // ✅ 'data' 컬렉션 참조
```

**→ 이미 올바르게 설정되어 있습니다!** 🎉

### **Firebase 프로젝트 설정**
1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Firestore Database 활성화
3. `data` 컬렉션에 작품 데이터 업로드
4. `/firebase.ts`의 Firebase Config 업데이트 (이미 설정되어 있음)

## 🌍 API 연동

### **1. WeatherAPI.com**
- **용도**: 실시간 날씨 정보
- **API Key**: `99da4188aaf34c43a81183135251911` (이미 포함)
- **무료 플랜**: 일일 1,000,000 요청

### **2. Nominatim (OpenStreetMap)**
- **용도**: GPS 좌표 → 도시명 변환 (Reverse Geocoding)
- **API Key**: 불필요 (무료)
- **제한**: 초당 1 요청

### **3. ipapi.co**
- **용도**: IP 기반 위치 감지 (GPS 실패 시 백업)
- **API Key**: 불필요 (무료)
- **무료 플랜**: 일일 1,000 요청

## 🎯 추천 알고리즘

### **1. 감정 태그 변환**
```typescript
사용자 입력: ["energetic", "happy", "social"]
      ↓
한국어 변환: ["활기찬", "역동적", "행복한", "기쁜", "사교적", "외향적"]
```

### **2. 유사도 점수 계산**
```typescript
Firestore 작품: { emotion_tag_1: "활기찬", emotion_tag_2: "즐거운" }
      ↓
점수 계산:
  - "활기찬" 정확 일치 → +10점
  - "즐거운" 부분 일치 → +5점
  - 총점: 15점
```

### **3. 추천 우선순위**
```
1. 점수 높은 작품 (매칭된 감정 태그)
2. 랜덤 셔플 (다양성 보장)
3. 중복 제거 (index 기반)
4. 최대 3개 추천
```

## 🎨 스타일 가이드

### **CSS 유틸리티 클래스**
프로젝트는 Tailwind 없이 순수 CSS로 구현되었습니다. `/styles/globals.css`에 300+ 클래스 정의:

```css
/* 레이아웃 */
.flex, .flex-col, .flex-row
.grid, .grid-cols-1, .md:grid-cols-2

/* 간격 */
.gap-2, .gap-4, .gap-6
.p-4, .px-6, .py-4
.mb-4, .mt-6

/* 크기 */
.w-full, .w-16, .h-96
.max-w-5xl, .min-h-screen

/* 색상 */
.text-pink-400, .text-purple-400
.bg-pink-500/20, .bg-gradient-to-br

/* 효과 */
.glass-effect, .neon-border
.text-glow, .paint-blend

/* 애니메이션 */
.animate-pulse, .animate-spin
.transition-all, .hover:scale-105
```

### **반응형 디자인**
```css
/* Mobile First */
.gap-4         /* 기본 */
.md:gap-6      /* ≥768px */
.lg:gap-8      /* ≥1024px */
```

## 📱 브라우저 지원

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🔧 트러블슈팅

### **문제: 위치가 영어로 표시됨**
**해결**: `/utils/location.ts`의 번역 맵에 도시명 추가
```typescript
const CITY_TRANSLATION: Record<string, string> = {
  'YourCity': '당신의도시',  // 추가
  // ...
};
```

### **문제: Firestore에서 데이터 안 가져와짐**
**해결**:
1. Firebase Console에서 Firestore 규칙 확인
```javascript
allow read, write: if true;  // 개발용 (보안 주의!)
```
2. 콘솔에서 에러 확인: `F12 → Console`

### **문제: framer-motion 에러**
**해결**: 의존성 재설치
```bash
npm install framer-motion
```

## 📊 성능 최적화

- ✅ **Code Splitting**: React.lazy 사용
- ✅ **Image Optimization**: ImageWithFallback 컴포넌트
- ✅ **CSS Minification**: 프로덕션 빌드 시 자동
- ✅ **Firestore 캐싱**: 5분간 위치 정보 캐시

## 🌟 주요 기술 스택

- **Frontend**: React 18 + TypeScript
- **Styling**: Pure CSS (300+ utility classes)
- **Animation**: Framer Motion
- **Database**: Firebase Firestore
- **APIs**: WeatherAPI, Nominatim, ipapi
- **Build**: Vite
- **Icons**: Lucide React

## 📝 라이선스

MIT License - 자유롭게 사용하세요!

## 👨‍💻 개발자

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 등록해주세요!

---

**🎉 다운로드 후 바로 실행 가능합니다!**

```bash
npm install && npm run dev
```

**즐거운 개발 되세요! ✨**