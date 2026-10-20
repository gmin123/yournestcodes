/**
 * 큐레이션 DB v2.0 엑셀 → Firestore 'data' 컬렉션 dry-run 검증 스크립트
 *
 * ⚠️ 이 스크립트는 Firestore에 아무것도 쓰지 않습니다 (읽기 전용).
 *    - 엑셀 파싱
 *    - 기존 'data' 컬렉션(7,236개 문서 규모) 전수 조회
 *    - 제목 + image_url 이중 신호로 갱신/신규/수동검토 분류
 *    - image_url의 실제 Content-Type을 라이브로 확인(추측 금지 원칙 준수)
 *    - index 사용 현황 감사 및 신규 배정안 설계
 *    - content_type/recommendation_type 분포 조사
 *    - 갱신 대상이 될 기존 문서의 백업 JSON 생성
 *    - JSON/CSV 리포트를 scripts/output/ 에 저장
 *
 * 실행: node scripts/dry-run-curation-v2.cjs "C:/Users/WD/Downloads/yournest_curation_db_v2.0.xlsx"
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = process.argv[2] || 'C:/Users/WD/Downloads/yournest_curation_db_v2.0.xlsx';
const OUT_DIR = path.join(__dirname, 'output');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const firebaseConfig = {
  apiKey: 'AIzaSyDQgm4ey4FKH2ieB7LmLxoWwAdA3jLg-sc',
  authDomain: 'yournest-today-d2a73.firebaseapp.com',
  projectId: 'yournest-today-d2a73',
  storageBucket: 'yournest-today-d2a73.firebasestorage.app',
  messagingSenderId: '360692815974',
  appId: '1:360692815974:web:7b4cadbedd6abf0752f5a7',
};
const FIRESTORE_DB_NAME = 'mydb'; // ⚠️ named database. (default) 아님.

function normTitle(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function normUrl(s) {
  return String(s ?? '').trim();
}
function toCsvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => toCsvCell(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

// --- 1. 엑셀 실제 데이터 행 수 재확인 (헤더 제외, 완전 빈 줄 제외) ---
function loadExcelRows() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rangeRef = sheet['!ref'];

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let lastNonEmpty = -1;
  matrix.forEach((r, i) => {
    if (r.some((c) => String(c).trim() !== '')) lastNonEmpty = i;
  });
  const totalDataRows = lastNonEmpty; // matrix[0]은 헤더이므로 lastNonEmpty(0-based)가 곧 데이터 행 수

  const objRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }).slice(0, totalDataRows);

  return { sheetName, rangeRef, totalDataRows, rows: objRows };
}

// --- 2. image_url Content-Type 라이브 검증 (추측 없이 실제 응답으로 판정) ---
async function verifyImageUrls(urls, { concurrency = 10, timeoutMs = 9000 } = {}) {
  const unique = [...new Set(urls)];
  const result = new Map(); // url -> { ok, status, contentType, isImage, error }
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const idx = cursor++;
      const url = unique[idx];
      let entry;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
          res = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YourNestDryRun/1.0)' },
          });
          // 일부 서버는 HEAD를 막아둠(405/403) → GET으로 재시도
          if (res.status === 405 || res.status === 403 || res.status === 501) {
            res = await fetch(url, {
              method: 'GET',
              redirect: 'follow',
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YourNestDryRun/1.0)', Range: 'bytes=0-1024' },
            });
          }
        } finally {
          clearTimeout(timer);
        }
        const contentType = res.headers.get('content-type') || '';
        entry = {
          ok: res.ok,
          status: res.status,
          contentType,
          isImage: contentType.toLowerCase().startsWith('image/'),
          error: null,
        };
      } catch (e) {
        entry = { ok: false, status: null, contentType: '', isImage: false, error: String(e.message || e) };
      }
      result.set(url, entry);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, unique.length) }, () => worker());
  await Promise.all(workers);
  return result;
}

async function main() {
  console.log('=== 큐레이션 DB v2.0 dry-run 검증 시작 (쓰기 없음) ===');
  console.log('엑셀:', EXCEL_PATH);

  // --- 엑셀 로드 ---
  const { sheetName, rangeRef, totalDataRows, rows } = loadExcelRows();
  console.log(`시트: ${sheetName} / 원본 range: ${rangeRef} / 재확인된 실제 데이터 행 수: ${totalDataRows}`);

  // --- Firestore 연결 & 전수 조회 (읽기 전용) ---
  const { initializeApp } = await import('firebase/app');
  const { initializeFirestore, collection, getDocs } = await import('firebase/firestore');
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, { experimentalForceLongPolling: true }, FIRESTORE_DB_NAME);
  const col = collection(db, 'data');

  const snap = await getDocs(col);
  // ⚠️ 순서 중요: 일부 기존 문서는 데이터 안에 값이 빈 문자열인 'id' 필드를 그대로 갖고 있음
  // (예전 엑셀의 빈 id 컬럼이 그대로 저장된 흔적). ...d.data()를 먼저 펼치고 실제 Firestore
  // 문서 ID(d.id)를 마지막에 덮어써야, 그 내부 'id' 필드가 진짜 문서 ID를 가리는 사고를 막을 수 있음.
  const existing = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  console.log(`기존 'data' 컬렉션 문서 수(전수 조회): ${existing.length}`);
  const dataFieldIdCollisionCount = snap.docs.filter((d) => {
    const raw = d.data();
    return Object.prototype.hasOwnProperty.call(raw, 'id');
  }).length;
  if (dataFieldIdCollisionCount > 0) {
    console.log(
      `⚠️ 데이터 필드 안에 'id'라는 이름의 필드를 별도로 갖고 있는 기존 문서: ${dataFieldIdCollisionCount}개 (진짜 문서 ID와 별개 — 값은 대부분 빈 문자열로 추정, 이번 스크립트는 실제 Firestore 문서 ID만 사용함)`,
    );
  }

  // --- index 감사 ---
  const indexEntries = existing
    .map((d) => ({ id: d.id, index: d.index }))
    .filter((e) => e.index !== undefined);
  const nullIndexDocs = indexEntries.filter((e) => e.index === null);
  const numericIndexEntries = indexEntries.filter((e) => typeof e.index === 'number');
  const indexCounts = {};
  numericIndexEntries.forEach((e) => {
    indexCounts[e.index] = indexCounts[e.index] || [];
    indexCounts[e.index].push(e.id);
  });
  const dupIndexGroups = Object.entries(indexCounts).filter(([, ids]) => ids.length > 1);
  const usedIndexSet = new Set(numericIndexEntries.map((e) => e.index));
  const maxIndex = numericIndexEntries.length ? Math.max(...numericIndexEntries.map((e) => e.index)) : 0;
  const minIndex = numericIndexEntries.length ? Math.min(...numericIndexEntries.map((e) => e.index)) : 0;
  let gapCount = 0;
  for (let i = minIndex; i <= maxIndex; i++) if (!usedIndexSet.has(i)) gapCount++;

  console.log(
    `index 감사: 숫자형 index ${numericIndexEntries.length}개, null/누락 ${existing.length - numericIndexEntries.length}개, ` +
      `중복 index 그룹 ${dupIndexGroups.length}개, 사용범위 ${minIndex}~${maxIndex} 중 빈 번호(gap) ${gapCount}개`,
  );

  // --- content_type / recommendation_type 분포 (전수) ---
  const typeDist = {};
  existing.forEach((d) => {
    const t = d.content_type || d.recommendation_type || '(값 없음)';
    typeDist[t] = (typeDist[t] || 0) + 1;
  });
  console.log('content_type/recommendation_type 분포(전수 7236건 기준):', typeDist);

  // --- 기존 DB 내부의 image_url 재사용(중복) 감사 ---
  const imgToExistingDocs = {};
  existing.forEach((d) => {
    const u = normUrl(d.image_url);
    if (!u) return;
    (imgToExistingDocs[u] = imgToExistingDocs[u] || []).push(d.id);
  });
  const existingImgDupGroups = Object.entries(imgToExistingDocs).filter(([, ids]) => ids.length > 1);
  console.log(`기존 DB 안에서 image_url이 2개 이상 문서에 재사용된 그룹: ${existingImgDupGroups.length}개`);

  // --- 제목(정규화) 인덱스 ---
  const titleToExistingDocs = {};
  existing.forEach((d) => {
    const t = normTitle(d.title);
    if (!t) return;
    (titleToExistingDocs[t] = titleToExistingDocs[t] || []).push(d.id);
  });

  // --- 엑셀 내부 자체 중복(작가+제목) 그룹 ---
  const excelKeyGroups = {};
  rows.forEach((r, i) => {
    const k = normTitle(r.artist_name) + '|||' + normTitle(r.artwork_title);
    (excelKeyGroups[k] = excelKeyGroups[k] || []).push(i);
  });
  // 같은 (작가+제목) 그룹 내에서 image_url이 서로 다른 경우 = 한 작품에 이미지가 여러 개일 가능성
  const multiImagePerArtwork = Object.entries(excelKeyGroups)
    .filter(([, idxs]) => idxs.length > 1)
    .map(([k, idxs]) => {
      const imgs = new Set(idxs.map((i) => normUrl(rows[i].image_url)));
      return { key: k, rowCount: idxs.length, distinctImageUrls: imgs.size };
    })
    .filter((g) => g.distinctImageUrls > 1);

  // --- 행별 분류 (제목 + image_url 이중 신호, 둘 다 동일 문서를 가리켜야 '확정 갱신') ---
  const extRe = /\.(jpg|jpeg|png|webp|gif|bmp|tiff)(\?.*)?$/i;
  const classified = rows.map((r, i) => {
    const title = String(r.artwork_title || '').trim();
    const artist = String(r.artist_name || '').trim();
    const img = String(r.image_url || '').trim();
    const nTitle = normTitle(title);
    const nImg = normUrl(img);

    const imgMatches = nImg && imgToExistingDocs[nImg] ? imgToExistingDocs[nImg] : [];
    const titleMatches = nTitle && titleToExistingDocs[nTitle] ? titleToExistingDocs[nTitle] : [];

    const hasFragment = img.includes('#');
    const looksLikeFileExt = extRe.test(img.split('#')[0].split('?')[0]);

    let status, matchedDocId, reasons;
    const imgUnique = imgMatches.length === 1;
    const titleUnique = titleMatches.length === 1;

    if (imgUnique && titleUnique && imgMatches[0] === titleMatches[0]) {
      status = 'update_confirmed';
      matchedDocId = imgMatches[0];
      reasons = ['제목·image_url 모두 같은 기존 문서와 일치'];
    } else if (imgMatches.length === 0 && titleMatches.length === 0) {
      status = 'new_confirmed';
      matchedDocId = null;
      reasons = ['기존 DB에 제목·image_url 모두 없음'];
    } else {
      status = 'manual_review';
      matchedDocId = imgUnique ? imgMatches[0] : titleUnique ? titleMatches[0] : null;
      reasons = [];
      if (imgMatches.length > 1) reasons.push(`image_url이 기존 문서 ${imgMatches.length}개와 동시에 일치(이미지 재사용 의심)`);
      if (titleMatches.length > 1) reasons.push(`제목이 기존 문서 ${titleMatches.length}개와 일치(흔한 제목)`);
      if (imgUnique && titleUnique && imgMatches[0] !== titleMatches[0])
        reasons.push('제목 일치 문서와 image_url 일치 문서가 서로 다름');
      if (imgUnique && titleMatches.length === 0) reasons.push('image_url은 일치하지만 제목이 기존 DB와 다름');
      if (imgMatches.length === 0 && titleUnique) reasons.push('제목은 일치하지만 image_url이 기존 DB와 다름(동일 작품의 다른 이미지이거나 동명이작 가능)');
    }

    const dupGroupSize = excelKeyGroups[normTitle(artist) + '|||' + normTitle(title)].length;
    if (dupGroupSize > 1) reasons.push(`엑셀 내 동일 작가+제목 행 ${dupGroupSize}개 존재(중복 입력 가능성)`);

    return {
      rowIndex: i + 2, // 엑셀 실제 행 번호(1행=헤더)
      artist_name: artist,
      artwork_title: title,
      image_url: img,
      has_url_fragment: hasFragment,
      looks_like_image_extension: looksLikeFileExt,
      status,
      matched_existing_doc_id: matchedDocId,
      image_matches_count: imgMatches.length,
      title_matches_count: titleMatches.length,
      match_reason: reasons.join(' / '),
      raw: r,
    };
  });

  const updateConfirmed = classified.filter((r) => r.status === 'update_confirmed');
  const newConfirmed = classified.filter((r) => r.status === 'new_confirmed');
  const manualReview = classified.filter((r) => r.status === 'manual_review');

  console.log(
    `\n분류 결과 — 확정 갱신: ${updateConfirmed.length} / 확정 신규: ${newConfirmed.length} / 수동 검토: ${manualReview.length} (합계 ${classified.length})`,
  );

  // --- update_confirmed 안에서 다시 한번 중복 매칭 검증: 같은 기존 문서를 2개 이상의 엑셀 행이 동시에 가리키는지 ---
  const targetDocUsage = {};
  updateConfirmed.forEach((r) => {
    (targetDocUsage[r.matched_existing_doc_id] = targetDocUsage[r.matched_existing_doc_id] || []).push(r.rowIndex);
  });
  const doubleClaimedDocs = Object.entries(targetDocUsage).filter(([, rowIdxs]) => rowIdxs.length > 1);
  if (doubleClaimedDocs.length > 0) {
    console.log(`⚠️ 같은 기존 문서를 2개 이상의 엑셀 행이 동시에 갱신 대상으로 지목함: ${doubleClaimedDocs.length}건 → 자동으로 manual_review로 강등`);
  }
  const doubleClaimedDocIds = new Set(doubleClaimedDocs.map(([id]) => id));
  const finalUpdateConfirmed = [];
  const demotedToReview = [];
  updateConfirmed.forEach((r) => {
    if (doubleClaimedDocIds.has(r.matched_existing_doc_id)) {
      r.status = 'manual_review';
      r.match_reason += ' / 동일 기존 문서를 여러 엑셀 행이 동시에 지목(재검증 중 강등)';
      demotedToReview.push(r);
    } else {
      finalUpdateConfirmed.push(r);
    }
  });
  const finalManualReview = [...manualReview, ...demotedToReview];

  console.log(
    `재검증 후 최종 — 확정 갱신: ${finalUpdateConfirmed.length} / 확정 신규: ${newConfirmed.length} / 수동 검토: ${finalManualReview.length}`,
  );

  // --- image_url 실제 Content-Type 라이브 검증 ---
  console.log('\nimage_url 574개 실제 응답(Content-Type) 확인 중... (외부 사이트 호출, 다소 시간 소요)');
  const allUrls = rows.map((r) => String(r.image_url || '').trim()).filter(Boolean);
  const verifyMap = await verifyImageUrls(allUrls);

  let verifiedImageCount = 0,
    verifiedPageCount = 0,
    unreachableCount = 0;
  classified.forEach((r) => {
    const v = verifyMap.get(r.image_url);
    r.live_content_type = v ? v.contentType : '';
    r.live_is_image = v ? v.isImage : false;
    r.live_check_error = v ? v.error : 'checked-skipped';
    if (!v || v.error) unreachableCount++;
    else if (v.isImage) verifiedImageCount++;
    else verifiedPageCount++;
  });
  console.log(
    `실제 이미지로 확인됨: ${verifiedImageCount} / 웹페이지·기타로 확인됨: ${verifiedPageCount} / 접속 실패·타임아웃: ${unreachableCount}`,
  );

  // --- index 배정안 (신규 확정 행만 대상, 충돌 없는 정수 순차 배정) ---
  const indexPlan = [];
  let cursorIdx = maxIndex + 1;
  const claimed = new Set();
  newConfirmed.forEach((r) => {
    while (usedIndexSet.has(cursorIdx) || claimed.has(cursorIdx)) cursorIdx++;
    claimed.add(cursorIdx);
    indexPlan.push({
      rowIndex: r.rowIndex,
      artist_name: r.artist_name,
      artwork_title: r.artwork_title,
      assigned_index: cursorIdx,
    });
    cursorIdx++;
  });

  // --- 실제 값 변화가 있는지 필드 단위로 재검증 (엑셀 v2.0 vs 기존 문서 v1 계열) ---
  // 이 컬렉션 안에는 이미 이전 버전(v1)의 같은 큐레이션 엑셀이 artworkUploadService.ts로
  // 업로드돼 있는 문서가 상당수 섞여 있음(artist_name/artist_bio_ko 등이 이미 채워진 채로 발견됨).
  // → "필드가 비어서 채운다"가 아니라 "값이 실제로 달라졌는가"를 기준으로 갱신 필요 여부를 재판단해야 함.
  const ENRICH_FIELD_MAP = [
    ['artist_name', 'artist_name'],
    ['artist_bio_ko', 'artist_description'], // 엑셀 컬럼명 → 앱(RecommendationModal)이 실제로 읽는 필드명
    ['emotion_tag_3', 'emotion_tag_3'],
    ['emotion_tag_4', 'emotion_tag_4'],
    ['situation_tag_1', 'situation_tag_1'],
    ['art_movement', 'art_movement'],
    ['production_year', 'production_year'],
    ['medium', 'medium'],
    ['artwork_size', 'artwork_size'],
  ];
  function computeFieldChanges(oldDoc, rawRow) {
    const changes = [];
    ENRICH_FIELD_MAP.forEach(([excelCol, targetField]) => {
      const newVal = rawRow[excelCol] !== undefined ? String(rawRow[excelCol]).trim() : '';
      if (!newVal) return; // 엑셀에 값이 없으면 기존 값을 그대로 두므로 '변경'이 아님
      const oldVal =
        oldDoc[targetField] !== undefined && oldDoc[targetField] !== null ? String(oldDoc[targetField]).trim() : '';
      if (newVal !== oldVal) {
        changes.push({ field: targetField, excel_column: excelCol, before: oldVal || '(없음)', after: newVal });
      }
    });
    return changes;
  }

  const existingById = new Map(existing.map((d) => [d.id, d]));
  finalUpdateConfirmed.forEach((r) => {
    const old = existingById.get(r.matched_existing_doc_id) || {};
    r.field_changes = computeFieldChanges(old, r.raw);
    r.has_real_change = r.field_changes.length > 0;
  });
  const realChangeRows = finalUpdateConfirmed.filter((r) => r.has_real_change);
  const noChangeRows = finalUpdateConfirmed.filter((r) => !r.has_real_change);
  console.log(
    `\n갱신 후보 ${finalUpdateConfirmed.length}건 중 실제 값 차이가 있는 행: ${realChangeRows.length} / 이미 동일해서 실질 변경 없음: ${noChangeRows.length}`,
  );

  // --- before/after 필드 diff 예시 (실제 변경이 있는 행 우선으로 최대 8건) ---
  const diffSamples = realChangeRows.slice(0, 8).map((r) => {
    const old = existingById.get(r.matched_existing_doc_id) || {};
    const raw = r.raw;
    return {
      existing_doc_id: r.matched_existing_doc_id,
      artwork_title: r.artwork_title,
      field_changes: r.field_changes,
      before: {
        title: old.title ?? '',
        artist_name: old.artist_name ?? '(없음)',
        artist_description: old.artist_description ?? '(없음)',
        emotion_tag_1: old.emotion_tag_1 ?? '',
        emotion_tag_2: old.emotion_tag_2 ?? '',
        emotion_tag_3: old.emotion_tag_3 ?? '(없음)',
        image_url: old.image_url ?? '',
        index: old.index ?? null,
        content_type: old.content_type ?? old.recommendation_type ?? '(없음)',
      },
      after_proposed: {
        title: old.title ?? raw.artwork_title, // 제목은 기존 값 유지(빈값 덮어쓰기 금지 원칙)
        artist_name: raw.artist_name || old.artist_name || '(엑셀에도 없음)',
        artist_description: raw.artist_bio_ko || old.artist_description || '(엑셀에도 없음)',
        emotion_tag_1: old.emotion_tag_1 || raw.emotion_tag_1 || '',
        emotion_tag_2: old.emotion_tag_2 || raw.emotion_tag_2 || '',
        emotion_tag_3: raw.emotion_tag_3 || old.emotion_tag_3 || '(없음)',
        image_url: old.image_url ?? '(기존 값 유지 — 엑셀 페이지 URL로 덮어쓰지 않음)',
        index: old.index ?? '(기존 값 유지)',
        content_type: '(이번 작업에서 자동 지정하지 않음 — 별도 승인 필요)',
        source_excel_image_url_candidate: raw.image_url || '',
      },
      note: '실제 반영 아님 — dry-run 미리보기',
    };
  });

  // --- 기존 문서 백업 (갱신/수동검토 대상이 될 수 있는 기존 문서 전체를 지금 시점 그대로 저장) ---
  const backupTargetIds = new Set([
    ...finalUpdateConfirmed.map((r) => r.matched_existing_doc_id),
    ...finalManualReview.map((r) => r.matched_existing_doc_id).filter(Boolean),
  ]);
  const backupDocs = existing.filter((d) => backupTargetIds.has(d.id));

  // --- 출력 ---
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = {
    generated_at: new Date().toISOString(),
    firebase_project: firebaseConfig.projectId,
    firestore_database: FIRESTORE_DB_NAME,
    excel_file: EXCEL_PATH,
    excel_sheet: sheetName,
    excel_raw_range: rangeRef,
    excel_confirmed_data_rows: totalDataRows,
    existing_collection: 'data',
    existing_doc_count: existing.length,
    classification: {
      update_confirmed: finalUpdateConfirmed.length,
      update_confirmed_with_real_change: realChangeRows.length,
      update_confirmed_no_real_change: noChangeRows.length,
      new_confirmed: newConfirmed.length,
      manual_review: finalManualReview.length,
      demoted_from_double_claim: demotedToReview.length,
    },
    image_url_live_check: {
      verified_real_image: verifiedImageCount,
      verified_web_page_or_other: verifiedPageCount,
      unreachable_or_error: unreachableCount,
      total_checked: allUrls.length,
    },
    index_audit: {
      existing_numeric_index_count: numericIndexEntries.length,
      existing_null_or_missing_index_count: existing.length - numericIndexEntries.length,
      duplicate_index_groups: dupIndexGroups.length,
      duplicate_index_detail: dupIndexGroups.map(([idx, ids]) => ({ index: Number(idx), doc_ids: ids })),
      min_index: minIndex,
      max_index: maxIndex,
      gap_count_within_range: gapCount,
      new_index_plan_count: indexPlan.length,
    },
    content_type_distribution_full_7236: typeDist,
    existing_db_internal_image_url_duplicate_groups: existingImgDupGroups.length,
    excel_internal_multi_image_per_artwork_groups: multiImagePerArtwork.length,
    double_claimed_existing_docs: doubleClaimedDocs.map(([id, rowIdxs]) => ({ existing_doc_id: id, excel_rows: rowIdxs })),
    backup_doc_count: backupDocs.length,
  };

  fs.writeFileSync(path.join(OUT_DIR, `summary-${STAMP}.json`), JSON.stringify(summary, null, 2), 'utf8');

  fs.writeFileSync(
    path.join(OUT_DIR, `classification-full-${STAMP}.json`),
    JSON.stringify(
      classified.map((r) => ({ ...r, raw: undefined })),
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(OUT_DIR, `classification-${STAMP}.csv`),
    toCsv(
      classified.map((r) => ({
        row: r.rowIndex,
        artist_name: r.artist_name,
        artwork_title: r.artwork_title,
        status: r.status,
        matched_existing_doc_id: r.matched_existing_doc_id || '',
        image_matches_count: r.image_matches_count,
        title_matches_count: r.title_matches_count,
        image_url: r.image_url,
        live_content_type: r.live_content_type,
        live_is_real_image: r.live_is_image,
        reason: r.match_reason,
      })),
      [
        'row',
        'artist_name',
        'artwork_title',
        'status',
        'matched_existing_doc_id',
        'image_matches_count',
        'title_matches_count',
        'image_url',
        'live_content_type',
        'live_is_real_image',
        'reason',
      ],
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(OUT_DIR, `update-candidates-${STAMP}.json`),
    JSON.stringify(
      finalUpdateConfirmed.map((r) => ({
        row: r.rowIndex,
        existing_doc_id: r.matched_existing_doc_id,
        artist_name: r.artist_name,
        artwork_title: r.artwork_title,
        image_url_verified_real_image: r.live_is_image,
        has_real_change: r.has_real_change,
        field_changes: r.field_changes,
      })),
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(OUT_DIR, `new-candidates-${STAMP}.json`),
    JSON.stringify(
      newConfirmed.map((r) => {
        const plan = indexPlan.find((p) => p.rowIndex === r.rowIndex);
        return {
          row: r.rowIndex,
          artist_name: r.artist_name,
          artwork_title: r.artwork_title,
          image_url_verified_real_image: r.live_is_image,
          image_registration_status: r.live_is_image ? '등록 가능' : '이미지 등록 보류(실제 이미지 URL 미확인)',
          assigned_index_plan: plan ? plan.assigned_index : null,
        };
      }),
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(OUT_DIR, `manual-review-${STAMP}.json`),
    JSON.stringify(
      finalManualReview.map((r) => ({
        row: r.rowIndex,
        artist_name: r.artist_name,
        artwork_title: r.artwork_title,
        candidate_existing_doc_id: r.matched_existing_doc_id,
        image_matches_count: r.image_matches_count,
        title_matches_count: r.title_matches_count,
        reason: r.match_reason,
      })),
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(path.join(OUT_DIR, `index-assignment-plan-${STAMP}.json`), JSON.stringify(indexPlan, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `diff-samples-${STAMP}.json`), JSON.stringify(diffSamples, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `backup-existing-docs-${STAMP}.json`), JSON.stringify(backupDocs, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(OUT_DIR, `existing-db-image-url-duplicates-${STAMP}.json`),
    JSON.stringify(existingImgDupGroups.map(([url, ids]) => ({ image_url: url, doc_ids: ids })), null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(OUT_DIR, `excel-multi-image-per-artwork-${STAMP}.json`),
    JSON.stringify(multiImagePerArtwork, null, 2),
    'utf8',
  );

  console.log(`\n=== 완료. 결과 파일: ${OUT_DIR} (접미사 -${STAMP}) ===`);
}

main().catch((err) => {
  console.error('❌ dry-run 실행 중 오류:', err);
  process.exit(1);
});
