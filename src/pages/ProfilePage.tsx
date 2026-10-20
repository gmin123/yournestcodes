import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { deleteAccount, RecentLoginRequiredError } from '../utils/accountService';
import { siteHomePath } from '../utils/siteDomain';

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  email: '이메일',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB 이하 원본만 허용

// 큰 이미지를 그대로 저장하지 않도록 정사각형에 가깝게 리사이즈해 작은 JPEG로 변환
function resizeImageToDataUrl(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지를 처리할 수 없습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user, updateUserProfile, logout } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setNickname(user.nickname);
    setProfileImage(user.profileImage);
  }, [user, navigate]);

  if (!user) return null;

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 다시 선택해도 onChange 되도록
    if (!file) return;

    setError(null);
    setSaved(false);

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있어요.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('이미지 용량이 너무 커요. 8MB 이하로 선택해주세요.');
      return;
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setProfileImage(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 처리 중 오류가 발생했습니다.');
    }
  }

  async function handleSave() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateUserProfile({ nickname: trimmed, profileImage });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate(siteHomePath());
  }

  async function handleWithdraw() {
    if (!user) return;
    const ok = window.confirm(
      '정말 탈퇴할까요?\n\n담아둔 작품·메모·날씨 기록과 프로필 정보가 모두 삭제되며 되돌릴 수 없어요.',
    );
    if (!ok) return;

    setWithdrawing(true);
    setError(null);
    try {
      await deleteAccount(user);
      logout();
      window.alert('탈퇴가 완료되었습니다. 그동안 MeM을 이용해주셔서 감사합니다.');
      navigate(siteHomePath(), { replace: true });
    } catch (err) {
      if (err instanceof RecentLoginRequiredError) {
        setError(err.message);
        logout();
        navigate('/login');
        return;
      }
      console.error('[탈퇴] 실패', err);
      setError('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setWithdrawing(false);
    }
  }

  const email = user.provider === 'email' ? auth.currentUser?.email ?? user.providerId : null;

  return (
    <div
      className="gradient-bg"
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
          maxWidth: 420,
          borderRadius: '2rem',
          padding: '2.25rem 2rem 2.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            padding: 0,
          }}
        >
          <ChevronLeft size={18} /> 돌아가기
        </button>

        <h2
          style={{
            marginBottom: '1.75rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ff6b9d 0%, #c96dfd 50%, #fec260 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          내 프로필
        </h2>

        {/* 프로필 사진 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <div style={{ position: 'relative', width: 112, height: 112 }}>
            <ImageWithFallback
              src={profileImage}
              alt={nickname || user.nickname}
              fallbackTitle={(nickname || user.nickname).trim().slice(0, 1) || '?'}
              style={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(255,255,255,0.25)',
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="프로필 사진 변경"
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid #1a1027',
                background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={16} color="#fff" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* 닉네임 */}
        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.4rem' }}>
          닉네임
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
          maxLength={30}
          placeholder="닉네임을 입력해주세요"
          style={{
            width: '100%',
            padding: '0.9rem',
            marginBottom: '1.25rem',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }}
        />

        {/* 읽기 전용 계정 정보 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            padding: '0.9rem 1rem',
            borderRadius: '1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span>로그인 방식: {PROVIDER_LABEL[user.provider] ?? user.provider}</span>
          {email && <span>이메일: {email}</span>}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '1rem',
            border: 'none',
            color: '#fff',
            fontWeight: 600,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #ff6b9d, #c96dfd)',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>

        {error && (
          <p style={{ marginTop: '1rem', color: '#ff8fab', fontSize: '0.85rem', lineHeight: 1.5 }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p style={{ marginTop: '1rem', color: '#8ce8b0', fontSize: '0.85rem', fontWeight: 600 }}>
            저장되었습니다.
          </p>
        )}

        {/* 계정 관리: 로그아웃 / 회원 탈퇴 */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'grid', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={withdrawing}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.78rem',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              padding: '0.4rem',
              cursor: withdrawing ? 'default' : 'pointer',
            }}
          >
            {withdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
