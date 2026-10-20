import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { MEM } from './memTheme';

// MeM 공용 푸터 (MeM 화면 전부 동일하게 사용) - 기존 MeM 푸터 항목(SNS + 개인정보처리방침) 유지
export function MemFooter() {
  return (
    <footer
      style={{
        marginTop: 24,
        padding: '20px 0 8px',
        borderTop: `1px solid ${MEM.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a
          href="https://www.instagram.com/atelier_tour_official/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="인스타그램"
          style={{ color: MEM.textMuted, display: 'flex' }}
        >
          <Instagram size={18} />
        </a>
        <a
          href="https://blog.naver.com/atelier_tour"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="네이버 블로그"
          style={{ display: 'flex', alignItems: 'center', color: MEM.textMuted }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: MEM.textMuted,
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            N
          </span>
        </a>
      </div>
      <Link to="/privacy" style={{ fontSize: 11, color: MEM.textMuted, textDecoration: 'underline', textUnderlineOffset: 2 }}>
        개인정보처리방침
      </Link>
    </footer>
  );
}
