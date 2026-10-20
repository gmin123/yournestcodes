import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { JourneyProvider } from './contexts/JourneyContext'
import { NavBar } from './components/NavBar'
import { WelcomePage } from './pages/WelcomePage'
import { EmotionPage } from './pages/EmotionPage'
import { ResultPage } from './pages/ResultPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { CalendarPage } from './pages/CalendarPage'
import { UploadPage } from './pages/UploadPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { AdminPage } from './pages/AdminPage'
import { PageViewTracker } from './components/PageViewTracker'
import './styles/globals.css' // Import Tailwind CSS
import './firebase' // Initialize Firebase
import { applyDomainEntryRoute } from './utils/siteDomain'
import { consumeAuthHandoff } from './contexts/AuthContext'
import { DomainGuard } from './components/DomainGuard'

// MeM 도메인(mem-memory.web.app)으로 들어오면 첫 화면을 MeM 으로 (라우터 생성 전에 주소만 바꿈)
// 다른 도메인(MeM ↔ Rheina)에서 넘어온 로그인 정보를 먼저 저장한 뒤 첫 화면 결정
consumeAuthHandoff()
applyDomainEntryRoute()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NavBar />
        <PageViewTracker />
        <JourneyProvider>
          <DomainGuard>
          <Routes>
            {/* 감정 분석 여정: 페이지 단위로 분리 (애니메이션 렉 최소화) */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/emotion" element={<EmotionPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* MeM 전용 진입점 (첫 화면 = MeM 랜딩/달력). /calendar 는 기존 링크 호환용 */}
            <Route path="/mem" element={<CalendarPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            {/* 내부 전용 관리자 페이지 (비밀번호 인증) */}
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          </DomainGuard>
        </JourneyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
