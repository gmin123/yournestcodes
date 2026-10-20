// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQgm4ey4FKH2ieB7LmLxoWwAdA3jLg-sc",
  authDomain: "yournest-today-d2a73.firebaseapp.com",
  projectId: "yournest-today-d2a73",
  storageBucket: "yournest-today-d2a73.firebasestorage.app",
  messagingSenderId: "360692815974",
  appId: "1:360692815974:web:7b4cadbedd6abf0752f5a7",
  measurementId: "G-T15X7HCWHW"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Use HTTP long polling when the browser/network cannot keep Firestore's QUIC stream alive.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true }, "mydb");

// Initialize Firebase Auth (이메일/비밀번호 로그인용)
export const auth = getAuth(app);

// Initialize Analytics (only in browser)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };

// ============================================
// 🔥 Firestore Helper Functions
// ============================================

// Collection reference for 'data' (작품 데이터)
export const dataCollection = collection(db, 'data');

/**
 * 📖 모든 작품 데이터 가져오기 (Read All from 'data' collection)
 * @returns Promise<Array> - 모든 작품 문서 배열
 */
export const getAllArtworks = async () => {
  try {
    const querySnapshot = await getDocs(dataCollection);
    const artworks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('✅ Firestore "data" 컬렉션에서', artworks.length, '개 작품 가져옴');
    return artworks;
  } catch (error) {
    console.error('❌ Error getting artworks:', error);
    throw error;
  }
};

/**
 * 🔍 감정 태그로 작품 검색 (Query by emotion tags)
 * @param emotionTag - 검색할 감정 태그 (한국어)
 * @returns Promise<Array> - 검색된 작품 배열
 */
export const queryArtworksByEmotion = async (emotionTag: string) => {
  try {
    // emotion_tag_1 또는 emotion_tag_2에서 검색
    const q1 = query(dataCollection, where('emotion_tag_1', '==', emotionTag));
    const q2 = query(dataCollection, where('emotion_tag_2', '==', emotionTag));
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    const artworks1 = snapshot1.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const artworks2 = snapshot2.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 중복 제거
    const allArtworks = [...artworks1, ...artworks2];
    const uniqueArtworks = allArtworks.filter((artwork, index, self) => 
      index === self.findIndex(a => a.id === artwork.id)
    );
    
    console.log('✅ 감정 태그 "' + emotionTag + '"로 검색:', uniqueArtworks.length, '개 작품');
    return uniqueArtworks;
  } catch (error) {
    console.error('❌ Error querying artworks:', error);
    throw error;
  }
};

// ============================================
// 📊 사용 예제 (주석 처리)
// ============================================

/*
// 1. 데이터 추가
const newId = await addToMyDB({
  emotion: 'happy',
  artworkId: 'art123',
  userId: 'user456'
});

// 2. 모든 데이터 가져오기
const allData = await getAllFromMyDB();
console.log(allData);

// 3. 특정 조건으로 검색
const happyEmotions = await queryMyDB('emotion', '==', 'happy');
console.log(happyEmotions);

// 4. 데이터 업데이트
await updateMyDB('documentId', { emotion: 'excited' });

// 5. 데이터 삭제
await deleteFromMyDB('documentId');
*/