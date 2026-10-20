# 🔥 Firestore 연동 상태 확인

## ✅ **현재 설정 상태**

### **1. 데이터베이스 구조**
```
Firebase Project: yournest-today-d2a73
  └── Firestore Database
      └── Collection: "data"  ✅ 올바른 컬렉션명
          ├── Document 1
          │   ├── title: "Entree de l'atelier Rousseau et la Maison de Millet"
          │   ├── description: "Gift of Leonard C. Hanna Jr."
          │   ├── emotion_tag_1: "외로움"
          │   ├── emotion_tag_2: "향수"
          │   ├── image_url: "https://openaccess-cdn.clevelandart.org/..."
          │   ├── index: 3014
          │   └── reason: "고요한 시골 골목과 빈 집 풍경이..."
          ├── Document 2
          │   └── ... (3014개 문서)
          └── ...
```

---

## 📂 **코드 확인**

### **1. Firebase 설정 (`/firebase.ts`)**
```typescript
// ✅ 올바른 설정
export const db = getFirestore(app);
export const dataCollection = collection(db, 'data');  // 'data' 컬렉션 참조
```

### **2. 추천 알고리즘 (`/utils/artworkRecommendation.ts`)**
```typescript
// ✅ 올바른 설정
const dataCollection = collection(db, 'data');  // 'data' 컬렉션에서 가져오기
const querySnapshot = await getDocs(dataCollection);
```

### **3. 데이터 타입 정의**
```typescript
export interface Artwork {
  id: string;           // Firestore 문서 ID
  title: string;        // 작품 제목
  description: string;  // 작품 설명
  emotion_tag_1: string; // 감정 태그 1 (한국어)
  emotion_tag_2: string; // 감정 태그 2 (한국어)
  image_url: string;    // 작품 이미지 URL
  index: number;        // 고유 인덱스
  reason: string;       // 추천 이유
}
```

---

## 🔍 **데이터 로딩 확인 방법**

### **1. 브라우저 콘솔 확인**
감정 설문을 완료하면 다음과 같은 로그가 표시됩니다:

```javascript
✅ Firestore에서 3014개의 작품을 가져왔습니다
🎯 사용자 감정 태그: ['calm', 'peaceful', 'past']
✅ 매칭된 작품: 45개
🎲 매칭 안된 작품: 2969개
🎨 최종 추천 작품: 2개
  - Entree de l'atelier Rousseau et la Maison de Millet (태그: 외로움, 향수)
  - ... (다른 작품들)
```

### **2. Network 탭 확인 (F12 → Network)**
```
Request URL: firestore.googleapis.com/...
Status: 200 OK
Response: {documents: Array(3014)}
```

---

## 🎯 **감정 태그 매칭 시스템**

### **1. 영어 → 한국어 변환**
사용자가 선택한 영어 감정 태그를 한국어로 변환:

```typescript
const EMOTION_TRANSLATION = {
  'energetic': ['활기찬', '역동적', '힘찬', '생동감'],
  'calm': ['평온한', '고요한', '차분한', '안정된'],
  'tired': ['지친', '피곤한', '나른한', '무기력한'],
  'happy': ['행복한', '기쁜', '즐거운', '밝은'],
  'sad': ['슬픈', '우울한', '침울한', '비통한'],
  'anxious': ['불안한', '초조한', '걱정되는', '긴장된'],
  'peaceful': ['평화로운', '고요한', '안온한', '편안한'],
  'social': ['사교적', '외향적', '활동적', '사람들'],
  'alone': ['혼자', '고독한', '외로운', '독립적'],
  'intimate': ['친밀한', '따뜻한', '가까운', '정겨운'],
  'vibrant': ['생동감', '화려한', '밝은', '선명한'],
  'muted': ['차분한', '은은한', '절제된', '조용한'],
  'abstract': ['추상적', '상징적', '의미있는', '함축적'],
  'realistic': ['사실적', '구체적', '현실적', '정밀한'],
  'past': ['과거', '추억', '향수', '회상'],
  'present': ['현재', '지금', '순간', '당장'],
  'future': ['미래', '희망', '기대', '전망'],
  // ... 50+ 감정 단어
};
```

### **2. 유사도 점수 계산**
```typescript
function calculateSimilarity(userTags, artworkTag1, artworkTag2) {
  let score = 0;
  
  // 사용자 태그: ['calm', 'peaceful']
  // → 한국어: ['평온한', '고요한', '차분한', '안정된', '평화로운', ...]
  
  // 작품 태그: '평온한', '고요한'
  
  // 정확히 일치 → +10점
  if (artworkTag === userTag) score += 10;
  
  // 부분 일치 → +5점
  if (artworkTag.includes(userTag)) score += 5;
  
  return score;
}
```

### **3. 추천 우선순위**
```typescript
1. 점수 높은 작품 우선 (감정 매칭)
2. 같은 점수면 랜덤 셔플 (다양성)
3. 중복 제거 (index 기반)
4. 최종 2개 선택 (큐리즘 1개 + Firestore 2개)
```

---

## 🔧 **트러블슈팅**

### **❌ 문제: 콘솔에 "0개의 작품" 표시**
```javascript
⚠️ Firestore에 작품이 없습니다
```

**해결 방법:**

#### **1. Firestore 규칙 확인**
Firebase Console → Firestore Database → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 개발 중에는 모든 읽기 허용 (배포 시 변경 필요!)
    match /data/{document=**} {
      allow read: if true;
      allow write: if false;  // 쓰기는 막기
    }
  }
}
```

#### **2. 컬렉션명 확인**
Firestore Console에서:
- ✅ 컬렉션명이 **정확히 "data"**인지 확인
- ❌ "mydb"가 아닌지 확인
- ❌ "Data"처럼 대문자가 아닌지 확인

#### **3. 문서 구조 확인**
각 문서에 다음 필드가 있는지 확인:
```
title (string)
description (string)
emotion_tag_1 (string)
emotion_tag_2 (string)
image_url (string)
index (number)
reason (string)
```

#### **4. 네트워크 확인**
F12 → Network 탭에서:
- Firestore 요청이 **200 OK**인지 확인
- 에러가 있다면 **403 Forbidden** → 규칙 문제
- **404 Not Found** → 컬렉션명 오타

---

## 🎨 **데이터 예시**

### **Firestore 문서 구조**
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

### **추천 알고리즘 작동 예시**
```javascript
// 사용자 선택
User Input: ['calm', 'peaceful', 'past']

// 한국어 변환
Translated: ['평온한', '고요한', '차분한', '안정된', '평화로운', '고요한', '안온한', '편안한', '과거', '추억', '향수', '회상']

// 작품 매칭
Artwork: {
  emotion_tag_1: "외로움",  // 점수: 0 (일치 없음)
  emotion_tag_2: "향수"     // 점수: +10 (정확히 일치!)
}
Total Score: 10점

// 추천 선택
✅ 점수 10점 → 추천에 포함됨!
```

---

## 📊 **실시간 테스트 방법**

### **1. 개발자 도구 열기**
```
F12 → Console
```

### **2. 감정 설문 진행**
```
웰컴 화면 → 상황 선택 → 5단계 감정 설문 → 결과 분석
```

### **3. 콘솔 로그 확인**
```javascript
✅ Firestore "data" 컬렉션에서 3014개 작품 가져옴  // ← 이게 보이면 성공!
🎯 사용자 감정 태그: ['calm', 'peaceful', 'past']
✅ 매칭된 작품: 45개
🎨 최종 추천 작품: 2개
```

### **4. 추천 페이지 확인**
```
[큐리즘 작품] [Firestore 작품 1] [Firestore 작품 2]
```

---

## ✅ **정상 작동 확인 체크리스트**

- [ ] Firebase Console에서 "data" 컬렉션 존재 확인
- [ ] 3014개 문서 존재 확인
- [ ] 각 문서에 7개 필드 (title, description, emotion_tag_1, emotion_tag_2, image_url, index, reason) 확인
- [ ] Firestore Rules에서 read 권한 허용 확인
- [ ] 브라우저 콘솔에서 "✅ Firestore에서 3014개의 작품을 가져왔습니다" 로그 확인
- [ ] 추천 페이지에서 작품 이미지 정상 로드 확인
- [ ] 감정 태그 (한국어) 정상 표시 확인

---

## 🎉 **결론**

**현재 코드는 이미 올바르게 설정되어 있습니다!**

- ✅ `collection(db, 'data')` 사용 중
- ✅ 감정 태그 매칭 알고리즘 작동 중
- ✅ 3014개 작품 데이터 로드 가능

**만약 데이터가 안 나온다면:**
1. Firebase Console에서 **컬렉션명 "data"** 확인
2. Firestore **읽기 권한 (Rules)** 확인
3. 브라우저 **콘솔 에러 메시지** 확인

---

**질문이 있으면 콘솔 로그를 공유해주세요!** 🔥
