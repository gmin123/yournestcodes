import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet, UploadCloud, Download, RefreshCw } from 'lucide-react';
import {
  MUSEUM_GALLERY_COLLECTION,
  parseMuseumGalleryWorkbook,
  saveMuseumGalleryRecords,
} from '../utils/museumGalleryService';
import {
  ARTWORK_COLLECTION,
  ARTWORK_COLLECTION_ALT,
  parseArtworkWorkbook,
  saveArtworkRecords,
} from '../utils/artworkUploadService';
import { EVENT_LOG_COLLECTION, exportEventLogs, getEventLogSummary, type EventLogSummary } from '../utils/analyticsService';

const PREVIEW_LIMIT = 20;

type Row = Record<string, unknown>;

interface ParseOutput {
  records: Row[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  totalRows: number;
}

interface UploaderConfig {
  id: 'museum' | 'artwork';
  tabLabel: string;
  collectionName: string;
  // 저장할 컬렉션을 고를 수 있는 경우에만 채움 (예: 작품 탭 → data / firstdata 버튼)
  collectionOptions?: string[];
  intro: string;
  parse: (buffer: ArrayBuffer) => ParseOutput;
  save: (
    records: Row[],
    onProgress: (saved: number, total: number) => void,
    targetCollection?: string,
  ) => Promise<number>;
  previewColumns: { key: string; label: string }[];
}

const UPLOADERS: UploaderConfig[] = [
  {
    id: 'museum',
    tabLabel: '미술관·갤러리',
    collectionName: MUSEUM_GALLERY_COLLECTION,
    intro:
      '미술관·갤러리 엑셀을 올리면 각 행을 JSON으로 변환해 아래 컬렉션에 저장합니다. 첫 시트만 사용하고 첫 행은 헤더로 인식합니다.',
    parse: (buffer) => parseMuseumGalleryWorkbook(buffer) as unknown as ParseOutput,
    save: (records, onProgress) =>
      saveMuseumGalleryRecords(records as never, onProgress),
    previewColumns: [
      { key: 'category', label: '구분' },
      { key: 'name', label: '이름' },
      { key: 'phone', label: '전화번호' },
      { key: 'address', label: '주소' },
      { key: 'latitude', label: '위도' },
      { key: 'longitude', label: '경도' },
      { key: 'operatingHours', label: '운영시간' },
      { key: 'website', label: '웹사이트' },
      { key: 'situation', label: '상황' },
      { key: 'emotion', label: '감정' },
      { key: 'message', label: '메시지' },
      { key: 'image_url', label: '이미지URL' },
    ],
  },
  {
    id: 'artwork',
    tabLabel: '작품 (A~AP)',
    collectionName: ARTWORK_COLLECTION,
    collectionOptions: [ARTWORK_COLLECTION, ARTWORK_COLLECTION_ALT],
    intro:
      '작품 엑셀(A~AP)을 올리면 원본 컬럼을 모두 보존하면서 앱이 읽는 핵심 필드(title·description·reason·image_url·emotion_tag_1~3·index)를 맞춰 아래에서 고른 컬렉션에 저장합니다.',
    parse: (buffer) => parseArtworkWorkbook(buffer) as unknown as ParseOutput,
    save: (records, onProgress, targetCollection) =>
      saveArtworkRecords(records as never, onProgress, targetCollection),
    previewColumns: [
      { key: 'index', label: 'index' },
      { key: 'title', label: 'title' },
      { key: 'emotion_tag_1', label: 'emotion_tag_1' },
      { key: 'emotion_tag_2', label: 'emotion_tag_2' },
      { key: 'emotion_tag_3', label: 'emotion_tag_3' },
      { key: 'image_url', label: 'image_url' },
      { key: 'reason', label: 'reason' },
      { key: 'description', label: 'description' },
    ],
  },
];

type PageMode = UploaderConfig['id'] | 'logs';

export function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<PageMode>('museum');
  const config = useMemo(() => UPLOADERS.find((u) => u.id === mode), [mode]);

  // 저장할 컬렉션 선택 (collectionOptions가 있는 탭에서만 의미 있음, 기본은 첫 번째 옵션)
  const [targetCollection, setTargetCollection] = useState(config?.collectionOptions?.[0] ?? config?.collectionName ?? '');

  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ saved: number; total: number } | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const records = parseResult?.records ?? [];

  function reset() {
    setFileName('');
    setParseResult(null);
    setError(null);
    setDoneMessage(null);
    setProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function switchMode(next: PageMode) {
    if (next === mode) return;
    setMode(next);
    const nextConfig = UPLOADERS.find((u) => u.id === next);
    setTargetCollection(nextConfig?.collectionOptions?.[0] ?? nextConfig?.collectionName ?? '');
    reset();
  }

  async function handleFile(file: File) {
    if (!config) return;
    setError(null);
    setDoneMessage(null);
    setParseResult(null);
    setProgress(null);
    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = config.parse(buffer);
      if (result.records.length === 0) {
        setError('엑셀에서 유효한 데이터 행을 찾지 못했습니다. 첫 시트에 헤더 + 데이터가 있는지 확인해주세요.');
      }
      setParseResult(result);
    } catch (err) {
      console.error('❌ 엑셀 파싱 실패:', err);
      setError('파일을 읽는 중 오류가 발생했습니다. .xlsx / .xls / .csv 파일인지 확인해주세요.');
    } finally {
      setParsing(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleUpload() {
    if (!config || records.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    setDoneMessage(null);
    setProgress({ saved: 0, total: records.length });

    try {
      const saved = await config.save(
        records,
        (savedCount, total) => {
          setProgress({ saved: savedCount, total });
        },
        targetCollection,
      );
      setDoneMessage(`✅ "${targetCollection}" 컬렉션에 ${saved}개 문서를 저장했습니다.`);
    } catch (err) {
      console.error('❌ 파이어스토어 저장 실패:', err);
      setError('파이어스토어 저장 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요.');
    } finally {
      setSaving(false);
    }
  }

  const jsonPreview = JSON.stringify(records.slice(0, 3), null, 2);

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111111' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem 1rem 5rem' }}>
        {/* 앱바 */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0 1.25rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              marginRight: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              color: '#111111',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>엑셀 → 파이어스토어 업로드</h2>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {UPLOADERS.map((u) => {
            const active = u.id === mode;
            return (
              <button
                key={u.id}
                onClick={() => switchMode(u.id)}
                disabled={saving}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '0.75rem',
                  border: active ? '1px solid #111111' : '1px solid #dddddd',
                  background: active ? '#111111' : '#ffffff',
                  color: active ? '#ffffff' : '#555555',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                {u.tabLabel}
              </button>
            );
          })}
          <button
            onClick={() => switchMode('logs')}
            disabled={saving}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.75rem',
              border: mode === 'logs' ? '1px solid #111111' : '1px solid #dddddd',
              background: mode === 'logs' ? '#111111' : '#ffffff',
              color: mode === 'logs' ? '#ffffff' : '#555555',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            검수 로그
          </button>
        </div>

        {mode === 'logs' && <EventLogPanel />}

        {config && (
        <>
        <p style={{ color: '#666666', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: config.collectionOptions ? '0.9rem' : '1.5rem' }}>
          {config.intro}
          {!config.collectionOptions && (
            <>
              <br />
              저장 위치:{' '}
              <code style={{ background: '#f1f1f1', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                {config.collectionName}
              </code>
            </>
          )}
        </p>

        {/* 저장할 컬렉션 선택 (작품 탭: data / firstdata) */}
        {config.collectionOptions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#666666', marginRight: '0.25rem' }}>저장 위치:</span>
            {config.collectionOptions.map((name) => {
              const active = name === targetCollection;
              return (
                <button
                  key={name}
                  onClick={() => setTargetCollection(name)}
                  disabled={saving}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: active ? '1px solid #111111' : '1px solid #dddddd',
                    background: active ? '#111111' : '#ffffff',
                    color: active ? '#ffffff' : '#555555',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    fontFamily: 'inherit',
                    cursor: saving ? 'default' : 'pointer',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {/* 파일 선택 영역 */}
        <label
          htmlFor="upload-file"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            border: '2px dashed #d5d5d5',
            borderRadius: '1rem',
            padding: '2.5rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#fafafa',
          }}
        >
          <UploadCloud size={32} color="#888888" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {fileName || '엑셀/CSV 파일 선택 (.xlsx, .xls, .csv)'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#999999' }}>클릭해서 파일을 고르세요</span>
          <input
            id="upload-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={onInputChange}
            style={{ display: 'none' }}
          />
        </label>

        {parsing && (
          <p style={{ marginTop: '1rem', color: '#666666', fontSize: '0.85rem' }}>파일을 분석하는 중...</p>
        )}

        {error && (
          <p
            style={{
              marginTop: '1rem',
              padding: '0.75rem 0.9rem',
              borderRadius: '0.75rem',
              background: '#fdecec',
              color: '#c0392b',
              fontSize: '0.82rem',
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
        )}

        {parseResult && records.length > 0 && (
          <>
            {/* 요약 */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <SummaryChip label="변환된 행" value={`${records.length} / ${parseResult.totalRows}`} />
              <SummaryChip label="인식된 핵심 열" value={`${parseResult.matchedHeaders.length}`} />
              <SummaryChip label="원본 열 개수" value={`${records[0] ? Object.keys(records[0]).length : 0}`} />
            </div>

            {/* 헤더 매핑 */}
            <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: '#555555', lineHeight: 1.8 }}>
              <strong style={{ color: '#111111' }}>매핑된 열:</strong>{' '}
              {parseResult.matchedHeaders.join(', ') || '없음'}
              {parseResult.unmatchedHeaders.length > 0 && (
                <>
                  <br />
                  <strong style={{ color: '#8a6d3b' }}>그대로 저장되는 열:</strong>{' '}
                  {parseResult.unmatchedHeaders.join(', ')}
                </>
              )}
            </div>

            {/* 미리보기 테이블 */}
            <div
              style={{
                marginTop: '1rem',
                border: '1px solid #ededed',
                borderRadius: '0.75rem',
                overflowX: 'auto',
              }}
            >
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: '#f7f7f7' }}>
                    {config.previewColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: 'left',
                          padding: '0.5rem 0.65rem',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #ededed',
                          color: '#555555',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, PREVIEW_LIMIT).map((record, i) => (
                    <tr key={i}>
                      {config.previewColumns.map((col) => {
                        const value = record[col.key];
                        const text =
                          value === null || value === undefined || value === '' ? '—' : String(value);
                        return (
                          <td
                            key={col.key}
                            title={text}
                            style={{
                              padding: '0.45rem 0.65rem',
                              borderBottom: '1px solid #f3f3f3',
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > PREVIEW_LIMIT && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#999999' }}>
                상위 {PREVIEW_LIMIT}개 행만 표시 중 · 전체 {records.length}개 저장됩니다.
              </p>
            )}

            {/* JSON 미리보기 */}
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#555555', fontWeight: 600 }}>
                <FileSpreadsheet size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                변환된 JSON 미리보기 (상위 3개)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0.9rem',
                  borderRadius: '0.6rem',
                  fontSize: '0.72rem',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {jsonPreview}
              </pre>
            </details>

            {/* 저장 */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button
                onClick={handleUpload}
                disabled={saving}
                style={{
                  padding: '0.85rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: '#111111',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving
                  ? `저장 중... ${progress ? `${progress.saved}/${progress.total}` : ''}`
                  : `${targetCollection}에 ${records.length}개 저장`}
              </button>
              <button
                onClick={reset}
                disabled={saving}
                style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #dddddd',
                  background: '#ffffff',
                  color: '#555555',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: saving ? 'default' : 'pointer',
                }}
              >
                초기화
              </button>
            </div>

            {progress && saving && (
              <div style={{ marginTop: '0.9rem', height: 6, background: '#eeeeee', borderRadius: 999 }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: '#111111',
                    width: `${Math.round((progress.saved / progress.total) * 100)}%`,
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
            )}

            {doneMessage && (
              <p
                style={{
                  marginTop: '1rem',
                  padding: '0.8rem 0.95rem',
                  borderRadius: '0.75rem',
                  background: '#e9f7ef',
                  color: '#1e8449',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {doneMessage}
              </p>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}

function EventLogPanel() {
  const [summary, setSummary] = useState<EventLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const s = await getEventLogSummary();
      setSummary(s);
    } catch (err) {
      console.error('❌ 검수 로그 조회 실패:', err);
      setError('로그를 불러오는 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const logs = await exportEventLogs();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventLogs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ 로그 내보내기 실패:', err);
      alert('로그 내보내기에 실패했습니다. 콘솔을 확인해주세요.');
    } finally {
      setExporting(false);
    }
  }

  const targetMet = summary ? summary.successRate >= 95 : null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ color: '#666666', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1rem' }}>
        버튼 클릭 시 기록되는 익명 세션 이벤트 로그(성공 200 / 실패 500)를 집계합니다. 이 프로젝트엔 별도 백엔드
        서버가 없어서, Firestore{' '}
        <code style={{ background: '#f1f1f1', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
          {EVENT_LOG_COLLECTION}
        </code>{' '}
        컬렉션을 검수 증빙용 원천 로그 저장소로 사용합니다.
      </p>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid #dddddd',
            background: '#ffffff',
            color: '#555555',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          <RefreshCw size={14} /> {loading ? '불러오는 중...' : '새로고침'}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting || !summary || summary.total === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 1rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: '#111111',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: exporting ? 'default' : 'pointer',
            opacity: exporting || !summary || summary.total === 0 ? 0.5 : 1,
          }}
        >
          <Download size={14} /> {exporting ? '내보내는 중...' : '원천 로그 JSON 다운로드'}
        </button>
      </div>

      {error && (
        <p
          style={{
            padding: '0.75rem 0.9rem',
            borderRadius: '0.75rem',
            background: '#fdecec',
            color: '#c0392b',
            fontSize: '0.82rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </p>
      )}

      {summary && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <SummaryChip label="전체 이벤트" value={`${summary.total}`} />
            <SummaryChip label="성공(200)" value={`${summary.successCount}`} />
            <SummaryChip label="실패(500)" value={`${summary.failCount}`} />
            <div
              style={{
                border: `1px solid ${targetMet ? '#bfe3cc' : '#f3c7c0'}`,
                borderRadius: '0.75rem',
                padding: '0.6rem 0.9rem',
                minWidth: 140,
                background: targetMet ? '#eefaf1' : '#fdf1ef',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#999999', marginBottom: 2 }}>
                작동 성공률 (목표 95%)
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: targetMet ? '#1e8449' : '#c0392b' }}>
                {summary.successRate}%
              </div>
            </div>
          </div>

          {summary.total === 0 ? (
            <p style={{ color: '#999999', fontSize: '0.85rem' }}>
              아직 쌓인 로그가 없습니다. 결과 화면에서 저장/방문 버튼을 눌러보면 여기에 집계됩니다.
            </p>
          ) : (
            <div
              style={{
                border: '1px solid #ededed',
                borderRadius: '0.75rem',
                overflowX: 'auto',
              }}
            >
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f7f7f7' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.65rem', borderBottom: '1px solid #ededed', color: '#555555' }}>이벤트 타입</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.65rem', borderBottom: '1px solid #ededed', color: '#555555' }}>전체</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.65rem', borderBottom: '1px solid #ededed', color: '#555555' }}>성공</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.65rem', borderBottom: '1px solid #ededed', color: '#555555' }}>실패</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.65rem', borderBottom: '1px solid #ededed', color: '#555555' }}>성공률</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byType).map(([type, s]) => (
                    <tr key={type}>
                      <td style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f3f3f3' }}>{type}</td>
                      <td style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>{s.total}</td>
                      <td style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>{s.success}</td>
                      <td style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>{s.fail}</td>
                      <td style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid #f3f3f3', textAlign: 'right' }}>
                        {s.total > 0 ? Math.round((s.success / s.total) * 1000) / 10 : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#999999' }}>
            최근 최대 5,000건 기준 집계입니다.
          </p>
        </>
      )}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid #ededed',
        borderRadius: '0.75rem',
        padding: '0.6rem 0.9rem',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: '0.7rem', color: '#999999', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
