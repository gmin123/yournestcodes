import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJourney } from '../contexts/JourneyContext';
import { siteHomePath } from '../utils/siteDomain';
import { isKakaoConfigured } from '../utils/kakaoAuth';

// 인가 코드는 한 번만 쓸 수 있어서, StrictMode 이중 실행으로 같은 코드를 두 번 교환하지 않도록 기억해둠
const handledKakaoCodes = new Set<string>();

function safeReturnPath(path: string | null | undefined): string {
  // 돌아갈 곳이 없으면 MeM 도메인은 MeM, 그 외는 Rheina 첫 화면
  return path && path.startsWith('/') && !path.startsWith('//') ? path : siteHomePath();
}

export function LoginPage() {
  const { user, loginWithKakao, finishKakaoLogin, loginWithEmail, signupWithEmail } = useAuth();
  const { saveJourneySnapshot } = useJourney();
  const [searchParams, setSearchParams] = useSearchParams();
  const kakaoConfigured = isKakaoConfigured();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<'kakao' | 'email' | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 추천 결과에서 저장하려다 넘어온 경우엔 그 화면으로 돌려보냄 (내부 경로만 허용)
  // 카카오 로그인에서 돌아온 경우엔 location.state 가 사라지므로 카카오 state 파라미터에 실어 보낸 경로를 씀
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? searchParams.get('state');
  const returnTo = safeReturnPath(from);

  // 카카오 로그인 페이지에서 /login?code=... (취소 시 ?error=...) 로 돌아온 경우 처리
  useEffect(() => {
    const code = searchParams.get('code');
    const kakaoError = searchParams.get('error');

    if (kakaoError) {
      setError(kakaoError === 'access_denied' ? '카카오 로그인을 취소했습니다.' : '카카오 로그인 중 오류가 발생했습니다.');
      setSearchParams({}, { replace: true });
      return;
    }
    if (!code || handledKakaoCodes.has(code)) return;
    handledKakaoCodes.add(code);

    setLoadingProvider('kakao');
    finishKakaoLogin(code)
      .catch((e) => {
        setError(e instanceof Error ? e.message : '카카오 로그인 중 오류가 발생했습니다.');
        setSearchParams({}, { replace: true });
      })
      .finally(() => setLoadingProvider(null));
  }, [searchParams, setSearchParams, finishKakaoLogin]);

  useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true, state: returnTo === '/result' ? { resumed: true } : undefined });
    }
  }, [user, navigate, returnTo]);

  async function handleKakao() {
    setError(null);

    if (!kakaoConfigured) {
      setError('카카오 로그인 키가 아직 준비되지 않았습니다. 아래 이메일 로그인으로 계속해주세요.');
      return;
    }

    setLoadingProvider('kakao');
    try {
      // 카카오 로그인 페이지로 이동했다 돌아오면 앱 메모리가 초기화되므로 추천 결과 등을 미리 저장
      saveJourneySnapshot();
      await loginWithKakao(returnTo);
      // 성공하면 페이지가 카카오로 이동하므로 로딩 상태를 그대로 둠
    } catch (e) {
      setError(e instanceof Error ? e.message : '카카오 로그인 중 오류가 발생했습니다.');
      setLoadingProvider(null);
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingProvider('email');
    try {
      if (mode === 'signup') {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div
      className="min-h-screen gradient-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect"
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: '2rem',
          padding: '2.5rem',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #ff6b9d 0%, #c96dfd 50%, #fec260 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          로그인
        </h2>
        <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.9rem' }}>
          로그인하면 마음에 든 작품을 담아두고
          <br />
          하루하루의 감정을 기록할 수 있어요
        </p>

        <form onSubmit={handleEmailSubmit} style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            style={{
              width: '100%',
              padding: '0.9rem',
              marginBottom: '0.6rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: '0.95rem',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '0.9rem',
              marginBottom: '0.75rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: '0.95rem',
            }}
          />
          <button
            type="submit"
            disabled={loadingProvider !== null}
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '1rem',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
              opacity: loadingProvider === 'email' ? 0.7 : 1,
            }}
          >
            {loadingProvider === 'email'
              ? '처리 중...'
              : mode === 'signup'
              ? '이메일로 회원가입'
              : '이메일로 로그인'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.4rem',
              background: 'transparent',
              border: 'none',
              color: '#c96dfd',
              fontSize: '0.8rem',
            }}
          >
            {mode === 'signup' ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '0 0 1.25rem',
            opacity: 0.5,
            fontSize: '0.8rem',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          또는
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        <button
          onClick={handleKakao}
          disabled={loadingProvider !== null || !kakaoConfigured}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '1rem',
            border: 'none',
            background: kakaoConfigured ? '#fee500' : 'rgba(255, 255, 255, 0.12)',
            color: kakaoConfigured ? '#191600' : '#d8d8d8',
            fontWeight: 600,
            fontSize: '1rem',
            opacity: loadingProvider === 'kakao' ? 0.7 : 1,
            cursor: kakaoConfigured ? 'pointer' : 'not-allowed',
          }}
        >
          {loadingProvider === 'kakao'
            ? '카카오 로그인 중...'
            : kakaoConfigured
            ? '카카오로 로그인'
            : '카카오 로그인 준비 중'}
        </button>


        {error && (
          <p style={{ marginTop: '1.25rem', color: '#ff8fab', fontSize: '0.85rem', lineHeight: 1.5 }}>
            {error}
          </p>
        )}
      </motion.div>
    </div>
  );
}
