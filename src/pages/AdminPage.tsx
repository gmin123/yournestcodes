import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  adminGetMetrics,
  adminListEventLogs,
  AdminAuthError,
  downloadCsv,
  EVENT_COLUMNS,
  formatDateTime,
  SESSION_COLUMNS,
  sessionToRow,
  USER_COLUMNS,
  userToRow,
  verifyApiKey,
  type AdminMetrics,
  type EventLogRecord,
  type Row,
  type SessionRecord,
  type UserRecord,
} from '../utils/adminApi';

// 탭을 닫으면 다시 인증 (sessionStorage)
const KEY_STORAGE = 'rheina_admin_key';
const PREVIEW_ROWS = 200;

type Tab = 'metrics' | 'users' | 'sessions' | 'events';

const colors = {
  bg: '#f5f6f8',
  card: '#ffffff',
  border: '#e3e5ea',
  text: '#1f2330',
  sub: '#6b7080',
  accent: '#6f4fe5',
  ok: '#14804a',
  okBg: '#e7f6ee',
  warn: '#a15c00',
  warnBg: '#fff4e0',
};

const card: CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: '1rem 1.1rem',
};

function readStoredKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function AdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [checking, setChecking] = useState(true);

  // 새로고침해도 같은 탭이면 인증 유지
  useEffect(() => {
    const stored = readStoredKey();
    if (!stored) {
      setChecking(false);
      return;
    }
    verifyApiKey(stored).then((ok) => {
      if (ok) setApiKey(stored);
      setChecking(false);
    });
  }, []);

  const logout = () => {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // 무시
    }
    setApiKey('');
  };

  if (checking) return <div style={{ minHeight: '100vh', background: colors.bg }} />;
  if (!apiKey) return <AdminLogin onSuccess={setApiKey} />;
  return <AdminDashboard apiKey={apiKey} onLogout={logout} />;
}

function AdminLogin({ onSuccess }: { onSuccess: (key: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await verifyApiKey(value);
    setBusy(false);
    if (!ok) {
      setError('비밀번호가 올바르지 않습니다.');
      return;
    }
    try {
      sessionStorage.setItem(KEY_STORAGE, value);
    } catch {
      // 저장 못 해도 이번 화면에서는 계속 사용 가능
    }
    onSuccess(value);
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, color: colors.text }}>
      <form onSubmit={handleSubmit} style={{ ...card, width: '100%', maxWidth: 360, padding: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>관리자</h1>
        <p style={{ margin: '0 0 1.25rem', color: colors.sub, fontSize: '0.85rem' }}>내부 전용 페이지입니다.</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 0.85rem', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '0.95rem', marginBottom: '0.75rem' }}
        />
        {error && <p style={{ margin: '0 0 0.75rem', color: '#c62828', fontSize: '0.8rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={busy || !value}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: 'none', background: colors.accent, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', opacity: busy || !value ? 0.6 : 1 }}
        >
          {busy ? '확인 중...' : '들어가기'}
        </button>
      </form>
    </div>
  );
}

function AdminDashboard({ apiKey, onLogout }: { apiKey: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('metrics');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [events, setEvents] = useState<EventLogRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetMetrics(apiKey);
      setMetrics(result.metrics);
      setUsers(result.users);
      setSessions(result.sessions);
      setEvents(null); // 이벤트 로그는 탭을 열 때 다시 조회
    } catch (e) {
      if (e instanceof AdminAuthError) {
        onLogout();
        return;
      }
      console.error('[admin] 조회 실패', e);
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiKey, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'events' || events) return;
    adminListEventLogs(apiKey)
      .then(setEvents)
      .catch((e) => {
        console.error('[admin] 이벤트 로그 조회 실패', e);
        setError('이벤트 로그를 불러오지 못했습니다.');
      });
  }, [tab, events, apiKey]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'metrics', label: '지표' },
    { id: 'users', label: `회원 (${users.length})` },
    { id: 'sessions', label: `세션 (${sessions.length})` },
    { id: 'events', label: '이벤트 로그' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, fontSize: 14 }}>
      <header style={{ background: colors.card, borderBottom: `1px solid ${colors.border}`, padding: '0.85rem 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem' }}>관리자 대시보드</h1>
            {metrics && <p style={{ margin: 0, color: colors.sub, fontSize: '0.75rem' }}>조회 시각 {formatDateTime(metrics.generatedAt)}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SmallButton onClick={() => void load()} disabled={loading}>{loading ? '불러오는 중...' : '새로고침'}</SmallButton>
            <SmallButton onClick={onLogout}>로그아웃</SmallButton>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 16px 3rem' }}>
        <nav style={{ display: 'flex', gap: 6, marginBottom: '1rem', overflowX: 'auto' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: 999,
                border: `1px solid ${tab === t.id ? colors.accent : colors.border}`,
                background: tab === t.id ? colors.accent : colors.card,
                color: tab === t.id ? '#fff' : colors.text,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error && (
          <div style={{ ...card, borderColor: '#f3c2c2', background: '#fdf0f0', color: '#a12a2a', marginBottom: '1rem' }}>{error}</div>
        )}

        {tab === 'metrics' && (metrics ? <MetricsView metrics={metrics} /> : loading && <p style={{ color: colors.sub }}>불러오는 중...</p>)}

        {tab === 'users' && (
          <DataTable
            title="회원 (users)"
            description="로그인/가입 시 기록됩니다. kakao_ci는 카카오 비즈 앱 CI 동의항목 승인 후에만 값이 들어옵니다."
            rows={users.map(userToRow)}
            columns={USER_COLUMNS}
            filename="users"
          />
        )}

        {tab === 'sessions' && (
          <DataTable
            title="세션 (sessions) · 최근 60일"
            description="브라우저 탭 1개 = 세션 1개. 페이지 이동마다 page_view_count가 1씩 증가합니다."
            rows={sessions.map(sessionToRow)}
            columns={SESSION_COLUMNS}
            filename="sessions"
          />
        )}

        {tab === 'events' &&
          (events ? (
            <DataTable
              title="이벤트 로그 (eventLogs) · 최근 5,000건"
              description="맴 저장·홈페이지 방문·소장하기 클릭 등. status 200 = 성공."
              rows={events as unknown as Row[]}
              columns={EVENT_COLUMNS}
              filename="event-logs"
            />
          ) : (
            <p style={{ color: colors.sub }}>불러오는 중...</p>
          ))}
      </main>
    </div>
  );
}

function SmallButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '0.45rem 0.8rem', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <p style={{ margin: 0, color: colors.sub, fontSize: '0.78rem', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ margin: '0.2rem 0 0', color: colors.sub, fontSize: '0.75rem' }}>{sub}</p>}
    </div>
  );
}

function MetricsView({ metrics: m }: { metrics: AdminMetrics }) {
  const n = (v: number) => v.toLocaleString('ko-KR');

  // 산출 가능 여부: 계산에 필요한 원천 데이터가 실제로 쌓여 있는지
  const checks: { label: string; ok: boolean; how: string }[] = [
    { label: 'MAU', ok: m.sessions30 > 0, how: '최근 30일 sessions의 고유 visitor_id 수' },
    { label: '신규 가입자 수', ok: m.totalUsers > 0, how: 'users.created_at 기간 필터' },
    { label: '주간 재방문율', ok: m.prevWeekVisitors > 0, how: '지난주(8~14일 전) 방문자 중 이번 주(최근 7일)에도 온 비율 · 데이터 2주 이상 필요' },
    { label: 'PV / MAU', ok: m.sessions30 > 0, how: '최근 30일 page_view_count 합 ÷ MAU' },
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        <StatCard label="MAU (최근 30일)" value={n(m.mau)} sub={`로그인 회원 ${n(m.mauLoggedIn)}명`} />
        <StatCard label="PV (최근 30일)" value={n(m.pv30)} sub={`세션 ${n(m.sessions30)}개`} />
        <StatCard label="PV / MAU" value={String(m.pvPerMau)} />
        <StatCard label="신규 가입자 (7일)" value={n(m.newUsers7)} sub={`30일 ${n(m.newUsers30)}명`} />
        <StatCard label="전체 회원" value={n(m.totalUsers)} sub={`kakao_ci 보유 ${n(m.usersWithKakaoCi)}명`} />
        <StatCard
          label="주간 재방문율"
          value={m.prevWeekVisitors > 0 ? `${m.weeklyRevisitRate}%` : '-'}
          sub={`지난주 ${n(m.prevWeekVisitors)}명 중 ${n(m.returnedVisitors)}명 재방문`}
        />
      </div>

      <div style={card}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>지표 산출 가능 여부</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {checks.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  flexShrink: 0,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: c.ok ? colors.okBg : colors.warnBg,
                  color: c.ok ? colors.ok : colors.warn,
                }}
              >
                {c.ok ? '산출 가능' : '데이터 쌓이는 중'}
              </span>
              <span style={{ fontWeight: 700, minWidth: 110 }}>{c.label}</span>
              <span style={{ color: colors.sub, fontSize: '0.8rem', flex: 1, minWidth: 200 }}>{c.how}</span>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        title="일별 추이 (최근 30일)"
        rows={m.daily as unknown as Row[]}
        columns={['date', 'visitors', 'sessions', 'pv', 'signups']}
        filename="daily-metrics"
      />
    </div>
  );
}

function DataTable({ title, description, rows, columns, filename }: { title: string; description?: string; rows: Row[]; columns: string[]; filename: string }) {
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem' }}>{title}</h2>
          {description && <p style={{ margin: '0.2rem 0 0', color: colors.sub, fontSize: '0.78rem' }}>{description}</p>}
        </div>
        <SmallButton onClick={() => downloadCsv(`${filename}-${stamp}.csv`, rows, columns)} disabled={rows.length === 0}>
          CSV 다운로드 ({rows.length.toLocaleString('ko-KR')}건)
        </SmallButton>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#fafbfc' }}>
              {columns.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '0.55rem 0.8rem', color: colors.sub, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '1.5rem', textAlign: 'center', color: colors.sub }}>
                  아직 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {columns.map((c) => (
                    <td key={c} style={{ padding: '0.5rem 0.8rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row[c] == null ? '' : String(row[c])}>
                      {row[c] == null || row[c] === '' ? <span style={{ color: '#b6b9c3' }}>-</span> : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS && (
        <p style={{ margin: 0, padding: '0.6rem 1.1rem', color: colors.sub, fontSize: '0.75rem' }}>
          화면에는 {PREVIEW_ROWS}건까지만 표시됩니다. 전체는 CSV로 받으세요.
        </p>
      )}
    </div>
  );
}
