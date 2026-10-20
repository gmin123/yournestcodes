import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { MemHeader } from '../components/mem/MemHeader';
import { MemFooter } from '../components/mem/MemFooter';
import { MEM, useBodyScrollLock, useEscapeKey } from '../components/mem/memTheme';
import {
  deleteDiaryEntry,
  deleteMemo,
  MEMO_MAX_LENGTH,
  getDiaryEntries,
  getSavedArtworkLinks,
  getTodayDateString,
  parseLocalDateString,
  removeSavedArtwork,
  saveMemo,
  type DiaryEntry,
  type SavedArtworkLink,
  type SavedArtworkRef,
} from '../utils/diaryService';

// 요일 헤더 (월요일 시작) - 참고 사이트와 동일
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// 감정 스펙트럼 바 색상 (비율이 높은 감정부터 순서대로 적용) - 참고 사이트의 노랑·주황 계열부터
const SPECTRUM_COLORS = ['#FFCC00', '#FF9500', '#7E57C2', '#6dd5ed', '#8a9bd4'];

// 현재 달부터 과거로 최소 12개월, 그보다 오래된 기록이 있으면 그 달까지 포함
function getMonthList(entries: DiaryEntry[]): Date[] {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let earliest = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 11, 1);

  entries.forEach((entry) => {
    const d = parseLocalDateString(entry.date);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    if (monthStart < earliest) earliest = monthStart;
  });

  const months: Date[] = [];
  let cursor = currentMonthStart;
  while (cursor >= earliest) {
    months.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return months;
}

function formatDot(dateStr: string): string {
  return dateStr.replace(/-/g, '.');
}

// 모달 공통 닫기 버튼 (참고 사이트 .close-btn)
function CloseButton({ onClick, label = '닫기' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: MEM.appBg,
        border: 'none',
        color: MEM.text,
        fontSize: 16,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      ✕
    </button>
  );
}

// 큐레이션 카드 (작가 설명 / 작품 설명 / 메모란)
function CurationCard({ label, accent, background, children }: { label: string; accent: string; background?: string; children: ReactNode }) {
  return (
    <div style={{ background: background ?? MEM.cardBg, padding: '12px 14px', borderRadius: 10, borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.3px', color: MEM.textDate, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const curationTextStyle: CSSProperties = {
  fontSize: 11.5,
  lineHeight: 1.6,
  color: '#2C2C2E',
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
  margin: 0,
};

export function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [memoDraft, setMemoDraft] = useState('');
  const [editingMemo, setEditingMemo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);

  // 기록 모달(날짜의 작품들 - 이전/다음 기록) / 이미지 확대 / 담아둔 작품 참고 링크 모달
  const [record, setRecord] = useState<{ items: SavedArtworkRef[]; index: number } | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [linkTarget, setLinkTarget] = useState<SavedArtworkRef | null>(null);
  const [links, setLinks] = useState<{ status: 'loading' | 'done' | 'error'; items: SavedArtworkLink[] }>({ status: 'done', items: [] });

  // MeM 은 로그인한 사람만 이용 가능 - 비로그인으로 들어오면 로그인 화면으로 (로그인 후 다시 MeM 으로 돌아옴)
  useEffect(() => {
    if (!user) navigate('/login', { replace: true, state: { from: '/mem' } });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDiaryEntries(user.uid)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [user]);

  const selectedEntry = entries.find((e) => e.date === selectedDate) ?? null;
  // "기록" = 그 날짜에 담아둔 작품. 작품이 없으면 (메모만 있어도) 기록 없음 안내 + 메모란 표시
  const hasRecord = (selectedEntry?.savedArtworks?.length ?? 0) > 0;

  // 날짜가 바뀌면 그 날짜의 메모로 갱신 - 메모가 없으면 바로 입력할 수 있게 입력창을 열어 둠
  useEffect(() => {
    setMemoDraft(selectedEntry?.memo ?? '');
    setEditingMemo(!selectedEntry?.memo);
    setSaveMessage(null);
  }, [selectedDate, selectedEntry]);

  const months = useMemo(() => getMonthList(entries), [entries]);

  const selectedArtworks = entries.find((e) => e.date === selectedDate)?.savedArtworks ?? [];

  // 날짜별 작품 목록 & 대표 감정 태그 & 대표 썸네일 (달력 칸에 표시)
  const dayInfoMap = useMemo(() => {
    const map = new Map<string, { items: SavedArtworkRef[]; tag?: string; thumb?: string }>();
    entries.forEach((entry) => {
      const items = entry.savedArtworks ?? [];
      if (items.length === 0) return;
      const tagCounts: Record<string, number> = {};
      items.forEach((a) => {
        if (a.emotionTag1) tagCounts[a.emotionTag1] = (tagCounts[a.emotionTag1] ?? 0) + 1;
      });
      const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const thumb = items.find((a) => a.imageUrl?.trim())?.imageUrl;
      map.set(entry.date, { items, tag: topTag, thumb });
    });
    return map;
  }, [entries]);

  // 지금 보고 있는 달의 감정 스펙트럼 (그 달에 담아둔 작품들의 감정 태그 비율)
  const monthlyStats = useMemo(() => {
    const month = months[monthIndex];
    if (!month) return [] as { tag: string; percent: number }[];
    const counts: Record<string, number> = {};
    let total = 0;
    entries.forEach((entry) => {
      const d = parseLocalDateString(entry.date);
      if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) return;
      entry.savedArtworks?.forEach((a) => {
        if (!a.emotionTag1) return;
        counts[a.emotionTag1] = (counts[a.emotionTag1] ?? 0) + 1;
        total += 1;
      });
    });
    if (total === 0) return [];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, percent: Math.round((count / total) * 100) }));
  }, [entries, months, monthIndex]);

  // months 안에서 "오늘이 속한 달"의 위치 (없으면 0)
  const currentMonthIndex = useMemo(() => {
    const now = new Date();
    const i = months.findIndex((m) => m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth());
    return i >= 0 ? i : 0;
  }, [months]);

  // 진입 시(기록 로딩 완료 후) 캘린더를 항상 "이번 달"로 맞춤
  const monthInitDone = useRef(false);
  useEffect(() => {
    if (loading || months.length === 0) return;
    if (!monthInitDone.current) {
      setMonthIndex(currentMonthIndex);
      monthInitDone.current = true;
    } else {
      setMonthIndex((currentIndex) => Math.min(currentIndex, Math.max(months.length - 1, 0)));
    }
  }, [loading, months.length, currentMonthIndex]);

  useEffect(() => {
    document.body.classList.add('ynt-plain-scrollbar');
    return () => document.body.classList.remove('ynt-plain-scrollbar');
  }, []);

  // 담아둔 작품 참고 링크: 모달을 열 때만 원본 작품 문서를 조회 (같은 작품은 캐시)
  useEffect(() => {
    if (!linkTarget) return;
    let cancelled = false;
    setLinks({ status: 'loading', items: [] });
    getSavedArtworkLinks(linkTarget)
      .then((items) => !cancelled && setLinks({ status: 'done', items }))
      .catch(() => !cancelled && setLinks({ status: 'error', items: [] }));
    return () => {
      cancelled = true;
    };
  }, [linkTarget]);

  const closeRecord = useCallback(() => setRecord(null), []);
  const closeZoom = useCallback(() => setZoomImage(null), []);
  const closeLinks = useCallback(() => setLinkTarget(null), []);
  useBodyScrollLock(Boolean(record || zoomImage || linkTarget));
  // 가장 위에 떠 있는 레이어부터 ESC 로 닫힘
  useEscapeKey(Boolean(zoomImage), closeZoom);
  useEscapeKey(!zoomImage && Boolean(record), closeRecord);
  useEscapeKey(!zoomImage && !record && Boolean(linkTarget), closeLinks);

  // "담아둔 작품" 가로 목록: 스크롤바는 숨기고, 데스크톱은 드래그/휠로 가로 스크롤
  const artworkListRef = useRef<HTMLDivElement | null>(null);
  const artworkDraggedRef = useRef(false); // 드래그였으면 뒤따르는 click(작품 열기) 무시
  useEffect(() => {
    const node = artworkListRef.current;
    if (!node) return;

    // 마우스 휠(세로) → 가로 스크롤
    const onWheel = (e: WheelEvent) => {
      if (node.scrollWidth <= node.clientWidth) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const before = node.scrollLeft;
      node.scrollLeft += e.deltaY;
      if (node.scrollLeft !== before) e.preventDefault();
    };

    // 마우스/펜 드래그로 가로 스크롤 (모바일 터치는 네이티브 스크롤 그대로)
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = node.scrollLeft;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return; // 5px 미만이면 클릭으로 인정
      moved = true;
      node.scrollLeft = startLeft - dx;
    };
    const onPointerUp = () => {
      if (!down) return;
      down = false;
      artworkDraggedRef.current = moved;
      if (moved) window.setTimeout(() => { artworkDraggedRef.current = false; }, 0);
      moved = false;
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [selectedEntry]);

  // 날짜 클릭: 기록이 있으면 기록 모달, 없으면 아래 "기록 없음 + 메모란"으로 이동
  const dailySectionRef = useRef<HTMLDivElement | null>(null);
  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr);
    const info = dayInfoMap.get(dateStr);
    if (info && info.items.length > 0) {
      setRecord({ items: info.items, index: 0 });
    } else {
      window.setTimeout(() => dailySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  async function handleSaveMemo() {
    if (!user) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveMemo(user.uid, selectedDate, memoDraft);
      const refreshed = await getDiaryEntries(user.uid);
      setEntries(refreshed);
      setSaveMessage('메모가 저장되었습니다.');
    } catch {
      window.alert('메모 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMemo() {
    if (!user || !selectedEntry?.memo) return;
    if (!window.confirm('이 날짜의 메모를 삭제할까요?')) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await deleteMemo(user.uid, selectedDate);
      setEntries(await getDiaryEntries(user.uid));
      setMemoDraft('');
      setSaveMessage('메모가 삭제되었습니다.');
    } catch {
      window.alert('메모 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry() {
    if (!user || !selectedEntry) return;
    const confirmed = window.confirm('이 날짜의 기록을 정말 삭제할까요?');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteDiaryEntry(user.uid, selectedDate);
      const refreshed = await getDiaryEntries(user.uid);
      setEntries(refreshed);
      setMemoDraft('');
      setSaveMessage(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteArtwork(artworkId: string) {
    if (!user) return;
    const confirmed = window.confirm('이 작품을 기록에서 삭제할까요?');
    if (!confirmed) return;

    try {
      await removeSavedArtwork(user.uid, selectedDate, artworkId);
      const refreshed = await getDiaryEntries(user.uid);
      setEntries(refreshed);
      setRecord(null);
    } catch {
      window.alert('작품 삭제에 실패했습니다.');
    }
  }

  const goToRheina = () => navigate('/');

  // 지금 보고 있는 달의 날짜 칸 (월요일 시작, 앞쪽 빈칸 포함)
  const month = months[monthIndex];
  const calendarCells = useMemo(() => {
    if (!month) return [] as (string | null)[];
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const cells: (string | null)[] = Array.from({ length: leading }, () => null);
    for (let d = 1; d <= lastDay; d += 1) {
      cells.push(getTodayDateString(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const currentItem = record ? record.items[record.index] : null;
  const memoLength = Array.from(memoDraft).length;

  const smallTextButton: CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: MEM.text,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: MEM.font,
  };

  // 메모란 (기록이 있는 날/없는 날 공통) - 실제 Firestore 저장(saveMemo)과 연결, 비로그인 시 저장 기능 없음을 안내
  const memoBlock = (
    <CurationCard label={`메모란 · ${formatDot(selectedDate)}`} accent={MEM.memoAccent} background={MEM.memoBg}>
      {!user ? (
        <p style={{ ...curationTextStyle, color: MEM.textMuted }}>
          로그인하면 이 날의 메모를 남길 수 있어요.{' '}
          <Link to="/login" state={{ from: '/mem' }} style={{ color: MEM.text, fontWeight: 600 }}>
            로그인
          </Link>
        </p>
      ) : !editingMemo && selectedEntry?.memo ? (
        <>
          <p style={curationTextStyle}>{selectedEntry.memo}</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <button
              type="button"
              style={smallTextButton}
              onClick={() => {
                setSaveMessage(null);
                setMemoDraft(selectedEntry.memo);
                setEditingMemo(true);
              }}
            >
              메모 수정
            </button>
            <button type="button" style={{ ...smallTextButton, color: MEM.textMuted, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={handleDeleteMemo}>
              메모 삭제
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={memoDraft}
            onChange={(e) => setMemoDraft(Array.from(e.target.value).slice(0, MEMO_MAX_LENGTH).join(''))}
            placeholder={`오늘의 감정을 한 줄로 기록해보세요 (최대 ${MEMO_MAX_LENGTH}자)`}
            maxLength={MEMO_MAX_LENGTH * 2 /* 이모지(2 code unit)까지 고려 - 실제 제한은 onChange에서 글자 단위로 */}
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 8,
              padding: '10px 12px',
              background: '#FFFFFF',
              border: `1px solid ${MEM.border}`,
              color: '#2C2C2E',
              fontFamily: MEM.font,
              fontSize: 12.5,
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
            <span aria-live="polite" style={{ fontSize: 10.5, color: memoLength >= MEMO_MAX_LENGTH ? '#d13b3b' : MEM.textMuted }}>
              {memoLength}/{MEMO_MAX_LENGTH}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedEntry?.memo && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setMemoDraft(selectedEntry.memo);
                    setEditingMemo(false);
                    setSaveMessage(null);
                  }}
                  style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${MEM.border}`, background: '#FFFFFF', color: MEM.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: MEM.font }}
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveMemo}
                disabled={saving || !memoDraft.trim()}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: MEM.text,
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: saving || !memoDraft.trim() ? 'default' : 'pointer',
                  opacity: saving || !memoDraft.trim() ? 0.45 : 1,
                  fontFamily: MEM.font,
                }}
              >
                {saving ? '저장 중...' : '메모 저장'}
              </button>
            </div>
          </div>
        </>
      )}
      {saveMessage && <p style={{ margin: '8px 0 0', color: '#1b7f4d', fontSize: 11, fontWeight: 600 }}>{saveMessage}</p>}
    </CurationCard>
  );

  if (!user) return null;

  return (
    <div className="mem-page" style={{ minHeight: '100vh', background: MEM.pageBg, color: MEM.text, fontFamily: MEM.font }}>
      <style>{`
        .mem-app { width: 100%; max-width: 390px; margin: 0 auto; min-height: 100vh; background: ${MEM.appBg}; padding: 20px 16px; box-sizing: border-box; display: flex; flex-direction: column; }
        @media (min-width: 431px) {
          .mem-page { padding: 20px 0; }
          .mem-app { min-height: 844px; border: 1px solid ${MEM.border}; border-radius: 28px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08); }
        }
        .mem-cell-archived:active { transform: scale(0.92); }
        .mem-banner:active { transform: scale(0.98); }
      `}</style>

      <div className="mem-app">
        <MemHeader />

        {/* 오늘의 마음 배너 → Rheina 첫 화면 */}
        <section
          className="mem-banner"
          role="link"
          tabIndex={0}
          onClick={goToRheina}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              goToRheina();
            }
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: 16,
            padding: '13px 18px',
            cursor: 'pointer',
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.2s ease',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: MEM.textSub }}>오늘의 마음을, 작품으로 남겨볼까요?</span>
        </section>

        {/* 달력 */}
        <main style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 10 }}>
            <button
              type="button"
              aria-label="이전 달 보기"
              onClick={() => setMonthIndex((index) => Math.min(index + 1, months.length - 1))}
              disabled={monthIndex >= months.length - 1}
              style={{ background: 'none', border: 'none', color: MEM.text, cursor: 'pointer', fontSize: 16, fontWeight: 600, padding: '0 8px', opacity: monthIndex >= months.length - 1 ? 0.25 : 1 }}
            >
              &lt;
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: MEM.textSub, minWidth: 70, textAlign: 'center' }}>
              {month ? `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, '0')}` : ''}
            </span>
            <button
              type="button"
              aria-label="다음 달 보기"
              onClick={() => setMonthIndex((index) => Math.max(index - 1, 0))}
              disabled={monthIndex === 0}
              style={{ background: 'none', border: 'none', color: MEM.text, cursor: 'pointer', fontSize: 16, fontWeight: 600, padding: '0 8px', opacity: monthIndex === 0 ? 0.25 : 1 }}
            >
              &gt;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 11, color: MEM.textMuted, marginBottom: 8, fontWeight: 500 }}>
            {WEEKDAY_LETTERS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          {loading ? (
            <p style={{ padding: '40px 0', textAlign: 'center', color: MEM.textMuted, fontSize: 12 }}>불러오는 중...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {calendarCells.map((dateStr, i) => {
                if (!dateStr) return <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />;
                const info = dayInfoMap.get(dateStr);
                const selected = dateStr === selectedDate;
                const dayNumber = Number(dateStr.slice(8));
                if (info) {
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className="mem-cell-archived"
                      onClick={() => handleDayClick(dateStr)}
                      aria-label={`${formatDot(dateStr)} 기록 ${info.items.length}개`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 10,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                        outline: selected ? `1.5px solid ${MEM.text}` : 'none',
                        outlineOffset: 1,
                        minWidth: 0,
                      }}
                    >
                      <div style={{ width: '100%', height: '72%', position: 'relative', borderRadius: 8, overflow: 'hidden', background: MEM.pageBg }}>
                        {info.thumb && (
                          <ImageWithFallback src={info.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} optimizeWidth={120} plainFallback />
                        )}
                        {info.items.length > 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 3,
                              right: 3,
                              background: MEM.badge,
                              color: '#FFFFFF',
                              fontSize: 8,
                              fontWeight: 700,
                              padding: '1px 4px',
                              borderRadius: 6,
                              border: '1px solid #FFFFFF',
                              lineHeight: 1,
                            }}
                          >
                            +{info.items.length}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '26%',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: 8.5,
                          fontWeight: 600,
                          color: MEM.textSub,
                          letterSpacing: '-0.2px',
                          paddingTop: 2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {info.tag ?? dayNumber}
                      </div>
                    </button>
                  );
                }
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    aria-label={`${formatDot(dateStr)} 기록 없음`}
                    style={{ aspectRatio: '1', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', minWidth: 0 }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 11,
                        color: selected ? '#FFFFFF' : MEM.textDate,
                        background: selected ? MEM.text : 'rgba(0, 0, 0, 0.04)',
                        fontFamily: MEM.font,
                      }}
                    >
                      {dayNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 달력 하단 감정 스펙트럼 */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(224, 220, 211, 0.6)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: MEM.textSub, marginBottom: 6 }}>
              <span style={{ flexShrink: 0 }}>{month ? month.getMonth() + 1 : ''}월의 감정 스펙트럼</span>
              <span style={{ color: MEM.accent, fontWeight: 600, textAlign: 'right' }}>
                {monthlyStats.length > 0 ? monthlyStats.map((s) => `#${s.tag} ${s.percent}%`).join(' · ') : ''}
              </span>
            </div>
            <div style={{ height: 6, width: '100%', background: '#E5E5EA', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
              {monthlyStats.map((s, i) => (
                <div key={s.tag} style={{ height: '100%', width: `${s.percent}%`, background: SPECTRUM_COLORS[i % SPECTRUM_COLORS.length] }} />
              ))}
            </div>
          </div>

          {/* 선택한 날짜: 기록이 없으면 안내 문구 + 메모란, 있으면 담아둔 작품 + 메모 */}
          <div ref={dailySectionRef} style={{ marginTop: 14, scrollMarginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!loading && !hasRecord ? (
              <>
                <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 12, color: MEM.textMuted, fontWeight: 500 }}>아직 이 날의 기록이 없어요</p>
                {memoBlock}
              </>
            ) : !loading ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MEM.textSub }}>
                    {formatDot(selectedDate)} · 담아둔 작품
                  </span>
                  {selectedArtworks.length > 0 && (
                    <button type="button" style={smallTextButton} onClick={() => setRecord({ items: selectedArtworks, index: 0 })}>
                      기록 보기
                    </button>
                  )}
                </div>
                {selectedArtworks.length > 0 ? (
                  <div ref={artworkListRef} className="ynt-artwork-list" style={{ display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 2 }}>
                    {selectedArtworks.map((a, i) => (
                      <button
                        key={`${a.refId}-${i}`}
                        type="button"
                        onClick={() => {
                          if (artworkDraggedRef.current) return; // 드래그였으면 열지 않음
                          setLinkTarget(a);
                        }}
                        style={{ flex: '0 0 auto', width: 72, textAlign: 'center', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <ImageWithFallback src={a.imageUrl} alt={a.title} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, marginBottom: 4, display: 'block' }} optimizeWidth={160} />
                        <p style={{ margin: 0, fontSize: 10, color: MEM.textSub, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: MEM.textMuted }}>담아둔 작품이 없어요</p>
                )}
                {memoBlock}
                {user && selectedEntry && (
                  <button
                    type="button"
                    onClick={handleDeleteEntry}
                    disabled={deleting}
                    style={{ ...smallTextButton, alignSelf: 'flex-end', color: '#d13b3b', opacity: deleting ? 0.5 : 1 }}
                  >
                    {deleting ? '삭제 중' : '이 날의 기록 삭제'}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </main>

        <MemFooter />
      </div>

      {/* 기록 모달 (참고 사이트 center-modal) */}
      {record && currentItem && (
        <div
          onClick={closeRecord}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${currentItem.title} 기록`}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 358,
              maxHeight: 'min(720px, calc(100vh - 32px))',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 18,
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              fontFamily: MEM.font,
            }}
          >
            <CloseButton onClick={closeRecord} />

            {record.items.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: MEM.appBg,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 10,
                  marginRight: 36,
                }}
              >
                <button
                  type="button"
                  disabled={record.index === 0}
                  onClick={() => setRecord((r) => (r && r.index > 0 ? { ...r, index: r.index - 1 } : r))}
                  style={{ background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', color: MEM.text, padding: '0 6px', opacity: record.index === 0 ? 0.3 : 1, fontFamily: MEM.font, fontSize: 11 }}
                >
                  &lt; 이전 기록
                </button>
                <span>
                  오늘의 기록 {record.index + 1} / {record.items.length}
                </span>
                <button
                  type="button"
                  disabled={record.index >= record.items.length - 1}
                  onClick={() => setRecord((r) => (r && r.index < r.items.length - 1 ? { ...r, index: r.index + 1 } : r))}
                  style={{ background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', color: MEM.text, padding: '0 6px', opacity: record.index >= record.items.length - 1 ? 0.3 : 1, fontFamily: MEM.font, fontSize: 11 }}
                >
                  다음 기록 &gt;
                </button>
              </div>
            )}

            <div
              onClick={() => currentItem.imageUrl?.trim() && setZoomImage(currentItem.imageUrl)}
              style={{
                position: 'relative',
                width: '100%',
                height: 220,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 14,
                background: MEM.pageBg,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'zoom-in',
              }}
            >
              <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, background: 'rgba(0, 0, 0, 0.5)', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, pointerEvents: 'none', zIndex: 1 }}>
                🔍 터치하여 확대
              </span>
              <ImageWithFallback
                key={currentItem.refId}
                src={currentItem.imageUrl}
                alt={currentItem.title}
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: MEM.text }}>
                {currentItem.artistName ? `${currentItem.artistName}, ` : ''}
                <span style={{ fontWeight: 400, color: '#48484A', fontStyle: 'italic' }}>{currentItem.title}</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4A4A4A', fontWeight: 500 }}>
                {[formatDot(selectedDate), currentItem.weather].filter(Boolean).join(' · ')}
              </p>
              {(() => {
                const tags = [currentItem.emotionTag1, currentItem.emotionTag2, ...(currentItem.situationTags ?? [])].filter(
                  (t, i, arr): t is string => Boolean(t && t.trim()) && arr.indexOf(t) === i,
                );
                return tags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {tags.map((tag) => (
                      <span key={tag} style={{ fontSize: 10.5, background: MEM.tagBg, color: MEM.text, padding: '4px 10px', borderRadius: 8, fontWeight: 600, border: `1px solid ${MEM.tagBorder}` }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {currentItem.artistDescription?.trim() && (
                <CurationCard label="작가 설명" accent="#4A4A4A">
                  <p style={curationTextStyle}>{currentItem.artistDescription}</p>
                </CurationCard>
              )}
              {currentItem.artworkDescription?.trim() && (
                <CurationCard label="작품 설명" accent={MEM.accent}>
                  <p style={curationTextStyle}>{currentItem.artworkDescription}</p>
                </CurationCard>
              )}
              {selectedEntry?.memo && (
                <CurationCard label="메모란" accent={MEM.memoAccent} background={MEM.memoBg}>
                  <p style={curationTextStyle}>{selectedEntry.memo}</p>
                </CurationCard>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => setLinkTarget(currentItem)}
                style={{ width: '100%', height: 44, background: '#FFFFFF', color: MEM.text, border: '1px solid #E5E5EA', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: MEM.font }}
              >
                참고 링크 보기
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => handleDeleteArtwork(currentItem.refId)}
                  style={{ ...smallTextButton, alignSelf: 'center', color: '#d13b3b', marginTop: 4 }}
                >
                  이 작품을 기록에서 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 담아둔 작품 참고 링크 모달 */}
      {linkTarget && (
        <div
          onClick={closeLinks}
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150, padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${linkTarget.title} 참고 링크`}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 330, background: '#FFFFFF', borderRadius: 20, padding: 18, position: 'relative', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)', fontFamily: MEM.font }}
          >
            <CloseButton onClick={closeLinks} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, paddingRight: 32 }}>
              <ImageWithFallback src={linkTarget.imageUrl} alt={linkTarget.title} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, display: 'block' }} optimizeWidth={120} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: MEM.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkTarget.title}</p>
                {linkTarget.artistName && <p style={{ margin: '2px 0 0', fontSize: 11, color: MEM.textDate }}>{linkTarget.artistName}</p>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.3px', color: MEM.textDate, marginBottom: 8 }}>참고 링크</div>
            {links.status === 'loading' ? (
              <p style={{ margin: 0, fontSize: 12, color: MEM.textMuted }}>링크를 확인하는 중...</p>
            ) : links.status === 'error' ? (
              <p style={{ margin: 0, fontSize: 12, color: MEM.textMuted }}>링크 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
            ) : links.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.items.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 44,
                      background: '#FFFFFF',
                      color: MEM.text,
                      border: '1px solid #E5E5EA',
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: MEM.textMuted, lineHeight: 1.6 }}>이 작품에 등록된 참고 링크가 없어요.</p>
            )}
          </div>
        </div>
      )}

      {/* 풀스크린 확대 (이미지 전용) - 아무 곳이나 누르면 닫힘 */}
      {zoomImage && (
        <div
          onClick={closeZoom}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: 12,
            cursor: 'zoom-out',
          }}
        >
          <img src={zoomImage} alt="" style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }} />
        </div>
      )}
    </div>
  );
}
