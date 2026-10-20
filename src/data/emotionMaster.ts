// ============================================================
// Master Data — Master_Tagging_Mapping_Clustering_Logic_v2.4.xlsx
// ============================================================
// ⚠️ 이 파일의 단어/문장/태그명/ID/분류명/매핑은 클라이언트가 제공한 원본 엑셀을
// 그대로 옮긴 것입니다. 표현이 어색하거나 분류가 일반적인 감정 분류와 다르게
// 느껴져도 임의로 교정·재해석하지 않습니다. (예: 성취감/용기 → RE:ST 쉼,
// 설렘 → "불안과 불확실성의 감정" 클러스터 — 원본 그대로)
//
// 화면에는 name(한글 표시명)을 그대로 노출하고, 내부 로직(상황→감정 필터링 등)은
// id를 기준으로 연결합니다. 원본 표시명에 공백 차이가 있어도 id 매핑은 깨지지 않습니다.

export interface SituationMaster {
  id: string; // SIT_01 ~ SIT_15
  name: string;
  d2cMapping: string;
}

export interface EmotionMaster {
  id: string; // EMO_01 ~ EMO_23
  name: string;
  d2cMapping: string;
}

export interface ClusterMajor {
  id: string;
  name: string; // 대분류 감정 클러스터명 (원본 그대로)
  emotionIds: string[];
}

export interface ClusterDetail {
  id: string;
  code: number; // 1~11 - Ment_Closing 코드("A-B") 조회에 쓰이는 클러스터 번호
  name: string; // 상세 감정 클러스터명 (원본 그대로)
  emotionIds: string[];
  needs: string[]; // 관련 욕구
}

export interface ToneAndManner {
  clusterMajorId: string;
  description: string;
}

export interface Ment {
  id: string;
  text: string;
}

// ------------------------------------------------------------
// 1. 상황 태그 (SIT_01 ~ SIT_15)
// ------------------------------------------------------------
export const SITUATIONS: SituationMaster[] = [
  { id: 'SIT_01', name: '번아웃', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_02', name: '이직/퇴사', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_03', name: '인간관계', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_04', name: '실패 경험 후', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_05', name: '가족 간 갈등', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_06', name: '반복되는 일상', d2cMapping: 'RE:ST 쉼' },
  { id: 'SIT_07', name: '여행 중', d2cMapping: 'RE:START 시작' },
  { id: 'SIT_08', name: '이별', d2cMapping: 'RE:START 시작' },
  { id: 'SIT_09', name: '펫로스', d2cMapping: 'RE:START 시작' },
  { id: 'SIT_10', name: '내면의 혼란', d2cMapping: 'RE:START 시작' },
  { id: 'SIT_11', name: '새로운 시작/도전', d2cMapping: 'RE:START 시작' },
  { id: 'SIT_12', name: '기분 좋은 날', d2cMapping: 'RE:VERSE 전환' },
  { id: 'SIT_13', name: '컨디션 난조', d2cMapping: 'RE:VERSE 전환' },
  { id: 'SIT_14', name: '시험이나 학업 스트레스', d2cMapping: 'RE:VERSE 전환' },
  { id: 'SIT_15', name: '돈/경제적 문제로 고민', d2cMapping: 'RE:VERSE 전환' },
];

// ------------------------------------------------------------
// 2. 감정 태그 (EMO_01 ~ EMO_23)
// ------------------------------------------------------------
export const EMOTIONS: EmotionMaster[] = [
  { id: 'EMO_01', name: '슬픔', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_02', name: '피로', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_03', name: '지침', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_04', name: '불안', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_05', name: '긴장', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_06', name: '혼란', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_07', name: '성취감', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_08', name: '억울함', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_09', name: '용기', d2cMapping: 'RE:ST 쉼' },
  { id: 'EMO_10', name: '희망', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_11', name: '무기력', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_12', name: '외로움', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_13', name: '답답함', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_14', name: '자책', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_15', name: '수치심', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_16', name: '소외감', d2cMapping: 'RE:START 시작' },
  { id: 'EMO_17', name: '공허함', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_18', name: '고립감', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_19', name: '향수', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_20', name: '설렘', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_21', name: '의욕', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_22', name: '뭉클함', d2cMapping: 'RE:VERSE 전환' },
  { id: 'EMO_23', name: '기쁨/행복', d2cMapping: 'RE:VERSE 전환' },
];

// ------------------------------------------------------------
// 3. 상황별 노출 감정 매핑 (Mapping_SituationEmotion) — situationId → emotionId[]
// ------------------------------------------------------------
export const SITUATION_EMOTION_MAP: Record<string, string[]> = {
  SIT_01: ['EMO_02', 'EMO_03', 'EMO_11', 'EMO_12', 'EMO_22'], // 번아웃 → 피로,지침,무기력,외로움,뭉클함
  SIT_02: ['EMO_04', 'EMO_05', 'EMO_06', 'EMO_09', 'EMO_10', 'EMO_21'], // 이직/퇴사 → 불안,긴장,혼란,용기,희망,의욕
  SIT_03: ['EMO_12', 'EMO_13', 'EMO_16', 'EMO_17', 'EMO_18', 'EMO_22'], // 인간관계 → 외로움,답답함,소외감,공허함,고립감,뭉클함
  SIT_04: ['EMO_01', 'EMO_08', 'EMO_14', 'EMO_15', 'EMO_09', 'EMO_10'], // 실패 경험 후 → 슬픔,억울함,자책,수치심,용기,희망
  SIT_05: ['EMO_01', 'EMO_13', 'EMO_08', 'EMO_18', 'EMO_22'], // 가족 간 갈등 → 슬픔,답답함,억울함,고립감,뭉클함
  SIT_06: ['EMO_02', 'EMO_03', 'EMO_11', 'EMO_13', 'EMO_17', 'EMO_22', 'EMO_23'], // 반복되는 일상 → 피로,지침,무기력,답답함,공허함,뭉클함,기쁨/행복
  SIT_07: ['EMO_23', 'EMO_20', 'EMO_22', 'EMO_21', 'EMO_07'], // 여행 중 → 기쁨/행복,설렘,뭉클함,의욕,성취감
  SIT_08: ['EMO_01', 'EMO_12', 'EMO_19', 'EMO_22'], // 이별 → 슬픔,외로움,향수,뭉클함
  SIT_09: ['EMO_01', 'EMO_19', 'EMO_14', 'EMO_22'], // 펫로스 → 슬픔,향수,자책,뭉클함
  SIT_10: ['EMO_04', 'EMO_05', 'EMO_06', 'EMO_13', 'EMO_18', 'EMO_17'], // 내면의 혼란 → 불안,긴장,혼란,답답함,고립감,공허함
  SIT_11: ['EMO_05', 'EMO_04', 'EMO_06', 'EMO_07', 'EMO_21', 'EMO_20', 'EMO_22', 'EMO_23'], // 새로운 시작/도전 → 긴장,불안,혼란,성취감,의욕,설렘,뭉클함,기쁨/행복
  SIT_12: ['EMO_23', 'EMO_07', 'EMO_20', 'EMO_21', 'EMO_22'], // 기분 좋은 날 → 기쁨/행복,성취감,설렘,의욕,뭉클함
  SIT_13: ['EMO_02', 'EMO_03', 'EMO_12', 'EMO_13', 'EMO_11'], // 컨디션 난조 → 피로,지침,외로움,답답함,무기력
  SIT_14: ['EMO_04', 'EMO_05', 'EMO_03', 'EMO_13', 'EMO_07', 'EMO_21'], // 시험이나 학업 스트레스 → 불안,긴장,지침,답답함,성취감,의욕
  SIT_15: ['EMO_04', 'EMO_05', 'EMO_13', 'EMO_08', 'EMO_18'], // 돈/경제적 문제로 고민 → 불안,긴장,답답함,억울함,고립감
};

// ------------------------------------------------------------
// 4. 대분류 감정 클러스터
// ------------------------------------------------------------
export const CLUSTER_MAJOR: ClusterMajor[] = [
  {
    id: 'MAJOR_NEGATIVE',
    name: '부정적이고 취약한 감정',
    emotionIds: ['EMO_01', 'EMO_03', 'EMO_02', 'EMO_11', 'EMO_12', 'EMO_18', 'EMO_13', 'EMO_08', 'EMO_14', 'EMO_15', 'EMO_16', 'EMO_17'],
  },
  {
    id: 'MAJOR_ANXIOUS',
    name: '불안과 불확실성의 감정',
    emotionIds: ['EMO_04', 'EMO_05', 'EMO_06', 'EMO_20'],
  },
  {
    id: 'MAJOR_POSITIVE',
    name: '긍정적이고 희망적인 감정',
    emotionIds: ['EMO_07', 'EMO_09', 'EMO_10', 'EMO_19', 'EMO_21', 'EMO_22', 'EMO_23'],
  },
];

// ------------------------------------------------------------
// 5. 상세 감정 클러스터 (+ 관련 욕구)
// ------------------------------------------------------------
export const CLUSTER_DETAIL: ClusterDetail[] = [
  { id: 'DETAIL_01', code: 1, name: '정신적/육체적 소진', emotionIds: ['EMO_02', 'EMO_03', 'EMO_11'], needs: ['휴식', '회복', '활력'] },
  { id: 'DETAIL_02', code: 2, name: '슬픔과 상실감', emotionIds: ['EMO_01'], needs: ['위로', '공감', '애도', '치유'] },
  { id: 'DETAIL_03', code: 3, name: '후회', emotionIds: ['EMO_14', 'EMO_15'], needs: ['용서', '인정', '개선'] },
  { id: 'DETAIL_04', code: 4, name: '관계적 단절', emotionIds: ['EMO_12', 'EMO_18', 'EMO_16', 'EMO_17'], needs: ['소속감', '연결감', '인정', '사랑'] },
  { id: 'DETAIL_05', code: 5, name: '억압과 불공정', emotionIds: ['EMO_13', 'EMO_08'], needs: ['해방', '정의', '표현'] },
  { id: 'DETAIL_06', code: 6, name: '미래에 대한 염려', emotionIds: ['EMO_04', 'EMO_05', 'EMO_20'], needs: ['안정감', '통제', '예측 가능성'] },
  { id: 'DETAIL_07', code: 7, name: '인지적 혼란', emotionIds: ['EMO_06'], needs: ['명료성', '이해', '질서'] },
  { id: 'DETAIL_08', code: 8, name: '성취와 인정', emotionIds: ['EMO_07'], needs: ['유능감', '인정', '자존감'] },
  { id: 'DETAIL_09', code: 9, name: '희망과 용기', emotionIds: ['EMO_10', 'EMO_09', 'EMO_21'], needs: ['성장', '도전', '극복', '가능성'] },
  { id: 'DETAIL_10', code: 10, name: '향수와 감동', emotionIds: ['EMO_19', 'EMO_22'], needs: ['연결', '아름다움', '회상'] },
  { id: 'DETAIL_11', code: 11, name: '행복과 즐거움', emotionIds: ['EMO_23'], needs: ['즐거움', '만족', '긍정적 경험'] },
];

// ------------------------------------------------------------
// 6. Tone & Manner (대분류 감정 클러스터 기준)
// ------------------------------------------------------------
export const TONE_AND_MANNER: ToneAndManner[] = [
  { clusterMajorId: 'MAJOR_NEGATIVE', description: '위로와 공감이 핵심. 낮고 따뜻한 어조, 조심스러운 문장 구조' },
  { clusterMajorId: 'MAJOR_ANXIOUS', description: '안정감과 명료성이 핵심. 지적이고 논리적이며 안정적인 어조' },
  { clusterMajorId: 'MAJOR_POSITIVE', description: '에너지 증폭과 확신이 핵심. 밝고 리드미컬하며 힘 있는 어조' },
];

// ------------------------------------------------------------
// 7. 상황 질문 멘트 (MS1 ~ MS5)
// ------------------------------------------------------------
export const ASK_SITUATION_MENTS: Ment[] = [
  { id: 'MS1', text: '지금 당신을 힘들게 하는 상황을 선택해주세요.\n억지로 괜찮은 척하지 않아도 돼요.' },
  { id: 'MS2', text: '당신의 감정이 시작된 곳을 알려주세요.\n그 시작점부터 우리가 함께할게요.' },
  { id: 'MS3', text: '오늘 당신에게 가장 큰 영향을 준 상황은 무엇인가요? \n당신의 모습 그대로, 그 이야기에 깊이 공감하겠습니다.' },
  { id: 'MS4', text: '지금 이 복잡한 마음의 시작점을 찾아볼까요?\n혼자가 아니에요, 함께 천천히 걸어갈게요.' },
  { id: 'MS5', text: '당신의 하루를 만든 이야기를 들려주세요.\n어떤 이야기든, 이곳에서는 안전합니다.' },
];

// ------------------------------------------------------------
// 8. 감정 질문 멘트 (ME1 ~ ME5)
// ------------------------------------------------------------
export const ASK_EMOTION_MENTS: Ment[] = [
  { id: 'ME1', text: '그 상황 속에서 느껴지는 감정은 여러 가지일 거예요.\n가장 솔직하게 느껴지는 2가지를 골라주세요.' },
  { id: 'ME2', text: '그 상황에서 당신이 느끼는 감정을 찾아볼게요.\n마음에 가장 가까운 2가지를 선택해주세요.' },
  { id: 'ME3', text: '당신이 선택한 상황 안에는 여러 감정이 함께 있을 거예요.\n그중 가장 강하게 느껴지는 2가지를 알려주세요.' },
  { id: 'ME4', text: '좋아요, 이제 그 안에서 느껴지는 감정을 찾아볼게요.\n지금 당신 마음을 가장 솔직하게 담은 2가지를 골라주세요.' },
  { id: 'ME5', text: '이제 당신 안에 있는 감정을 우리 함께 봐요.\n느껴지는 대로, 2가지를 선택해 주세요.' },
];

// ============================================================
// 조회 헬퍼 — 화면/로직에서는 이 함수들을 통해서만 접근
// ============================================================

export function getSituationById(id: string): SituationMaster | undefined {
  return SITUATIONS.find((s) => s.id === id);
}

export function getSituationByName(name: string): SituationMaster | undefined {
  return SITUATIONS.find((s) => s.name === name);
}

export function getEmotionById(id: string): EmotionMaster | undefined {
  return EMOTIONS.find((e) => e.id === id);
}

export function getEmotionByName(name: string): EmotionMaster | undefined {
  return EMOTIONS.find((e) => e.name === name);
}

// 상황 표시명 → 그 상황에서 노출해야 할 감정 목록(표시명 배열, 원본 순서 유지)
export function getEmotionsForSituationName(situationName: string): EmotionMaster[] {
  const situation = getSituationByName(situationName);
  if (!situation) return [];
  const emotionIds = SITUATION_EMOTION_MAP[situation.id] ?? [];
  return emotionIds
    .map((id) => getEmotionById(id))
    .filter((e): e is EmotionMaster => Boolean(e));
}

export function getMajorClusterForEmotionName(emotionName: string): ClusterMajor | undefined {
  const emotion = getEmotionByName(emotionName);
  if (!emotion) return undefined;
  return CLUSTER_MAJOR.find((c) => c.emotionIds.includes(emotion.id));
}

export function getDetailClusterForEmotionName(emotionName: string): ClusterDetail | undefined {
  const emotion = getEmotionByName(emotionName);
  if (!emotion) return undefined;
  return CLUSTER_DETAIL.find((c) => c.emotionIds.includes(emotion.id));
}

export function getToneAndMannerForMajorId(clusterMajorId: string): string | undefined {
  return TONE_AND_MANNER.find((t) => t.clusterMajorId === clusterMajorId)?.description;
}

// 선택한 감정 2개(표시명)로 클러스터/D2C/tone 을 한 번에 판단
// 두 감정이 서로 다른 대분류에 속할 수 있으므로 배열로 반환 (임의로 하나만 고르지 않음)
export interface EmotionClusterResult {
  emotionName: string;
  emotionId?: string;
  d2cMapping?: string;
  majorCluster?: ClusterMajor;
  detailCluster?: ClusterDetail;
  toneAndManner?: string;
}

export function resolveEmotionClusters(emotionNames: string[]): EmotionClusterResult[] {
  return emotionNames.map((emotionName) => {
    const emotion = getEmotionByName(emotionName);
    const majorCluster = getMajorClusterForEmotionName(emotionName);
    const detailCluster = getDetailClusterForEmotionName(emotionName);
    return {
      emotionName,
      emotionId: emotion?.id,
      d2cMapping: emotion?.d2cMapping,
      majorCluster,
      detailCluster,
      toneAndManner: majorCluster ? getToneAndMannerForMajorId(majorCluster.id) : undefined,
    };
  });
}
