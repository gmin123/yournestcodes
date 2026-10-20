// ============================================================
// Master v2.5 기반 추천 매칭 점수
// ============================================================
// 사용자가 고른 상황 1개 + 감정 2개(선택 순서)를 Master 데이터로 해석해서
// 작품/공간의 상황·감정 태그와 비교한다.
//
//  1) 상황 일치        : 항목의 상황 태그에 사용자가 고른 상황이 있으면 가산
//  2) Mirror 점수      : 사용자 감정과 같은 감정(최고점) > 같은 상세 클러스터(5. Logic_ClusterDetail)
//  3) Balance 점수     : "긍정적이고 희망적인 감정" 대분류(4. Logic_ClusterMajor) 태그
//  4) 2)·3)의 반영 비율 : 13. Ment_Closing 의 매칭 유형(Mirror/Balance %)을 그대로 사용
//
// 태그 비교는 Master 표시명 기준(공백 차이 무시). 데이터의 오타 몇 개만 별칭으로 연결하고,
// Master 에 없는 태그(예: "인간관계 피로", "추진력")는 점수에 쓰지 않는다(임의 해석 금지).

import {
  CLUSTER_MAJOR,
  getDetailClusterForEmotionName,
  getEmotionByName,
  getSituationByName,
  EMOTIONS,
  SITUATIONS,
} from '../data/emotionMaster';
import { getMatchingType, type MatchingType } from '../data/closingMents';

// 실제 데이터에서 확인된 표기 오류 → Master 표시명 (공백 차이는 별도로 무시하므로 여기엔 넣지 않음)
const TAG_ALIASES: Record<string, string> = {
  답답: '답답함',
  뭉클: '뭉클함',
  내명의혼란: '내면의 혼란',
};

const squash = (value: string) => value.replace(/\s+/g, '');
const MASTER_NAME_BY_SQUASHED = new Map<string, string>(
  [...SITUATIONS, ...EMOTIONS].map((item) => [squash(item.name), item.name]),
);

// 태그 하나를 Master 표시명으로 정규화 (Master 에 없으면 정리된 원문 그대로 반환)
export function normalizeMasterTag(raw: unknown): string {
  const cleaned = String(raw ?? '').replace(/["“”']/g, '').trim();
  if (!cleaned) return '';
  const key = squash(cleaned);
  return MASTER_NAME_BY_SQUASHED.get(key) ?? TAG_ALIASES[key] ?? cleaned;
}

// "새로운 시작/도전, 기분 좋은 날" → ["새로운 시작/도전", "기분 좋은 날"]
// ⚠️ "/" 는 Master 태그명 일부("기쁨/행복", "이직/퇴사")라서 구분자로 쓰지 않음
export function splitTagList(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[,\n;]/)
    .map(normalizeMasterTag)
    .filter(Boolean);
}

const POSITIVE_EMOTION_IDS = new Set(CLUSTER_MAJOR.find((c) => c.id === 'MAJOR_POSITIVE')?.emotionIds ?? []);

export interface MatchProfile {
  situations: string[]; // Master 상황 표시명
  emotions: string[]; // Master 감정 표시명 (선택 순서 유지)
  emotionDetailCodes: (number | undefined)[];
  matchingType: (MatchingType & { code: string }) | null;
  mirrorShare: number; // 0~1
  balanceShare: number; // 0~1
  unknownTags: string[]; // Master 에 없는 입력 태그 - 기존 방식(정확 일치)으로만 사용
}

// 화면에서 넘어오는 태그 배열([...상황, ...감정])을 Master 기준으로 해석
export function buildMatchProfile(tags: string[]): MatchProfile {
  const situations: string[] = [];
  const emotions: string[] = [];
  const unknownTags: string[] = [];
  for (const raw of tags) {
    const tag = normalizeMasterTag(raw);
    if (!tag) continue;
    if (getSituationByName(tag)) situations.push(tag);
    else if (getEmotionByName(tag)) emotions.push(tag);
    else unknownTags.push(tag);
  }

  const matchingType = getMatchingType(emotions[0], emotions[1]);
  // 매칭 유형을 알 수 없으면(감정 1개 등) 사용자의 감정을 그대로 비추는 쪽으로만 계산
  const mirrorShare = matchingType ? (matchingType.kind === 'Mirror' ? matchingType.percent : 100 - matchingType.percent) / 100 : 1;

  return {
    situations,
    emotions,
    emotionDetailCodes: emotions.map((e) => getDetailClusterForEmotionName(e)?.code),
    matchingType,
    mirrorShare,
    balanceShare: 1 - mirrorShare,
    unknownTags,
  };
}

// 항목 태그의 위치 가중치 (emotion_tag_1 이 가장 대표 감정)
const POSITION_WEIGHTS = [1, 0.8, 0.6, 0.4];
// 1차 선택 감정을 2차보다 조금 더 반영 (클로징 멘트도 선택 순서를 구분함)
const USER_EMOTION_WEIGHTS = [1, 0.85];

const SITUATION_POINTS = 8;
const EXACT_EMOTION_POINTS = 10;
const SAME_CLUSTER_POINTS = 5;
const POSITIVE_POINTS = 10;

export interface MatchTarget {
  emotionTags: string[]; // 대표 감정부터 순서대로
  situationTags: string[];
}

export function scoreMatch(profile: MatchProfile, target: MatchTarget): number {
  const emotionTags = target.emotionTags.map(normalizeMasterTag).filter(Boolean);
  const situationTags = target.situationTags.map(normalizeMasterTag).filter(Boolean);

  // 1) 상황 일치
  const situationScore = profile.situations.some((s) => situationTags.includes(s)) ? SITUATION_POINTS : 0;

  // 2) Mirror / 3) Balance
  let mirror = 0;
  let balance = 0;
  emotionTags.forEach((tag, index) => {
    const positionWeight = POSITION_WEIGHTS[index] ?? POSITION_WEIGHTS[POSITION_WEIGHTS.length - 1];
    const tagCode = getDetailClusterForEmotionName(tag)?.code;

    let best = 0;
    profile.emotions.forEach((emotion, i) => {
      const userWeight = USER_EMOTION_WEIGHTS[i] ?? USER_EMOTION_WEIGHTS[USER_EMOTION_WEIGHTS.length - 1];
      if (tag === emotion) best = Math.max(best, EXACT_EMOTION_POINTS * userWeight);
      else if (tagCode !== undefined && tagCode === profile.emotionDetailCodes[i]) best = Math.max(best, SAME_CLUSTER_POINTS * userWeight);
    });
    mirror += best * positionWeight;

    const emotionId = getEmotionByName(tag)?.id;
    if (emotionId && POSITIVE_EMOTION_IDS.has(emotionId)) balance += POSITIVE_POINTS * positionWeight;
  });

  // Master 에 없는 입력 태그는 기존처럼 정확히 같은 태그만 인정
  const legacy = profile.unknownTags.filter((t) => emotionTags.includes(t) || situationTags.includes(t)).length * EXACT_EMOTION_POINTS;

  const score = situationScore + profile.mirrorShare * mirror + profile.balanceShare * balance + legacy;
  return Math.round(score * 100) / 100;
}
