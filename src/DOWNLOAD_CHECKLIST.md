# ✅ 다운로드 후 체크리스트

프로젝트를 다운로드 받은 후 아래 체크리스트를 확인하세요!

## 📦 1단계: 파일 확인

### ✅ 필수 파일
- [ ] `/package.json` - 의존성 정의
- [ ] `/vite.config.ts` - Vite 설정
- [ ] `/tsconfig.json` - TypeScript 설정
- [ ] `/index.html` - HTML 엔트리 포인트
- [ ] `/main.tsx` - React 엔트리 포인트
- [ ] `/App.tsx` - 메인 앱 컴포넌트

### ✅ 스타일 파일
- [ ] `/styles/globals.css` - 300+ 유틸리티 클래스

### ✅ 컴포넌트
- [ ] `/components/WelcomeScreen.tsx`
- [ ] `/components/SituationSelector.tsx`
- [ ] `/components/EmotionSurvey.tsx`
- [ ] `/components/ResultAnalysis.tsx`
- [ ] `/components/Recommendations.tsx`

### ✅ 유틸리티
- [ ] `/utils/location.ts` - GPS/날씨 API
- [ ] `/utils/contextMessages.ts` - 환영 메시지
- [ ] `/utils/artworkRecommendation.ts` - Firestore 추천

### ✅ Firebase
- [ ] `/firebase.ts` - Firebase 설정

### ✅ 문서
- [ ] `/README.md` - 전체 프로젝트 문서
- [ ] `/SETUP.md` - 빠른 설치 가이드
- [ ] `/DOWNLOAD_CHECKLIST.md` - 이 파일

---

## 🚀 2단계: 설치 및 실행

### 1️⃣ 의존성 설치
```bash
npm install
```

**예상 설치 시간**: 1-3분

**확인 사항**:
- [ ] 에러 없이 설치 완료
- [ ] `node_modules/` 폴더 생성됨
- [ ] `package-lock.json` 생성됨

### 2️⃣ 개발 서버 시작
```bash
npm run dev
```

**예상 결과**:
```
VITE v5.3.1  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
➜  press h to show help
```

**확인 사항**:
- [ ] 서버가 성공적으로 시작됨
- [ ] 브라우저가 자동으로 열림
- [ ] 콘솔에 에러 없음

---

## 🎨 3단계: 스타일 확인

### ✅ 화면 표시 확인
브라우저에서 다음 항목들이 올바르게 표시되는지 확인:

#### WelcomeScreen
- [ ] 네온 효과가 있는 타이틀
- [ ] 물감이 섞이는 듯한 배경
- [ ] 위치/날씨/시간 정보 카드 (가로 3개)
- [ ] 유리같은 글래스 효과
- [ ] 핑크/퍼플/옐로우 색상

#### SituationSelector
- [ ] 6개의 상황 카드
- [ ] 호버 시 확대 애니메이션
- [ ] 선택 시 네온 테두리

#### EmotionSurvey
- [ ] 5단계 설문 (프로그레스 바)
- [ ] 감정 선택 버튼들
- [ ] 애니메이션 전환

#### ResultAnalysis
- [ ] 원형 프로그레스 애니메이션
- [ ] 감정 태그 표시
- [ ] 로딩 효과

#### Recommendations
- [ ] 3개 카테고리 (전시회/명화/아틀리에)
- [ ] 작품 카드 (이미지 + 정보)
- [ ] 스크롤 애니메이션

---

## 🔧 4단계: 기능 테스트

### ✅ 위치 권한
- [ ] 브라우저에서 위치 권한 요청됨
- [ ] "허용" 클릭 시 GPS 위치 표시
- [ ] "거부" 클릭 시 IP 기반 위치로 전환

### ✅ 날씨 API
- [ ] 현재 날씨 정보 표시됨
- [ ] 온도가 숫자로 표시됨
- [ ] 날씨 아이콘이 보임

### ✅ 감정 설문
- [ ] 5단계 모두 완료 가능
- [ ] 각 단계별 프로그레스 업데이트
- [ ] 뒤로가기 버튼 작동
- [ ] 다음 버튼 작동

### ✅ Firestore 연동
콘솔(F12) 확인:
```javascript
✅ Firestore에서 3014개의 작품을 가져왔습니다
🎯 사용자 감정 태그: ['calm', 'peaceful', 'past']
✅ 매칭된 작품: 45개
🎨 최종 추천 작품: 3개
```

- [ ] Firestore 데이터 가져오기 성공
- [ ] 추천 작품 3개 표시됨
- [ ] 작품 이미지 로드됨

---

## 🌐 5단계: 브라우저 호환성

### ✅ 테스트 브라우저
- [ ] Chrome/Edge (최신 버전)
- [ ] Firefox (최신 버전)
- [ ] Safari (14+)

### ✅ 모바일 테스트
- [ ] 반응형 레이아웃 작동
- [ ] 터치 제스처 작동
- [ ] 스크롤 부드러움

---

## 📊 6단계: 성능 확인

### ✅ 콘솔 확인 (F12 → Console)
**정상 로그 예시**:
```
🌍 GPS 원본 위치 (영어): Gangnam-gu, South Korea
🇰🇷 번역된 위치 (한국어): 강남구, 대한민국
📝 환영 메시지: welcome_sunny, 맑은 날씨
✅ Firestore에서 3014개의 작품을 가져왔습니다
```

**에러가 없어야 합니다**:
- [ ] ❌ 빨간색 에러 없음
- [ ] ⚠️ 노란색 경고 최소화
- [ ] ℹ️ 파란색 정보 로그만 있음

### ✅ 네트워크 확인 (F12 → Network)
- [ ] API 요청 성공 (200 OK)
- [ ] 이미지 로드 성공
- [ ] Firebase 연결 성공

---

## 🎯 7단계: 프로덕션 빌드

### ✅ 빌드 테스트
```bash
npm run build
```

**예상 결과**:
```
✓ 2156 modules transformed.
dist/index.html                   0.85 kB
dist/assets/index-abc123.css     15.24 kB
dist/assets/index-xyz789.js     245.67 kB

✓ built in 3.45s
```

**확인 사항**:
- [ ] 빌드 성공
- [ ] `dist/` 폴더 생성됨
- [ ] CSS/JS 파일 최적화됨

### ✅ 프리뷰 테스트
```bash
npm run preview
```

- [ ] 프로덕션 모드 정상 작동
- [ ] 스타일 정상 표시
- [ ] 모든 기능 작동

---

## 🚨 문제 해결

### ❌ 스타일이 안 나올 때
1. `/styles/globals.css` 파일 존재 확인
2. `/main.tsx`에서 import 확인:
   ```typescript
   import "./styles/globals.css";
   ```
3. 브라우저 캐시 삭제 (Ctrl + Shift + R)

### ❌ Firestore 데이터 안 가져올 때
1. Firebase Console에서 Firestore 규칙 확인
2. 콘솔 에러 메시지 확인
3. `/firebase.ts` 설정 확인

### ❌ 위치 정보 안 나올 때
1. HTTPS 환경인지 확인 (localhost는 OK)
2. 브라우저 위치 권한 확인
3. IP 기반 위치로 자동 전환됨 (정상)

### ❌ 애니메이션 안 작동할 때
1. `framer-motion` 설치 확인:
   ```bash
   npm install framer-motion
   ```
2. 브라우저 하드웨어 가속 확인

---

## ✅ 최종 체크리스트

### 파일 구조
- [ ] 모든 필수 파일 존재
- [ ] `node_modules/` 폴더 생성됨
- [ ] `dist/` 폴더 빌드 가능

### 실행
- [ ] `npm install` 성공
- [ ] `npm run dev` 성공
- [ ] 브라우저 정상 표시

### 스타일
- [ ] 네온 효과 작동
- [ ] 글래스 효과 작동
- [ ] 애니메이션 작동
- [ ] 반응형 레이아웃

### 기능
- [ ] 위치 감지 작동
- [ ] 날씨 API 작동
- [ ] 감정 설문 작동
- [ ] Firestore 추천 작동

### 성능
- [ ] 콘솔 에러 없음
- [ ] 네트워크 요청 성공
- [ ] 빌드 성공

---

## 🎉 완료!

**모든 항목에 체크 표시가 되었다면 축하합니다!** 🎊

프로젝트가 완벽하게 작동하고 있습니다!

---

## 📞 문제 발생 시

1. **README.md** 전체 문서 참고
2. **SETUP.md** 설치 가이드 참고
3. **GitHub Issues** 등록
4. **콘솔 로그** 복사해서 공유

---

**즐거운 개발 되세요! ✨**
