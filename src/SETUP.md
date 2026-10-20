# 🚀 빠른 설치 가이드

## ⚡ 1분 안에 시작하기

### **1단계: 의존성 설치**
```bash
npm install
```

### **2단계: 개발 서버 시작**
```bash
npm run dev
```

### **3단계: 브라우저 열기**
```
http://localhost:5173
```

**끝! 🎉**

---

## 📦 필수 의존성

모든 의존성이 `package.json`에 포함되어 있습니다:

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "framer-motion": "^11.11.17",
  "lucide-react": "^0.454.0",
  "firebase": "^10.13.1"
}
```

---

## ✅ 설치 확인

### **1. Node.js 버전 확인**
```bash
node --version
# v18.0.0 이상 권장
```

### **2. npm 버전 확인**
```bash
npm --version
# v9.0.0 이상 권장
```

### **3. 의존성 설치 확인**
```bash
npm list
# 에러 없이 패키지 트리 표시되면 OK
```

---

## 🔧 문제 해결

### **문제: `npm install` 실패**
```bash
# 캐시 정리 후 재시도
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **문제: 포트 5173이 이미 사용 중**
```bash
# 다른 포트 사용
npm run dev -- --port 3000
```

### **문제: TypeScript 에러**
```bash
# tsconfig.json 확인
npm run build
```

---

## 🌍 브라우저 권한

### **위치 권한 허용**
프로젝트가 GPS 위치를 사용합니다:
1. 브라우저에서 "위치 정보 액세스 허용" 클릭
2. 거부 시 IP 기반 위치로 자동 전환

---

## 🔥 Firebase 연동 (선택사항)

Firebase 설정은 이미 코드에 포함되어 있습니다!

### **데이터 업로드 (관리자용)**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. `yournest-today-d2a73` 프로젝트 선택
3. Firestore Database → `data` 컬렉션에 작품 데이터 업로드

---

## 📱 모바일 테스트

### **로컬 네트워크에서 테스트**
```bash
# vite.config.ts에 host 추가
export default {
  server: {
    host: '0.0.0.0'
  }
}

# 서버 시작
npm run dev

# 모바일 브라우저에서 접속
http://YOUR_IP:5173
```

---

## 🚀 프로덕션 배포

### **빌드**
```bash
npm run build
```

### **Firebase Hosting 배포**
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 배포
firebase deploy
```

### **Vercel 배포**
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel
```

### **Netlify 배포**
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 배포
netlify deploy --prod
```

---

## 📊 성능 확인

### **개발 모드**
```bash
npm run dev
```

### **프리뷰 모드 (프로덕션 빌드 테스트)**
```bash
npm run build
npm run preview
```

---

## 💡 유용한 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 (Hot Reload)
npm run dev

# TypeScript 타입 체크
tsc --noEmit

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# 의존성 업데이트
npm update

# 보안 취약점 확인
npm audit
```

---

## 📚 추가 문서

- **README.md**: 전체 프로젝트 문서
- **Attributions.md**: 라이선스 및 크레딧

---

## 🎉 완료!

이제 프로젝트를 실행할 준비가 되었습니다!

```bash
npm run dev
```

**질문이 있으시면 GitHub Issues를 열어주세요!** 🚀
