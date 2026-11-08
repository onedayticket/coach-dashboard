/**
 * ==============================================================================
 * [4주 온라인 운동/식단 습관화 코칭 프로그램 대시보드 - app.js]
 * ==============================================================================
 * [풀스택 수석 개발자 구현 내역]
 * 1. [요구사항 1] 지침서 관리 모달 제거 -> 대시보드 자체 인라인 뷰로 통합 구현
 * 2. [요구사항 2] Git Tag 스타일 프로그램 참여 코스 태그화
 * 3. [요구사항 3] 태그 드롭다운 fixed popper 적용으로 스크롤 잘림 현상 완벽 해결
 * 4. 구글 시트 DB 연동 및 동적 컬럼 보존 매핑
 * 5. Gemini AI 백엔드 실행: 운동 루틴/식단 생성
 * 6. 공복 체중 그래프 (WeightLog, 회원번호 기준) · 태그별 체중 비교
 * 7. 코치 관리 기록 (CoachLog): 오늘 보드 · 기록 창 · 회원 상세 타임라인
 * ==============================================================================
 */

// ==============================================================================
// [보안 아키텍처: 코치 마스터 비밀번호 검증]
// 1. 온라인(GAS 연동): 구글 시트 백엔드 [스크립트 속성 (COACH_PASSWORD)]에서 안전하게 검증
// 2. 오프라인(Mock 모드): 단방향 암호화 해시(SHA-256)로 검증 (평문 노출 원천 차단)
// ※ 비밀번호 변경: 구글 시트 상단 [🤖 코칭 자동화] > [🔑 코치 마스터 비밀번호 설정]에서 변경
// ==============================================================================
const COACH_OFFLINE_PASSWORD_HASH = '297ddf5c3d11c1cfdc16118d667afb3d68fa7fe4eb60f7e723b86479eb4700b5';

// 로컬 스토리지 키
const STORAGE_GAS_URL_KEY = 'coach_dash_gas_api_url_v2';

// 기본 구글 Apps Script 웹앱 연동 URL (대시보드 및 회원 페이지 자동 직결용)
const DEFAULT_GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzkKdXbM2KNOC2PvBcOtzxR13wt5Em_JUQdvotr22wdb2hxwYTc2eGZmzSHUArqGSNYWQ/exec';

const STORAGE_GEMINI_KEY = 'coach_dash_gemini_key_v1';
const STORAGE_MODEL_PREF_KEY = 'coach_dash_model_pref_v1';
const STORAGE_READ_PENDING_NOTIS_KEY = 'coach_dash_read_pending_notis_v1';
const STORAGE_COACH_AUTH_KEY = 'coach_authenticated';
const STORAGE_COACH_TOKEN_KEY = 'coach_session_token'; // GAS 서버가 발급한 코치 로그인 토큰 (모든 시트 조회/저장에 필수)
const STORAGE_COACH_DATA_CACHE_KEY = 'coach_dash_data_cache_v4'; // 마지막으로 불러온 시트 데이터 사본 (새로고침 즉시 표시용, 잠금/로그아웃 시 삭제)
const LEGACY_COACH_DATA_CACHE_KEYS = ['coach_dash_data_cache_v2', 'coach_dash_data_cache_v3']; // 예전 구조(코치 기록·AI 분석 없음) 저장본 - 시작할 때 지움
const STORAGE_COACH_FAIL_COUNT_KEY = 'coach_fail_count';
const STORAGE_COACH_LOCK_UNTIL_KEY = 'coach_lock_until';

// 기본 Mock 데이터 (시트 미연동 또는 테스트 시 즉각 동작)
const MOCK_DB = {
  members: [
    {
      '회원번호': 'M001',
      '이름': '김민수',
      '상태': '유효',
      '태그': '4주-체중감량반',
      '나이': 31,
      '성별': '남성',
      '키': 178,
      '체중': 82.5,
      '시작 체중': 82.5,
      '직업/근무시간': 'IT 개발자 (09:00~19:00, 좌식근무)',
      '운동 경력': '헬스 3개월 미만',
      '주당 운동 횟수': '주 1회',
      '참여목적': '4주 체중 -3kg 감량 (82.5kg → 79.5kg) 및 저녁 야식 습관 개선',
      '운동 루틴 수정 제안 지침': '허리 부담 줄이는 코어 및 맨몸 하체 중심 (데드리프트 제외)',
      '식단 수정 제안 지침': '야근 시 편의점 단백질바/무가당 두유 대체, 20시 이후 금식',
      '현재 제안 운동 루틴': `[김민수 회원 주간 운동 루틴]
- 월/수/금 (저녁 20:30, 35분):
  1. 웜업: 고관절 스트레칭 & 버드독 10회 3세트
  2. 맨몸 스쿼트 15회 4세트
  3. 무릎 대고 푸시업 10회 3세트
  4. 슬로우 버피 12회 3세트
  5. 쿨다운: 폼롤러 허리/둔근 이완 10분`,
      '현재 제안 식단': `[김민수 회원 맞춤 식단]
- 아침: 그릭요거트 100g + 사과 반 쪽 + 삶은 달걀 1개
- 점심 (구내식당): 밥 2/3 공기 + 국물 제외 건더기 위주 + 단백질 반찬 2배
- 간식: 견과류 1봉 또는 아몬드브리즈 언스위트
- 저녁: 닭가슴살 샐러드 (발사믹 드레싱) + 삶은 고구마 100g
- 수분: 하루 2L 이상 (텀블러 4회)`,
      '체중 목표': '',
      '운동 목적': ''
    },
    {
      '회원번호': 'M002',
      '이름': '이지원',
      '상태': '유효',
      '태그': '4주-식단집중반',
      '나이': 28,
      '성별': '여성',
      '키': 164,
      '체중': 58.2,
      '시작 체중': 58.2,
      '직업/근무시간': '브랜드 마케터 (외근 잦음)',
      '운동 경력': '필라테스 1년',
      '주당 운동 횟수': '주 2회',
      '참여목적': '군살 정리, 클린 식단 정착 및 퇴근 후 디저트 폭식 방지',
      '운동 루틴 수정 제안 지침': '퇴근 후 20분 릴렉스 요가 및 매트 필라테스',
      '식단 수정 제안 지침': '점심 포케/샐러드 위주, 카페라떼 대신 아메리카노',
      '현재 제안 운동 루틴': `[이지원 회원 주간 운동 루틴]
- 화/목/토: 매트 필라테스 코어 강화 30분 + 실내 인터벌 워킹 20분`,
      '현재 제안 식단': `[이지원 회원 식단]
- 아침: 두유 + 사과 1개
- 점심: 현미 포케 (연어 또는 닭가슴살)
- 저녁: 단호박 에그슬럿 + 방울토마토`,
      '체중 목표': '',
      '운동 목적': ''
    },
    {
      '회원번호': 'M003',
      '이름': '박준혁',
      '상태': '휴면',
      '태그': '4주-직장인루틴반',
      '나이': 35,
      '성별': '남성',
      '키': 172,
      '체중': 75.0,
      '시작 체중': 75.0,
      '직업/근무시간': '해외영업팀 과장 (회식 잦음)',
      '운동 경력': '웨이트 2년차',
      '주당 운동 횟수': '주 3회',
      '참여목적': '복부 내장지방 감량 및 주 1회 이하 음주 절제',
      '운동 루틴 수정 제안 지침': '',
      '식단 수정 제안 지침': '',
      '현재 제안 운동 루틴': '',
      '현재 제안 식단': '',
      '체중 목표': '',
      '운동 목적': ''
    }
  ],
  // WeightLog 시트 (날짜 | 회원번호 | 이름 | 체중 | 입력자 | 기록시각) - 미리보기에서 오늘 보드가 보이도록 오늘 기준 날짜로 만듦
  weights: buildMockWeights(),
  // CoachLog 시트 (날짜 | 회원번호 | 이름 | 식단 상태 | 운동 상태 | 식단 태그 | 운동 태그 | 메모 | 코치 한마디 | 다음에 확인 | 확인 완료 | 작성시각 | 수정시각)
  coachLogs: buildMockCoachLogs(),
  // CoachSettings 시트 (식단 태그 | 운동 태그 | 자주 쓰는 문구)
  coachSettings: {
    dietTags: ['과식', '야식', '음주', '단백질 부족', '잘 지킴'],
    exerciseTags: ['통증', '질문', '강도↑', '누락'],
    phrases: ['오늘도 기록해 주셔서 감사해요!', '물 2L 꼭 챙겨 주세요.', '무리하지 말고 스트레칭 먼저 해 주세요.']
  },
  guidelines: {
    philosophy: '완벽함보다는 지속 가능성에 집중합니다. 단기간 극단적 절식 대신 평생 유지할 수 있는 작은 습관의 복리 효과를 지향합니다. 실패한 날도 과정의 일부로 인정합니다.',
    exercise: '초보자는 주 3~4회, 하루 20~30분 저강도~중강도 루틴으로 성공 경험을 축적합니다. 점진적 과부하와 관절 부상 방지(스트레칭 10분 필수)를 최우선 원칙으로 합니다.',
    diet: '극단적 탄수화물 제한을 지양하고, 매 끼니 양질의 단백질 20~30g과 식이섬유를 기본 탑재합니다. 가공식품과 단순당을 줄이고 수분 1.5~2L 섭취를 강조합니다.',
    analysis: '통증·부상 언급, 식단 주의 3일 이상, 체중 기록 3일 이상 끊김, 주간 변화율 ±1.5% 초과를 특이사항으로 봅니다. 형식: 첫 줄 요약, 이어서 근거와 코치가 할 일.'
  },
  // AnalysisLog 시트 (분석일시 | 회원번호 | 이름 | 특이사항_있음 | 보고) - getAll과 같이 최근 보고만 전문, 이전 보고는 요약
  analyses: buildMockAnalyses(),
  analysisFailures: {}
};

// [미리보기 전용] 샘플 AI 분석 보고
function buildMockAnalyses() {
  const today = localDateKey();
  return [
    { '분석일시': `${shiftDateKey(today, -2)} 23:04:00`, '회원번호': 'M001', '이름': '김민수', '특이사항_있음': false, '요약': '체중 순조롭게 감소 중, 특이사항 없음' },
    { '분석일시': `${shiftDateKey(today, -1)} 23:05:00`, '회원번호': 'M001', '이름': '김민수', '특이사항_있음': true, '요약': '왼쪽 무릎 통증 확인 필요 (3일째 미확인)',
      '보고': '왼쪽 무릎 통증 확인 필요 (3일째 미확인)\n- 근거: 3일 전 메모 \'스쿼트 때 왼쪽 무릎 시큰\', 다음에 확인이 아직 확인 전\n- 체중: 최근 7일 평균이 그 전 7일보다 0.9kg 감소로 순조로움\n- 코치 할 일: 하체 루틴 강도 조정 여부 확인' },
    { '분석일시': `${shiftDateKey(today, -1)} 23:06:00`, '회원번호': 'M002', '이름': '이지원', '특이사항_있음': false, '요약': '회식 후 체중 소폭 상승, 지켜보기',
      '보고': '회식 후 체중 소폭 상승, 지켜보기\n- 근거: 최근 7일 평균 변화 +0.1kg, 운동 안 함 1회\n- 코치 할 일: 주말 필라테스 참여 여부만 확인' }
  ];
}

// [미리보기 전용] 오늘 기준 며칠 전 날짜로 샘플 체중·코치 기록 생성
function buildMockWeights() {
  const today = localDateKey();
  const rows = [];
  [[-13, 82.5], [-12, 82.1], [-11, 81.9], [-10, 81.6], [-9, 81.4], [-7, 81.2], [-6, 80.9], [-4, 80.7], [-3, 80.8], [-2, 80.4], [-1, 80.2], [0, 80.1]]
    .forEach(([d, w]) => rows.push({ '날짜': shiftDateKey(today, d), '회원번호': 'M001', '이름': '김민수', '체중': w, '입력자': '회원' }));
  [[-10, 58.2], [-9, 58.0], [-7, 57.7], [-5, 57.8], [-4, 57.6], [-2, 57.9], [-1, 58.1]]
    .forEach(([d, w]) => rows.push({ '날짜': shiftDateKey(today, d), '회원번호': 'M002', '이름': '이지원', '체중': w, '입력자': '회원' }));
  return rows;
}

function buildMockCoachLogs() {
  const today = localDateKey();
  const row = (d, no, name, v) => Object.assign({
    '날짜': shiftDateKey(today, d), '회원번호': no, '이름': name, '식단 상태': '', '운동 상태': '', '식단 태그': '', '운동 태그': '',
    '메모': '', '코치 한마디': '', '다음에 확인': '', '확인 완료': '', '작성시각': `${shiftDateKey(today, d)} 21:10:00`, '수정시각': ''
  }, v);
  return [
    row(-3, 'M001', '김민수', { '식단 상태': '주의', '운동 상태': '했음', '식단 태그': '야식', '운동 태그': '통증', '메모': '야근 후 라면. 스쿼트 때 왼쪽 무릎 시큰.', '코치 한마디': '야근하셨는데도 운동 챙기신 거 멋져요! 무릎은 오늘 쉬어 주세요.', '다음에 확인': '왼쪽 무릎 통증 나아졌는지' }),
    row(-1, 'M001', '김민수', { '식단 상태': '좋음', '운동 상태': '쉬는 날', '식단 태그': '잘 지킴', '코치 한마디': '어제 식단 완벽했어요 👍' }),
    row(-2, 'M002', '이지원', { '식단 상태': '보통', '운동 상태': '안 함', '식단 태그': '과식', '운동 태그': '누락', '메모': '회식으로 디저트 2개.', '코치 한마디': '회식 다음 날은 물 많이 드시고 가볍게 걸어 주세요.', '다음에 확인': '주말 필라테스 다녀왔는지' })
  ];
}

// 애플리케이션 전역 상태 객체
const AppState = {
  gasUrl: (localStorage.getItem(STORAGE_GAS_URL_KEY) || DEFAULT_GAS_API_URL || '').trim(),
  geminiApiKey: localStorage.getItem(STORAGE_GEMINI_KEY) || '',
  serverGeminiApiKey: '', // 코치 로그인 후 GAS에서 받아온 AI 키 (메모리에만 보관, 저장하지 않음)
  modelPref: localStorage.getItem(STORAGE_MODEL_PREF_KEY) || 'auto',
  isOnline: false,
  dataSource: 'none',     // 'live'(서버 최신) | 'cache'(저장본) | 'mock' | 'none'
  syncState: 'idle',      // 'syncing' | 'done' | 'failed' (저장본 표시 중 백그라운드 최신화 상태)
  lastSyncedAt: 0,        // 서버 최신 데이터 수신 시각
  cacheSavedAt: 0,        // 현재 표시 중인 저장본의 기준 시각
  userEditedSinceRender: false, // 화면 렌더 후 코치가 입력칸을 수정했는지 (백그라운드 갱신 시 덮어쓰기 방지)
  currentView: 'today',   // 'today' | 'members' | 'tagstats' | 'guidelines'
  members: [],
  weights: [], // WeightLog 공복 체중 기록 (회원번호로 회원과 연결)
  coachLogs: [], // CoachLog 코치 관리 기록 (최근 60일 + 확인 안 한 '다음에 확인', 회원 상세 '더 보기'로 이전 기록 추가)
  coachSettings: null, // CoachSettings 태그·자주 쓰는 문구 (pickCoachSettings로 채움)
  coachLogHistoryLoaded: {}, // 회원번호 -> 전체 기록을 받아 왔는지
  analyses: [], // AI 회원 분석 (회원별 최근 보고 전문 + 최근 14일 요약, 코치 전용)
  analysisFailures: {}, // 회원번호 -> { at, reason } 마지막 분석 실패 (성공하면 서버가 지움)
  analysisHistoryLoaded: {}, // 회원번호 -> 이전 보고 전문을 받아 왔는지
  analysisRunning: {}, // 회원번호 -> [분석 업데이트] 진행 중
  localCoachLogEdits: [], // 방금 저장한 기록 (저장 직전에 출발한 백그라운드 최신화가 덮어쓰지 않도록 잠깐 다시 적용)
  boardDate: localDateKey(), // 오늘 보드 날짜
  guidelines: {
    philosophy: '',
    exercise: '',
    diet: '',
    analysis: ''
  },
  selectedMember: null,
  filterStatus: 'active', // 'all' | 'active' | 'inactive' (오늘 보드·회원 목록 공통, 기본 유효 회원)
  filterTag: 'all',    // 'all' | specific tag
  searchQuery: '',
  charts: {
    weight: null,
    tagStats: null,
    tagStatsMembers: []
  },
  customTagTargetKey: null      // 태그 직접 입력 모달 대상
};

/**
 * ==============================================================================
 * [보안 1단계 & 2단계: 코치 전용 보안 인증 및 3회 오류 30초 잠금 시스템]
 * ==============================================================================
 */

let coachLockInterval = null;

function getCoachToken() {
  return localStorage.getItem(STORAGE_COACH_TOKEN_KEY) || '';
}

function isCoachAuthenticated() {
  if (localStorage.getItem(STORAGE_COACH_AUTH_KEY) !== 'true') return false;
  // GAS 연동 시에는 서버 발급 토큰이 있어야 인증 상태로 인정 (구버전 로그인 플래그만 있는 경우 1회 재로그인)
  const gasUrl = (AppState.gasUrl || '').trim();
  return !gasUrl || !!getCoachToken();
}

/**
 * 서버가 토큰 만료/무효(unauthorized)를 응답한 경우: 세션 정리 후 로그인 모달 재표시
 */
function handleCoachSessionExpired() {
  localStorage.removeItem(STORAGE_COACH_AUTH_KEY);
  localStorage.removeItem(STORAGE_COACH_TOKEN_KEY);
  clearCoachDataCache();
  AppState.serverGeminiApiKey = '';
  backendSessionInfoSynced = false;
  hideLoadingOverlay();
  showCoachAuthModal(true);
  showToast('보안을 위해 코치 인증이 다시 필요합니다. 비밀번호를 입력해 주세요.', 'warning');
}

function getCoachFailCount() {
  return parseInt(localStorage.getItem(STORAGE_COACH_FAIL_COUNT_KEY) || '0', 10);
}

function setCoachFailCount(count) {
  localStorage.setItem(STORAGE_COACH_FAIL_COUNT_KEY, String(count));
}

function getCoachLockUntil() {
  return parseInt(localStorage.getItem(STORAGE_COACH_LOCK_UNTIL_KEY) || '0', 10);
}

function setCoachLockUntil(timestamp) {
  localStorage.setItem(STORAGE_COACH_LOCK_UNTIL_KEY, String(timestamp));
}

function clearCoachAuthSecurityState() {
  localStorage.removeItem(STORAGE_COACH_FAIL_COUNT_KEY);
  localStorage.removeItem(STORAGE_COACH_LOCK_UNTIL_KEY);
}

/**
 * 30초 잠금 카운트다운 타이머
 */
function startCoachLockCountdown(lockUntil) {
  if (coachLockInterval) clearInterval(coachLockInterval);

  const inputEl = document.getElementById('coachPasswordInput');
  const btnEl = document.getElementById('coachLoginBtn');
  const errorEl = document.getElementById('coachAuthErrorMsg');

  if (inputEl) inputEl.disabled = true;
  if (btnEl) btnEl.disabled = true;

  function update() {
    const now = Date.now();
    const remainingMs = lockUntil - now;

    if (remainingMs <= 0) {
      clearInterval(coachLockInterval);
      coachLockInterval = null;
      clearCoachAuthSecurityState();

      if (inputEl) {
        inputEl.disabled = false;
        inputEl.value = '';
        inputEl.focus();
      }
      if (btnEl) btnEl.disabled = false;
      if (errorEl) {
        errorEl.className = 'mt-3 small text-center text-success fw-bold';
        errorEl.innerHTML = '<i class="bi bi-unlock-fill me-1"></i>30초 잠금이 해제되었습니다. 비밀번호를 다시 입력해 주세요.';
      }
      return;
    }

    const remainingSec = Math.ceil(remainingMs / 1000);
    if (errorEl) {
      errorEl.className = 'mt-3 small text-center text-danger fw-bold alert alert-danger py-2 mb-0 shadow-sm';
      errorEl.innerHTML = `<i class="bi bi-shield-slash-fill me-1"></i>비밀번호 3회 오류로 30초 동안 로그인이 제한됩니다.<br>(남은 시간: <span class="fs-6 fw-extrabold text-danger">${remainingSec}초</span>)`;
    }
  }

  update();
  coachLockInterval = setInterval(update, 1000);
}

/**
 * 브라우저 내장 SHA-256 단방향 암호화 해시 헬퍼
 */
async function computeSha256Hex(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

/**
 * 코치 로그인 처리 함수 (백엔드 서버 검증 + 오프라인 해시 하이브리드)
 */
async function handleCoachLogin() {
  const lockUntil = getCoachLockUntil();
  const now = Date.now();
  if (lockUntil > now) {
    startCoachLockCountdown(lockUntil);
    return;
  }

  const inputEl = document.getElementById('coachPasswordInput');
  const btnEl = document.getElementById('coachLoginBtn');
  const errorEl = document.getElementById('coachAuthErrorMsg');
  const enteredPw = (inputEl ? inputEl.value : '').trim();

  if (!enteredPw) {
    if (errorEl) {
      errorEl.className = 'mt-3 small text-center text-danger fw-bold';
      errorEl.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>비밀번호를 입력해 주세요.';
    }
    inputEl?.focus();
    return;
  }

  // 검증 중 버튼 스피너 표시
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>보안 인증 확인 중...';
  }

  let isPasswordValid = false;
  let issuedToken = '';

  try {
    // 1순위: 구글 스프레드시트(GAS) 백엔드가 연결되어 있다면 서버 스크립트 속성에서 안전하게 검증
    const gasUrl = (AppState.gasUrl || localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
    if (gasUrl) {
      try {
        const res = await postToGasBackend({
          action: 'verifyCoachPassword',
          password: enteredPw
        });
        if (res && res.status === 'success') {
          isPasswordValid = true;
          issuedToken = res.token || '';
        } else if (res && res.status === 'error' && res.message === '비밀번호가 올바르지 않습니다.') {
          isPasswordValid = false;
        } else {
          // 네트워크 에러나 액션 미반영 배포본일 경우 오프라인 해시로 보조 검증
          const hash = await computeSha256Hex(enteredPw);
          isPasswordValid = (hash === COACH_OFFLINE_PASSWORD_HASH);
        }
      } catch (err) {
        const hash = await computeSha256Hex(enteredPw);
        isPasswordValid = (hash === COACH_OFFLINE_PASSWORD_HASH);
      }
    } else {
      // 2순위: GAS URL 미연동/Mock 모드 시 브라우저 단방향 SHA-256 해시로 검증 (평문 노출 없음)
      const hash = await computeSha256Hex(enteredPw);
      isPasswordValid = (hash === COACH_OFFLINE_PASSWORD_HASH);
    }
  } catch (authErr) {
    console.error('[코치 인증 오류]', authErr);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i class="bi bi-unlock-fill me-1"></i><span>대시보드 잠금 해제</span>';
    }
  }

  if (isPasswordValid) {
    // [인증 성공]
    localStorage.setItem(STORAGE_COACH_AUTH_KEY, 'true');
    if (issuedToken) {
      localStorage.setItem(STORAGE_COACH_TOKEN_KEY, issuedToken);
    } else {
      localStorage.removeItem(STORAGE_COACH_TOKEN_KEY);
    }
    clearCoachAuthSecurityState();
    if (coachLockInterval) {
      clearInterval(coachLockInterval);
      coachLockInterval = null;
    }

    if (errorEl) {
      errorEl.innerHTML = '';
      errorEl.className = 'mt-3 small';
    }
    document.body.classList.remove('coach-locked');

    // 모달 닫기
    const modalEl = document.getElementById('coachAuthModal');
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    showToast('✓ 코치 인증이 완료되었습니다. 대시보드를 시작합니다.', 'success');

    // 아직 데이터가 로드되지 않았다면 로드
    if (!AppState.members || AppState.members.length === 0) {
      startDashboard();
    }
  } else {
    // [비밀번호 불일치]
    let failCount = getCoachFailCount() + 1;
    setCoachFailCount(failCount);

    if (inputEl) {
      inputEl.value = '';
      inputEl.classList.add('shake-input');
      setTimeout(() => inputEl.classList.remove('shake-input'), 500);
    }

    if (failCount >= 3) {
      const newLockUntil = Date.now() + 30000;
      setCoachLockUntil(newLockUntil);
      startCoachLockCountdown(newLockUntil);
    } else {
      if (errorEl) {
        errorEl.className = 'mt-3 small text-center text-danger fw-bold';
        errorEl.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i>비밀번호가 올바르지 않습니다. (오류 ${failCount}/3회 - 3회 실패 시 30초 잠금)`;
      }
      inputEl?.focus();
    }
  }
}

/**
 * 코치 인증 모달 표시 함수
 */
function showCoachAuthModal(force = false) {
  if (!force && isCoachAuthenticated()) {
    document.body.classList.remove('coach-locked');
    return;
  }

  document.body.classList.add('coach-locked');
  const modalEl = document.getElementById('coachAuthModal');
  if (!modalEl || !window.bootstrap) return;

  let modal = bootstrap.Modal.getInstance(modalEl);
  if (!modal) {
    modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
  }
  modal.show();

  const lockUntil = getCoachLockUntil();
  if (lockUntil > Date.now()) {
    startCoachLockCountdown(lockUntil);
  } else {
    const inputEl = document.getElementById('coachPasswordInput');
    const btnEl = document.getElementById('coachLoginBtn');
    const errorEl = document.getElementById('coachAuthErrorMsg');
    if (inputEl) {
      inputEl.disabled = false;
      inputEl.value = '';
      setTimeout(() => inputEl.focus(), 300);
    }
    if (btnEl) btnEl.disabled = false;
    if (errorEl) {
      errorEl.innerHTML = '';
      errorEl.className = 'mt-3 small';
    }
  }
}

/**
 * 코치 세션 수동 잠금 (로그아웃)
 */
function coachLogout() {
  localStorage.removeItem(STORAGE_COACH_AUTH_KEY);
  localStorage.removeItem(STORAGE_COACH_TOKEN_KEY);
  clearCoachDataCache();
  AppState.serverGeminiApiKey = '';
  backendSessionInfoSynced = false;
  showCoachAuthModal(true);
  showToast('코치 세션이 안전하게 잠겼습니다.', 'info');
}

/**
 * 비밀번호 보기/숨기기 토글
 */
function toggleCoachPasswordVisibility() {
  const inputEl = document.getElementById('coachPasswordInput');
  const iconEl = document.getElementById('iconToggleCoachPw');
  if (!inputEl || !iconEl) return;
  if (inputEl.type === 'password') {
    inputEl.type = 'text';
    iconEl.className = 'bi bi-eye-slash';
  } else {
    inputEl.type = 'password';
    iconEl.className = 'bi bi-eye';
  }
}

// 전역 함수 노출
window.handleCoachLogin = handleCoachLogin;
window.coachLogout = coachLogout;
window.toggleCoachPasswordVisibility = toggleCoachPasswordVisibility;
window.showCoachAuthModal = showCoachAuthModal;

/**
 * ==============================================================================
 * [애플리케이션 초기화 진입점]
 * ==============================================================================
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    purgeLegacyCoachDataCaches();
    initApiSettings();
    initInlineGuidelinesActions();
    // ※ 버튼 바인딩은 initEventListeners() 내부에서 1회만 수행 (중복 바인딩 시 저장/AI 호출 2회 실행)
    initEventListeners();

    // [요청 1] 사이드바 접힘 상태 복원
    if (localStorage.getItem('coach_dash_sidebar_collapsed') === 'true') {
      toggleSidebar(true);
    }

    // [모바일 UI 초기화] 하단 탭바 / 스와이프 / 운동·식단·그래프 전환 연결
    initCoachMobileTabs();

    // [보안 1단계 & 2단계] 코치 인증 확인
    if (!isCoachAuthenticated()) {
      showCoachAuthModal(true);
      return; // 미인증 시 대시보드 데이터 로드 대기
    }

    document.body.classList.remove('coach-locked');

    // 데이터 로드: 저장본이 있으면 즉시 표시 후 백그라운드 최신화, 없으면 서버에서 로드
    await startDashboard();
  } catch (initErr) {
    console.error('[대시보드 초기화 오류 방어]', initErr);
  } finally {
    // [100% 안전 보장] 어떤 예외가 발생하더라도 로딩 화면을 무조건 닫아 화면 멈춤을 원천 차단
    hideLoadingOverlay();
  }
});

/**
 * ==============================================================================
 * [1. 데이터 통신 및 로드 엔진 (GAS / Mock)]
 * ==============================================================================
 */

// 이 프론트엔드가 기대하는 GAS 백엔드 코드 버전 (gas_backend.js의 BACKEND_VERSION과 반드시 동일)
const EXPECTED_BACKEND_VERSION = '2026-11-08.1';

/**
 * [백그라운드] GAS 배포 버전 점검 + AI 키 확보 (데이터 로드 직후 1회, 화면 로딩을 막지 않음)
 * 1) 서버 코드가 구버전이면 코치에게 재배포 필요 안내 (깃 푸시와 GAS 재배포 불일치 조기 감지)
 * 2) [API 설정]에 키가 없으면 GAS 스크립트 속성의 키를 받아 브라우저 스트리밍 직통 호출에 사용
 *    (GAS UrlFetchApp은 타임아웃 지정이 불가해 정체 모델에서 수 분씩 대기하므로 브라우저 경로를 우선 사용)
 */
let backendSessionInfoSynced = false;
async function syncBackendSessionInfo(gasUrl) {
  if (backendSessionInfoSynced || !gasUrl) return;
  backendSessionInfoSynced = true;

  try {
    const pingRes = await fetch(`${gasUrl}?action=ping`).then(r => r.json());
    if (!pingRes || pingRes.version !== EXPECTED_BACKEND_VERSION) {
      console.warn('[GAS 버전 불일치]', { expected: EXPECTED_BACKEND_VERSION, actual: pingRes && pingRes.version });
      showToast('⚠️ 구글 Apps Script 서버 코드가 최신 버전이 아닙니다. Apps Script에 gas_backend.js를 붙여넣고 [배포 관리 → 수정 → 새 버전]으로 재배포해 주세요.', 'warning');
    }
  } catch (e) {
    console.warn('[GAS 버전 점검 실패]', e);
  }

  // 브라우저 직통 스트리밍용 '브라우저 전용' 키 수신 (GAS 스크립트 속성 GEMINI_BROWSER_API_KEY, 없으면 빈 값)
  if (getCoachToken()) {
    // 간헐적 리다이렉트 오류(unauthorized)·통신 실패 대비 최대 3회 시도
    for (let attempt = 1; attempt <= GAS_UNAUTHORIZED_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getAiConfig', token: getCoachToken() })
        }).then(r => r.json());
        if (res && res.status === 'success') {
          AppState.serverGeminiApiKey = String(res.geminiApiKey || '').trim();
          break;
        }
      } catch (e) {
        console.warn(`[AI 키 동기화 실패 ${attempt}/${GAS_UNAUTHORIZED_MAX_ATTEMPTS}]`, e);
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }
}

/**
 * [읽기 전용 GAS 요청 병렬 재요청(헤징) 헬퍼]
 * - 첫 요청을 끊지 않고 hedgeDelaysMs 시점마다 예비 요청을 추가 발사, 가장 먼저 도착한 정상 JSON 응답 채택
 * - 구글 오류 HTML/JSON 아님/리다이렉트 오류(unauthorized 등 isTransient)는 즉시 다음 요청으로 전환
 * - 데이터 변경(저장) 요청에는 사용 금지 (중복 실행 방지)
 */
async function fetchJsonHedged(url, init, opts = {}) {
  const hedgeDelaysMs = opts.hedgeDelaysMs || [0, 8000, 20000];
  const totalTimeoutMs = opts.totalTimeoutMs || 90000;
  const isTransient = opts.isTransient || (() => false);

  return new Promise((resolve, reject) => {
    const controllers = [];
    const timers = [];
    let settled = false;
    let started = 0;
    let failed = 0;
    let lastError = null;

    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      timers.forEach(t => clearTimeout(t));
      controllers.forEach(c => { try { c.abort(); } catch (e) {} });
      if (opts.signal) opts.signal.removeEventListener('abort', onExternalAbort);
      fn(val);
    };
    const onExternalAbort = () => {
      const err = new Error('사용자 취소');
      err.name = 'AbortError';
      finish(reject, err);
    };

    const launch = () => {
      if (settled || started >= hedgeDelaysMs.length) return;
      started++;
      const controller = new AbortController();
      controllers.push(controller);
      fetch(url, { ...init, signal: controller.signal })
        .then(r => r.text())
        .then(raw => {
          let json = null;
          try { json = JSON.parse(raw); } catch (e) { throw new Error('JSON 아님 (구글 일시 오류 페이지)'); }
          if (isTransient(json)) throw new Error('일시적 리다이렉트 오류 응답');
          finish(resolve, json);
        })
        .catch(err => {
          if (settled) return;
          failed++;
          lastError = err;
          if (started < hedgeDelaysMs.length) {
            launch(); // 빠르게 실패한 경우 다음 예비 요청을 즉시 발사
          } else if (failed >= started) {
            finish(reject, lastError);
          }
        });
    };

    if (opts.signal) {
      if (opts.signal.aborted) return onExternalAbort();
      opts.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
    hedgeDelaysMs.slice(1).forEach(d => timers.push(setTimeout(launch, d)));
    timers.push(setTimeout(() => finish(reject, lastError || new Error(`전체 ${totalTimeoutMs / 1000}초 초과`)), totalTimeoutMs));
    launch();
  });
}

function saveCoachDataCache() {
  // 미리보기(Mock)·서버 실패 화면의 데이터는 저장본으로 남기지 않음
  if (AppState.dataSource === 'mock' || AppState.dataSource === 'offline') return;
  try {
    localStorage.setItem(STORAGE_COACH_DATA_CACHE_KEY, JSON.stringify({
      gasUrl: (AppState.gasUrl || '').trim(),
      savedAt: AppState.lastSyncedAt || AppState.cacheSavedAt || Date.now(), // '기준 시각' = 마지막 서버 수신 시각
      members: AppState.members,
      weights: AppState.weights,
      coachLogs: AppState.coachLogs,
      coachSettings: AppState.coachSettings,
      analyses: AppState.analyses,
      analysisFailures: AppState.analysisFailures,
      guidelines: AppState.guidelines
    }));
  } catch (e) {
    // 용량 초과: 기존 저장본을 지우고 포기 (최신 전체는 서버에서 다시 받음)
    try { localStorage.removeItem(STORAGE_COACH_DATA_CACHE_KEY); } catch (e2) {}
    console.warn('[데이터 저장본 기록 실패 - 저장 공간 부족]', e);
  }
}

function loadCoachDataCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_COACH_DATA_CACHE_KEY) || 'null');
    if (cached && Array.isArray(cached.members) && cached.gasUrl === (AppState.gasUrl || '').trim()) return cached;
  } catch (e) {}
  return null;
}

// 지침서는 코칭 철학·운동·식단·회원 분석 4종만 사용 (예전 저장본의 피드백·동기부여 지침은 버림)
function pickGuidelines(g) {
  const src = g || {};
  return { philosophy: src.philosophy || '', exercise: src.exercise || '', diet: src.diet || '', analysis: src.analysis || '' };
}

function pickAnalysisFailures(f) {
  return (f && typeof f === 'object' && !Array.isArray(f)) ? f : {};
}

function clearCoachDataCache() {
  try { localStorage.removeItem(STORAGE_COACH_DATA_CACHE_KEY); } catch (e) {}
}

function purgeLegacyCoachDataCaches() {
  LEGACY_COACH_DATA_CACHE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
}

/**
 * 서버(getAll) 응답 데이터를 AppState에 반영하고 저장본·상태 배지 갱신
 */
function applyServerData(data, gasUrl) {
  AppState.members = Array.isArray(data.members) ? data.members : [];
  AppState.weights = Array.isArray(data.weights) ? data.weights : [];
  AppState.coachLogs = Array.isArray(data.coachLogs) ? data.coachLogs : [];
  AppState.coachSettings = pickCoachSettings(data.coachSettings);
  AppState.coachLogHistoryLoaded = {};
  AppState.analyses = Array.isArray(data.analyses) ? data.analyses : [];
  AppState.analysisFailures = pickAnalysisFailures(data.analysisFailures);
  AppState.analysisHistoryLoaded = {};
  reapplyLocalCoachLogEdits();
  if (data.guidelines) AppState.guidelines = pickGuidelines(data.guidelines);
  AppState.isOnline = true;
  AppState.dataSource = 'live';
  AppState.syncState = 'done';
  AppState.lastSyncedAt = Date.now();
  saveCoachDataCache();
  syncBackendSessionInfo(gasUrl);
  updateApiStatusUI();
  const syncText = document.getElementById('guidelinesSyncStatusText');
  if (syncText) {
    syncText.textContent = `구글 시트(Guidelines) 동기화 완료 (${new Date().toLocaleTimeString()})`;
  }
  try {
    updateGlobalNotificationBadge();
  } catch (badgeErr) {
    console.warn('[알림 뱃지 갱신 예외 무시]', badgeErr);
  }
}

/**
 * 데이터 준비 후 대시보드 최초 렌더링 (목록/태그/지침서 + 첫 유효 회원 선택)
 */
function renderDashboardAfterData() {
  renderTagFilterButtons();
  applyFiltersAndRenderMemberList();
  renderTodayBoard();
  populateInlineGuidelines();
  if (AppState.currentView === 'tagstats') renderTagStatsView();
  AppState.userEditedSinceRender = false;
  if (AppState.members.length > 0) {
    const firstActive = AppState.members.find(m => isMemberActive(m)) || AppState.members[0];
    selectMember(getMemberKey(firstActive), { auto: true });
  }
}

/**
 * 대시보드 시작: 저장본이 있으면 즉시 표시 + 백그라운드 최신화, 없으면 서버 로드 후 표시
 */
async function startDashboard() {
  const cached = (AppState.gasUrl || '').trim() ? loadCoachDataCache() : null;
  if (cached) {
    AppState.members = cached.members;
    AppState.weights = Array.isArray(cached.weights) ? cached.weights : [];
    AppState.coachLogs = Array.isArray(cached.coachLogs) ? cached.coachLogs : [];
    AppState.coachSettings = pickCoachSettings(cached.coachSettings);
    AppState.analyses = Array.isArray(cached.analyses) ? cached.analyses : [];
    AppState.analysisFailures = pickAnalysisFailures(cached.analysisFailures);
    AppState.guidelines = pickGuidelines(cached.guidelines);
    AppState.isOnline = true;
    AppState.dataSource = 'cache';
    AppState.cacheSavedAt = cached.savedAt || 0;
    AppState.syncState = 'syncing';
    updateApiStatusUI();
    try { updateGlobalNotificationBadge(); } catch (e) {}
    renderDashboardAfterData();
    hideLoadingOverlay();
    refreshDataInBackground();
    return;
  }
  await loadAllData();
  renderDashboardAfterData();
}

/**
 * 첫 로딩 실패 후 [다시 시도]: 서버에서 다시 받아 화면 전체 렌더링
 */
async function retryInitialLoad() {
  await loadAllData();
  renderDashboardAfterData();
}

/**
 * [백그라운드 최신화] 화면을 막지 않고 서버 최신 데이터를 받아 조용히 교체
 * - 로딩 오버레이/AI 작업 취소 신호와 분리 (AI 생성 중에도 독립적으로 진행)
 * - 실패 시 저장본 유지 + 배지에 '서버 연결 실패 (눌러서 재시도)' 표시 (Mock으로 덮어쓰지 않음)
 */
let backgroundRefreshInFlight = false;
async function refreshDataInBackground() {
  const gasUrl = (AppState.gasUrl || '').trim();
  if (!gasUrl || backgroundRefreshInFlight) return;
  backgroundRefreshInFlight = true;
  AppState.syncState = 'syncing';
  updateApiStatusUI();
  const startedAt = Date.now();
  try {
    const resJson = await fetchJsonHedged(
      `${gasUrl}?action=getAll&token=${encodeURIComponent(getCoachToken())}`,
      { method: 'GET' }
    );
    if (resJson && resJson.code === 'unauthorized') {
      handleCoachSessionExpired();
      return;
    }
    if (!(resJson && resJson.status === 'success' && resJson.data)) {
      throw new Error((resJson && resJson.message) || '데이터 형식 불일치');
    }
    console.log(`[백그라운드 최신화 완료] ${((Date.now() - startedAt) / 1000).toFixed(1)}초`);
    applyServerData(resJson.data, gasUrl);
    rerenderAfterBackgroundRefresh();
  } catch (e) {
    console.warn(`[백그라운드 최신화 실패 ${((Date.now() - startedAt) / 1000).toFixed(1)}초]`, e.message || e);
    AppState.syncState = 'failed';
    updateApiStatusUI();
  } finally {
    backgroundRefreshInFlight = false;
  }
}

/**
 * 최신 데이터 도착 후 화면 갱신 (코치 작업 보호)
 * - 목록/태그 필터/알림은 항상 갱신
 * - 입력 중이거나 모달이 열려 있으면 상세 패널·지침서 입력칸은 덮어쓰지 않음 (다음 회원 선택 시 최신 반영)
 * - 모바일 목록/상세 화면 전환이나 스크롤 위치는 건드리지 않음
 */
function rerenderAfterBackgroundRefresh() {
  const selectedKey = AppState.selectedMember ? getMemberKey(AppState.selectedMember) : '';
  const isModalOpen = !!document.querySelector('.modal.show');
  const canRefreshInputs = !AppState.userEditedSinceRender && !isModalOpen;

  if (selectedKey) {
    const freshMember = AppState.members.find(m => getMemberKey(m) === selectedKey);
    if (freshMember) AppState.selectedMember = freshMember;
  }

  renderTagFilterButtons();
  applyFiltersAndRenderMemberList();
  renderTodayBoard();

  if (canRefreshInputs) {
    populateInlineGuidelines();
    if (AppState.selectedMember && selectedKey) {
      updatePersonalInfoPanel(AppState.selectedMember);
      updateGuidelineRoutinePanel(AppState.selectedMember);
      updateWeightSection(AppState.selectedMember);
    }
  } else if (AppState.selectedMember) {
    // 입력값은 보존하고 체중 기록/차트만 최신화
    updateWeightSection(AppState.selectedMember);
  }

  if (AppState.currentView === 'tagstats') renderTagStatsView();

  if (!AppState.selectedMember && AppState.members.length > 0) {
    const firstActive = AppState.members.find(m => isMemberActive(m)) || AppState.members[0];
    selectMember(getMemberKey(firstActive), { auto: true });
  }
}

async function loadAllData() {
  const gasUrl = (AppState.gasUrl || DEFAULT_GAS_API_URL || '').trim();

  if (gasUrl) {
    // [콜드스타트/구글 리다이렉트 지연 대응: 병렬 재요청(헤징)]
    // 기존: 35초에서 요청을 끊고 처음부터 재요청 -> 36초면 끝났을 응답을 버리고 다시 대기해 분 단위 지연 발생
    // 개선: 첫 요청은 유지한 채 8초/20초 시점에 예비 요청을 병렬로 추가하고, 가장 먼저 온 정상 응답 사용 (최대 90초)
    let coldStartNoticeTimer = null;
    const loadStart = Date.now();
    try {
      showLoadingOverlay('구글 시트에서 최신 데이터를 가져오는 중...');
      coldStartNoticeTimer = setTimeout(() => {
        const el = document.getElementById('loadingOverlayText');
        if (el) el.textContent = '구글 클라우드 서버 준비 중입니다 (첫 기동 시 10~25초 소요될 수 있습니다)...';
      }, 7000);

      const resJson = await fetchJsonHedged(
        `${gasUrl}?action=getAll&token=${encodeURIComponent(getCoachToken())}`,
        { method: 'GET' },
        { signal: currentTaskAbortController ? currentTaskAbortController.signal : undefined }
      );
      clearTimeout(coldStartNoticeTimer);
      console.log(`[GAS getAll] ${((Date.now() - loadStart) / 1000).toFixed(1)}초`);

      // [보안] 토큰 만료/무효: Mock으로 대체하지 않고 즉시 재로그인 요청
      if (resJson && resJson.code === 'unauthorized') {
        handleCoachSessionExpired();
        return;
      }

      if (resJson.status === 'success' && resJson.data) {
        applyServerData(resJson.data, gasUrl);
        hideLoadingOverlay();
        return;
      }

      console.warn('[GAS 백엔드 오류 반환]:', (resJson && resJson.message) ? resJson.message : '데이터 형식 불일치');
    } catch (e) {
      clearTimeout(coldStartNoticeTimer);
      console.warn(`[GAS 연동 실패 ${((Date.now() - loadStart) / 1000).toFixed(1)}초]:`, e.message || e.name);
    }

    // [실패는 실패로] 서버 실패를 Mock 데이터로 대신 채우지 않음 -> 빈 화면 + 실패 배지 + [다시 시도]
    AppState.members = [];
    AppState.weights = [];
    AppState.coachLogs = [];
    AppState.isOnline = false;
    AppState.dataSource = 'offline';
    AppState.syncState = 'failed';
    updateApiStatusUI();
    hideLoadingOverlay();
    showRetryToast('서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.', retryInitialLoad);
    return;
  }

  // 시트 미연동(GAS URL 없음) 미리보기 전용 Mock 데이터
  AppState.members = JSON.parse(JSON.stringify(MOCK_DB.members));
  AppState.weights = JSON.parse(JSON.stringify(MOCK_DB.weights));
  AppState.coachLogs = JSON.parse(JSON.stringify(MOCK_DB.coachLogs));
  AppState.coachSettings = pickCoachSettings(MOCK_DB.coachSettings);
  AppState.analyses = JSON.parse(JSON.stringify(MOCK_DB.analyses));
  AppState.analysisFailures = {};
  AppState.guidelines = JSON.parse(JSON.stringify(MOCK_DB.guidelines));
  AppState.isOnline = false;
  AppState.dataSource = 'mock';
  updateApiStatusUI();
  try {
    updateGlobalNotificationBadge();
  } catch (badgeErr) {
    console.warn('[알림 뱃지 갱신 예외 무시]', badgeErr);
  }
  hideLoadingOverlay();
}

const GAS_UNAUTHORIZED_MAX_ATTEMPTS = 3;

async function postToGasBackend(payload, options = {}) {
  const gasUrl = AppState.gasUrl.trim();

  // Gemini API Key 및 모델 선호도 자동 주입
  if (AppState.geminiApiKey) {
    payload.geminiApiKey = AppState.geminiApiKey;
  }
  payload.modelPref = AppState.modelPref || 'auto';
  // 코치 로그인 토큰 자동 주입 (GAS 서버에서 검증)
  payload.token = getCoachToken();

  if (gasUrl) {
    try {
      // [구글 리다이렉트 오류 방어] GAS 웹앱은 간헐적으로 추가 리다이렉트를 거치며 POST가 본문 없는 GET으로 바뀌어
      // doPost가 실행되지 않은 채 'unauthorized'가 돌아오는 경우가 있음 -> 최대 3회까지 재전송 후에만 세션 만료로 판단
      let json = null;
      for (let attempt = 1; attempt <= GAS_UNAUTHORIZED_MAX_ATTEMPTS; attempt++) {
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          // noAbort: 코치 기록 저장처럼 로딩 바 작업과 무관한 요청은 [요청 취소]에 같이 취소되지 않게 함
          signal: (!options.noAbort && currentTaskAbortController) ? currentTaskAbortController.signal : undefined
        });
        json = await response.json();
        if (!(json && json.code === 'unauthorized') || payload.action === 'verifyCoachPassword') break;
        if (attempt < GAS_UNAUTHORIZED_MAX_ATTEMPTS) {
          console.warn(`[GAS 리다이렉트 오류 의심] unauthorized 응답 재시도 ${attempt}/${GAS_UNAUTHORIZED_MAX_ATTEMPTS - 1}`);
          await new Promise(r => setTimeout(r, 400));
        }
      }
      if (json && json.code === 'unauthorized' && payload.action !== 'verifyCoachPassword') {
        handleCoachSessionExpired();
      } else if (json && json.status === 'success' && /^update/.test(String(payload.action || '')) && AppState.dataSource !== 'mock') {
        // 저장 성공 시 화면에 반영된 최신 상태를 저장본에도 즉시 기록 (새로고침 직후 이전 내용이 잠깐 보이는 현상 방지)
        saveCoachDataCache();
      } else if (json && json.status === 'error' && /^update/.test(String(payload.action || '')) && !options.silent) {
        showRetryToast(`저장하지 못했습니다: ${json.message || '서버 오류'}`, options.retry || (() => retryGasPost(payload)));
      }
      return json;
    } catch (e) {
      if (e.name === 'AbortError' || (!options.noAbort && currentTaskAbortController && currentTaskAbortController.signal.aborted)) {
        console.log('[GAS POST 요청 취소됨]');
        return { status: 'cancelled', message: '요청이 사용자에 의해 취소되었습니다.' };
      }
      // [실패는 실패로] 통신 실패·응답 지연을 Mock 응답으로 바꾸지 않고 실패 안내 + [다시 시도] 제공
      console.warn('[GAS POST 통신 실패]', e);
      const failure = { status: 'error', code: 'network', message: '서버 응답이 늦어요. 잠시 후 다시 시도해 주세요.' };
      if (!options.silent) {
        const retry = options.retry || (() => retryGasPost(payload));
        showRetryToast(failure.message, retry);
      }
      return failure;
    }
  }

  // 사용자가 취소한 상태라면 즉시 반환
  if (!options.noAbort && currentTaskAbortController && currentTaskAbortController.signal.aborted) {
    return { status: 'cancelled', message: '요청이 사용자에 의해 취소되었습니다.' };
  }

  // 시트 미연동 미리보기(Mock) 모드에서만 로컬 시뮬레이션 (화면 메모리에만 반영, 시트·저장본에는 기록하지 않음)
  if (AppState.dataSource !== 'mock') {
    return { status: 'error', code: 'no_server', message: '구글 시트 서버 주소가 설정되지 않아 저장하지 못했습니다. [API 설정]을 확인해 주세요.' };
  }
  return simulateMockAction(payload);
}

/**
 * 저장 요청 [다시 시도] 기본 동작: 같은 요청을 다시 보내고 결과를 알림
 */
async function retryGasPost(payload) {
  showToast('다시 시도하는 중...', 'info');
  const res = await postToGasBackend(payload);
  if (res && res.status === 'success') {
    showToast('✓ 다시 시도에 성공했습니다. 구글 시트에 반영되었습니다.', 'success');
  } else if (res && res.status === 'error' && res.code !== 'network') {
    showToast(`⚠️ ${res.message || '요청을 처리하지 못했습니다.'}`, 'danger');
  }
  return res;
}

/**
 * [초고속 직통 모드] 프론트엔드 브라우저에서 Google Gemini API 직접 호출
 * - 구글 실시간 지원 모델을 조회 후 로컬스토리지에 캐싱하여 404 원천 차단
 * - GAS 서버 왕복 없이 0.8~1.5초 만에 직접 생성 완료
 */
// 구버전 모델 목록 캐시 키 정리 (페이지 로드당 1회만 실행하여 AI 호출마다 반복되는 스토리지 작업 제거)
let legacyGeminiCachesPurged = false;
function purgeLegacyGeminiModelCaches() {
  if (legacyGeminiCachesPurged) return;
  legacyGeminiCachesPurged = true;
  try {
    [
      'CACHE_GEMINI_TEXT_MODELS_V2',
      'CACHE_GEMINI_TEXT_MODELS_V3',
      'CACHE_GEMINI_MODELS_STABLE_V6',
      'CACHE_GEMINI_MODELS_V38_auto',
      'CACHE_GEMINI_MODELS_V38_pro',
      'CACHE_GEMINI_MODELS_V38_flash',
      'CACHE_GEMINI_MODELS_V38_ONLY_auto',
      'CACHE_GEMINI_MODELS_V38_ONLY_pro',
      'CACHE_GEMINI_MODELS_V38_ONLY_flash',
      'CACHE_GEMINI_MODELS_V38_STABLE_2026_auto',
      'CACHE_GEMINI_MODELS_V38_STABLE_2026_pro',
      'CACHE_GEMINI_MODELS_V38_STABLE_2026_flash',
      'CACHE_GEMINI_MODELS_FLASH_CLUSTER_2026_auto',
      'CACHE_GEMINI_MODELS_FLASH_CLUSTER_2026_flash',
      'CACHE_GEMINI_MODELS_FLASH_CLUSTER_2026_latest'
    ].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

async function getBrowserSupportedGeminiModels(apiKey) {
  // 구버전 및 이전 캐시들 모두 정리
  purgeLegacyGeminiModelCaches();

  const cacheKey = `CACHE_GEMINI_MODELS_FLASH_LITE_CLUSTER_2026_${AppState.modelPref || 'auto'}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const arr = JSON.parse(cached);
      if (Array.isArray(arr) && arr.length > 0) {
        // [중요] 캐시에서 꺼낼 때도 2.5 이하 및 Pro(무료 쿼터 0 에러) 모델 제외
        const cleanArr = arr.filter(m => {
          const lower = String(m || '').toLowerCase();
          return !lower.includes('pro') && !lower.includes('2.5') && !lower.includes('2.0') && !lower.includes('1.5') && !lower.includes('1.0');
        });
        if (cleanArr.length > 0) return cleanArr;
      }
    } catch (e) {}
  }

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: currentTaskAbortController ? currentTaskAbortController.signal : undefined
    });
    if (listRes.ok) {
      const data = await listRes.json();
      if (data.models && data.models.length > 0) {
        const textModels = data.models.filter(m => {
          const name = String(m.name || '').toLowerCase();
          const desc = String(m.description || '').toLowerCase();
          // [핵심 1] 2.5 이하 레거시 버전(2.5, 2.0, 1.5, 1.0) 엄격 제외
          const isLegacyOrUnder25 = name.includes('2.5') || name.includes('2.0') || name.includes('1.5') || name.includes('1.0') ||
                            desc.includes('2.5') || desc.includes('2.0') || desc.includes('1.5') || desc.includes('1.0');
          // [핵심 2] 무료 티어 키에서 limit: 0 (쿼터 0 에러)을 일으키는 Pro 모델 엄격 제외
          const isProModel = name.includes('pro') || desc.includes('pro');
          const isSlowOrNonText = isLegacyOrUnder25 || isProModel || name.includes('thinking') || desc.includes('thinking') ||
                            name.includes('tts') || name.includes('audio') || name.includes('embed') || 
                            name.includes('imagen') || name.includes('aqa') || name.includes('speech') ||
                            desc.includes('audio') || desc.includes('text-to-speech') || desc.includes('embedding');
          return !isSlowOrNonText && m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent');
        }).map(m => m.name.replace(/^models\//, ''));

        // [구글 공식 Flash 클러스터 정렬 (503 고수요 병목 없는 초고속 무정체 모델 최우선)]
        const getScore = (m) => {
          const lower = m.toLowerCase();
          if (lower.includes('pro') || lower.includes('2.5') || lower.includes('2.0') || lower.includes('1.5') || lower.includes('1.0')) return 0;
          // [1순위: 0.8~2초 초고속 무정체 Flash-Lite] 트래픽 집중(503) 병목이 전혀 없는 실시간 엔진
          if (lower === 'gemini-flash-lite-latest' || lower.includes('flash-lite')) return 100;
          // [2순위: 최신 공식 플래그십 Flash] 구글 정식 표준 프로덕션
          if (lower === 'gemini-flash-latest' || lower.includes('flash-latest')) return 95;
          // [3순위: 안정화 Flash] 3.7 / 3.5 안정 버전
          if (lower.includes('3.7-flash') || lower.includes('3.7')) return 90;
          if (lower.includes('3.5-flash') || lower.includes('3.5')) return 85;
          // [4순위: 3.8 Flash] 현재 구글 서버 고수요(503) 병목이 잦으므로 보조 예비로만 배치
          if (lower.includes('3.8')) return 80;
          if (lower.includes('flash')) return 75;
          return 0; // Pro 및 기타 버전은 0점 처리하여 완전 제외
        };

        textModels.sort((a, b) => getScore(b) - getScore(a));

        const qualifiedModels = textModels.filter(m => getScore(m) > 0);

        if (qualifiedModels.length > 0) {
          const topModels = qualifiedModels.slice(0, 4);
          localStorage.setItem(cacheKey, JSON.stringify(topModels));
          return topModels;
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return [];
    console.warn('[브라우저 모델 목록 조회 실패]', e);
  }

  return ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.8-flash'];
}

// [스트리밍 타임아웃 정책]
// - 첫 응답 토큰 대기: 20초 (응답 없는 고수요/정체 모델은 즉시 다음 모델로 전환)
// - 토큰 수신 중 무응답 간격: 25초 / 모델당 전체 상한: 120초
// ※ 기존 '전체 7초 제한'은 긴 운동 루틴/식단 생성 시 모든 모델을 강제 중단시켜 GAS 경유(수 분 소요)로 넘어가던 원인
const GEMINI_STREAM_FIRST_TOKEN_MS = 20000;
const GEMINI_STREAM_IDLE_MS = 25000;
const GEMINI_STREAM_TOTAL_MS = 120000;
const STORAGE_GEMINI_LAST_GOOD_MODEL_KEY = 'coach_dash_gemini_last_good_model_v1';

/**
 * 브라우저 직통 호출에 사용할 Gemini API Key
 * - 로그인 후 GAS getAiConfig가 내려준 '브라우저 전용' 키(스크립트 속성 GEMINI_BROWSER_API_KEY)만 사용 (메모리에만 보관)
 * - 없으면 브라우저 직통을 건너뛰고 GAS generate*로 바로 생성 (서버용 GEMINI_API_KEY는 브라우저로 오지 않음)
 */
function getBrowserGeminiKey() {
  return String(AppState.serverGeminiApiKey || '').trim();
}

function hasBrowserGeminiKey() {
  return !!getBrowserGeminiKey();
}

/**
 * [프롬프트 단일 출처] 브라우저 직통 스트리밍에 쓸 프롬프트를 GAS(buildAiPrompt)에서 받아옴
 * - kind: 'workout' | 'diet' | 'daily'
 * - 실패(구버전 서버·통신 오류 등) 시 null -> 호출부는 직통을 건너뛰고 GAS generate*로 생성
 */
async function requestAiPromptFromGas(kind, fields) {
  const res = await postToGasBackend({ action: 'buildAiPrompt', kind, ...fields }, { silent: true });
  if (res && res.status === 'success' && res.prompt) {
    return { prompt: res.prompt, systemInstruction: res.systemInstruction || '', scores: res.scores || null, maxOutputTokens: res.maxOutputTokens || null };
  }
  if (res && res.status !== 'cancelled') console.warn('[AI 프롬프트 수신 실패 -> GAS 생성으로 진행]', res && res.message);
  return null;
}

/**
 * Gemini SSE 스트림(streamGenerateContent?alt=sse) 응답을 읽어 텍스트를 누적
 * - onChunk: 데이터 수신 시마다 호출 (무응답 타이머 갱신용)
 */
async function readGeminiSseStream(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let text = '';
  let finishReason = '';
  let usage = {};

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') return;
    let evt = null;
    try { evt = JSON.parse(jsonStr); } catch (e) { return; }
    const cand = evt && evt.candidates && evt.candidates[0];
    if (cand && cand.content && Array.isArray(cand.content.parts)) {
      cand.content.parts.forEach(p => {
        if (p && typeof p.text === 'string' && !p.thought) text += p.text;
      });
    }
    if (cand && cand.finishReason) finishReason = cand.finishReason;
    if (evt && evt.usageMetadata) usage = evt.usageMetadata;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handleLine);
    if (onChunk) onChunk(text.length);
  }
  buffer += decoder.decode();
  if (buffer) handleLine(buffer);

  return { text, finishReason: finishReason || 'STOP', usage };
}

// options.maxOutputTokens: 최대 출력 토큰 (GAS buildAiPrompt가 내려준 값, 없으면 4096)
async function callGeminiDirectlyFromBrowser(prompt, systemInstruction, options) {
  const apiKey = getBrowserGeminiKey();
  if (!apiKey) return { text: null, error: 'API 키 미등록' };

  if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
    return { text: null, error: 'ABORTED', isAborted: true };
  }

  // 구버전 및 이전 캐시 청소
  purgeLegacyGeminiModelCaches();

  const startTime = performance.now();
  // 상위 최적 Flash 모델만 신속 시도 (503 고수요 병목 및 429 쿼터 0 에러 원천 차단)
  const rawModels = await getBrowserSupportedGeminiModels(apiKey);
  let candidateModels = (rawModels && rawModels.length > 0)
    ? rawModels.slice(0, 4)
    : ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.8-flash'];

  // [철통 방어 1] 2.5 이하 모델 및 Pro 모델 목록 필터링
  const isBlockedModel = (m) => {
    const lower = String(m || '').toLowerCase();
    return lower.includes('pro') || lower.includes('2.5') || lower.includes('2.0') || lower.includes('1.5') || lower.includes('1.0');
  };
  candidateModels = candidateModels.filter(m => !isBlockedModel(m));
  if (candidateModels.length === 0) {
    candidateModels = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.8-flash'];
  }

  // [학습형 우선순위] 직전에 빠르게 성공한 모델을 맨 앞으로 (정체 모델 재시도 낭비 제거)
  let lastGoodModel = '';
  try { lastGoodModel = localStorage.getItem(STORAGE_GEMINI_LAST_GOOD_MODEL_KEY) || ''; } catch (e) {}
  if (lastGoodModel && !isBlockedModel(lastGoodModel)) {
    candidateModels = [lastGoodModel, ...candidateModels.filter(m => m !== lastGoodModel)];
  }

  if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
    return { text: null, error: 'ABORTED', isAborted: true };
  }

  let lastErrorDetail = '';
  const attempts = [];

  for (let i = 0; i < candidateModels.length; i++) {
    if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
      return { text: null, error: 'ABORTED', isAborted: true };
    }

    const model = String(candidateModels[i] || '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const attemptStart = performance.now();

    const timeoutController = new AbortController();
    let timeoutReason = '';
    let stageTimer = setTimeout(() => { timeoutReason = `첫 응답 ${GEMINI_STREAM_FIRST_TOKEN_MS / 1000}초 초과`; timeoutController.abort(); }, GEMINI_STREAM_FIRST_TOKEN_MS);
    const totalTimer = setTimeout(() => { timeoutReason = `전체 ${GEMINI_STREAM_TOTAL_MS / 1000}초 초과`; timeoutController.abort(); }, GEMINI_STREAM_TOTAL_MS);
    const resetIdleTimer = (receivedLen) => {
      clearTimeout(stageTimer);
      const limitMs = receivedLen > 0 ? GEMINI_STREAM_IDLE_MS : GEMINI_STREAM_FIRST_TOKEN_MS;
      stageTimer = setTimeout(() => { timeoutReason = receivedLen > 0 ? `응답 중단 ${GEMINI_STREAM_IDLE_MS / 1000}초` : `첫 응답 ${GEMINI_STREAM_FIRST_TOKEN_MS / 1000}초 초과`; timeoutController.abort(); }, limitMs);
    };

    const onUserAbort = () => timeoutController.abort();
    if (currentTaskAbortController) {
      currentTaskAbortController.signal.addEventListener('abort', onUserAbort, { once: true });
    }

    try {
      const bodyObj = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: (options && options.maxOutputTokens) || 4096
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeoutController.signal,
        body: JSON.stringify(bodyObj)
      });

      if (res.ok) {
        const streamed = await readGeminiSseStream(res, resetIdleTimer);
        clearTimeout(stageTimer);
        clearTimeout(totalTimer);
        const attemptMs = Math.round(performance.now() - attemptStart);

        if (streamed.text && streamed.text.trim()) {
          attempts.push({ model, status: 200, ms: attemptMs });
          const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
          try { localStorage.setItem(STORAGE_GEMINI_LAST_GOOD_MODEL_KEY, model); } catch (e) {}

          console.group('%c⚡ [Gemini AI 브라우저 직통 스트리밍 성공]', 'color: #10b981; font-weight: bold; font-size: 13px;');
          console.log(`📌 모델: ${model} | 소요시간: ${elapsedSec}초`);
          console.log(`🏁 상태: ${streamed.finishReason} | 텍스트 길이: ${streamed.text.length}자`);
          console.log('시도 내역:', attempts);
          console.groupEnd();

          return {
            text: streamed.text,
            isAiGenerated: true,
            model: model,
            elapsedSec: elapsedSec,
            finishReason: streamed.finishReason,
            usage: streamed.usage,
            isTruncated: (streamed.finishReason === 'MAX_TOKENS'),
            attempts: attempts
          };
        }
        lastErrorDetail = `[빈 응답] ${model}`;
        attempts.push({ model, status: 200, ms: attemptMs, error: 'empty' });
      } else {
        clearTimeout(stageTimer);
        clearTimeout(totalTimer);
        const errText = await res.text().catch(() => '');
        lastErrorDetail = `[HTTP ${res.status}] ${errText.slice(0, 150)}`;
        attempts.push({ model, status: res.status, ms: Math.round(performance.now() - attemptStart) });
        console.warn(`[브라우저 직통 ${model} 응답 오류 HTTP ${res.status}]`, errText);
        if (lastGoodModel === model) {
          try { localStorage.removeItem(STORAGE_GEMINI_LAST_GOOD_MODEL_KEY); } catch (e) {}
        }
      }
    } catch (e) {
      clearTimeout(stageTimer);
      clearTimeout(totalTimer);
      if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
        return { text: null, error: 'ABORTED', isAborted: true };
      }
      lastErrorDetail = (e.name === 'AbortError')
        ? `[${timeoutReason || '타임아웃'}] ${model}`
        : `[네트워크 예외] ${e.message}`;
      attempts.push({ model, status: 0, ms: Math.round(performance.now() - attemptStart), error: lastErrorDetail });
      console.warn(`[브라우저 직통 ${model} 예외]`, lastErrorDetail);
      if (lastGoodModel === model) {
        try { localStorage.removeItem(STORAGE_GEMINI_LAST_GOOD_MODEL_KEY); } catch (e2) {}
      }
    } finally {
      if (currentTaskAbortController) {
        currentTaskAbortController.signal.removeEventListener('abort', onUserAbort);
      }
    }
  }

  console.warn('[브라우저 직통 전체 실패] 시도 내역:', attempts);
  return { text: null, error: lastErrorDetail, attempts: attempts };
}

function simulateMockAction(payload) {
  const action = payload.action;

  if (action === 'updateMemberStatusTag') {
    const mem = AppState.members.find(m => getMemberKey(m) === payload.memberKey);
    if (mem) {
      if (payload.status !== undefined) mem['상태'] = payload.status;
      if (payload.tag !== undefined) mem['태그'] = payload.tag;
    }
    return { status: 'success', message: '로컬 Mock에 회원 상태/태그가 반영되었습니다.' };
  }

  if (action === 'updateMemberGuidelineRoutine') {
    const mem = AppState.members.find(m => getMemberKey(m) === payload.memberKey);
    if (mem) {
      if (payload.exerciseGuideline !== undefined) mem['운동 루틴 수정 제안 지침'] = payload.exerciseGuideline;
      if (payload.dietGuideline !== undefined) mem['식단 수정 제안 지침'] = payload.dietGuideline;
      if (payload.exerciseRoutine !== undefined) mem['현재 제안 운동 루틴'] = payload.exerciseRoutine;
      if (payload.dietRoutine !== undefined) mem['현재 제안 식단'] = payload.dietRoutine;
    }
    return { status: 'success', message: '로컬 Mock에 루틴/지침이 저장되었습니다.' };
  }

  if (action === 'updateGuidelines') {
    AppState.guidelines = pickGuidelines({ ...AppState.guidelines, ...payload.guidelines });
    return { status: 'success', message: '지침서가 로컬에 저장되었습니다.' };
  }

  // 코치 기록: 서버와 같은 규칙(회원번호+날짜 1행, 이전 날짜 '다음에 확인'만 확인 완료)으로 화면 메모리에만 반영
  if (action === 'saveCoachLog') {
    const mem = AppState.members.find(m => getMemberNo(m) === payload.memberNo);
    if (!mem) return { status: 'error', code: 'not_found', message: '회원번호를 찾지 못했습니다.' };
    if (payload.date > localDateKey()) return { status: 'error', code: 'future_date', message: '오늘 이후 날짜에는 기록할 수 없습니다.' };
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const prev = getCoachLog(payload.memberNo, payload.date);
    const log = {
      '날짜': payload.date, '회원번호': payload.memberNo, '이름': getMemberName(mem),
      '식단 상태': payload.dietStatus || '', '운동 상태': payload.exerciseStatus || '',
      '식단 태그': (payload.dietTags || []).join(', '), '운동 태그': (payload.exerciseTags || []).join(', '),
      '메모': payload.memo || '', '코치 한마디': payload.coachNote || '', '다음에 확인': payload.nextCheck || '',
      '확인 완료': prev ? prev['확인 완료'] : '', '작성시각': prev ? prev['작성시각'] : now, '수정시각': prev ? now : ''
    };
    const resolved = (payload.resolve || [])
      .filter(r => r.date < payload.date && getCoachLog(payload.memberNo, r.date))
      .map(r => ({ '날짜': r.date, '확인 완료': r.done ? payload.date : '' }));
    return { status: 'success', memberNo: payload.memberNo, date: payload.date, mode: prev ? 'updated' : 'created', log, resolved };
  }

  if (action === 'getCoachLogHistory') {
    return { status: 'success', memberNo: payload.memberNo, logs: AppState.coachLogs.filter(r => r['회원번호'] === payload.memberNo) };
  }

  // [미리보기 전용] AI 분석 결과를 흉내 내지 않음
  if (action === 'analyzeMember') {
    return { status: 'error', code: 'preview_mode', message: '시트 미연동 미리보기 모드에서는 AI 분석을 할 수 없습니다. [API 설정]에서 구글 시트를 연결해 주세요.' };
  }
  if (action === 'getAnalysisHistory') {
    return { status: 'success', memberNo: payload.memberNo, analyses: AppState.analyses.filter(r => r['회원번호'] === payload.memberNo) };
  }

  // [미리보기 전용] 시트 미연동 Mock 모드에서는 AI 생성 결과를 흉내 내지 않음 (모달에 채우거나 저장할 내용 없음)
  if (/^generate/.test(String(action || ''))) {
    return {
      status: 'error',
      code: 'preview_mode',
      message: '시트 미연동 미리보기 모드에서는 AI 생성을 할 수 없습니다. [API 설정]에서 구글 시트를 연결해 주세요.'
    };
  }

  return { status: 'error', code: 'preview_mode', message: '미리보기 모드에서 지원하지 않는 요청입니다.' };
}

/**
 * ==============================================================================
 * [2. 대시보드 메인 뷰 전환 & 사이드바 접기/펼치기]
 * ==============================================================================
 */

/**
 * [요청 1] 좌측 사이드바(참여자/지침서 목록) 화면 왼쪽으로 밀어 숨기기/펼치기 토글
 * - 사이드바 숨김 시 본문 영역(#mainContentColumn)이 12컬럼(전폭 100%)으로 시원하게 확장
 * - 본문 너비 확장에 맞춰 3개 독립 Chart.js 차트 자동 리사이즈
 */
function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebarColumn');
  const mainCol = document.getElementById('mainContentColumn');
  const textBtn = document.getElementById('textSidebarToggle');
  const iconBtn = document.getElementById('iconSidebarToggle');
  const btnToggle = document.getElementById('btnToggleSidebar');

  if (!sidebar || !mainCol) return;

  const isCurrentlyCollapsed = sidebar.classList.contains('collapsed');
  const shouldCollapse = (typeof forceState === 'boolean') ? forceState : !isCurrentlyCollapsed;

  if (shouldCollapse) {
    // 1. 사이드바 숨김 (화면 왼쪽으로 밀어 접기)
    sidebar.classList.add('collapsed');
    mainCol.classList.remove('col-md-8', 'col-xl-9');
    mainCol.classList.add('col-12');

    if (textBtn) textBtn.textContent = '목록 열기';
    if (iconBtn) {
      iconBtn.className = 'bi bi-layout-sidebar';
    }
    if (btnToggle) {
      btnToggle.title = '목록 사이드바 다시 펼치기';
      btnToggle.classList.add('btn-primary');
      btnToggle.classList.remove('btn-outline-secondary');
    }
    localStorage.setItem('coach_dash_sidebar_collapsed', 'true');
  } else {
    // 2. 사이드바 복원 (다시 펼치기)
    sidebar.classList.remove('collapsed');
    mainCol.classList.remove('col-12');
    mainCol.classList.add('col-md-8', 'col-xl-9');

    if (textBtn) textBtn.textContent = '목록 접기';
    if (iconBtn) {
      iconBtn.className = 'bi bi-layout-sidebar-inset';
    }
    if (btnToggle) {
      btnToggle.title = '목록 사이드바 왼쪽으로 접기';
      btnToggle.classList.remove('btn-primary');
      btnToggle.classList.add('btn-outline-secondary');
    }
    localStorage.setItem('coach_dash_sidebar_collapsed', 'false');
  }

  // 본문 너비 변화에 따른 Chart.js 리사이즈
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    if (AppState && AppState.charts) {
      if (AppState.charts.weight && AppState.charts.weight.resize) AppState.charts.weight.resize();
      if (AppState.charts.exercise && AppState.charts.exercise.resize) AppState.charts.exercise.resize();
      if (AppState.charts.diet && AppState.charts.diet.resize) AppState.charts.diet.resize();
    }
  }, 150);
}
window.toggleSidebar = toggleSidebar;

/**
 * ==============================================================================
 * [모바일 하단 탭바] 오늘 / 회원 / 루틴·식단(이름 줄을 누르면 프로필 펼침) / 기록 / 더보기(태그·지침서)
 * - 화면 폭 992px 미만에서는 한 번에 한 화면만 보여 주고 하단 탭바·좌우 스와이프로 전환
 * - 데스크톱에서는 기존 2열 레이아웃 그대로 (탭 상태만 기억)
 * ==============================================================================
 */
const COACH_TABS = ['today', 'list', 'routine', 'record', 'stats', 'guide'];
// 탭 → 대시보드 뷰 (나머지 탭은 'members')
const COACH_TAB_VIEWS = { today: 'today', guide: 'guidelines', stats: 'tagstats' };
const COACH_DETAIL_TABS = ['routine', 'record'];
const COACH_MORE_TABS = ['stats', 'guide']; // 하단 탭바 '더보기'에 묶인 탭
const CoachTabState = { current: 'today', lastDetail: 'routine', scroll: {}, routineSeg: 'exercise' };

function isCoachMobileLayout() {
  return window.innerWidth < 992;
}

function switchCoachTab(tab, opts = {}) {
  if (!COACH_TABS.includes(tab)) return;
  const prev = CoachTabState.current;
  const mobile = isCoachMobileLayout();
  if (mobile && prev !== tab) CoachTabState.scroll[prev] = window.scrollY || 0;

  const view = COACH_TAB_VIEWS[tab] || 'members';
  if (AppState.currentView !== view) switchDashboardView(view);

  CoachTabState.current = tab;
  if (COACH_DETAIL_TABS.includes(tab)) CoachTabState.lastDetail = tab;
  document.body.setAttribute('data-ctab', tab);
  document.querySelectorAll('[data-ctab-target]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-ctab-target') === tab);
  });
  const moreBtn = document.getElementById('coachTabMore');
  if (moreBtn) moreBtn.classList.toggle('is-active', COACH_MORE_TABS.includes(tab));

  if (!mobile || prev === tab) return;

  // 탭 전환 애니메이션 (스와이프/탭 방향에 맞춰 살짝 밀려 들어옴)
  const dir = opts.direction || (COACH_TABS.indexOf(tab) > COACH_TABS.indexOf(prev) ? 'next' : 'prev');
  const target = tab === 'list' ? document.getElementById('sidebarColumn') : document.getElementById('mainContentColumn');
  if (target) {
    target.classList.remove('cv3-enter-next', 'cv3-enter-prev');
    void target.offsetWidth;
    target.classList.add(dir === 'next' ? 'cv3-enter-next' : 'cv3-enter-prev');
  }
  window.scrollTo({ top: CoachTabState.scroll[tab] || 0, behavior: 'auto' });
  if (tab === 'record') resizeCoachCharts();
  if (tab === 'stats') resizeTagStatsChart();
}
window.switchCoachTab = switchCoachTab;

// [모바일 루틴·식단 탭] 상단 이름 줄을 누르면 프로필(인적 사항)을 펼치거나 접음
function toggleMobileProfile(force) {
  const open = typeof force === 'boolean' ? force : document.body.getAttribute('data-cprofile') !== 'open';
  document.body.setAttribute('data-cprofile', open ? 'open' : 'closed');
  const btn = document.getElementById('btnStripProfileToggle');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
window.toggleMobileProfile = toggleMobileProfile;

// 기존 호출부 호환: 'list' = 회원 목록, 'detail' = 마지막으로 보던 상세 탭
function switchMobileCoachView(view) {
  switchCoachTab(view === 'detail' ? CoachTabState.lastDetail : 'list');
}
window.switchMobileCoachView = switchMobileCoachView;

function resizeCoachCharts() {
  setTimeout(() => {
    if (AppState.charts.weight) AppState.charts.weight.resize();
  }, 60);
}

function setRoutineSegment(seg) {
  CoachTabState.routineSeg = seg;
  document.body.setAttribute('data-croutine', seg);
  document.querySelectorAll('[data-routine-seg]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-routine-seg') === seg);
  });
}

// 좌우 스와이프로 탭 이동 (입력창·가로 스크롤 표·차트·모달 위에서는 무시)
function isSwipeExcludedTarget(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const tag = node.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'CANVAS') return true;
    if (node.classList && (node.classList.contains('modal') || node.classList.contains('dropdown-menu') || node.classList.contains('offcanvas'))) return true;
    if (node.scrollWidth > node.clientWidth + 4) {
      const ox = window.getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
  }
  return false;
}

function initCoachMobileTabs() {
  document.body.setAttribute('data-ctab', CoachTabState.current);
  setRoutineSegment(CoachTabState.routineSeg);

  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    const tabBtn = t.closest('[data-ctab-target]');
    if (tabBtn) switchCoachTab(tabBtn.getAttribute('data-ctab-target'));
    const segBtn = t.closest('[data-routine-seg]');
    if (segBtn) setRoutineSegment(segBtn.getAttribute('data-routine-seg'));
  });

  let start = null;
  document.addEventListener('touchstart', (e) => {
    if (!isCoachMobileLayout() || document.body.classList.contains('modal-open') || isCoachLogSheetOpen() || e.touches.length !== 1) {
      start = null;
      return;
    }
    start = isSwipeExcludedTarget(e.target) ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const quick = Date.now() - start.t < 600;
    start = null;
    if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const idx = COACH_TABS.indexOf(CoachTabState.current);
    const nextIdx = dx < 0 ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= COACH_TABS.length) return;
    switchCoachTab(COACH_TABS[nextIdx], { direction: dx < 0 ? 'next' : 'prev' });
  }, { passive: true });
}

/**
 * 대시보드 뷰 전환: 오늘 보드('today') / 참여자 관리('members') / 태그별 그래프('tagstats') / 코칭 지침서 관리('guidelines')
 * - 오늘 보드·태그별 그래프 뷰에서도 사이드바는 참여자 목록을 그대로 보여 줌 (회원을 누르면 참여자 관리로 이동)
 */
function switchDashboardView(viewName) {
  AppState.currentView = viewName;
  const isGuidelines = viewName === 'guidelines';

  const navButtons = { today: 'btnNavViewToday', members: 'btnNavViewMembers', tagstats: 'btnNavViewTagStats', guidelines: 'btnNavViewGuidelines' };
  Object.keys(navButtons).forEach(view => {
    const btn = document.getElementById(navButtons[view]);
    if (btn) btn.classList.toggle('active', view === viewName);
  });

  const tabBtnMembers = document.getElementById('tabBtnMembers');
  const tabBtnGuidelines = document.getElementById('tabBtnGuidelines');
  if (tabBtnMembers) { tabBtnMembers.classList.toggle('active', !isGuidelines); tabBtnMembers.classList.toggle('text-muted', isGuidelines); }
  if (tabBtnGuidelines) { tabBtnGuidelines.classList.toggle('active', isGuidelines); tabBtnGuidelines.classList.toggle('text-muted', !isGuidelines); }

  const sidebarMembers = document.getElementById('sidebarMembersMode');
  const sidebarGuidelines = document.getElementById('sidebarGuidelinesMode');
  if (sidebarMembers) sidebarMembers.classList.toggle('d-none', isGuidelines);
  if (sidebarGuidelines) {
    sidebarGuidelines.classList.toggle('d-none', !isGuidelines);
    sidebarGuidelines.classList.toggle('d-flex', isGuidelines);
  }

  const views = { today: 'viewTodayWrapper', members: 'viewMembersWrapper', tagstats: 'viewTagStatsWrapper', guidelines: 'viewGuidelinesWrapper' };
  Object.keys(views).forEach(view => {
    const el = document.getElementById(views[view]);
    if (el) el.classList.toggle('d-none', view !== viewName);
  });

  if (isGuidelines) {
    populateInlineGuidelines();
  } else if (viewName === 'today') {
    renderTodayBoard();
  } else if (viewName === 'tagstats') {
    renderTagStatsView();
  } else if (AppState.selectedMember) {
    // 선택된 참여자 차트 리사이즈 갱신
    resizeCoachCharts();
  }

  // 하단 탭바 상태 동기화 (상단 메뉴·회원 선택 등 다른 경로로 전환된 경우)
  const currentTabView = COACH_TAB_VIEWS[CoachTabState.current] || 'members';
  if (currentTabView !== viewName) {
    const tab = Object.keys(COACH_TAB_VIEWS).find(t => COACH_TAB_VIEWS[t] === viewName);
    switchCoachTab(tab || 'list');
  }
}

/**
 * ==============================================================================
 * [태그별 그래프] 한 태그 회원들의 체중(회원별 작은 그래프) / 첫 기록 대비 체중 변화(한 그래프)
 * - 체중은 WeightLog 기록을 회원번호로 연결 (회원 상세 그래프와 같은 데이터)
 * ==============================================================================
 */
const TagStatsState = { tag: '', metric: 'weight', axis: 'date', includeInactive: false };

const TAG_STATS_METRICS = {
  weight: { title: '아침 공복 몸무게 (kg)', unit: 'kg' },
  weightChange: { title: '첫 기록 대비 체중 변화 (kg)', unit: 'kg' }
};

const TAG_STATS_COLORS = ['#3182f6', '#f08c00', '#0ca678', '#e64980', '#7950f2', '#15aabf', '#fa5252', '#82c91e', '#495057', '#fab005', '#be4bdb', '#1c7ed6'];

// 회원 1명의 WeightLog 기록 (회원번호 정확 일치, 날짜순, 같은 날짜는 마지막 행)
function getMemberWeightRecords(mem) {
  const memberNo = getMemberNo(mem);
  if (!memberNo) return [];
  const byDate = new Map();
  AppState.weights.forEach(w => {
    if (String(w['회원번호'] || '').trim() !== memberNo) return;
    const date = String(w['날짜'] || '').trim();
    const weight = parseFloat(w['체중']);
    if (dateKeyToUtcDay(date) === null || isNaN(weight) || weight <= 0) return;
    byDate.set(date, Math.round(weight * 10) / 10);
  });
  return [...byDate.keys()].sort().map(date => ({ date, weight: byDate.get(date) }));
}

function dateKeyToUtcDay(dateKey) {
  const m = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null;
}

function getTagStatsMembers() {
  return AppState.members.filter(m =>
    getMemberTag(m) === TagStatsState.tag && (TagStatsState.includeInactive || isMemberActive(m))
  );
}

// 회원 1명의 날짜별 체중 + 참여 일차·첫 기록 대비 변화
function collectMemberDailySeries(mem) {
  const rows = getMemberWeightRecords(mem).map(r => ({ ...r, day: dateKeyToUtcDay(r.date) }));
  const firstDay = rows.length ? rows[0].day : 0;
  const firstWeight = rows.length ? rows[0].weight : null;
  rows.forEach(r => {
    r.dayIndex = r.day - firstDay + 1;
    r.weightChange = Math.round((r.weight - firstWeight) * 10) / 10;
  });
  return rows;
}

function averageOf(values) {
  const nums = values.filter(v => v !== null && v !== undefined);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null;
}

function renderTagStatsTagChips() {
  const container = document.getElementById('tagStatsTagChips');
  if (!container) return;
  const tags = [...new Set(AppState.members.map(getMemberTag).filter(Boolean))];
  if (!tags.includes(TagStatsState.tag)) TagStatsState.tag = tags[0] || '';

  container.innerHTML = `<small class="text-muted me-1 fw-bold"><i class="bi bi-tag-fill text-secondary me-1"></i>태그:</small>` +
    (tags.length ? tags.map(tag => {
      const selected = tag === TagStatsState.tag;
      const count = AppState.members.filter(m => getMemberTag(m) === tag && (TagStatsState.includeInactive || isMemberActive(m))).length;
      return `<button type="button" class="git-tag-pill tagstats-tag-btn ${selected ? 'bg-primary text-white border-primary' : ''}" data-tag="${escapeHtml(tag)}">
        <i class="bi bi-tag-fill ${selected ? 'text-white' : 'text-primary'}"></i>${escapeHtml(tag)} <span class="opacity-75">${count}</span>
      </button>`;
    }).join('') : '<span class="text-muted small">등록된 태그가 없습니다.</span>');

  container.querySelectorAll('.tagstats-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      TagStatsState.tag = btn.getAttribute('data-tag');
      renderTagStatsView();
    });
  });
}

function renderTagStatsView() {
  renderTagStatsTagChips();
  const metric = TAG_STATS_METRICS[TagStatsState.metric];
  document.querySelectorAll('[data-tagstats-metric]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-tagstats-metric') === TagStatsState.metric);
  });
  document.querySelectorAll('[data-tagstats-axis]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tagstats-axis') === TagStatsState.axis);
  });
  setElementText('tagStatsChartTitle', metric.title);

  const members = getTagStatsMembers();
  const seriesList = members.map(mem => ({ mem, rows: collectMemberDailySeries(mem) }));
  renderTagStatsTable(seriesList);
  // 체중은 회원마다 눈금이 달라 한 그래프에 겹치면 추세가 묻히므로 회원별 작은 그래프로 따로 그림
  const perMember = TagStatsState.metric === 'weight';
  const chartCard = document.getElementById('tagStatsChartCard');
  if (chartCard) chartCard.classList.toggle('d-none', perMember);
  if (perMember) {
    renderTagStatsChart([]);
    renderTagStatsMemberGrid(seriesList);
  } else {
    renderTagStatsMemberGrid(null);
    renderTagStatsChart(seriesList);
  }
}

const TAG_STATS_TREND_COLORS = { down: '#3182f6', up: '#f04452', flat: '#8b95a1' };

// 회원 1명의 체중 추세 (코드 계산): 첫/최근 체중, 변화, 7일 평균선, 주당 변화 속도(최소제곱 기울기)
function computeMemberWeightTrend(rows) {
  const points = rows.filter(r => r.weight !== null);
  const trend = { points, first: null, last: null, change: null, pacePerWeek: null, direction: 'none', avg7: [] };
  if (!points.length) return trend;
  trend.first = points[0].weight;
  trend.last = points[points.length - 1].weight;
  trend.change = Math.round((trend.last - trend.first) * 10) / 10;
  trend.avg7 = points.map(p => averageOf(points.filter(q => q.day <= p.day && q.day > p.day - 7).map(q => q.weight)));

  const spanDays = points[points.length - 1].day - points[0].day;
  if (points.length >= 3 && spanDays >= 4) {
    const n = points.length;
    const mx = points.reduce((a, p) => a + p.day, 0) / n;
    const my = points.reduce((a, p) => a + p.weight, 0) / n;
    const num = points.reduce((a, p) => a + (p.day - mx) * (p.weight - my), 0);
    const den = points.reduce((a, p) => a + (p.day - mx) ** 2, 0);
    if (den > 0) trend.pacePerWeek = Math.round(num / den * 7 * 100) / 100;
  }
  if (trend.pacePerWeek === null) trend.direction = 'none';
  else if (trend.pacePerWeek <= -0.2) trend.direction = 'down';
  else if (trend.pacePerWeek >= 0.2) trend.direction = 'up';
  else trend.direction = 'flat';
  return trend;
}

function destroyTagStatsMemberCharts() {
  (AppState.charts.tagStatsMembers || []).forEach(c => c.destroy());
  AppState.charts.tagStatsMembers = [];
}

// 회원별 체중 그래프 카드 (감량 많은 순). seriesList가 null이면 숨김
function renderTagStatsMemberGrid(seriesList) {
  destroyTagStatsMemberCharts();
  const grid = document.getElementById('tagStatsMemberGrid');
  if (!grid) return;
  grid.classList.toggle('d-none', seriesList === null);
  if (seriesList === null) { grid.innerHTML = ''; return; }
  if (!seriesList.length) {
    grid.innerHTML = '<div class="text-center text-muted small py-4">이 태그에 해당하는 회원이 없습니다.</div>';
    return;
  }

  const byDay = TagStatsState.axis === 'day';
  const items = seriesList.map(s => ({ ...s, trend: computeMemberWeightTrend(s.rows) }))
    .sort((a, b) => {
      if (a.trend.change === null) return b.trend.change === null ? 0 : 1;
      if (b.trend.change === null) return -1;
      return a.trend.change - b.trend.change;
    });

  const signed = (v, suffix) => `${v > 0 ? '+' : ''}${v}${suffix}`;
  const trendLabel = { down: '감소 추세', up: '증가 추세', flat: '유지', none: '기록 부족' };
  grid.innerHTML = items.map(({ mem, trend }, i) => {
    const inactive = !isMemberActive(mem);
    const changeCls = trend.change === null ? 'text-muted' : (trend.change < 0 ? 'is-down' : (trend.change > 0 ? 'is-up' : ''));
    const hasData = trend.points.length > 0;
    return `<div class="tagstats-member-card is-${trend.direction}">
      <div class="tagstats-member-head">
        <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fw-bold tagstats-member-link" data-member-key="${escapeHtml(getMemberKey(mem))}">${escapeHtml(getMemberName(mem))}</button>
        ${inactive ? '<span class="badge bg-secondary-subtle text-secondary">휴면</span>' : ''}
        <span class="tagstats-trend-badge ms-auto">${trendLabel[trend.direction]}</span>
      </div>
      <div class="tagstats-member-stats">
        <div><span class="tagstats-stat-label">최근</span><b>${hasData ? `${trend.last}kg` : '-'}</b></div>
        <div><span class="tagstats-stat-label">첫 기록 대비</span><b class="${changeCls}">${trend.change === null ? '-' : signed(trend.change, 'kg')}</b></div>
        <div><span class="tagstats-stat-label">주당</span><b>${trend.pacePerWeek === null ? '-' : signed(trend.pacePerWeek, 'kg')}</b></div>
      </div>
      <div class="tagstats-member-chart">
        ${hasData ? `<canvas data-tagstats-idx="${i}"></canvas>` : '<div class="tagstats-member-empty">체중 기록이 없습니다.</div>'}
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.tagstats-member-link').forEach(btn => {
    btn.addEventListener('click', () => selectMember(btn.getAttribute('data-member-key'), { tab: 'record' }));
  });
  if (typeof Chart === 'undefined') return;

  grid.querySelectorAll('canvas[data-tagstats-idx]').forEach(canvas => {
    const { trend } = items[+canvas.getAttribute('data-tagstats-idx')];
    const color = TAG_STATS_TREND_COLORS[trend.direction] || TAG_STATS_TREND_COLORS.flat;
    const labels = trend.points.map(p => {
      if (byDay) return `${p.dayIndex}일차`;
      const [, mm, dd] = p.date.split('-');
      return `${+mm}/${+dd}`;
    });
    // 회원마다 자기 체중 범위로 눈금을 잡되, 최소 3kg 폭을 둬 작은 출렁임이 과장되지 않게 함
    const values = trend.points.map(p => p.weight);
    const lo = Math.min(...values), hi = Math.max(...values);
    const mid = (lo + hi) / 2, half = Math.max(1.5, (hi - lo) / 2 + 0.5);
    const options = createSingleChartOptions('kg', Math.floor(mid - half), Math.ceil(mid + half));
    options.layout.padding = { top: 6, right: 6, bottom: 0, left: 0 };
    options.scales.x.ticks = { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 };
    options.scales.y.ticks = { font: { size: 9 }, maxTicksLimit: 4, callback: (val) => `${val}` };
    options.plugins.tooltip.callbacks.label = (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} kg`;

    AppState.charts.tagStatsMembers.push(new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '체중',
            data: values,
            borderColor: 'rgba(139, 149, 161, 0.45)',
            backgroundColor: 'rgba(139, 149, 161, 0.85)',
            borderWidth: 1,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            tension: 0
          },
          {
            label: '7일 평균',
            data: trend.avg7,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3
          }
        ]
      },
      options
    }));
  });
}

function renderTagStatsChart(seriesList) {
  if (AppState.charts.tagStats) {
    AppState.charts.tagStats.destroy();
    AppState.charts.tagStats = null;
  }
  const canvas = document.getElementById('chartTagStats');
  const emptyEl = document.getElementById('tagStatsEmpty');
  const key = TagStatsState.metric;
  const byDay = TagStatsState.axis === 'day';
  const withData = seriesList.filter(s => s.rows.some(r => r[key] !== null));
  if (emptyEl) emptyEl.classList.toggle('d-none', withData.length > 0);
  if (!canvas || withData.length === 0 || typeof Chart === 'undefined') return;

  // 가로축: 모든 회원의 날짜(또는 참여 일차)를 합쳐 정렬
  const axisKeys = [...new Set(withData.flatMap(s => s.rows.map(r => (byDay ? r.dayIndex : r.date))))]
    .sort((a, b) => (byDay ? a - b : String(a).localeCompare(String(b))));
  const labels = axisKeys.map(k => {
    if (byDay) return `${k}일차`;
    const [, mm, dd] = String(k).split('-');
    return `${+mm}/${+dd}`;
  });

  const datasets = withData.map((s, i) => {
    const color = TAG_STATS_COLORS[i % TAG_STATS_COLORS.length];
    const valueByKey = new Map(s.rows.map(r => [byDay ? r.dayIndex : r.date, r[key]]));
    return {
      label: getMemberName(s.mem),
      data: axisKeys.map(k => (valueByKey.has(k) ? valueByKey.get(k) : null)),
      spanGaps: true,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.2,
      clip: false,
      pointRadius: (ctx) => (ctx.raw === null || ctx.raw === undefined ? 0 : 3.5),
      pointHoverRadius: 6
    };
  });

  const unit = TAG_STATS_METRICS[key].unit;
  const values = datasets.flatMap(d => d.data).filter(v => v !== null);
  const options = createSingleChartOptions(unit, Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1));
  if (key === 'weightChange') {
    options.scales.y.ticks.callback = (val) => `${val > 0 ? '+' : ''}${val}${unit}`;
  }
  options.plugins.legend = {
    display: true,
    position: 'bottom',
    labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 }
  };
  options.plugins.tooltip.callbacks.label = (ctx) => {
    const v = ctx.parsed.y;
    return `${ctx.dataset.label}: ${key === 'weightChange' && v > 0 ? '+' : ''}${v} ${unit}`;
  };

  AppState.charts.tagStats = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options
  });
}

function renderTagStatsTable(seriesList) {
  const tbody = document.getElementById('tagStatsTableBody');
  if (!tbody) return;
  if (seriesList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">이 태그에 해당하는 회원이 없습니다.</td></tr>';
    return;
  }
  const fmt = (v, suffix = '') => (v === null || v === undefined ? '<span class="text-muted">-</span>' : `${v}${suffix}`);
  tbody.innerHTML = seriesList.map(({ mem, rows }) => {
    const weights = rows.filter(r => r.weight !== null);
    const first = weights.length ? weights[0].weight : null;
    const last = weights.length ? weights[weights.length - 1].weight : null;
    const change = (first !== null && last !== null) ? Math.round((last - first) * 10) / 10 : null;
    const changeCls = change === null ? '' : (change < 0 ? 'text-primary fw-bold' : (change > 0 ? 'text-danger fw-bold' : ''));
    const inactive = !isMemberActive(mem);
    return `<tr>
      <td><button type="button" class="btn btn-link btn-sm p-0 text-decoration-none fw-semibold tagstats-member-link" data-member-key="${escapeHtml(getMemberKey(mem))}">${escapeHtml(getMemberName(mem))}</button>${inactive ? ' <span class="badge bg-secondary-subtle text-secondary">휴면</span>' : ''}</td>
      <td class="text-end">${rows.length}일</td>
      <td class="text-end">${fmt(first, 'kg')}</td>
      <td class="text-end">${fmt(last, 'kg')}</td>
      <td class="text-end ${changeCls}">${change === null ? fmt(null) : `${change > 0 ? '+' : ''}${change}kg`}</td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.tagstats-member-link').forEach(btn => {
    btn.addEventListener('click', () => selectMember(btn.getAttribute('data-member-key'), { tab: 'record' }));
  });
}

function resizeTagStatsChart() {
  setTimeout(() => {
    if (AppState.charts.tagStats) AppState.charts.tagStats.resize();
    (AppState.charts.tagStatsMembers || []).forEach(c => c.resize());
  }, 60);
}

function initTagStatsActions() {
  document.querySelectorAll('[data-tagstats-metric]').forEach(btn => {
    btn.addEventListener('click', () => {
      TagStatsState.metric = btn.getAttribute('data-tagstats-metric');
      renderTagStatsView();
    });
  });
  document.querySelectorAll('[data-tagstats-axis]').forEach(btn => {
    btn.addEventListener('click', () => {
      TagStatsState.axis = btn.getAttribute('data-tagstats-axis');
      renderTagStatsView();
    });
  });
  const inactiveToggle = document.getElementById('tagStatsIncludeInactive');
  if (inactiveToggle) {
    inactiveToggle.addEventListener('change', () => {
      TagStatsState.includeInactive = inactiveToggle.checked;
      renderTagStatsView();
    });
  }
}

/**
 * 지침서 사이드바 항목 클릭 시 해당 카드로 스크롤 이동
 */
function scrollToGuideline(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.borderColor = '#6366f1';
    setTimeout(() => { el.style.borderColor = ''; }, 1500);
  }
}

/**
 * 지침서 대시보드 인라인 폼 데이터 바인딩
 */
function populateInlineGuidelines() {
  setInputValue('gdInlinePhilosophy', AppState.guidelines.philosophy || '');
  setInputValue('gdInlineExercise', AppState.guidelines.exercise || '');
  setInputValue('gdInlineDiet', AppState.guidelines.diet || '');
  setInputValue('gdInlineAnalysis', AppState.guidelines.analysis || '');
}

/**
 * 지침서 4종(코칭 철학·운동·식단·회원 분석) 대시보드 인라인 저장 로직
 */
function initInlineGuidelinesActions() {
  const btnSaveAll = document.getElementById('btnSaveAllGuidelinesInline');
  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', async () => {
      const updated = {
        philosophy: getInputValue('gdInlinePhilosophy'),
        exercise: getInputValue('gdInlineExercise'),
        diet: getInputValue('gdInlineDiet'),
        analysis: getInputValue('gdInlineAnalysis')
      };

      showLoadingOverlay('코칭 지침서를 구글 시트(Guidelines)에 저장 중...');
      const res = await postToGasBackend({
        action: 'updateGuidelines',
        guidelines: updated
      });
      hideLoadingOverlay();

      if (res && res.status === 'success') {
        AppState.guidelines = updated;
        showToast('코칭 지침서가 구글 시트에 안전하게 저장되었습니다!', 'success');
        const syncText = document.getElementById('guidelinesSyncStatusText');
        if (syncText) {
          const now = new Date();
          syncText.textContent = `최근 시트 동기화: ${now.toLocaleTimeString()}`;
        }
      }
    });
  }
}

/**
 * 지침서 개별 단건 저장
 */
async function saveSingleGuidelineInline(key, title) {
  const inputIdMap = {
    philosophy: 'gdInlinePhilosophy',
    exercise: 'gdInlineExercise',
    diet: 'gdInlineDiet',
    analysis: 'gdInlineAnalysis'
  };

  const val = getInputValue(inputIdMap[key]);
  AppState.guidelines[key] = val;

  showToast(`[${title}] 구글 시트에 저장 중...`, 'info');
  const res = await postToGasBackend({
    action: 'updateGuidelines',
    guidelines: AppState.guidelines
  });

  if (res && res.status === 'success') {
    showToast(`[${title}] 지침서가 구글 시트에 성공적으로 저장되었습니다.`, 'success');
  }
}

/**
 * 필터 적용 및 참여자 목록 렌더링
 */
function applyFiltersAndRenderMemberList() {
  const container = document.getElementById('memberListContainer');
  if (!container) return;

  const query = AppState.searchQuery.trim().toLowerCase();
  const statusFilter = AppState.filterStatus;
  const tagFilter = AppState.filterTag;

  const filtered = AppState.members.filter(m => {
    // 1. 이름, 회원번호, 태그 다중 검색 (대소문자 및 띄어쓰기 무관 방어)
    const name = getMemberName(m).toLowerCase();
    const memberId = getMemberId(m).toLowerCase();
    const tag = getMemberTag(m).toLowerCase();

    if (query && !name.includes(query) && !memberId.includes(query) && !tag.includes(query)) {
      return false;
    }

    // 2. 상태 필터 (유효/휴면)
    const isActive = isMemberActive(m);
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'inactive' && isActive) return false;

    // 3. 태그 필터
    if (tagFilter !== 'all') {
      const currentTag = getMemberTag(m);
      if (currentTag !== tagFilter) return false;
    }

    return true;
  });

  // 카운트 업데이트
  const countEl = document.getElementById('memberCountText');
  if (countEl) countEl.textContent = `${filtered.length}명`;
  const mobileCountBadge = document.getElementById('mobileTabCountBadge');
  if (mobileCountBadge) mobileCountBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted small">
        <i class="bi bi-person-x fs-2 d-block mb-1 opacity-50"></i>
        조건에 맞는 참여자가 없습니다.
      </div>
    `;
    return;
  }

  // 회원별 체중 기록 수를 1회 순회로 미리 집계 (회원번호 기준, 회원 수 x 기록 수 반복 스캔 방지)
  const weightCountByNo = {};
  AppState.weights.forEach(w => {
    const no = String(w['회원번호'] || '').trim();
    if (no) weightCountByNo[no] = (weightCountByNo[no] || 0) + 1;
  });

  let html = '';
  filtered.forEach((m, idx) => {
    const key = getMemberKey(m);
    const memberId = getMemberId(m);
    const name = getMemberName(m);
    const isActive = isMemberActive(m);
    const tag = getMemberTag(m);
    const isSelected = AppState.selectedMember && getMemberKey(AppState.selectedMember) === key;
    const weightCount = weightCountByNo[getMemberNo(m)] || 0;

    const ageVal = getField(m, '나이', 'age');
    const jobVal = getField(m, '직업/근무시간', '직업', '근무시간', 'job');

    html += `
      <div class="member-card-item ${isSelected ? 'active' : ''}" onclick="selectMember('${escapeHtml(key)}')">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <div class="d-flex align-items-center">
            <div class="member-avatar ${isActive ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'} me-2">
              ${name.charAt(0)}
            </div>
            <div>
              <div class="fw-bold text-dark d-flex align-items-center">
                <span class="badge bg-light text-secondary border font-monospace me-1" style="font-size: 0.68rem;" title="회원번호">${escapeHtml(memberId)}</span>
                ${escapeHtml(name)}
                <span class="badge ${isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} ms-1 fw-normal" style="font-size: 0.7rem;">
                  ${isActive ? '유효' : '휴면'}
                </span>
              </div>
              <div class="text-muted small" style="font-size: 0.75rem;">
                ${ageVal ? ageVal + '세' : '-'} / ${jobVal ? String(jobVal).split('(')[0].trim() : '-'}
              </div>
            </div>
          </div>
          <span class="badge bg-light text-secondary border rounded-pill" style="font-size: 0.72rem;" title="공복 체중 기록 수">
            체중 ${weightCount}회
          </span>
        </div>

        <!-- [요구사항 2 & 3] 상태 토글 및 Fixed Popper Git Tag 스타일 드롭다운 -->
        <div class="d-flex align-items-center justify-content-between pt-1 border-top" onclick="event.stopPropagation();">
          <!-- 상태 토글 버튼 -->
          <button type="button" 
                  class="btn btn-sm py-0 px-2 fw-semibold ${isActive ? 'btn-outline-secondary' : 'btn-outline-success'}" 
                  style="font-size: 0.72rem;"
                  onclick="toggleMemberStatus('${escapeHtml(key)}', ${isActive})">
            <i class="bi ${isActive ? 'bi-moon' : 'bi-sun'} me-1"></i>${isActive ? '휴면 전환' : '유효 활성화'}
          </button>

          <!-- Git Tag 스타일 드롭다운 (data-bs-strategy="fixed"로 스크롤 잘림 완벽 해결) -->
          <div class="dropdown">
            <button class="btn btn-git-tag-dropdown dropdown-toggle" 
                    type="button" 
                    id="dropdownTag_${idx}"
                    data-bs-toggle="dropdown" 
                    data-bs-strategy="fixed"
                    aria-expanded="false"
                    title="참여 프로그램 코스 변경 (시트 즉시 저장)">
              <i class="bi bi-tag-fill text-primary"></i> ${escapeHtml(tag)}
            </button>
            <ul class="dropdown-menu dropdown-menu-end dropdown-menu-tag shadow-lg" aria-labelledby="dropdownTag_${idx}">
              <li><h6 class="dropdown-header text-muted py-1" style="font-size: 0.7rem;"><i class="bi bi-tags me-1"></i>프로그램 코스 선택</h6></li>
              <li><a class="dropdown-item ${tag === '4주-체중감량반' ? 'active' : ''}" href="javascript:void(0)" onclick="changeMemberTag('${escapeHtml(key)}', '4주-체중감량반')"><i class="bi bi-check2"></i> 4주-체중감량반</a></li>
              <li><a class="dropdown-item ${tag === '4주-식단집중반' ? 'active' : ''}" href="javascript:void(0)" onclick="changeMemberTag('${escapeHtml(key)}', '4주-식단집중반')"><i class="bi bi-check2"></i> 4주-식단집중반</a></li>
              <li><a class="dropdown-item ${tag === '4주-직장인루틴반' ? 'active' : ''}" href="javascript:void(0)" onclick="changeMemberTag('${escapeHtml(key)}', '4주-직장인루틴반')"><i class="bi bi-check2"></i> 4주-직장인루틴반</a></li>
              <li><a class="dropdown-item ${tag === '4주-기초체력반' ? 'active' : ''}" href="javascript:void(0)" onclick="changeMemberTag('${escapeHtml(key)}', '4주-기초체력반')"><i class="bi bi-check2"></i> 4주-기초체력반</a></li>
              <li><a class="dropdown-item ${tag === '4주-유지어터반' ? 'active' : ''}" href="javascript:void(0)" onclick="changeMemberTag('${escapeHtml(key)}', '4주-유지어터반')"><i class="bi bi-check2"></i> 4주-유지어터반</a></li>
              <li><hr class="dropdown-divider my-1"></li>
              <li><a class="dropdown-item text-primary fw-bold" href="javascript:void(0)" onclick="openCustomTagModal('${escapeHtml(key)}', '${escapeHtml(tag)}')"><i class="bi bi-pencil-square"></i> 직접 입력/수정...</a></li>
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * 프로그램 태그 필터 칩 목록 동적 렌더링 (Git Tag 스타일)
 */
function renderTagFilterButtons() {
  const container = document.getElementById('tagFilterContainer');
  if (!container) return;

  const tagsSet = new Set();
  AppState.members.forEach(m => {
    const t = getMemberTag(m);
    if (t) tagsSet.add(t);
  });

  let html = `
    <small class="text-muted me-1 fw-bold" style="font-size: 0.72rem;"><i class="bi bi-tag-fill text-secondary me-1"></i>코스:</small>
    <button type="button" class="git-tag-pill ${AppState.filterTag === 'all' ? 'bg-dark text-white border-dark' : ''} border-0 tag-filter-btn" data-tag="all">전체</button>
  `;

  tagsSet.forEach(tag => {
    const isSelected = AppState.filterTag === tag;
    html += `
      <button type="button" class="git-tag-pill ${isSelected ? 'bg-primary text-white border-primary' : ''} tag-filter-btn" data-tag="${escapeHtml(tag)}">
        <i class="bi bi-tag-fill ${isSelected ? 'text-white' : 'text-primary'}"></i>${escapeHtml(tag)}
      </button>
    `;
  });

  container.innerHTML = html;

  // 클릭 이벤트 바인딩
  container.querySelectorAll('.tag-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.filterTag = btn.getAttribute('data-tag');
      renderTagFilterButtons();
      applyFiltersAndRenderMemberList();
      renderTodayBoard();
    });
  });
}

/**
 * [상태 변경] 리스트에서 상태(유효/휴면) 변경 시 구글 시트 해당 열에 즉시 업데이트
 */
async function toggleMemberStatus(memberKey, currentIsActive) {
  const newStatus = currentIsActive ? '휴면' : '유효';
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  if (!mem) return;

  mem['상태'] = newStatus;
  applyFiltersAndRenderMemberList();
  if (AppState.selectedMember && getMemberKey(AppState.selectedMember) === memberKey) {
    updatePersonalInfoPanel(mem);
  }

  showToast(`[${getMemberName(mem)}] 회원의 상태를 '${newStatus}'(으)로 구글 시트에 업데이트 중...`, 'info');

  const res = await postToGasBackend({
    action: 'updateMemberStatusTag',
    memberKey: memberKey,
    status: newStatus
  });

  if (res && res.status === 'success') {
    showToast(`'${newStatus}' 상태가 구글 시트에 저장되었습니다.`, 'success');
  }
}

/**
 * [태그 변경] 리스트에서 태그 변경 시 구글 시트 해당 열에 즉시 업데이트
 */
async function changeMemberTag(memberKey, newTag) {
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  if (!mem) return;

  mem['태그'] = newTag;
  applyFiltersAndRenderMemberList();
  renderTagFilterButtons();
  if (AppState.selectedMember && getMemberKey(AppState.selectedMember) === memberKey) {
    updatePersonalInfoPanel(mem);
  }

  showToast(`[${getMemberName(mem)}] 회원의 코스를 '${newTag}'(으)로 구글 시트에 업데이트 중...`, 'info');

  const res = await postToGasBackend({
    action: 'updateMemberStatusTag',
    memberKey: memberKey,
    tag: newTag
  });

  if (res && res.status === 'success') {
    showToast(`프로그램 태그가 구글 시트에 성공적으로 저장되었습니다.`, 'success');
  }
}

/**
 * 커스텀 태그 직접 입력 모달 열기
 */
function openCustomTagModal(memberKey, currentTag) {
  AppState.customTagTargetKey = memberKey;
  const inputEl = document.getElementById('customTagInput');
  if (inputEl) inputEl.value = currentTag || '';

  const modalEl = document.getElementById('customTagModal');
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

/**
 * ==============================================================================
 * [4. 우측 메인 상세 화면: 참여자 상세 렌더링 로직]
 * ==============================================================================
 */

/**
 * 참여자 선택 시 전체 메인 패널 갱신
 */
function selectMember(memberKey, opts = {}) {
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  if (!mem) return;

  AppState.selectedMember = mem;

  // 참여자 관리 뷰로 자동 전환 (지침서·오늘 보드 뷰에서 클릭한 경우, 자동 선택은 지금 화면 유지)
  if (AppState.currentView !== 'members' && !opts.auto) {
    switchDashboardView('members');
  } else {
    applyFiltersAndRenderMemberList();
  }

  // 상단 내비 배지
  const navBadge = document.getElementById('navSelectedMemberBadge');
  if (navBadge) {
    navBadge.innerHTML = `
      <span class="badge bg-primary text-white border px-3 py-2 fw-semibold">
        <i class="bi bi-person-check-fill me-1"></i>선택: ${escapeHtml(getMemberName(mem))} (${getField(mem, '상태', 'status') || '유효'})
      </span>
    `;
  }

  // 빈 화면 숨기고 상세 영역 보이기
  const emptyState = document.getElementById('noMemberSelectedState');
  const detailContent = document.getElementById('memberDetailContent');
  if (emptyState) emptyState.classList.add('d-none');
  if (detailContent) detailContent.classList.remove('d-none');

  // 1. [상단] 인적 사항 렌더링
  updatePersonalInfoPanel(mem);

  // 2. [중단] 지침 및 루틴 관리 렌더링
  updateGuidelineRoutinePanel(mem);

  // 3. [하단] 체중 그래프·코치 기록 타임라인
  updateWeightSection(mem);

  // 4. [모바일] 상단 회원 표시 갱신, 직접 선택한 경우에만 상세 탭으로 이동 (자동 선택은 목록 유지)
  const mobileMemberTop = document.getElementById('mobileSelectedMemberNameTop');
  if (mobileMemberTop) {
    mobileMemberTop.textContent = `${getMemberName(mem)} · ${getMemberId(mem) || ''} (${getField(mem, '상태', 'status') || '유효'})`;
  }
  if (!opts.auto && isCoachMobileLayout()) {
    switchCoachTab(opts.tab || CoachTabState.lastDetail);
  }
}

/**
 * [상단] 인적 사항 패널 바인딩 (공백 및 어휘 차이에 100% 안전한 방어 바인딩)
 */
function updatePersonalInfoPanel(mem) {
  const memberId = getMemberId(mem);
  const name = getMemberName(mem);
  const age = getField(mem, '나이', 'age') || '-';
  const gender = getField(mem, '성별', 'gender') || '-';
  const height = getField(mem, '키', 'height') || '-';
  const weight = getField(mem, '시작 체중', '시작체중', '체중', '공복 몸무게', '공복몸무게', 'weight') || '-';
  const job = getField(mem, '직업/근무시간', '직업', '근무시간', 'job') || '-';
  const exp = getField(mem, '운동 경력', '운동경력', '운동 경험', '운동경험', '경력', 'experience') || '-';
  const freq = getField(mem, '주당 운동 횟수', '주당운동횟수', '주당 운동횟수', '운동 횟수', '운동횟수', 'frequency') || '-';
  const goal = getField(mem, '참여목적', '목표', 'goal') || '-';
  const status = getField(mem, '상태', 'status') || '유효';
  const tag = getMemberTag(mem);

  setElementText('valMemberId', memberId);
  setElementText('valNameAgeGender', `${name} (${age}세 / ${gender})`);
  setElementText('valHeightWeight', `${height} cm / ${weight} kg`);
  setElementText('valJobSchedule', `${job}`);
  setElementText('valExperience', `${exp}`);
  setElementText('valFrequency', `${freq}`);
  setElementText('valGoal', `${goal}`);

  const badgeMemberId = document.getElementById('badgeMemberId');
  if (badgeMemberId) {
    badgeMemberId.textContent = memberId;
  }

  const badgeStatus = document.getElementById('badgeMemberStatus');
  if (badgeStatus) {
    badgeStatus.textContent = status;
    badgeStatus.className = `badge ${isMemberActive(mem) ? 'bg-success text-white' : 'bg-secondary text-white'} fw-normal`;
  }

  const badgeTag = document.getElementById('badgeMemberTag');
  if (badgeTag) {
    badgeTag.innerHTML = `<i class="bi bi-tag-fill text-primary me-1"></i>${escapeHtml(tag)}`;
  }
}

function omitGuideAndSelfEditFields(mem) {
  const selfEdit = ['회원운동요청', '회원식단요청', '이전버전(운동)', '이전버전(식단)', '회원운동변경일시', '회원식단변경일시', '회원운동요청결과', '회원식단요청결과'];
  const out = {};
  Object.keys(mem || {}).forEach(k => {
    const clean = String(k).replace(/\s+/g, '');
    if (clean.includes('지침') || clean.includes('분석') || selfEdit.includes(clean)) return;
    out[k] = mem[k];
  });
  return out;
}

/**
 * [중단] 지침 및 루틴 관리 패널 바인딩
 */
function updateGuidelineRoutinePanel(mem) {
  const exGuide = getField(mem, 
    '운동 루틴 수정 제안 지침', '운동루틴수정제안지침', 
    '운동 수정 제안 지침', '운동수정제안지침', 
    '운동 제안 지침서', '운동제안지침서', 
    '운동수정지침', '운동제안지침', '운동지침'
  );
  // 루틴/식단 값은 지침 열·회원 셀프 수정 열(요청/이전 버전/변경일시)을 제외하고 탐색 (부분 일치로 지침 문구가 루틴 칸에 채워지는 오매칭 방지)
  const planSource = omitGuideAndSelfEditFields(mem);
  const exRoutine = getField(planSource, 
    '현재 제안 운동 루틴', '현재제안운동루틴', 
    '제안운동루틴', '제안 운동 루틴', 
    '현재운동루틴', '현재 운동 루틴', 
    '운동루틴', '운동 루틴'
  );
  const dietGuide = getField(mem, 
    '식단 수정 제안 지침', '식단수정제안지침', 
    '식단 제안 지침서', '식단제안지침서', 
    '식단수정지침', '식단제안지침', '식단지침'
  );
  const dietRoutine = getField(planSource, 
    '현재 제안 식단', '현재제안식단', 
    '제안식단', '제안 식단', 
    '현재식단', '현재 식단', 
    '식단계획', '식단 계획'
  );

  MEMBER_PLAN_CHANGE_KINDS.forEach(k => renderMemberRequestNoteForCoach(mem, k));

  setInputValue('inputExerciseGuideline', exGuide);
  setInputValue('inputCurrentExerciseRoutine', exRoutine);
  setInputValue('inputDietGuideline', dietGuide);
  setInputValue('inputCurrentDietPlan', dietRoutine);

  // [아코디언 표 미리보기 렌더링 (운동 & 식단)]
  renderCoachWorkoutRoutinePreview(exRoutine);
  switchRoutineViewMode('table');
  renderCoachDietPlanPreview(dietRoutine);
  switchDietViewMode('table');
}

// 회원이 마이페이지에서 마지막으로 요청한 수정과 '요청 반영 안내'를 지침 칸 아래에 표시 (코치 지침과 다른 부분은 빨간색 강조)
function renderMemberRequestNoteForCoach(mem, k) {
  const box = document.getElementById(`${k.kind}MemberRequestNote`);
  if (!box) return;
  const exact = (names) => String(mem[names[0]] || mem[names[1]] || '').trim();
  const changedAt = exact(k.changed);
  const request = exact(k.request);
  const note = exact(k.note);
  if (!changedAt || (!request && !note)) {
    box.classList.add('d-none');
    box.innerHTML = '';
    return;
  }
  const conflict = hasCoachConflictRequestNote(note);
  box.className = `mt-2 p-2 rounded-3 small border ${conflict ? 'border-danger bg-danger-subtle' : 'bg-light'}`;
  box.innerHTML = `
    <div class="fw-bold ${conflict ? 'text-danger' : 'text-dark'} mb-1">
      <i class="bi ${conflict ? 'bi-exclamation-octagon-fill' : 'bi-person-gear'} me-1"></i>회원 셀프 수정 (${escapeHtml(changedAt)})${conflict ? ' · 코치 지침과 다른 부분 있음' : ''}
    </div>
    ${request ? `<div class="text-muted mb-1">요청: ${escapeHtml(request)}</div>` : ''}
    ${note ? `<div class="text-dark" style="white-space: pre-wrap;">${escapeHtml(note)}</div>` : ''}
  `;
}

/**
 * 마크다운 운동 루틴 텍스트를 [루틴 소개 카드] + [DAY1~DAY7 접기/펼치기 아코디언 표]로 변환하여 렌더링
 */
function parseWorkoutRoutineToAccordionHtml(rawText, prefix = 'routine') {
  if (!rawText || !rawText.trim()) {
    return '<div class="text-muted text-center py-4">등록된 운동 루틴이 없습니다.<br>코치님의 상담 또는 AI 업데이트를 통해 루틴을 생성할 수 있습니다.</div>';
  }

  // 1. 관리용 수정 지침 줄 필터링 (화면 뷰 시인성 최적화)
  const lines = rawText.split('\n');
  const filteredLines = lines.filter(line => {
    const t = line.trim();
    return !(t.includes('수정 지침') || t.includes('수정지침') || t.includes('수정 제안') || t.includes('제안 지침') || t.includes('제안지침'));
  });
  const cleanText = filteredLines.join('\n').trim();

  // 2. [루틴 소개]와 [루틴 본문 (DAY1~DAY7)] 명확 분리
  // 첫 번째 DAY 패턴(예: DAY 1, | DAY 1, # DAY 1 등)의 위치를 기준으로 분할
  const firstDayMatch = cleanText.match(/(?:^|\n)\s*(?:\|\s*)?(?:#+\s*)?DAY\s*[1-7]/i);

  let rawIntroPart = '';
  let routineBodyPart = cleanText;

  if (firstDayMatch) {
    const splitIdx = firstDayMatch.index;
    rawIntroPart = cleanText.substring(0, splitIdx).trim();
    routineBodyPart = cleanText.substring(splitIdx).trim();
  } else {
    // DAY 패턴이 없는 경우
    rawIntroPart = cleanText;
    routineBodyPart = '';
  }

  // 3. [루틴 소개] 텍스트 대청소 ("1. 루틴 소개", "2. 루틴", 마크다운 헤더/볼드/대시 기호 제거)
  let introClean = rawIntroPart
    .replace(/^[#*_\s]*\d+[\.\)]\s*\[?루틴\s*소개\]?[#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\[루틴\s*소개\][#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\d+[\.\)]\s*\[?루틴\]?[#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\[루틴\][#*_\s:]*/gmi, '')
    .trim();

  // 각 라인별 추가 필터링 (잔여 레이블 및 불필요한 문구 제거)
  introClean = introClean
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (!t) return false;
      if (/^(?:#+\s*)?(?:\d+[\.\)]\s*)?\[?루틴(?:\s*소개)?\]?[:\s]*$/i.test(t)) return false;
      if (/^무리한\s*운동은/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();

  let introHtml = '';
  if (introClean) {
    const introCollapseId = `${prefix}_collapse_intro`;
    const introHeaderId = `${prefix}_heading_intro`;

    introHtml = `
      <div class="accordion-item routine-intro-accordion-item">
        <h2 class="accordion-header" id="${introHeaderId}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${introCollapseId}" aria-expanded="false" aria-controls="${introCollapseId}">
            <div class="d-flex align-items-center justify-content-between w-100 pe-2">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-bold">
                  <i class="bi bi-info-circle-fill me-1"></i>가이드
                </span>
                <strong class="text-dark">루틴 설계 배경 & 맞춤 가이드</strong>
              </div>
              <div class="d-none d-sm-block">
                <span class="badge bg-light text-secondary border small">설계 가이드 💡</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${introCollapseId}" class="accordion-collapse collapse" aria-labelledby="${introHeaderId}">
          <div class="accordion-body">
            <div class="workout-intro-card p-3 shadow-none mb-0">
              <div class="small text-secondary leading-relaxed">${escapeHtml(introClean).replace(/\n/g, '<br>')}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // DAY 패턴이 전혀 없는 경우의 안전 폴백
  if (!routineBodyPart) {
    if (!introHtml) {
      return `
        <div class="p-3 bg-white rounded-3 border leading-relaxed text-dark" style="white-space: pre-wrap;">${escapeHtml(cleanText)}</div>
      `;
    }
    return `
      <div class="routine-accordion-container">
        <div class="accordion routine-accordion" id="${prefix}_accordion">
          ${introHtml}
        </div>
      </div>
    `;
  }

  // 4. [루틴 본문]에서 잔여 섹션 레이블("2. 루틴" 등) 청소
  const sanitizedRoutineBody = routineBodyPart
    .replace(/^[#*_\s]*\d+[\.\)]\s*\[?루틴\]?[#*_\s:]*$/gmi, '')
    .replace(/^[#*_\s]*\[루틴\][#*_\s:]*$/gmi, '')
    .trim();

  // 5. DAY1 ~ DAY7 블록 분리 (DAY 패턴이 확실한 청크만 선별)
  const rawChunks = sanitizedRoutineBody
    .split(/(?=(?:^|\n)\s*(?:\|\s*)?(?:#+\s*)?DAY\s*[1-7])/i)
    .filter(c => c.trim().length > 0 && /DAY\s*[1-7]/i.test(c));

  if (rawChunks.length === 0) {
    return `
      <div class="routine-accordion-container">
        <div class="accordion routine-accordion" id="${prefix}_accordion">
          ${introHtml}
        </div>
        <div class="p-3 bg-white rounded-3 border leading-relaxed text-dark mt-2" style="white-space: pre-wrap;">${escapeHtml(sanitizedRoutineBody)}</div>
      </div>
    `;
  }

  let accordionItemsHtml = '';

  rawChunks.forEach((chunk, idx) => {
    const trimmedChunk = chunk.trim();
    const chunkLines = trimmedChunk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const firstLine = chunkLines[0] || '';

    // 1) DAY 번호 추출
    let dayNum = idx + 1;
    const dayNumMatch = firstLine.match(/DAY\s*([1-7])/i) || trimmedChunk.match(/DAY\s*([1-7])/i);
    if (dayNumMatch) {
      dayNum = parseInt(dayNumMatch[1], 10);
    }
    const dayBadgeText = `DAY ${dayNum}`;
    const collapseId = `${prefix}_collapse_${dayNum}`;
    const headerId = `${prefix}_heading_${dayNum}`;
    const isFirstDay = (idx === 0); // 첫 번째 카드 기본 펼침

    // 2) 타겟 부위 / 휴식 텍스트 추출 및 정제
    let rawTarget = '';
    const bracketMatch = firstLine.match(/\[(.*?)\]/) || firstLine.match(/\((.*?)\)/);
    if (bracketMatch) {
      rawTarget = bracketMatch[1].trim();
    } else {
      const cleanedFirst = firstLine.replace(/^[|#\s*]+/, '').replace(/[|#\s*]+$/, '');
      const afterDay = cleanedFirst.replace(/DAY\s*[1-7]/i, '').replace(/^[\s:\-\–~]+/, '').trim();
      if (afterDay) rawTarget = afterDay;
    }

    // 타겟 부위 문자열에서 "1. 루틴 소개", "2. 루틴" 등 불필요한 레이블 완전 제거
    let cleanTarget = rawTarget
      .replace(/\d+[\.\)]\s*\[?루틴\s*소개\]?/gi, '')
      .replace(/\[?루틴\s*소개\]?/gi, '')
      .replace(/\d+[\.\)]\s*\[?루틴\]?/gi, '')
      .replace(/\[?루틴\]?/gi, '')
      .replace(/^[\s:\-\–~,]+|[\s:\-\–~,]+$/g, '')
      .replace(/^[\[\(]+|[\]\)]+$/g, '')
      .trim();

    // 3) 마크다운 테이블 행들 파싱 및 유효 운동 데이터 추출
    const tableRows = chunkLines.filter(l => l.startsWith('|') && l.endsWith('|'));
    let dataRows = [];

    tableRows.forEach(r => {
      const cells = r.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      if (cells.length === 0) return;

      // 구분선 행 제외 (모든 셀이 - 형태이거나 첫 번째 셀이 마크다운 구분선(---)인 경우)
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c)) || (cells.length > 0 && /^:?-{2,}:?$/.test(cells[0]));
      if (isSeparator) return;

      // 헤더 행 제외 (운동 종목, 횟수 등)
      if (cells.some(c => c.includes('운동 종목') || c.includes('종목') || c.includes('세트수'))) return;

      // 첫 번째 행이 DAY 제목인 경우 제외
      if (cells[0] && /DAY\s*[1-7]/i.test(cells[0])) return;

      // 실제 운동 종목 이름이 유효한지 검사 (단순 '휴식' 단독 행만 제외하고 스트레칭, 유산소, 리커버리 운동은 보존)
      const exerciseCol = cells[0] || '';
      const validName = exerciseCol.replace(/[-—_~*\s]/g, '');
      if (validName.length > 0 && !/^(휴식|rest|회복|recovery)\s*(데이|day)?$/i.test(validName)) {
        dataRows.push(cells);
      }
    });

    // 4) 휴식일 최종 판별: 실제 테이블 데이터 행(dataRows)이 0개일 때만 안내 카드로 렌더링
    const isRestKeyword = /휴식|rest|리커버리|recovery|회복|스트레칭\s*및\s*휴식/i.test(trimmedChunk);
    const isRestDay = (dataRows.length === 0);

    // 5) 요구사항 1: 무조건 DAY X [타겟 부위] 또는 DAY X (휴식) 포맷 엄격 준수
    let dayFullTitle = '';
    let headerTitle = '';
    let badgeBg = '';
    let rightHint = '';

    if (isRestDay) {
      const restLabel = cleanTarget || '휴식';
      headerTitle = `(${restLabel})`;
      dayFullTitle = `${dayBadgeText} ${headerTitle}`;
      badgeBg = 'bg-secondary-subtle text-secondary border';
      rightHint = '<span class="badge bg-light text-secondary border small">휴식일 🌿</span>';
    } else {
      let targetLabel = cleanTarget;
      if (!targetLabel || /^(휴식|rest|회복|recovery)$/i.test(targetLabel)) {
        targetLabel = '맞춤 운동';
      }
      headerTitle = `[${targetLabel}]`;
      dayFullTitle = `${dayBadgeText} ${headerTitle}`;
      badgeBg = 'bg-success text-white';
      rightHint = `<span class="badge bg-success-subtle text-success border border-success-subtle small">${escapeHtml(targetLabel)}</span>`;
    }

    let bodyContentHtml = '';

    if (isRestDay) {
      // 6) 휴식일 안내 텍스트 완벽 정제 (마크다운 기호 및 불필요한 레이블/하단 문구 제거)
      let descParts = [];
      chunkLines.forEach((l, lIdx) => {
        // 구분선, 헤더 제외
        if (/^\|?\s*:?-+:?\s*\|?$/.test(l) || l.includes(':-')) return;
        if (l.includes('운동 종목') || l.includes('세트수') || l.includes('쉬는시간')) return;
        if (/루틴\s*소개|^\d+[\.\)]\s*루틴/i.test(l)) return;

        let clean = l.replace(/^\|\s*/, '').replace(/\s*\|$/, '');
        let cells = clean.split('|').map(c => c.replace(/[*_#`]/g, '').trim()).filter(c => c && c !== '-');
        let joined = cells.join(' ').trim();
        if (!joined) return;

        // 불필요한 레이블이나 하단 문구 필터링
        if (/루틴\s*소개|^\d+[\.\)]\s*루틴|무리한\s*운동/i.test(joined)) return;

        if (lIdx === 0) {
          // 첫 줄에서 DAY X 및 괄호를 제외한 남은 설명 문구 추출
          let remain = joined.replace(/DAY\s*[1-7]/i, '').replace(/\[.*?\]|\(.*?\)/g, '').replace(/^[\s:\-\–~,]+/, '').trim();
          if (remain && !/루틴|무리한\s*운동/i.test(remain)) {
            descParts.push(remain);
          }
        } else {
          descParts.push(joined);
        }
      });

      descParts = descParts.filter(p => !/루틴\s*소개|^\d+[\.\)]\s*루틴|무리한\s*운동/i.test(p));

      const cleanFullDesc = descParts.length > 0 
        ? descParts.join(' • ') 
        : '가벼운 스트레칭과 충분한 수분 섭취, 수면으로 근육과 관절을 회복하는 날입니다.';

      // 센터 정렬된 깔끔하고 세련된 휴식일 안내 카드
      bodyContentHtml = `
        <div class="routine-rest-card p-3 p-md-4 text-center">
          <div class="d-flex align-items-center justify-content-center gap-2 text-dark fw-bold mb-2">
            <i class="bi bi-heart-pulse-fill text-danger fs-5"></i>
            <span class="fs-6">${escapeHtml(dayFullTitle)}</span>
          </div>
          <div class="text-secondary small leading-relaxed fw-medium">
            ${escapeHtml(cleanFullDesc)}
          </div>
        </div>
      `;
    } else {
      // 7) 실제 운동 테이블 렌더링 (Colspan=5 가로 병합 헤더 + 5열 구조)
      let tbodyRowsHtml = '';
      dataRows.forEach(cells => {
        const exercise = escapeHtml((cells[0] || '').replace(/[*_]/g, '').trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\\n/g, '<br>');
        const reps = escapeHtml((cells[1] || '').replace(/[*_]/g, '').trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\\n/g, '<br>');
        const sets = escapeHtml((cells[2] || '').replace(/[*_]/g, '').trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\\n/g, '<br>');
        const rest = escapeHtml((cells[3] || '').replace(/[*_]/g, '').trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\\n/g, '<br>');
        const weight = escapeHtml((cells[4] || '').replace(/[*_]/g, '').trim()).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\\n/g, '<br>'); // 코치 지침에 따라 공란 유지

        tbodyRowsHtml += `
          <tr>
            <td class="fw-semibold text-dark ps-2 ps-md-3">${exercise}</td>
            <td class="text-center text-secondary">${reps || '-'}</td>
            <td class="text-center text-secondary">${sets || '-'}</td>
            <td class="text-center text-muted">${rest || '-'}</td>
            <td class="text-center text-muted">${weight || ''}</td>
          </tr>
        `;
      });

      bodyContentHtml = `
        <div class="table-responsive routine-day-table-wrapper">
          <table class="table table-sm table-bordered routine-day-table align-middle">
            <thead>
              <tr class="table-day-title-row">
                <th colspan="5" class="text-center py-2 bg-success text-white fw-bold">
                  <i class="bi bi-calendar-check me-1"></i>${escapeHtml(dayFullTitle)}
                </th>
              </tr>
              <tr class="table-day-header-row table-light text-center small">
                <th style="width: 35%;">운동 종목</th>
                <th style="width: 17%;">횟수</th>
                <th style="width: 16%;">세트수</th>
                <th style="width: 17%;">쉬는시간</th>
                <th style="width: 15%;">무게</th>
              </tr>
            </thead>
            <tbody>
              ${tbodyRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    accordionItemsHtml += `
      <div class="accordion-item">
        <h2 class="accordion-header" id="${headerId}">
          <button class="accordion-button ${isFirstDay ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isFirstDay ? 'true' : 'false'}" aria-controls="${collapseId}">
            <div class="d-flex align-items-center justify-content-between w-100 pe-2">
              <div class="d-flex align-items-center gap-2">
                <span class="badge ${badgeBg} rounded-pill px-2.5 py-1 fw-bold">${dayBadgeText}</span>
                <strong class="text-dark">${escapeHtml(headerTitle)}</strong>
              </div>
              <div class="d-none d-sm-block">
                ${rightHint}
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isFirstDay ? 'show' : ''}" aria-labelledby="${headerId}">
          <div class="accordion-body">
            ${bodyContentHtml}
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div class="routine-accordion-container">
      <div class="accordion routine-accordion" id="${prefix}_accordion">
        ${introHtml}
        ${accordionItemsHtml}
      </div>
    </div>
  `;
}

/**
 * 코치 대시보드 내 운동 루틴 아코디언 표 미리보기 렌더링
 */
function renderCoachWorkoutRoutinePreview(rawText) {
  const previewBox = document.getElementById('exerciseRoutineAccordionPreview');
  if (!previewBox) return;
  previewBox.innerHTML = parseWorkoutRoutineToAccordionHtml(rawText, 'coachRoutine');
}

/**
 * 루틴 뷰 모드 전환 (표 보기 <-> 텍스트 편집)
 */
function switchRoutineViewMode(mode) {
  const btnViewTable = document.getElementById('btnRoutineViewTable');
  const btnViewText = document.getElementById('btnRoutineViewText');
  const previewBox = document.getElementById('exerciseRoutineAccordionPreview');
  const textareaBox = document.getElementById('inputCurrentExerciseRoutine');

  if (mode === 'table') {
    btnViewTable?.classList.add('active', 'btn-outline-success');
    btnViewTable?.classList.remove('btn-outline-secondary');
    btnViewText?.classList.remove('active', 'btn-outline-success');
    btnViewText?.classList.add('btn-outline-secondary');
    previewBox?.classList.remove('d-none');
    textareaBox?.classList.add('d-none');
    renderCoachWorkoutRoutinePreview(getInputValue('inputCurrentExerciseRoutine'));
  } else {
    btnViewText?.classList.add('active', 'btn-outline-success');
    btnViewText?.classList.remove('btn-outline-secondary');
    btnViewTable?.classList.remove('active', 'btn-outline-success');
    btnViewTable?.classList.add('btn-outline-secondary');
    textareaBox?.classList.remove('d-none');
    previewBox?.classList.add('d-none');
  }
}

// 돌발 상황(Plan B) 대처법: 기본은 접힌 한 줄 카드, 눌러야 펼쳐짐 (식단 화면 길이 단축)
function renderPlanBCard(cleanPlanB, formatCellContent) {
  if (!cleanPlanB) return '';
  const lines = cleanPlanB.split('\n').map(l => l.trim()).filter(Boolean);
  const body = formatCellContent(lines.join('\n')).replace(/\n/g, '<br>');
  return `
    <details class="diet-planb-card mt-3 p-3 rounded-3 border bg-light">
      <summary class="d-flex align-items-center gap-2 text-dark fw-bold small">
        <i class="bi bi-shield-exclamation text-warning fs-6"></i>
        <span>돌발 상황(Plan B) 대처법</span>
        <span class="text-muted fw-normal ms-auto">${lines.length}개 · 펼치기</span>
      </summary>
      <div class="small text-secondary leading-relaxed mt-2">${body}</div>
    </details>
  `;
}

/**
 * 마크다운 식단 플랜 텍스트를 [식단 소개 알림 박스] + [클린데이 & 주말/휴일 아코디언 표] + [Plan B 가이드라인 카드]로 변환하여 렌더링
 */
function parseDietPlanToAccordionHtml(rawText, prefix = 'diet') {
  if (!rawText || !rawText.trim()) {
    return '<div class="text-muted text-center py-4">등록된 맞춤 식단이 없습니다.<br>코치님의 상담 또는 AI 업데이트를 통해 식단이 생성됩니다.</div>';
  }

  // 1. 관리용 수정 지침 줄 필터링 (화면 뷰 보안 및 시인성 최적화)
  const lines = rawText.split('\n');
  const filteredLines = lines.filter(line => {
    const t = line.trim();
    return !(t.includes('수정 지침') || t.includes('수정지침') || t.includes('수정 제안') || t.includes('제안 지침') || t.includes('제안지침'));
  });
  const cleanText = filteredLines.join('\n').trim();

  // 2. [돌발 상황(Plan B) 대처 가이드라인] 분리
  let mainBody = cleanText;
  let rawPlanB = '';

  const planBMatch = cleanText.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?돌발\s*상황(?:\s*\(Plan\s*B\))?(?:\s*대처(?:\s*가이드라인)?)?\]?/i) ||
                     cleanText.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?Plan\s*B(?:\s*대처(?:\s*가이드라인)?)?\]?/i);

  if (planBMatch) {
    mainBody = cleanText.substring(0, planBMatch.index).trim();
    rawPlanB = cleanText.substring(planBMatch.index).trim();
  }

  // Plan B 텍스트 정제 (헤더 레이블 제거)
  let cleanPlanB = rawPlanB
    .replace(/^[#*_\s]*\d*[\.\)]?\s*\[?돌발\s*상황[^\n]*\n?/i, '')
    .replace(/^[#*_\s]*\d*[\.\)]?\s*\[?Plan\s*B[^\n]*\n?/i, '')
    .trim();

  // 3. [주말 및 휴일 식단] 분리
  let cleanDayPart = mainBody;
  let weekendPart = '';

  const weekendMatch = mainBody.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?주말\s*(?:및\s*휴일)?\s*식단(?:\s*\(치팅\/자유식\s*관리\))?\]?/i) ||
                       mainBody.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?(?:치팅|자유식)\s*식단[^\n]*/i);

  if (weekendMatch) {
    weekendPart = mainBody.substring(weekendMatch.index).trim();
    cleanDayPart = mainBody.substring(0, weekendMatch.index).trim();
  }

  // 4. [평상시 식단 (클린데이)]와 [식단 소개] 분리
  let introPart = '';
  const cleanDayMatch = cleanDayPart.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?평상시\s*식단(?:\s*\(클린데이\))?\]?/i) ||
                        cleanDayPart.match(/(?:^|\n)\s*(?:[#*_\s]*\d*[\.\)]?\s*)?\[?클린데이(?:\s*식단)?\]?/i) ||
                        cleanDayPart.match(/(?:^|\n)\s*\|\s*식사\s*\|/i);

  if (cleanDayMatch) {
    introPart = cleanDayPart.substring(0, cleanDayMatch.index).trim();
    cleanDayPart = cleanDayPart.substring(cleanDayMatch.index).trim();
  } else {
    introPart = '';
  }

  // 5. [식단 소개] 텍스트 대청소 ("1. 식단 소개", "[식단 소개]", "2. 식단", "[식단]" 등 제거)
  let cleanIntro = introPart
    .replace(/^[#*_\s]*\d+[\.\)]\s*\[?식단\s*소개\]?[#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\[식단\s*소개\][#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\d+[\.\)]\s*\[?식단\]?[#*_\s:]*/gmi, '')
    .replace(/^[#*_\s]*\[식단\][#*_\s:]*/gmi, '')
    .trim();

  cleanIntro = cleanIntro
    .split('\n')
    .filter(line => {
      const t = line.trim();
      if (!t) return false;
      if (/^(?:#+\s*)?(?:\d+[\.\)]\s*)?\[?식단\s*(?:소개|플랜)?[^\]\n]*\]?[:\s]*$/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();

  // 헬퍼: 셀 및 텍스트 내 HTML 및 <br> 코드 안전 서식화 (Literal <br> 태그가 화면에 노출되지 않도록 변환)
  function formatCellContent(val) {
    if (!val) return '';
    let s = String(val).replace(/[*_]/g, '').trim();
    s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    s = escapeHtml(s);
    s = s.replace(/&lt;br\s*\/?&gt;/gi, '<br>')
         .replace(/\\n/g, '<br>');
    return s;
  }

  // 5. [식단 설계 배경 & 대사량 분석] 아코디언 항목 (접기/펼치기 지원)
  let introHtml = '';
  if (cleanIntro) {
    const introCollapseId = `${prefix}_collapse_intro`;
    const introHeaderId = `${prefix}_heading_intro`;
    const formattedIntro = escapeHtml(cleanIntro)
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/\\n/g, '<br>')
      .replace(/\n/g, '<br>');

    introHtml = `
      <div class="accordion-item diet-intro-accordion-item">
        <h2 class="accordion-header" id="${introHeaderId}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${introCollapseId}" aria-expanded="false" aria-controls="${introCollapseId}">
            <div class="d-flex align-items-center justify-content-between w-100 pe-2">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2.5 py-1 fw-bold">
                  <i class="bi bi-info-circle-fill me-1"></i>분석
                </span>
                <strong class="text-dark">식단 설계 배경 & 대사량 분석</strong>
              </div>
              <div class="d-none d-sm-block">
                <span class="badge bg-light text-secondary border small">영양 분석 💡</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${introCollapseId}" class="accordion-collapse collapse" aria-labelledby="${introHeaderId}">
          <div class="accordion-body">
            <div class="diet-intro-card p-3 shadow-none mb-0">
              <div class="small text-secondary leading-relaxed">${formattedIntro}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 6. 각 식단 테이블 파싱 헬퍼
  function parseDietTableSection(sectionText) {
    const sLines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let totalCalText = '';
    let dataRows = [];
    let noteLines = [];

    sLines.forEach(line => {
      // 총 예상 칼로리 라인 매칭 (마크다운 볼드/이탤릭 제거 후 관대하게 매칭)
      const cleanLine = line.replace(/[*_]/g, '').trim();
      const calMatch = cleanLine.match(/(?:총\s*예상\s*칼로리|총\s*칼로리)\s*:\s*(.+)/i);
      if (calMatch) {
        totalCalText = cleanLine.replace(/^[#*_\-\s]+/, '').trim();
        return;
      }

      // 테이블 행 매칭
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length === 0) return;

        // 구분선 제외 (모든 셀이 - 형태이거나 첫 번째 셀이 마크다운 구분선인 경우)
        const isSeparator = cells.every(c => /^:?-+:?$/.test(c)) || (cells.length > 0 && /^:?-{2,}:?$/.test(cells[0]));
        if (isSeparator) return;

        // 헤더 행 제외
        if (cells.some(c => c.includes('식사') || c.includes('식단 내용') || c.includes('대체 식품') || c.includes('대체식품') || c.includes('예상 칼로리') || c.includes('칼로리') || c.includes('끼니'))) return;

        dataRows.push(cells);
        return;
      }

      // 섹션 레이블 제외
      if (/^(?:#+\s*)?(?:\d+[\.\)]\s*)?\[?(?:평상시|주말|클린데이|치팅|식단|돌발)[^\]]*\]?[:\s]*$/i.test(line)) {
        return;
      }

      // 기타 유효한 안내 문구
      if (line && !line.startsWith('#')) {
        noteLines.push(line.replace(/^[*\-\s]+/, '').trim());
      }
    });

    return { dataRows, totalCalText, noteLines };
  }

  function renderTableRows(tableObj) {
    const { dataRows, totalCalText, noteLines } = tableObj;
    if (dataRows.length === 0) {
      return '<div class="text-muted small p-3 text-center">등록된 상세 식단 표가 없습니다.</div>';
    }

    let tbodyHtml = '';
    dataRows.forEach(cells => {
      const meal = formatCellContent(cells[0]);
      const content = formatCellContent(cells[1]);
      const alt = formatCellContent(cells[2]);
      const cal = formatCellContent(cells[3]);

      tbodyHtml += `
        <tr>
          <td class="text-center fw-bold text-dark bg-light-subtle">${meal}</td>
          <td class="ps-3 text-dark">${content}</td>
          <td class="ps-3 text-secondary small">${alt || '-'}</td>
          <td class="text-center fw-semibold text-warning-emphasis">${cal || '-'}</td>
        </tr>
      `;
    });

    let calBoxHtml = '';
    if (totalCalText) {
      calBoxHtml = `
        <div class="d-flex justify-content-end align-items-center mt-2">
          <div class="d-inline-flex align-items-center gap-1.5 text-warning-emphasis fw-bold small py-1.5 px-3 bg-warning-subtle rounded-pill border border-warning-subtle shadow-xs">
            <i class="bi bi-fire text-danger"></i>
            <span>${formatCellContent(totalCalText)}</span>
          </div>
        </div>
      `;
    }

    let notesBoxHtml = '';
    if (noteLines.length > 0) {
      notesBoxHtml = `
        <div class="mt-2 text-muted small ps-1 leading-relaxed">
          ${noteLines.map(n => `<div>• ${formatCellContent(n)}</div>`).join('')}
        </div>
      `;
    }

    return `
      <div class="table-responsive diet-table-wrapper mb-1">
        <table class="table table-sm table-bordered diet-day-table align-middle">
          <thead>
            <tr class="table-warning text-center small fw-bold">
              <th style="width: 15%;">식사</th>
              <th style="width: 42%;">식단 내용</th>
              <th style="width: 28%;">대체 식품 (2~3가지)</th>
              <th style="width: 15%;">예상 칼로리</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
        </table>
      </div>
      ${calBoxHtml}
      ${notesBoxHtml}
    `;
  }

  const cleanDayData = parseDietTableSection(cleanDayPart);
  const weekendData = parseDietTableSection(weekendPart);

  // 일반 텍스트 안전 폴백 (표 데이터가 양쪽 모두 전혀 없는 경우)
  if (cleanDayData.dataRows.length === 0 && weekendData.dataRows.length === 0) {
    const fallbackPlanB = renderPlanBCard(cleanPlanB, formatCellContent);
    return `
      <div class="diet-accordion-container">
        <div class="accordion diet-accordion" id="${prefix}_accordion">
          ${introHtml}
        </div>
        <div class="p-3 bg-white rounded-3 border leading-relaxed text-dark mt-2">${formatCellContent(cleanText).replace(/\n/g, '<br>')}</div>
        ${fallbackPlanB}
      </div>
    `;
  }

  // 7. 아코디언 항목 2개 구성:
  // - 평상시 식단 (클린데이): 초기 열림 (show)
  // - 주말 및 휴일 식단 (치팅/자유식 관리): 초기 닫힘 (collapsed)
  const collapseCleanDayId = `${prefix}_collapse_cleanday`;
  const headingCleanDayId = `${prefix}_heading_cleanday`;
  const collapseWeekendId = `${prefix}_collapse_weekend`;
  const headingWeekendId = `${prefix}_heading_weekend`;

  const cleanDayHtml = renderTableRows(cleanDayData);
  const weekendHtml = renderTableRows(weekendData);

  const accordionItemsHtml = `
    <!-- 1) 평상시 식단 (클린데이) - 기본 열림 -->
    <div class="accordion-item diet-accordion-item">
      <h2 class="accordion-header" id="${headingCleanDayId}">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseCleanDayId}" aria-expanded="true" aria-controls="${collapseCleanDayId}">
          <div class="d-flex align-items-center justify-content-between w-100 pe-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-warning text-dark rounded-pill px-2.5 py-1 fw-bold">클린데이</span>
              <strong class="text-dark">평상시 식단 (클린데이)</strong>
            </div>
            <div class="d-none d-sm-block">
              <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">주중 기본 식단 🥗</span>
            </div>
          </div>
        </button>
      </h2>
      <div id="${collapseCleanDayId}" class="accordion-collapse collapse show" aria-labelledby="${headingCleanDayId}">
        <div class="accordion-body">
          ${cleanDayHtml}
        </div>
      </div>
    </div>

    <!-- 2) 주말 및 휴일 식단 (치팅/자유식 관리) - 기본 닫힘 -->
    <div class="accordion-item diet-accordion-item">
      <h2 class="accordion-header" id="${headingWeekendId}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseWeekendId}" aria-expanded="false" aria-controls="${collapseWeekendId}">
          <div class="d-flex align-items-center justify-content-between w-100 pe-2">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-secondary-subtle text-secondary border rounded-pill px-2.5 py-1 fw-bold">주말/휴일</span>
              <strong class="text-dark">주말 및 휴일 식단 (치팅/자유식 관리)</strong>
            </div>
            <div class="d-none d-sm-block">
              <span class="badge bg-light text-secondary border small">자유식 관리 🥪</span>
            </div>
          </div>
        </button>
      </h2>
      <div id="${collapseWeekendId}" class="accordion-collapse collapse" aria-labelledby="${headingWeekendId}">
        <div class="accordion-body">
          ${weekendHtml}
        </div>
      </div>
    </div>
  `;

  // 8. 돌발 상황(Plan B) 대처 가이드라인 독립 알림 박스
  const planBHtml = renderPlanBCard(cleanPlanB, formatCellContent);

  return `
    <div class="diet-accordion-container">
      <div class="accordion diet-accordion" id="${prefix}_accordion">
        ${introHtml}
        ${accordionItemsHtml}
      </div>
      ${planBHtml}
    </div>
  `;
}

/**
 * 코치 대시보드 내 식단 플랜 아코디언 표 미리보기 렌더링
 */
function renderCoachDietPlanPreview(rawText) {
  const previewBox = document.getElementById('dietPlanAccordionPreview');
  if (!previewBox) return;
  previewBox.innerHTML = parseDietPlanToAccordionHtml(rawText, 'coachDiet');
}

/**
 * 식단 뷰 모드 전환 (표 보기 <-> 텍스트 편집)
 */
function switchDietViewMode(mode) {
  const btnViewTable = document.getElementById('btnDietViewTable');
  const btnViewText = document.getElementById('btnDietViewText');
  const previewBox = document.getElementById('dietPlanAccordionPreview');
  const textareaBox = document.getElementById('inputCurrentDietPlan');

  if (mode === 'table') {
    btnViewTable?.classList.add('active', 'btn-outline-warning', 'text-dark');
    btnViewTable?.classList.remove('btn-outline-secondary');
    btnViewText?.classList.remove('active', 'btn-outline-warning', 'text-dark');
    btnViewText?.classList.add('btn-outline-secondary');
    previewBox?.classList.remove('d-none');
    textareaBox?.classList.add('d-none');
    renderCoachDietPlanPreview(getInputValue('inputCurrentDietPlan'));
  } else {
    btnViewText?.classList.add('active', 'btn-outline-warning', 'text-dark');
    btnViewText?.classList.remove('btn-outline-secondary');
    btnViewTable?.classList.remove('active', 'btn-outline-warning', 'text-dark');
    btnViewTable?.classList.add('btn-outline-secondary');
    textareaBox?.classList.remove('d-none');
    previewBox?.classList.add('d-none');
  }
}

/**
 * [중단] 운동/식단 지침 및 루틴 저장 핸들러 바인딩
 */
function initGuidelineRoutineActions() {
  // 0. 운동 루틴 뷰 모드 토글 바인딩
  const btnViewTable = document.getElementById('btnRoutineViewTable');
  const btnViewText = document.getElementById('btnRoutineViewText');
  btnViewTable?.addEventListener('click', () => switchRoutineViewMode('table'));
  btnViewText?.addEventListener('click', () => switchRoutineViewMode('text'));

  // 0-2. 식단 뷰 모드 토글 바인딩
  const btnDietViewTable = document.getElementById('btnDietViewTable');
  const btnDietViewText = document.getElementById('btnDietViewText');
  btnDietViewTable?.addEventListener('click', () => switchDietViewMode('table'));
  btnDietViewText?.addEventListener('click', () => switchDietViewMode('text'));

  // 식단 텍스트에리어 입력 시 실시간 미리보기 동기화
  const inputCurrentDietPlan = document.getElementById('inputCurrentDietPlan');
  inputCurrentDietPlan?.addEventListener('input', () => {
    renderCoachDietPlanPreview(inputCurrentDietPlan.value);
  });

  // 1. 운동 루틴 수정 제안 지침 [저장]
  const btnSaveExGuide = document.getElementById('btnSaveExerciseGuideline');
  if (btnSaveExGuide) {
    btnSaveExGuide.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const key = getMemberKey(AppState.selectedMember);
      const val = getInputValue('inputExerciseGuideline');
      AppState.selectedMember['운동 루틴 수정 제안 지침'] = val;

      showToast('운동 수정 제안 지침을 시트(Members)에 저장 중...', 'info');
      const res = await postToGasBackend({
        action: 'updateMemberGuidelineRoutine',
        memberKey: key,
        exerciseGuideline: val
      });
      if (res && res.status === 'success') showToast('운동 수정 지침이 구글 시트에 저장되었습니다.', 'success');
    });
  }

  // 2. 현재 제안 운동 루틴 [저장]
  const btnSaveExRoutine = document.getElementById('btnSaveExerciseRoutine');
  if (btnSaveExRoutine) {
    btnSaveExRoutine.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const key = getMemberKey(AppState.selectedMember);
      const val = getInputValue('inputCurrentExerciseRoutine');
      AppState.selectedMember['현재 제안 운동 루틴'] = val;

      // 미리보기 아코디언도 최신 내용으로 동기화
      renderCoachWorkoutRoutinePreview(val);

      showToast('현재 제안 운동 루틴을 시트(Members)에 저장 중...', 'info');
      const res = await postToGasBackend({
        action: 'updateMemberGuidelineRoutine',
        memberKey: key,
        exerciseRoutine: val
      });
      if (res && res.status === 'success') showToast('운동 루틴이 구글 시트에 저장되었습니다.', 'success');
    });
  }

  // 3. 식단 수정 제안 지침 [저장]
  const btnSaveDietGuide = document.getElementById('btnSaveDietGuideline');
  if (btnSaveDietGuide) {
    btnSaveDietGuide.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const key = getMemberKey(AppState.selectedMember);
      const val = getInputValue('inputDietGuideline');
      AppState.selectedMember['식단 수정 제안 지침'] = val;

      showToast('식단 수정 제안 지침을 시트(Members)에 저장 중...', 'info');
      const res = await postToGasBackend({
        action: 'updateMemberGuidelineRoutine',
        memberKey: key,
        dietGuideline: val
      });
      if (res && res.status === 'success') showToast('식단 수정 지침이 구글 시트에 저장되었습니다.', 'success');
    });
  }

  // 4. 현재 제안 식단 [저장]
  const btnSaveDietPlan = document.getElementById('btnSaveDietPlan');
  if (btnSaveDietPlan) {
    btnSaveDietPlan.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const key = getMemberKey(AppState.selectedMember);
      const val = getInputValue('inputCurrentDietPlan');
      AppState.selectedMember['현재 제안 식단'] = val;
      renderCoachDietPlanPreview(val);

      showToast('현재 제안 식단을 시트(Members)에 저장 중...', 'info');
      const res = await postToGasBackend({
        action: 'updateMemberGuidelineRoutine',
        memberKey: key,
        dietRoutine: val
      });
      if (res && res.status === 'success') showToast('식단 계획이 구글 시트에 저장되었습니다.', 'success');
    });
  }

  // 5. [AI 운동 루틴 업데이트] 버튼 (직통 초고속 모드 + 지침서 및 수정지침 최우선 반영)
  const btnAiExRoutine = document.getElementById('btnAiUpdateExerciseRoutine');
  if (btnAiExRoutine) {
    btnAiExRoutine.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const mem = AppState.selectedMember;
      const customGuideline = getInputValue('inputExerciseGuideline');

      showLoadingOverlay('AI가 운동 지침서와 수정 지침을 분석하여 루틴을 생성 중입니다...');

      // [1] 브라우저 직통 스트리밍 (브라우저 전용 키가 있을 때만, 프롬프트는 GAS에서 받아옴)
      const builtPrompt = hasBrowserGeminiKey()
        ? await requestAiPromptFromGas('workout', { member: mem, customExerciseGuideline: customGuideline, guidelines: AppState.guidelines })
        : null;
      if (builtPrompt) {
        const directRes = await callGeminiDirectlyFromBrowser(builtPrompt.prompt, builtPrompt.systemInstruction);
        if (directRes && directRes.isAborted) {
          hideLoadingOverlay();
          showToast('운동 루틴 생성이 취소되었습니다.', 'info', 3000);
          return;
        }
        if (directRes && directRes.text) {
          hideLoadingOverlay();
          setInputValue('inputCurrentExerciseRoutine', directRes.text);
          renderCoachWorkoutRoutinePreview(directRes.text);
          switchRoutineViewMode('table');
          if (directRes.isTruncated) {
            showToast(`⚠️ [브라우저 직통 ${directRes.elapsedSec}초] 토큰 한도 끊김 (${directRes.text.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [브라우저 직통 ${directRes.elapsedSec}초] AI 운동 루틴 생성 완료 (${directRes.model}, ${directRes.text.length}자)`, 'success', 5000);
          }
          return;
        } else {
          if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
            hideLoadingOverlay();
            showToast('운동 루틴 생성이 취소되었습니다.', 'info', 3000);
            return;
          }
          console.warn('[브라우저 직통 실패 -> GAS 백엔드로 자동 전환]', directRes ? directRes.error : '알 수 없음');
          showLoadingOverlay(`브라우저 직통 실패 (${directRes ? directRes.error : '오류'}) ➔ GAS 백엔드로 전환하여 생성 중...`);
        }
      }

      // [2] GAS 백엔드 경유 모드 (초경량 직행)
      const gasStartTime = performance.now();
      const res = await postToGasBackend({
        action: 'generateWorkoutRoutine',
        member: AppState.selectedMember,
        customExerciseGuideline: customGuideline,
        guidelines: AppState.guidelines
      }, { retry: () => btnAiExRoutine.click() });
      hideLoadingOverlay();
      if (res && res.status === 'cancelled') {
        showToast('운동 루틴 생성이 취소되었습니다.', 'info', 3000);
        return;
      }
      const gasElapsedSec = ((performance.now() - gasStartTime) / 1000).toFixed(1);

      if (!res || res.status !== 'success' || !res.routine) {
        showAiFailure(res, '운동 루틴', () => btnAiExRoutine.click());
        return;
      }
      if (res && res.routine) {
        if (res.isAiGenerated) {
          setInputValue('inputCurrentExerciseRoutine', res.routine);
          renderCoachWorkoutRoutinePreview(res.routine);
          switchRoutineViewMode('table');
          const modelName = (res.debug && res.debug.model) ? res.debug.model : 'AI';
          if (res.debug && res.debug.isTruncated) {
            showToast(`⚠️ [GAS 백엔드 ${gasElapsedSec}초] 토큰 한도 끊김 (${res.routine.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [GAS 백엔드 ${gasElapsedSec}초] AI 맞춤 운동 루틴 생성 완료 (${modelName}, ${res.routine.length}자)`, 'success', 5000);
          }
        } else {
          const errDetail = (res.debug && res.debug.errorMessage) ? res.debug.errorMessage : '구글 서버 과부하';
          showToast(`⚠️ [AI 일시 지연 (${gasElapsedSec}초)] ${errDetail}\n잠시 후 다시 버튼을 눌러주세요.`, 'warning', 7000);
          console.warn('[Gemini AI 디버그 정보]', res.debug);
        }
      }
    });
  }

  // 6. [AI 식단 업데이트] 버튼 (직통 초고속 모드 + 지침서 및 수정지침 최우선 반영)
  const btnAiDietPlan = document.getElementById('btnAiUpdateDietPlan');
  if (btnAiDietPlan) {
    btnAiDietPlan.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const mem = AppState.selectedMember;
      const customGuideline = getInputValue('inputDietGuideline');

      showLoadingOverlay('AI가 식단 지침서와 수정 지침을 분석하여 식단을 생성 중입니다...');

      // [1] 브라우저 직통 스트리밍 (브라우저 전용 키가 있을 때만, 프롬프트는 GAS에서 받아옴)
      const builtPrompt = hasBrowserGeminiKey()
        ? await requestAiPromptFromGas('diet', { member: mem, customDietGuideline: customGuideline, guidelines: AppState.guidelines })
        : null;
      if (builtPrompt) {
        const directRes = await callGeminiDirectlyFromBrowser(builtPrompt.prompt, builtPrompt.systemInstruction);
        if (directRes && directRes.isAborted) {
          hideLoadingOverlay();
          showToast('식단 생성이 취소되었습니다.', 'info', 3000);
          return;
        }
        if (directRes && directRes.text) {
          hideLoadingOverlay();
          setInputValue('inputCurrentDietPlan', directRes.text);
          renderCoachDietPlanPreview(directRes.text);
          switchDietViewMode('table');
          if (directRes.isTruncated) {
            showToast(`⚠️ [브라우저 직통 ${directRes.elapsedSec}초] 토큰 한도 끊김 (${directRes.text.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [브라우저 직통 ${directRes.elapsedSec}초] AI 맞춤 데일리 식단 생성 완료 (${directRes.model}, ${directRes.text.length}자)`, 'success', 5000);
          }
          return;
        } else {
          if (currentTaskAbortController && currentTaskAbortController.signal.aborted) {
            hideLoadingOverlay();
            showToast('식단 생성이 취소되었습니다.', 'info', 3000);
            return;
          }
          console.warn('[브라우저 직통 실패 -> GAS 백엔드로 자동 전환]', directRes ? directRes.error : '알 수 없음');
          showLoadingOverlay(`브라우저 직통 실패 (${directRes ? directRes.error : '오류'}) ➔ GAS 백엔드로 전환하여 생성 중...`);
        }
      }

      // [2] GAS 백엔드 경유 모드 (초경량 직행)
      const gasStartTime = performance.now();
      const res = await postToGasBackend({
        action: 'generateDietPlan',
        member: AppState.selectedMember,
        customDietGuideline: customGuideline,
        guidelines: AppState.guidelines
      }, { retry: () => btnAiDietPlan.click() });
      hideLoadingOverlay();
      if (res && res.status === 'cancelled') {
        showToast('식단 생성이 취소되었습니다.', 'info', 3000);
        return;
      }
      const gasElapsedSec = ((performance.now() - gasStartTime) / 1000).toFixed(1);

      if (!res || res.status !== 'success' || !res.dietPlan) {
        showAiFailure(res, '식단', () => btnAiDietPlan.click());
        return;
      }
      if (res && res.dietPlan) {
        if (res.isAiGenerated) {
          setInputValue('inputCurrentDietPlan', res.dietPlan);
          renderCoachDietPlanPreview(res.dietPlan);
          switchDietViewMode('table');
          const modelName = (res.debug && res.debug.model) ? res.debug.model : 'AI';
          if (res.debug && res.debug.isTruncated) {
            showToast(`⚠️ [GAS 백엔드 ${gasElapsedSec}초] 토큰 한도 끊김 (${res.dietPlan.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [GAS 백엔드 ${gasElapsedSec}초] AI 맞춤 데일리 식단 생성 완료 (${modelName}, ${res.dietPlan.length}자)`, 'success', 5000);
          }
        } else {
          const errDetail = (res.debug && res.debug.errorMessage) ? res.debug.errorMessage : '구글 서버 과부하';
          showToast(`⚠️ [AI 일시 지연 (${gasElapsedSec}초)] ${errDetail}\n잠시 후 다시 버튼을 눌러주세요.`, 'warning', 7000);
          console.warn('[Gemini AI 디버그 정보]', res.debug);
        }
      }
    });
  }
}

/**
 * ==============================================================================
 * [5. 하단 공복 체중 기록] WeightLog의 회원번호 일치 기록으로 그래프·요약·표 표시
 * - 첫 기록 대비 변화·주당 변화·7일 평균은 코드가 계산 (태그별 그래프와 같은 computeMemberWeightTrend)
 * ==============================================================================
 */
function updateWeightSection(mem) {
  const rows = getMemberWeightRecords(mem).map(r => ({ ...r, day: dateKeyToUtcDay(r.date) }));
  const trend = computeMemberWeightTrend(rows);
  renderMemberWeightSummary(trend);
  renderMemberWeightChart(trend);
  renderMemberWeightTable(rows);
  renderMemberAiReport(mem);
  renderMemberCoachTimeline(mem);
}

function renderMemberWeightSummary(trend) {
  const el = document.getElementById('memberWeightSummary');
  if (!el) return;
  const signed = (v) => `${v > 0 ? '+' : ''}${v}kg`;
  const changeCls = trend.change === null ? '' : (trend.change < 0 ? 'is-down' : (trend.change > 0 ? 'is-up' : ''));
  const trendLabel = { down: '감소 추세', up: '증가 추세', flat: '유지', none: '기록 부족' };
  el.className = `tagstats-member-stats member-weight-summary is-${trend.direction}`;
  el.innerHTML = `
    <div><span class="tagstats-stat-label">최근</span><b>${trend.last === null ? '-' : `${trend.last}kg`}</b></div>
    <div><span class="tagstats-stat-label">첫 기록 대비</span><b class="${changeCls}">${trend.change === null ? '-' : signed(trend.change)}</b></div>
    <div><span class="tagstats-stat-label">주당</span><b>${trend.pacePerWeek === null ? '-' : signed(trend.pacePerWeek)}</b></div>
    <div><span class="tagstats-stat-label">추세 · 기록</span><b><span class="tagstats-trend-badge">${trendLabel[trend.direction]}</span> ${trend.points.length}회</b></div>`;
}

function renderMemberWeightChart(trend) {
  if (AppState.charts.weight) {
    AppState.charts.weight.destroy();
    AppState.charts.weight = null;
  }
  const canvas = document.getElementById('chartWeight');
  const emptyEl = document.getElementById('memberWeightEmpty');
  if (emptyEl) emptyEl.classList.toggle('d-none', trend.points.length > 0);
  if (!canvas || trend.points.length === 0 || typeof Chart === 'undefined') return;

  const values = trend.points.map(p => p.weight);
  const options = createSingleChartOptions('kg', Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1));
  options.plugins.legend = { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } };
  const color = TAG_STATS_TREND_COLORS[trend.direction] || TAG_STATS_TREND_COLORS.flat;

  AppState.charts.weight = new Chart(canvas, {
    type: 'line',
    data: {
      labels: trend.points.map(p => {
        const [, mm, dd] = p.date.split('-');
        return `${+mm}/${+dd}`;
      }),
      datasets: [
        {
          label: '공복 몸무게',
          data: values,
          borderColor: 'rgba(79, 70, 229, 0.55)',
          backgroundColor: '#4f46e5',
          borderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2,
          clip: false
        },
        {
          label: '7일 평균',
          data: trend.avg7,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3
        }
      ]
    },
    options
  });
}

// 기록 표 (최근 날짜가 위, 전 기록 대비 변화)
function renderMemberWeightTable(rows) {
  const tbody = document.getElementById('memberWeightTableBody');
  if (!tbody) return;
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">아직 체중 기록이 없습니다. 회원이 마이페이지 달력에서 입력하면 여기에 보입니다.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r, i) => {
    const diff = i > 0 ? Math.round((r.weight - rows[i - 1].weight) * 10) / 10 : null;
    const diffCls = diff === null || diff === 0 ? 'text-muted' : (diff < 0 ? 'text-primary' : 'text-danger');
    return `<tr>
      <td>${escapeHtml(r.date)}</td>
      <td class="text-end fw-semibold">${r.weight}kg</td>
      <td class="text-end ${diffCls}">${diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}kg`}</td>
    </tr>`;
  }).reverse().join('');
}

function createSingleChartOptions(unit, minVal, maxVal, stepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 14,
        right: 10,
        bottom: 8,
        left: 4
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => item.raw !== null && item.raw !== undefined,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} ${unit}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        min: minVal,
        max: maxVal,
        ticks: {
          stepSize: stepSize || undefined,
          font: { size: 10 },
          callback: (val) => {
            // 5점 척도에서 여백용으로 설정된 5.5 등 초과 눈금은 텍스트 미표시
            if (val > 5 && maxVal <= 6) return '';
            return `${val}${unit}`;
          }
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      }
    }
  };
}

/**
 * ==============================================================================
 * [6. 코치 관리 기록] 오늘 보드 · 기록 창 · 회원 상세 타임라인 (CoachLog, 회원번호+날짜 1행)
 * - 체중·7일 평균 변화는 WeightLog로 코드가 계산 (AI 사용 안 함)
 * - 저장은 saveCoachLog (서버가 잠금 + Members 회원번호 정확 일치 확인), 미리보기(Mock)에서는 화면 메모리에만 반영
 * - 메모는 코치 전용, 코치 한마디만 회원 마이페이지에 보임
 * ==============================================================================
 */
const COACH_LOG_DIET_STATUSES = ['좋음', '보통', '주의'];
const COACH_LOG_EXERCISE_STATUSES = ['했음', '쉬는 날', '안 함'];
const COACH_LOG_STATUS_CLASS = { '좋음': 'is-good', '보통': 'is-mid', '주의': 'is-warn', '했음': 'is-good', '쉬는 날': 'is-mid', '안 함': 'is-warn' };
const DEFAULT_COACH_SETTINGS = {
  dietTags: ['과식', '야식', '음주', '단백질 부족', '잘 지킴'],
  exerciseTags: ['통증', '질문', '강도↑', '누락'],
  phrases: []
};
const COACH_LOG_LOCAL_EDIT_TTL_MS = 5 * 60 * 1000;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function localDateKey(d) {
  const date = d || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDateKey(dateKey, days) {
  return new Date((dateKeyToUtcDay(dateKey) + days) * 86400000).toISOString().slice(0, 10);
}

function formatDateLabel(dateKey) {
  const m = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey || '';
  const wd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return `${+m[2]}월 ${+m[3]}일 (${WEEKDAY_KO[wd]})`;
}

function pickCoachSettings(src) {
  const s = src || {};
  const list = (v, fallback) => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : fallback.slice();
  return {
    dietTags: list(s.dietTags, DEFAULT_COACH_SETTINGS.dietTags),
    exerciseTags: list(s.exerciseTags, DEFAULT_COACH_SETTINGS.exerciseTags),
    phrases: list(s.phrases, DEFAULT_COACH_SETTINGS.phrases)
  };
}

function getCoachSettings() {
  return AppState.coachSettings || pickCoachSettings(null);
}

function splitCoachLogTags(text) {
  return String(text || '').split(',').map(t => t.trim()).filter(Boolean);
}

function getCoachLog(memberNo, date) {
  if (!memberNo) return null;
  return AppState.coachLogs.find(r => r['회원번호'] === memberNo && r['날짜'] === date) || null;
}

// 회원 1명의 기록 (최신 날짜가 앞)
function getMemberCoachLogs(memberNo) {
  if (!memberNo) return [];
  return AppState.coachLogs.filter(r => r['회원번호'] === memberNo).sort((a, b) => (a['날짜'] < b['날짜'] ? 1 : -1));
}

// 그 날짜 기준으로 아직 확인 안 한 이전 '다음에 확인' (그 날짜 이후에 확인 완료된 것도 그 날짜에는 미해결)
function getOpenNextChecks(memberNo, date) {
  return getMemberCoachLogs(memberNo).filter(r => r['다음에 확인'] && r['날짜'] < date && (!r['확인 완료'] || r['확인 완료'] > date));
}

function getLastCoachNote(memberNo, date) {
  return getMemberCoachLogs(memberNo).find(r => r['날짜'] < date && r['코치 한마디']) || null;
}

// [코드 계산] 그 날짜까지 7일 평균 - 그 전 7일 평균 (둘 다 기록이 있을 때만), ±0.2kg 기준 화살표
function computeWeeklyAvgChange(mem, dateKey) {
  const day = dateKeyToUtcDay(dateKey);
  const rows = getMemberWeightRecords(mem);
  const avgIn = (from, to) => averageOf(rows.filter(r => {
    const d = dateKeyToUtcDay(r.date);
    return d > from && d <= to;
  }).map(r => r.weight));
  const cur = avgIn(day - 7, day);
  const prev = avgIn(day - 14, day - 7);
  const dayWeight = (rows.find(r => r.date === dateKey) || {}).weight;
  const out = { dayWeight: dayWeight === undefined ? null : dayWeight, cur, prev, delta: null, direction: 'none' };
  if (cur !== null && prev !== null) {
    out.delta = Math.round((cur - prev) * 10) / 10;
    out.direction = out.delta <= -0.2 ? 'down' : (out.delta >= 0.2 ? 'up' : 'flat');
  }
  return out;
}

function renderWeeklyTrendHtml(trend) {
  if (trend.delta === null) return '<span class="today-trend is-none" title="7일 평균을 비교할 기록이 부족합니다">추세 -</span>';
  const arrow = { down: 'bi-arrow-down-right', up: 'bi-arrow-up-right', flat: 'bi-arrow-right' }[trend.direction];
  return `<span class="today-trend is-${trend.direction}" title="최근 7일 평균 ${trend.cur}kg · 그 전 7일 평균 ${trend.prev}kg"><i class="bi ${arrow}"></i>${trend.delta > 0 ? '+' : ''}${trend.delta}kg</span>`;
}

function upsertCoachLogLocal(log) {
  if (!log || !log['회원번호'] || !log['날짜']) return;
  AppState.coachLogs = AppState.coachLogs.filter(r => !(r['회원번호'] === log['회원번호'] && r['날짜'] === log['날짜']));
  AppState.coachLogs.push(log);
}

function applyResolvedLocal(memberNo, resolved) {
  (resolved || []).forEach(item => {
    AppState.coachLogs.forEach(r => {
      if (r['회원번호'] === memberNo && r['날짜'] === item['날짜']) r['확인 완료'] = item['확인 완료'];
    });
  });
}

// 방금 저장한 기록은 잠깐 동안 서버 최신화 결과 위에 다시 적용 (저장 직전에 출발한 getAll 응답이 덮어쓰는 것 방지)
function reapplyLocalCoachLogEdits() {
  const cutoff = Date.now() - COACH_LOG_LOCAL_EDIT_TTL_MS;
  AppState.localCoachLogEdits = AppState.localCoachLogEdits.filter(e => e.at > cutoff);
  AppState.localCoachLogEdits.forEach(e => {
    upsertCoachLogLocal({ ...e.log });
    applyResolvedLocal(e.memberNo, e.resolved);
  });
}

/* ---------------------------------- 오늘 보드 ---------------------------------- */

// 상태·태그 필터 (회원 목록과 공통, 검색어는 보드에 적용하지 않음)
function memberPassesStatusTagFilter(m) {
  const isActive = isMemberActive(m);
  if (AppState.filterStatus === 'active' && !isActive) return false;
  if (AppState.filterStatus === 'inactive' && isActive) return false;
  if (AppState.filterTag !== 'all' && getMemberTag(m) !== AppState.filterTag) return false;
  return true;
}

/* ------------------------------ AI 회원 분석 (코치 전용) ------------------------------ */

function isAnalysisFlagged(a) {
  return !!a && (a['특이사항_있음'] === true || String(a['특이사항_있음']).toUpperCase() === 'TRUE');
}

// 회원의 분석 보고 (분석일시 오름차순)
function getMemberAnalyses(memberNo) {
  if (!memberNo) return [];
  return AppState.analyses.filter(a => a['회원번호'] === memberNo)
    .sort((a, b) => (a['분석일시'] < b['분석일시'] ? -1 : (a['분석일시'] > b['분석일시'] ? 1 : 0)));
}

// 그 날짜(포함)까지 한 분석 중 가장 최근 보고
function getAnalysisAsOf(memberNo, dateKey) {
  const list = getMemberAnalyses(memberNo).filter(a => String(a['분석일시']).slice(0, 10) <= dateKey);
  return list.length ? list[list.length - 1] : null;
}

function getAnalysisSummary(a) {
  if (!a) return '';
  if (a['요약']) return a['요약'];
  const line = String(a['보고'] || '').split('\n').map(l => l.replace(/^[\s#*\-•]+/, '').trim()).find(l => l);
  return line || '';
}

// 오늘 보드 맨 위로 올릴 AI 특이사항 (그 날짜 기준 가장 최근 분석이 특이사항 있음일 때)
function hasCoachAiAlert(mem, dateKey) {
  return isAnalysisFlagged(getAnalysisAsOf(getMemberNo(mem), dateKey));
}

function upsertAnalysisLocal(a) {
  if (!a || !a['회원번호'] || !a['분석일시']) return;
  AppState.analyses = AppState.analyses.filter(x => !(x['회원번호'] === a['회원번호'] && x['분석일시'] === a['분석일시']));
  AppState.analyses.push(a);
}

function renderMemberAiReport(mem) {
  const el = document.getElementById('memberAiReportSlot');
  if (!el) return;
  const memberNo = getMemberNo(mem);
  const running = !!AppState.analysisRunning[memberNo];
  const list = getMemberAnalyses(memberNo);
  const latest = list.length ? list[list.length - 1] : null;
  const failure = memberNo ? AppState.analysisFailures[memberNo] : null;
  // 실패가 최근 보고보다 나중일 때만 표시 (이전 보고는 그대로 보여 줌)
  const showFailure = failure && (failure.local || !latest || String(failure.at || '') > String(latest['분석일시']));
  const canRun = !!memberNo && AppState.dataSource !== 'mock';
  const btn = memberNo
    ? `<button type="button" class="btn btn-sm btn-outline-primary" data-ai-analyze="${escapeHtml(memberNo)}" ${running || !canRun ? 'disabled' : ''} ${canRun ? '' : 'title="시트 연결 후 사용할 수 있습니다"'}>
        ${running ? '<span class="spinner-border spinner-border-sm me-1"></span>분석 중...' : `<i class="bi ${showFailure ? 'bi-arrow-clockwise' : 'bi-stars'} me-1"></i>${showFailure ? '다시 시도' : '분석 업데이트'}`}
      </button>`
    : '';
  const head = `<div class="ai-report-head">
      <h6><i class="bi bi-stars"></i>AI 분석 리포트 <span class="ai-report-private"><i class="bi bi-lock-fill"></i>코치 전용</span></h6>
      ${btn}
    </div>`;
  let body = '';
  if (!memberNo) {
    body = '<div class="ai-report-empty">회원번호가 없어 분석할 수 없습니다.</div>';
  } else if (!latest) {
    body = `<div class="ai-report-empty">아직 분석 보고가 없습니다. 매일 밤 11시에 자동으로 분석하거나 [분석 업데이트]로 바로 분석할 수 있습니다.</div>`;
  } else {
    const flagged = isAnalysisFlagged(latest);
    const older = list.slice(0, -1).reverse();
    const canLoadOlder = AppState.dataSource !== 'mock' && !AppState.analysisHistoryLoaded[memberNo];
    const olderItems = older.map(a => `<div class="ai-report-old">
        <div class="ai-report-old-meta">${isAnalysisFlagged(a) ? '<span class="ai-flag-badge">⚠ 특이사항</span>' : '<span class="ai-ok-badge">특이사항 없음</span>'}${escapeHtml(String(a['분석일시']).slice(0, 16))}</div>
        <div class="ai-report-text">${escapeHtml(a['보고'] || getAnalysisSummary(a))}</div>
      </div>`).join('');
    body = `<div class="ai-report-latest ${flagged ? 'is-flagged' : ''}">
        <div class="ai-report-meta">${flagged ? '<span class="ai-flag-badge">⚠ 특이사항</span>' : '<span class="ai-ok-badge">특이사항 없음</span>'}<span>${escapeHtml(String(latest['분석일시']).slice(0, 16))} 분석</span></div>
        <div class="ai-report-text">${escapeHtml(latest['보고'] || getAnalysisSummary(latest))}</div>
      </div>` +
      ((older.length || canLoadOlder) ? `<details class="ai-report-history" ${AppState.analysisHistoryLoaded[memberNo] ? 'open' : ''} data-ai-history="${escapeHtml(memberNo)}">
        <summary>이전 보고 ${AppState.analysisHistoryLoaded[memberNo] ? `${older.length}개` : '펼쳐보기'}</summary>
        ${canLoadOlder ? '<div class="ai-report-empty"><span class="spinner-border spinner-border-sm me-1"></span>이전 보고를 불러오는 중...</div>' : (olderItems || '<div class="ai-report-empty">이전 보고가 없습니다.</div>')}
      </details>` : '');
  }
  const failHtml = showFailure
    ? `<div class="ai-report-fail"><i class="bi bi-exclamation-triangle-fill"></i>분석 실패 (${escapeHtml(String(failure.at || '').slice(0, 16))}): ${escapeHtml(failure.reason || '')}</div>`
    : '';
  el.className = 'coach-ai-report mb-3';
  el.innerHTML = head + failHtml + body;
}

async function runMemberAnalysis(memberNo) {
  if (!memberNo || AppState.analysisRunning[memberNo]) return;
  AppState.analysisRunning[memberNo] = true;
  const rerender = () => {
    if (AppState.selectedMember && getMemberNo(AppState.selectedMember) === memberNo) renderMemberAiReport(AppState.selectedMember);
  };
  rerender();
  let res = null;
  try {
    res = await postToGasBackend({ action: 'analyzeMember', memberNo }, { silent: true, noAbort: true });
  } finally {
    AppState.analysisRunning[memberNo] = false;
  }
  if (res && res.status === 'success' && res.analysis) {
    upsertAnalysisLocal(res.analysis);
    delete AppState.analysisFailures[memberNo];
    showToast(isAnalysisFlagged(res.analysis) ? '분석 완료: 특이사항이 있습니다.' : '분석 완료: 특이사항이 없습니다.', 'success');
  } else {
    const reason = (res && res.message) || '서버 응답이 없습니다.';
    // 서버에 기록되지 않은 실패(지침 미인식·연결 오류 등)도 이번 화면에서는 표시 (다음 최신화 때 서버 값으로 바뀜)
    AppState.analysisFailures[memberNo] = (res && res.failure) ||
      { at: `${localDateKey()} ${new Date().toTimeString().slice(0, 8)}`, reason, local: true };
    showToast(`분석 실패: ${reason}`, 'danger');
  }
  saveCoachDataCache();
  rerender();
  renderTodayBoard();
}

async function loadAnalysisHistory(memberNo) {
  if (!memberNo || AppState.analysisHistoryLoaded[memberNo] === 'loading') return;
  AppState.analysisHistoryLoaded[memberNo] = 'loading';
  const res = await postToGasBackend({ action: 'getAnalysisHistory', memberNo }, { silent: true, noAbort: true });
  if (res && res.status === 'success' && Array.isArray(res.analyses)) {
    res.analyses.forEach(a => upsertAnalysisLocal(a));
    AppState.analysisHistoryLoaded[memberNo] = true;
  } else {
    delete AppState.analysisHistoryLoaded[memberNo];
    showRetryToast(`이전 보고를 불러오지 못했습니다: ${(res && res.message) || '서버 오류'}`, () => loadAnalysisHistory(memberNo));
  }
  if (AppState.selectedMember && getMemberNo(AppState.selectedMember) === memberNo) renderMemberAiReport(AppState.selectedMember);
}

document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest ? e.target : null;
  if (!t) return;
  const btn = t.closest('#memberAiReportSlot [data-ai-analyze]');
  if (btn) runMemberAnalysis(btn.getAttribute('data-ai-analyze'));
});

document.addEventListener('toggle', (e) => {
  const el = e.target;
  if (!el || !el.matches || !el.matches('#memberAiReportSlot details[data-ai-history]') || !el.open) return;
  const memberNo = el.getAttribute('data-ai-history');
  if (AppState.dataSource !== 'mock' && !AppState.analysisHistoryLoaded[memberNo]) loadAnalysisHistory(memberNo);
}, true);

// 정렬: AI 특이사항 → 미기록 → 기록 완료 → 회원번호 없음, 같은 묶음은 이름순
function getTodayBoardEntries() {
  const date = AppState.boardDate;
  return AppState.members.filter(memberPassesStatusTagFilter).map(mem => {
    const memberNo = getMemberNo(mem);
    const log = getCoachLog(memberNo, date);
    const analysis = memberNo ? getAnalysisAsOf(memberNo, date) : null;
    const aiAlert = isAnalysisFlagged(analysis);
    const group = !memberNo ? 3 : (aiAlert ? 0 : (log ? 2 : 1));
    return { mem, key: getMemberKey(mem), memberNo, name: getMemberName(mem), log, group, aiAlert, aiSummary: aiAlert ? getAnalysisSummary(analysis) : '' };
  }).sort((a, b) => a.group - b.group || a.name.localeCompare(b.name, 'ko'));
}

function setBoardDate(dateKey) {
  const today = localDateKey();
  if (dateKeyToUtcDay(dateKey) === null) return;
  AppState.boardDate = dateKey > today ? today : dateKey;
  renderTodayBoard();
}

function renderTodayBoardFilters() {
  const el = document.getElementById('boardFilters');
  if (!el) return;
  const tags = [...new Set(AppState.members.map(getMemberTag).filter(Boolean))];
  const statusBtn = (value, label) => `<button type="button" class="today-chip ${AppState.filterStatus === value ? 'is-active' : ''}" data-board-status="${value}">${label}</button>`;
  const tagBtn = (value, label) => `<button type="button" class="today-chip ${AppState.filterTag === value ? 'is-active' : ''}" data-board-tag="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
  el.innerHTML = `
    <div class="today-chip-row">${statusBtn('active', '유효')}${statusBtn('inactive', '휴면')}${statusBtn('all', '전체')}</div>
    <div class="today-chip-row is-scroll">${tagBtn('all', '모든 태그')}${tags.map(t => tagBtn(t, t)).join('')}</div>`;
}

function renderTodayBoard() {
  const list = document.getElementById('boardList');
  if (!list) return;
  const date = AppState.boardDate;
  const today = localDateKey();

  const input = document.getElementById('boardDateInput');
  if (input) {
    input.max = today;
    input.value = date;
  }
  setElementText('boardDateText', date === today ? `오늘 · ${formatDateLabel(date)}` : formatDateLabel(date));
  const nextBtn = document.getElementById('btnBoardNextDay');
  if (nextBtn) nextBtn.disabled = date >= today;
  const todayBtn = document.getElementById('btnBoardToday');
  if (todayBtn) todayBtn.classList.toggle('d-none', date === today);

  renderTodayBoardFilters();

  const entries = getTodayBoardEntries();
  const recordable = entries.filter(e => e.memberNo);
  const done = recordable.filter(e => e.log).length;
  setElementText('boardProgressText', `기록 ${done}/${recordable.length}`);
  const bar = document.getElementById('boardProgressBar');
  if (bar) bar.style.width = recordable.length ? `${Math.round(done / recordable.length * 100)}%` : '0%';

  if (!entries.length) {
    list.innerHTML = `<div class="today-empty"><i class="bi bi-person-x"></i>조건에 맞는 회원이 없습니다.</div>`;
    return;
  }

  list.innerHTML = entries.map(e => {
    if (!e.memberNo) {
      return `<div class="today-row is-disabled" title="회원번호가 없어 기록할 수 없습니다">
        <div class="today-row-main"><div class="today-row-name">${escapeHtml(e.name)}</div><div class="today-row-sub">회원번호 없음 · Members 시트에 입력해 주세요</div></div>
      </div>`;
    }
    const trend = computeWeeklyAvgChange(e.mem, date);
    const checks = getOpenNextChecks(e.memberNo, date);
    const checkHtml = checks.length
      ? `<div class="today-row-check"><i class="bi bi-pin-angle-fill"></i><span class="text-truncate">${escapeHtml(checks[0]['다음에 확인'])}</span>${checks.length > 1 ? `<b>+${checks.length - 1}</b>` : ''}</div>`
      : '';
    const statusHtml = e.log
      ? `<span class="today-done"><i class="bi bi-check-circle-fill"></i>기록</span>${['식단 상태', '운동 상태'].map(k => e.log[k] ? `<span class="today-status-dot ${COACH_LOG_STATUS_CLASS[e.log[k]] || ''}" title="${k}: ${escapeHtml(e.log[k])}"></span>` : '').join('')}`
      : '<span class="today-todo">미기록</span>';
    const aiHtml = e.aiAlert
      ? `<div class="today-row-ai" title="AI 분석 특이사항 (코치 전용)"><i class="bi bi-stars"></i><span class="text-truncate">${escapeHtml(e.aiSummary || '특이사항 있음')}</span></div>`
      : '';
    return `<button type="button" class="today-row ${e.log ? 'is-done' : 'is-todo'}${e.aiAlert ? ' is-ai-alert' : ''}" data-board-member="${escapeHtml(e.key)}">
      <div class="today-row-main">
        <div class="today-row-name">${e.aiAlert ? '<span class="today-ai-flag">⚠</span>' : ''}${escapeHtml(e.name)}<small>${escapeHtml(getMemberTag(e.mem))}</small></div>
        ${aiHtml}
        ${checkHtml}
      </div>
      <div class="today-row-weight">
        ${trend.dayWeight === null ? '<span class="today-weight-missing">미입력</span>' : `<b>${trend.dayWeight}kg</b>`}
        ${renderWeeklyTrendHtml(trend)}
      </div>
      <div class="today-row-status">${statusHtml}</div>
    </button>`;
  }).join('');
}

function initTodayBoardActions() {
  const list = document.getElementById('boardList');
  if (list) {
    list.addEventListener('click', (e) => {
      const row = e.target.closest('[data-board-member]');
      if (row) openCoachLogSheet(row.getAttribute('data-board-member'), AppState.boardDate);
    });
  }
  const filters = document.getElementById('boardFilters');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const statusBtn = e.target.closest('[data-board-status]');
      const tagBtn = e.target.closest('[data-board-tag]');
      if (statusBtn) {
        AppState.filterStatus = statusBtn.getAttribute('data-board-status');
        const radio = document.querySelector(`input[name="statusFilter"][value="${AppState.filterStatus}"]`);
        if (radio) radio.checked = true;
      } else if (tagBtn) {
        AppState.filterTag = tagBtn.getAttribute('data-board-tag');
        renderTagFilterButtons();
      } else {
        return;
      }
      applyFiltersAndRenderMemberList();
      renderTodayBoard();
    });
  }
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('btnBoardPrevDay', () => setBoardDate(shiftDateKey(AppState.boardDate, -1)));
  bind('btnBoardNextDay', () => setBoardDate(shiftDateKey(AppState.boardDate, 1)));
  bind('btnBoardToday', () => setBoardDate(localDateKey()));
  const input = document.getElementById('boardDateInput');
  if (input) input.addEventListener('change', () => { if (input.value) setBoardDate(input.value); });
}

/* ---------------------------------- 기록 창 ---------------------------------- */

const CoachLogSheetState = {
  memberKey: '', memberNo: '', date: '',
  dietStatus: '', exerciseStatus: '', dietTags: [], exerciseTags: [],
  resolve: {},   // 이전 날짜 -> true(확인 완료) / false(확인 취소) - 바꾼 것만
  saving: false,
  noteCaret: null
};

function isCoachLogSheetOpen() {
  const el = document.getElementById('coachLogSheet');
  return !!(el && (el.classList.contains('show') || el.classList.contains('showing')));
}

// 모바일은 아래에서 올라오는 창, 데스크톱은 오른쪽 패널 (닫혀 있을 때만 위치 변경)
function getCoachLogSheetInstance() {
  const el = document.getElementById('coachLogSheet');
  if (!el || !window.bootstrap) return null;
  if (!isCoachLogSheetOpen()) {
    const mobile = isCoachMobileLayout();
    el.classList.toggle('offcanvas-bottom', mobile);
    el.classList.toggle('offcanvas-end', !mobile);
  }
  return bootstrap.Offcanvas.getOrCreateInstance(el);
}

function openCoachLogSheet(memberKey, dateKey, opts = {}) {
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  if (!mem) return;
  const memberNo = getMemberNo(mem);
  if (!memberNo) {
    showToast('이 회원은 회원번호가 비어 있어 기록할 수 없습니다. Members 시트에 회원번호를 먼저 입력해 주세요.', 'warning');
    return;
  }
  const date = dateKey || localDateKey();
  const log = getCoachLog(memberNo, date);
  Object.assign(CoachLogSheetState, {
    memberKey, memberNo, date,
    dietStatus: log ? log['식단 상태'] : '',
    exerciseStatus: log ? log['운동 상태'] : '',
    dietTags: log ? splitCoachLogTags(log['식단 태그']) : [],
    exerciseTags: log ? splitCoachLogTags(log['운동 태그']) : [],
    resolve: {},
    noteCaret: null
  });

  setElementText('coachLogSheetTitle', `${getMemberName(mem)}${log ? '' : ' · 새 기록'}`);
  setElementText('coachLogSheetSub', `${formatDateLabel(date)} · ${memberNo}${log && log['수정시각'] ? ` · 수정 ${log['수정시각'].slice(5, 16)}` : (log && log['작성시각'] ? ` · 작성 ${log['작성시각'].slice(5, 16)}` : '')}`);
  setInputValue('coachLogMemo', log ? log['메모'] : '');
  setInputValue('coachLogNote', log ? log['코치 한마디'] : '');
  setInputValue('coachLogNextCheck', log ? log['다음에 확인'] : '');
  renderCoachLogSummary(mem, memberNo, date);
  renderCoachLogChoices();
  renderCoachLogPhrases();
  renderCoachLogPendingChecks();
  showCoachLogError('');
  setCoachLogSaving(false);
  // '저장하고 다음'으로 넘어왔을 때 앞 회원 저장 확인 (토스트는 창 제목·버튼을 가리므로 창 안에 표시)
  const savedNote = document.getElementById('coachLogSavedNote');
  if (savedNote) {
    savedNote.classList.toggle('d-none', !opts.savedNote);
    savedNote.innerHTML = opts.savedNote ? `<i class="bi bi-check-circle-fill"></i>${escapeHtml(opts.savedNote)}` : '';
  }

  const body = document.getElementById('coachLogSheetBody');
  if (body) body.scrollTop = 0;
  const inst = getCoachLogSheetInstance();
  if (inst && !isCoachLogSheetOpen()) inst.show();
}
window.openCoachLogSheet = openCoachLogSheet;

function renderCoachLogSummary(mem, memberNo, date) {
  const el = document.getElementById('coachLogSummary');
  if (!el) return;
  const trend = computeWeeklyAvgChange(mem, date);
  const last = getLastCoachNote(memberNo, date);
  el.innerHTML = `
    <div class="coachlog-stats">
      <div><span>그 날 체중</span><b>${trend.dayWeight === null ? '<em>미입력</em>' : `${trend.dayWeight}kg`}</b></div>
      <div><span>7일 평균</span><b>${trend.cur === null ? '-' : `${trend.cur}kg`}</b></div>
      <div><span>전 주 대비</span><b>${renderWeeklyTrendHtml(trend)}</b></div>
    </div>
    <div class="coachlog-lastnote">
      <span><i class="bi bi-chat-quote"></i>직전 코치 한마디${last ? ` · ${escapeHtml(formatDateLabel(last['날짜']))}` : ''}</span>
      <div>${last ? escapeHtml(last['코치 한마디']) : '<em>아직 없습니다.</em>'}</div>
    </div>`;
}

function renderCoachLogChoices() {
  const s = CoachLogSheetState;
  const settings = getCoachSettings();
  const choiceHtml = (group, options, selected) => options.map(v =>
    `<button type="button" class="coachlog-choice ${COACH_LOG_STATUS_CLASS[v] || ''} ${selected === v ? 'is-on' : ''}" data-cl-status="${group}" data-value="${escapeHtml(v)}" aria-pressed="${selected === v}">${escapeHtml(v)}</button>`
  ).join('');
  // 설정에서 빠진 태그라도 이 기록에 이미 있으면 보여 줌 (지우지 않도록)
  const tagHtml = (group, options, selected) => [...new Set(options.concat(selected))].map(t =>
    `<button type="button" class="coachlog-tag ${selected.includes(t) ? 'is-on' : ''}" data-cl-tag="${group}" data-value="${escapeHtml(t)}" aria-pressed="${selected.includes(t)}">${escapeHtml(t)}</button>`
  ).join('');
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('coachLogDietStatus', choiceHtml('diet', COACH_LOG_DIET_STATUSES, s.dietStatus));
  set('coachLogExerciseStatus', choiceHtml('exercise', COACH_LOG_EXERCISE_STATUSES, s.exerciseStatus));
  set('coachLogDietTags', tagHtml('diet', settings.dietTags, s.dietTags));
  set('coachLogExerciseTags', tagHtml('exercise', settings.exerciseTags, s.exerciseTags));
}

function renderCoachLogPhrases() {
  const el = document.getElementById('coachLogPhrases');
  if (!el) return;
  const phrases = getCoachSettings().phrases;
  el.innerHTML = phrases.length
    ? phrases.map((p, i) => `<button type="button" class="coachlog-phrase" data-cl-phrase="${i}" title="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')
    : '<span class="coachlog-hint">자주 쓰는 문구는 CoachSettings 시트의 \'자주 쓰는 문구\' 열에 적으면 여기에 버튼으로 생깁니다.</span>';
}

// 이전 날짜의 '다음에 확인' 목록 - 체크하면 이 날짜로 확인 완료 처리
function renderCoachLogPendingChecks() {
  const el = document.getElementById('coachLogPendingChecks');
  if (!el) return;
  const s = CoachLogSheetState;
  const items = getMemberCoachLogs(s.memberNo).filter(r => r['다음에 확인'] && r['날짜'] < s.date && (!r['확인 완료'] || r['확인 완료'] >= s.date));
  if (!items.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="coachlog-pending-title">이전에 남긴 확인할 것</div>` + items.map(r => {
    const d = r['날짜'];
    const checked = d in s.resolve ? s.resolve[d] : r['확인 완료'] === s.date;
    return `<label class="coachlog-pending-item ${checked ? 'is-done' : ''}">
      <input type="checkbox" class="form-check-input" data-cl-resolve="${escapeHtml(d)}" ${checked ? 'checked' : ''}>
      <span><small>${escapeHtml(formatDateLabel(d))}</small>${escapeHtml(r['다음에 확인'])}</span>
    </label>`;
  }).join('');
}

function showCoachLogError(message, onRetry) {
  const el = document.getElementById('coachLogError');
  if (!el) return;
  el.classList.toggle('d-none', !message);
  el.innerHTML = message ? `<i class="bi bi-exclamation-triangle-fill me-1"></i>${escapeHtml(message)} 입력한 내용은 그대로 있습니다.` : '';
  if (message && typeof onRetry === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-danger ms-2';
    btn.textContent = '다시 시도';
    btn.addEventListener('click', onRetry);
    el.appendChild(btn);
  }
}

function setCoachLogSaving(saving, goNext) {
  CoachLogSheetState.saving = saving;
  const save = document.getElementById('btnCoachLogSave');
  const next = document.getElementById('btnCoachLogSaveNext');
  if (save) {
    save.disabled = saving;
    save.innerHTML = saving && !goNext ? '<span class="spinner-border spinner-border-sm me-1"></span>저장 중' : '저장';
  }
  if (next) {
    next.disabled = saving;
    next.innerHTML = saving && goNext ? '<span class="spinner-border spinner-border-sm me-1"></span>저장 중' : '저장하고 다음 <i class="bi bi-arrow-right"></i>';
  }
}

// 오늘 보드 순서에서 현재 회원 다음의 미기록 회원 (끝까지 없으면 처음부터)
function findNextUnrecordedBoardEntry(currentKey) {
  const entries = getTodayBoardEntries().filter(e => e.memberNo);
  const idx = entries.findIndex(e => e.key === currentKey);
  const ordered = entries.slice(idx + 1).concat(entries.slice(0, Math.max(idx, 0)));
  return ordered.find(e => !e.log && e.key !== currentKey) || null;
}

async function saveCoachLogFromSheet(goNext) {
  const s = CoachLogSheetState;
  if (s.saving || !s.memberNo) return;
  const payload = {
    action: 'saveCoachLog',
    memberNo: s.memberNo,
    date: s.date,
    dietStatus: s.dietStatus,
    exerciseStatus: s.exerciseStatus,
    dietTags: s.dietTags.slice(),
    exerciseTags: s.exerciseTags.slice(),
    memo: getInputValue('coachLogMemo'),
    coachNote: getInputValue('coachLogNote'),
    nextCheck: getInputValue('coachLogNextCheck'),
    resolve: Object.keys(s.resolve).map(d => ({ date: d, done: !!s.resolve[d] }))
  };
  const memberKey = s.memberKey;
  showCoachLogError('');
  setCoachLogSaving(true, goNext);
  let res = null;
  try {
    res = await postToGasBackend(payload, { silent: true, noAbort: true });
  } catch (e) {
    res = { status: 'error', message: e.message || '저장 중 오류가 발생했습니다.' };
  } finally {
    setCoachLogSaving(false);
  }

  const stillOpen = isCoachLogSheetOpen() && s.memberNo === payload.memberNo && s.date === payload.date;
  if (!res || res.status !== 'success' || !res.log) {
    const message = (res && res.message) ? `저장하지 못했습니다: ${res.message}` : '저장하지 못했습니다.';
    if (stillOpen) showCoachLogError(message, () => saveCoachLogFromSheet(goNext));
    else showRetryToast(message, () => postToGasBackend(payload, { noAbort: true }));
    return;
  }

  applyCoachLogSaveResult(res);
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  const savedText = `${mem ? getMemberName(mem) : res.memberNo} · ${formatDateLabel(res.date)} 기록을 저장했습니다.`;
  if (!stillOpen) {
    showToast(`✓ ${savedText}`, 'success');
    return;
  }

  if (goNext) {
    const next = findNextUnrecordedBoardEntry(memberKey);
    if (next) {
      openCoachLogSheet(next.key, payload.date, { savedNote: savedText });
      return;
    }
  }
  const inst = getCoachLogSheetInstance();
  if (inst) inst.hide();
  showToast(goNext ? `✓ ${savedText} 이 날짜에 기록할 회원을 모두 기록했습니다. 🎉` : `✓ ${savedText}`, 'success');
}

function applyCoachLogSaveResult(res) {
  upsertCoachLogLocal({ ...res.log });
  applyResolvedLocal(res.memberNo, res.resolved);
  if (AppState.dataSource !== 'mock') {
    AppState.localCoachLogEdits.push({ at: Date.now(), memberNo: res.memberNo, log: { ...res.log }, resolved: res.resolved || [] });
  }
  saveCoachDataCache();
  renderTodayBoard();
  if (AppState.selectedMember && getMemberNo(AppState.selectedMember) === res.memberNo) {
    renderMemberCoachTimeline(AppState.selectedMember);
  }
}

function insertCoachNotePhrase(text) {
  const ta = document.getElementById('coachLogNote');
  if (!ta) return;
  const value = ta.value;
  const [start, end] = CoachLogSheetState.noteCaret || [value.length, value.length];
  const before = value.slice(0, start);
  const after = value.slice(end);
  const glue = before && !/\s$/.test(before) ? ' ' : '';
  ta.value = (before + glue + text + after).slice(0, 1000);
  const caret = Math.min(before.length + glue.length + text.length, ta.value.length);
  CoachLogSheetState.noteCaret = [caret, caret];
}

function initCoachLogSheet() {
  const sheet = document.getElementById('coachLogSheet');
  if (!sheet) return;

  sheet.addEventListener('click', (e) => {
    const s = CoachLogSheetState;
    const statusBtn = e.target.closest('[data-cl-status]');
    if (statusBtn) {
      const key = statusBtn.getAttribute('data-cl-status') === 'diet' ? 'dietStatus' : 'exerciseStatus';
      const v = statusBtn.getAttribute('data-value');
      s[key] = s[key] === v ? '' : v; // 같은 버튼을 다시 누르면 선택 해제
      renderCoachLogChoices();
      return;
    }
    const tagBtn = e.target.closest('[data-cl-tag]');
    if (tagBtn) {
      const key = tagBtn.getAttribute('data-cl-tag') === 'diet' ? 'dietTags' : 'exerciseTags';
      const v = tagBtn.getAttribute('data-value');
      s[key] = s[key].includes(v) ? s[key].filter(t => t !== v) : s[key].concat(v);
      renderCoachLogChoices();
      return;
    }
    const phraseBtn = e.target.closest('[data-cl-phrase]');
    if (phraseBtn) {
      const phrase = getCoachSettings().phrases[+phraseBtn.getAttribute('data-cl-phrase')];
      if (phrase) insertCoachNotePhrase(phrase);
    }
  });

  sheet.addEventListener('change', (e) => {
    const box = e.target.closest('[data-cl-resolve]');
    if (!box) return;
    const d = box.getAttribute('data-cl-resolve');
    const log = getCoachLog(CoachLogSheetState.memberNo, d);
    const original = !!(log && log['확인 완료'] === CoachLogSheetState.date);
    if (box.checked === original) delete CoachLogSheetState.resolve[d];
    else CoachLogSheetState.resolve[d] = box.checked;
    box.closest('.coachlog-pending-item').classList.toggle('is-done', box.checked);
  });

  // 자주 쓰는 문구를 넣을 커서 위치 기억 (버튼을 누르면 입력칸 포커스가 빠지므로)
  const note = document.getElementById('coachLogNote');
  if (note) {
    const remember = () => { CoachLogSheetState.noteCaret = [note.selectionStart, note.selectionEnd]; };
    ['keyup', 'click', 'select', 'input', 'blur'].forEach(ev => note.addEventListener(ev, remember));
  }

  const save = document.getElementById('btnCoachLogSave');
  const next = document.getElementById('btnCoachLogSaveNext');
  if (save) save.addEventListener('click', () => saveCoachLogFromSheet(false));
  if (next) next.addEventListener('click', () => saveCoachLogFromSheet(true));

  const detail = document.getElementById('btnCoachLogOpenDetail');
  if (detail) {
    detail.addEventListener('click', () => {
      const key = CoachLogSheetState.memberKey;
      const inst = getCoachLogSheetInstance();
      if (inst) inst.hide();
      selectMember(key, { tab: 'record' });
      if (!isCoachMobileLayout()) {
        const panel = document.getElementById('panelWeightHistory');
        if (panel) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    });
  }
}

/* --------------------------- 회원 상세: 날짜별 코치 기록 --------------------------- */

function renderMemberCoachTimeline(mem) {
  const el = document.getElementById('memberCoachTimeline');
  if (!el) return;
  const memberNo = getMemberNo(mem);
  const key = getMemberKey(mem);
  const head = `<div class="coach-timeline-head">
      <h6><i class="bi bi-journal-text"></i>날짜별 코치 기록</h6>
      ${memberNo ? `<button type="button" class="btn btn-sm btn-primary" data-cl-open="${escapeHtml(key)}" data-cl-date="${localDateKey()}"><i class="bi bi-plus-lg me-1"></i>오늘 기록</button>` : ''}
    </div>`;
  if (!memberNo) {
    el.innerHTML = head + '<div class="coach-timeline-empty">회원번호가 없어 코치 기록을 남길 수 없습니다.</div>';
    return;
  }
  const logs = getMemberCoachLogs(memberNo);
  const canLoadMore = AppState.dataSource !== 'mock' && !AppState.coachLogHistoryLoaded[memberNo];
  const tagHtml = (text) => splitCoachLogTags(text).map(t => `<span class="coach-tl-tag">${escapeHtml(t)}</span>`).join('');
  const items = logs.map(r => {
    const statuses = [['식단', r['식단 상태']], ['운동', r['운동 상태']]]
      .filter(([, v]) => v).map(([k, v]) => `<span class="coach-tl-status ${COACH_LOG_STATUS_CLASS[v] || ''}">${k} ${escapeHtml(v)}</span>`).join('');
    const tags = tagHtml(r['식단 태그']) + tagHtml(r['운동 태그']);
    const check = r['다음에 확인']
      ? `<div class="coach-tl-check ${r['확인 완료'] ? 'is-done' : ''}"><i class="bi ${r['확인 완료'] ? 'bi-check-circle-fill' : 'bi-pin-angle-fill'}"></i>${escapeHtml(r['다음에 확인'])}${r['확인 완료'] ? `<small>${escapeHtml(formatDateLabel(r['확인 완료']))} 확인</small>` : ''}</div>`
      : '';
    return `<button type="button" class="coach-tl-item" data-cl-open="${escapeHtml(key)}" data-cl-date="${escapeHtml(r['날짜'])}">
      <div class="coach-tl-date">${escapeHtml(formatDateLabel(r['날짜']))}</div>
      <div class="coach-tl-body">
        ${statuses || tags ? `<div class="coach-tl-chips">${statuses}${tags}</div>` : ''}
        ${r['메모'] ? `<div class="coach-tl-memo"><i class="bi bi-lock-fill"></i>${escapeHtml(r['메모'])}</div>` : ''}
        ${r['코치 한마디'] ? `<div class="coach-tl-note"><i class="bi bi-chat-heart-fill"></i>${escapeHtml(r['코치 한마디'])}</div>` : ''}
        ${check}
      </div>
    </button>`;
  }).join('');
  el.innerHTML = head +
    (items ? `<div class="coach-tl-list">${items}</div>` : '<div class="coach-timeline-empty">아직 코치 기록이 없습니다. 오늘 보드나 [오늘 기록]에서 남겨 주세요.</div>') +
    (canLoadMore ? `<button type="button" class="btn btn-sm btn-light border w-100 mt-2" data-cl-history="${escapeHtml(memberNo)}"><i class="bi bi-clock-history me-1"></i>60일보다 이전 기록 더 보기</button>` : '');
}

async function loadMoreCoachLogHistory(memberNo, btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>불러오는 중...';
  }
  const res = await postToGasBackend({ action: 'getCoachLogHistory', memberNo }, { silent: true, noAbort: true });
  if (res && res.status === 'success' && Array.isArray(res.logs)) {
    res.logs.forEach(log => upsertCoachLogLocal(log));
    reapplyLocalCoachLogEdits();
    AppState.coachLogHistoryLoaded[memberNo] = true;
  } else {
    showRetryToast(`이전 기록을 불러오지 못했습니다: ${(res && res.message) || '서버 오류'}`, () => loadMoreCoachLogHistory(memberNo));
  }
  if (AppState.selectedMember && getMemberNo(AppState.selectedMember) === memberNo) renderMemberCoachTimeline(AppState.selectedMember);
}

document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest ? e.target : null;
  if (!t) return;
  const openBtn = t.closest('#memberCoachTimeline [data-cl-open]');
  if (openBtn) {
    openCoachLogSheet(openBtn.getAttribute('data-cl-open'), openBtn.getAttribute('data-cl-date'));
    return;
  }
  const moreBtn = t.closest('#memberCoachTimeline [data-cl-history]');
  if (moreBtn) loadMoreCoachLogHistory(moreBtn.getAttribute('data-cl-history'), moreBtn);
});

function getReadPendingNotiKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_READ_PENDING_NOTIS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function markPendingNotiAsRead(itemKey) {
  if (!itemKey) return;
  const list = getReadPendingNotiKeys();
  if (!list.includes(itemKey)) {
    list.push(itemKey);
    try {
      localStorage.setItem(STORAGE_READ_PENDING_NOTIS_KEY, JSON.stringify(list));
    } catch (e) {}
  }
  updateGlobalNotificationBadges();
}

function markAllPendingNotisAsRead() {
  const currentKeys = getUnreadMemberPlanChangeItems().map(it => it.key);
  const existing = getReadPendingNotiKeys();
  const merged = Array.from(new Set([...existing, ...currentKeys]));
  try {
    localStorage.setItem(STORAGE_READ_PENDING_NOTIS_KEY, JSON.stringify(merged));
  } catch (e) {}
  updateGlobalNotificationBadges();
  showToast('모든 회원 변경 알림을 읽음(숨김) 처리했습니다.', 'info');
}

// 🔔 회원이 마이페이지에서 AI로 운동 루틴/식단을 바꾸거나 되돌린 알림
function updateGlobalNotificationBadges() {
  const badgeEl = document.getElementById('unreadFeedbackBadge');
  const countBadgeEl = document.getElementById('notificationListCountBadge');
  const itemsContainer = document.getElementById('notificationItemsContainer');

  const items = getUnreadMemberPlanChangeItems();
  const count = items.length;

  if (badgeEl) {
    badgeEl.textContent = count > 99 ? '99+' : String(count);
    badgeEl.classList.toggle('d-none', count === 0);
  }
  if (countBadgeEl) countBadgeEl.textContent = `${count}건`;
  if (!itemsContainer) return;

  if (count === 0) {
    itemsContainer.innerHTML = `
      <li class="p-4 text-center text-muted small">
        <i class="bi bi-check-circle-fill text-success fs-5 d-block mb-1"></i>
        새로운 회원 변경 알림이 없습니다.
      </li>
    `;
    return;
  }
  itemsContainer.innerHTML = items.map(item => `
    <li class="dropdown-item p-2 px-3 border-bottom cursor-pointer hover-bg-light notification-item"
        style="cursor: pointer;"
        onclick="handleMemberPlanChangeNotificationClick('${escapeHtml(item.key)}', '${escapeHtml(item.memberKey)}')">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold text-dark"><i class="bi bi-person-gear text-success me-1"></i>${escapeHtml(item.memberName)}</span>
        <span class="badge bg-success-subtle text-success border border-success-subtle small">${escapeHtml(item.changedAt)}</span>
      </div>
      <div class="small text-dark mb-1">
        회원이 <strong>${escapeHtml(item.label)}</strong>을(를) ${item.isRevert ? '이전 버전으로 되돌렸습니다.' : 'AI로 변경했습니다.'}
      </div>
      ${item.request ? `<div class="small text-muted text-truncate" style="max-width: 300px;">요청: ${escapeHtml(item.request)}</div>` : ''}
      ${item.hasCoachConflict ? '<div class="small text-danger fw-semibold"><i class="bi bi-exclamation-octagon me-1"></i>회원 요청이 코치 수정 지침과 다르게 반영되었습니다</div>' : ''}
      ${item.hasUnapplied ? '<div class="small text-warning-emphasis fw-semibold"><i class="bi bi-exclamation-triangle me-1"></i>일부 요청은 지침과 맞지 않아 반영되지 않았습니다</div>' : ''}
      <div class="text-end mt-1">
        <span class="badge bg-success text-white small px-2 py-1"><i class="bi bi-eye me-1"></i>변경 내용 확인 &rarr;</span>
      </div>
    </li>
  `).join('');
}

function updateGlobalNotificationBadge() {
  updateGlobalNotificationBadges();
}

/**
 * [회원 셀프 수정 알림] 회원이 마이페이지에서 AI로 루틴/식단을 바꾸거나 되돌린 기록 (Members 시트 '회원 운동/식단 변경일시')
 */
// 회원 셀프 수정 열 (gas_backend.js MEMBER_PLAN_FIELDS와 같은 열 이름)
const MEMBER_PLAN_CHANGE_KINDS = [
  { kind: 'exercise', label: '운동 루틴', changed: ['회원 운동 변경일시', '회원운동변경일시'], request: ['회원 운동 요청', '회원운동요청'], note: ['회원 운동 요청 결과', '회원운동요청결과'] },
  { kind: 'diet', label: '식단', changed: ['회원 식단 변경일시', '회원식단변경일시'], request: ['회원 식단 요청', '회원식단요청'], note: ['회원 식단 요청 결과', '회원식단요청결과'] }
];

// 요청 반영 안내에 '반영하지 못한 내용' / '코치님 지침과 다른 부분'이 '없음'이 아닌 값으로 들어 있는지
function hasUnappliedRequestNote(note) {
  return /반영하지\s*못한\s*내용\s*:\s*(?!없음)\S/.test(note);
}

function hasCoachConflictRequestNote(note) {
  return /코치님?\s*지침과\s*다른\s*부분\s*:\s*(?!없음)\S/.test(note);
}

function getUnreadMemberPlanChangeItems() {
  if (!AppState.members || AppState.members.length === 0) return [];
  const readKeys = new Set(getReadPendingNotiKeys());
  const items = [];
  AppState.members.forEach(m => {
    MEMBER_PLAN_CHANGE_KINDS.forEach(k => {
      const changedAt = String(m[k.changed[0]] || m[k.changed[1]] || '').trim();
      if (!changedAt) return;
      const memberKey = getMemberKey(m);
      const key = `plan_${memberKey}_${k.kind}_${changedAt}`;
      if (readKeys.has(key)) return;
      items.push({
        key,
        memberKey,
        memberName: getMemberName(m),
        label: k.label,
        changedAt,
        isRevert: changedAt.includes('되돌림'),
        request: String(m[k.request[0]] || m[k.request[1]] || '').trim(),
        hasUnapplied: hasUnappliedRequestNote(String(m[k.note[0]] || m[k.note[1]] || '')),
        hasCoachConflict: hasCoachConflictRequestNote(String(m[k.note[0]] || m[k.note[1]] || ''))
      });
    });
  });
  items.sort((a, b) => String(b.changedAt).localeCompare(String(a.changedAt)));
  return items;
}

function handleMemberPlanChangeNotificationClick(key, memberKey) {
  markPendingNotiAsRead(key);
  const bellBtn = document.getElementById('btnNotificationBell');
  if (bellBtn && window.bootstrap) {
    const dropdownInstance = bootstrap.Dropdown.getInstance(bellBtn);
    if (dropdownInstance) dropdownInstance.hide();
  }
  if (memberKey) selectMember(memberKey, { tab: 'routine' });
}

// 전역 함수 노출
window.getReadPendingNotiKeys = getReadPendingNotiKeys;
window.markPendingNotiAsRead = markPendingNotiAsRead;
window.markAllPendingNotisAsRead = markAllPendingNotisAsRead;
window.updateGlobalNotificationBadges = updateGlobalNotificationBadges;
window.updateGlobalNotificationBadge = updateGlobalNotificationBadge;
window.handleMemberPlanChangeNotificationClick = handleMemberPlanChangeNotificationClick;

/**
 * ==============================================================================
 * [8. 커스텀 태그 모달 확인 버튼 로직]
 * ==============================================================================
 */
function initCustomTagModalActions() {
  const btnConfirm = document.getElementById('btnConfirmCustomTag');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      const inputEl = document.getElementById('customTagInput');
      const newTag = inputEl ? inputEl.value.trim() : '';
      if (!newTag) {
        alert('프로그램 태그명을 입력해 주세요.');
        return;
      }

      if (AppState.customTagTargetKey) {
        await changeMemberTag(AppState.customTagTargetKey, newTag);

        const modalEl = document.getElementById('customTagModal');
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      }
    });
  }
}

/**
 * ==============================================================================
 * [9. GAS 설정 및 유틸리티]
 * ==============================================================================
 */
function initApiSettings() {
  const saveBtn = document.getElementById('saveGasUrlBtn');
  const inputEl = document.getElementById('gasApiUrlInput');
  const geminiInput = document.getElementById('geminiApiKeyInput');
  const modelSelect = document.getElementById('geminiModelSelect');
  const resetBtn = document.getElementById('resetGasUrlBtn');

  if (inputEl) inputEl.value = AppState.gasUrl;
  if (geminiInput) geminiInput.value = AppState.geminiApiKey;
  if (modelSelect) modelSelect.value = AppState.modelPref || 'auto';

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const val = inputEl ? inputEl.value.trim() : '';
      const gemVal = geminiInput ? geminiInput.value.trim() : '';
      const modelVal = modelSelect ? modelSelect.value : 'auto';

      AppState.gasUrl = val;
      AppState.geminiApiKey = gemVal;
      AppState.modelPref = modelVal;

      localStorage.setItem(STORAGE_GAS_URL_KEY, val);
      localStorage.setItem(STORAGE_GEMINI_KEY, gemVal);
      localStorage.setItem(STORAGE_MODEL_PREF_KEY, modelVal);

      // 캐시 초기화하여 변경된 모델 즉시 적용
      localStorage.removeItem('CACHE_GEMINI_MODELS_STABLE_V6');

      showToast('연동 설정 및 AI 모델 엔진 설정이 안전하게 저장되었습니다.', 'success');

      const modalEl = document.getElementById('apiConfigModal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }

      await loadAllData();
      applyFiltersAndRenderMemberList();
      populateInlineGuidelines();
      if (AppState.members.length > 0) selectMember(getMemberKey(AppState.members[0]), { auto: true });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('연동 설정을 초기화하고 기본 Mock 데이터 모드로 복귀하시겠습니까?')) {
        localStorage.removeItem(STORAGE_GAS_URL_KEY);
        localStorage.removeItem(STORAGE_GEMINI_KEY);
        localStorage.removeItem(STORAGE_MODEL_PREF_KEY);
        clearCoachDataCache();
        localStorage.removeItem('CACHE_GEMINI_MODELS_STABLE_V6');
        AppState.gasUrl = '';
        AppState.geminiApiKey = '';
        AppState.modelPref = 'auto';
        if (inputEl) inputEl.value = '';
        if (geminiInput) geminiInput.value = '';
        if (modelSelect) modelSelect.value = 'auto';
        location.reload();
      }
    });
  }
}

function updateApiStatusUI() {
  const badge = document.getElementById('apiStatusBadge');
  if (!badge) return;

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const baseClass = 'badge border py-2 px-3 small';
  badge.onclick = null;
  badge.style.cursor = '';

  if (AppState.dataSource === 'cache') {
    const basis = AppState.cacheSavedAt ? fmtDateTime(AppState.cacheSavedAt) : '이전';
    if (AppState.syncState === 'failed') {
      badge.className = `${baseClass} bg-danger-subtle text-danger border-danger-subtle`;
      badge.innerHTML = `<span class="status-dot bg-danger me-1"></span> 저장된 데이터 (${basis} 기준) · 서버 연결 실패 <u>재시도</u>`;
      badge.title = '구글 시트 서버에 연결하지 못해 마지막으로 불러온 데이터를 표시하고 있습니다. 클릭하면 다시 최신화를 시도합니다.';
      badge.style.cursor = 'pointer';
      badge.onclick = () => refreshDataInBackground();
    } else {
      badge.className = `${baseClass} bg-warning-subtle text-warning-emphasis border-warning-subtle`;
      badge.innerHTML = `<span class="spinner-grow spinner-grow-sm text-warning me-1" style="width: 0.6rem; height: 0.6rem;" role="status" aria-hidden="true"></span> 저장된 데이터 (${basis} 기준) · 최신화 중`;
      badge.title = '마지막으로 불러온 데이터를 먼저 표시하고, 구글 시트 최신 데이터를 받아오는 중입니다.';
    }
    return;
  }

  if (AppState.dataSource === 'offline') {
    badge.className = `${baseClass} bg-danger-subtle text-danger border-danger-subtle`;
    badge.innerHTML = '<span class="status-dot bg-danger me-1"></span> 서버 응답이 늦어요 · <u>다시 시도</u>';
    badge.title = '구글 시트 서버에서 데이터를 받지 못했습니다. 클릭하면 다시 불러옵니다.';
    badge.style.cursor = 'pointer';
    badge.onclick = () => retryInitialLoad();
    return;
  }

  if (AppState.isOnline) {
    badge.className = `${baseClass} bg-success-subtle text-success border-success-subtle`;
    const syncedAt = AppState.lastSyncedAt ? ` · ${fmtTime(AppState.lastSyncedAt)} 동기화` : '';
    badge.innerHTML = `<span class="status-dot bg-success me-1"></span> Google Sheets 실시간 연동${syncedAt}`;
    badge.title = AppState.lastSyncedAt ? `구글 시트 최신 데이터 (${fmtDateTime(AppState.lastSyncedAt)} 수신)` : '구글 시트와 연결되었습니다.';
  } else {
    badge.className = `${baseClass} bg-secondary-subtle text-secondary border-secondary-subtle`;
    badge.innerHTML = '<span class="status-dot bg-secondary me-1"></span> 미리보기 모드 (시트 미연동 · 저장 안 됨)';
    badge.title = '';
  }
}

function initEventListeners() {
  // 코치가 입력칸을 수정하면 표시 (백그라운드 최신화가 작성 중인 내용을 덮어쓰지 않도록 보호)
  document.addEventListener('input', (e) => {
    const t = e.target;
    // 검색창·그래프 옵션·오늘 보드 날짜·기록 창 입력은 상세 패널 입력이 아니므로 제외
    if (!t || t.id === 'memberSearchInput' || t.id === 'tagStatsIncludeInactive' || t.id === 'boardDateInput') return;
    if (t.closest && t.closest('#coachLogSheet')) return;
    AppState.userEditedSinceRender = true;
  }, true);

  const searchInput = document.getElementById('memberSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      applyFiltersAndRenderMemberList();
    });
  }

  document.querySelectorAll('input[name="statusFilter"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      AppState.filterStatus = e.target.value;
      applyFiltersAndRenderMemberList();
      renderTodayBoard();
    });
  });

  initGuidelineRoutineActions();
  initCustomTagModalActions();
  initTagStatsActions();
  initTodayBoardActions();
  initCoachLogSheet();

  // 하단 플로팅 로딩 바의 [요청 취소] 버튼 이벤트 바인딩
  const btnCancelTask = document.getElementById('btnCancelCurrentTask');
  if (btnCancelTask) {
    btnCancelTask.addEventListener('click', () => {
      cancelCurrentTask();
    });
  }
}

/**
 * 헬퍼 유틸리티 함수들
 */

/**
 * [요구사항 3] 데이터 객체에서 프로퍼티 값을 추출할 때 공백(\s+) 유무나 미세한 단어 차이에 구애받지 않는 안전한 방어 헬퍼
 * 1단계: 원본 후보 키 직접 일치
 * 2단계: 객체의 모든 키와 후보 키에서 공백을 제거(\s+)한 뒤 100% 일치 비교 (대소문자 무관)
 * 3단계: 공백 제거 후 부분 일치 비교 (2글자 이상 키워드)
 */
function getField(obj, ...candidates) {
  if (!obj || typeof obj !== 'object') return '';

  // 1단계: 원본 키 직접 일치
  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  const keys = Object.keys(obj);

  // 2단계: 공백(\s+) 제거 후 100% 일치 비교 (대소문자 무관)
  for (let i = 0; i < candidates.length; i++) {
    const cleanCand = String(candidates[i]).replace(/\s+/g, '').toLowerCase();
    if (!cleanCand) continue;
    for (let j = 0; j < keys.length; j++) {
      const cleanK = String(keys[j]).replace(/\s+/g, '').toLowerCase();
      if (cleanK === cleanCand) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && val !== '') return val;
      }
    }
  }

  // 3단계: 부분 일치 (2글자 이상)
  for (let i = 0; i < candidates.length; i++) {
    const cleanCand = String(candidates[i]).replace(/\s+/g, '').toLowerCase();
    if (!cleanCand || cleanCand.length < 2) continue;
    for (let j = 0; j < keys.length; j++) {
      const cleanK = String(keys[j]).replace(/\s+/g, '').toLowerCase();
      if (cleanK.includes(cleanCand) || cleanCand.includes(cleanK)) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && val !== '') return val;
      }
    }
  }

  return '';
}

function getMemberKey(m) {
  return String(getField(m, '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '이름', 'name') || '').trim();
}

function getMemberId(m) {
  if (!m) return '-';
  return String(getField(m, '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호') || '-').trim();
}

// 회원 전용 링크(view.html?id=...) 생성용 회원번호 (view.js·서버와 동일 규칙, 없으면 빈 문자열)
// 회원번호 열 이름 (공백·대소문자만 무시하고 열 이름이 정확히 같을 때만 인정 - 서버 MEMBER_NO_HEADERS와 동일)
const MEMBER_NO_HEADERS = ['회원번호', '회원ID', 'memberId', '고유번호'];

function getMemberNo(m) {
  if (!m || typeof m !== 'object') return '';
  const keys = Object.keys(m);
  for (const header of MEMBER_NO_HEADERS) {
    const wanted = header.replace(/[\s\r\n]+/g, '').toLowerCase();
    const key = keys.find(k => String(k).replace(/[\s\r\n]+/g, '').toLowerCase() === wanted);
    const val = key !== undefined ? String(m[key] === null || m[key] === undefined ? '' : m[key]).trim() : '';
    if (val) return val;
  }
  return '';
}

function getMemberName(m) {
  return String(getField(m, '이름', 'name', '성명', '회원명', '참여자이름', '참여자 이름') || '무명').trim();
}

function isMemberActive(m) {
  const s = String(getField(m, '상태', '회원상태', '회원 상태', 'status') || '유효').trim();
  return s === '유효' || s.toLowerCase() === 'active';
}

function getMemberTag(m) {
  return String(getField(m, '태그', 'tag', 'tags', '분류', '코스', '프로그램', '프로그램명') || '4주-체중감량반').trim();
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

let loadingOverlayTimeoutTimer = null;
let loadingOverlayIntervalTimer = null;
let loadingOverlayElapsedSec = 0;
let currentTaskAbortController = null;

function showLoadingOverlay(text, timeoutMs = null) {
  // 이전 컨트롤러가 있다면 취소 후 새로 생성
  if (currentTaskAbortController) {
    try { currentTaskAbortController.abort(); } catch (e) {}
  }
  currentTaskAbortController = new AbortController();

  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingOverlayText');
  const subTextEl = document.getElementById('loadingOverlaySubText');

  if (textEl && text) textEl.textContent = text;
  if (overlay) overlay.classList.remove('d-none');

  // 이전 타이머 초기화
  if (loadingOverlayTimeoutTimer) {
    clearTimeout(loadingOverlayTimeoutTimer);
    loadingOverlayTimeoutTimer = null;
  }
  if (loadingOverlayIntervalTimer) {
    clearInterval(loadingOverlayIntervalTimer);
    loadingOverlayIntervalTimer = null;
  }

  loadingOverlayElapsedSec = 0;
  if (subTextEl) {
    subTextEl.innerHTML = `처리 중... <strong class="text-primary">0초</strong> 경과 (응답 대기 중)`;
  }

  // 매초 경과 시간 실시간 카운팅 (1분이 지나도 화면 하단에 계속 누적 표시)
  loadingOverlayIntervalTimer = setInterval(() => {
    loadingOverlayElapsedSec++;
    if (subTextEl) {
      const min = Math.floor(loadingOverlayElapsedSec / 60);
      const sec = loadingOverlayElapsedSec % 60;
      const timeStr = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
      subTextEl.innerHTML = `처리 중... <strong class="text-primary">${timeStr}</strong> 경과 (지연 시 '요청 취소' 가능)`;
    }
  }, 1000);

  // 명시적 timeoutMs가 양수 숫자로 지정된 경우에만 타이머 작동 (기본값 null: 1분 이상 지속 표시)
  if (timeoutMs && typeof timeoutMs === 'number' && timeoutMs > 0) {
    loadingOverlayTimeoutTimer = setTimeout(() => {
      cancelCurrentTask();
      showToast(`⚠️ 요청 시간이 초과되었습니다 (${Math.round(timeoutMs / 1000)}초). 네트워크 상태나 API Key 설정을 확인해 주세요.`, 'warning', 6000);
    }, timeoutMs);
  }
}

function hideLoadingOverlay() {
  if (loadingOverlayTimeoutTimer) {
    clearTimeout(loadingOverlayTimeoutTimer);
    loadingOverlayTimeoutTimer = null;
  }
  if (loadingOverlayIntervalTimer) {
    clearInterval(loadingOverlayIntervalTimer);
    loadingOverlayIntervalTimer = null;
  }
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

function cancelCurrentTask() {
  if (currentTaskAbortController) {
    try {
      currentTaskAbortController.abort();
    } catch (e) {
      console.warn('[작업 취소 예외]', e);
    }
    currentTaskAbortController = null;
  }
  hideLoadingOverlay();
  showToast('요청이 취소되었습니다.', 'info', 3000);
}

function showToast(msg, type = 'info') {
  let toastEl = document.getElementById('appGlobalToast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'appGlobalToast';
    toastEl.className = 'toast align-items-center border-0 position-fixed bottom-0 end-0 m-3 shadow-lg text-white';
    toastEl.style.zIndex = '10500';
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center" id="appGlobalToastBody"></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    document.body.appendChild(toastEl);
  }

  const bgClasses = {
    info: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning text-dark',
    danger: 'bg-danger'
  };

  // 노란 경고 토스트는 흰 글씨가 잘 안 보이므로 어두운 글씨 사용
  const textClass = type === 'warning' ? '' : 'text-white';
  toastEl.className = `toast align-items-center border-0 position-fixed bottom-0 end-0 m-3 shadow-lg ${textClass} ${bgClasses[type] || 'bg-primary'}`;
  const closeBtn = toastEl.querySelector('.btn-close');
  if (closeBtn) closeBtn.classList.toggle('btn-close-white', type !== 'warning');
  const body = document.getElementById('appGlobalToastBody');
  if (body) body.innerHTML = `<i class="bi bi-info-circle-fill me-2 fs-5"></i> ${escapeHtml(msg)}`;

  if (window.bootstrap) {
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
  }
}

/**
 * [다시 시도] 버튼이 있는 실패 안내 토스트 (서버 응답 지연·AI 생성 실패 공통)
 */
function showRetryToast(msg, onRetry) {
  showToast(msg, 'warning');
  const toastEl = document.getElementById('appGlobalToast');
  const body = document.getElementById('appGlobalToastBody');
  if (!toastEl || !body || typeof onRetry !== 'function') return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-dark ms-3 flex-shrink-0';
  btn.textContent = '다시 시도';
  btn.addEventListener('click', () => {
    if (window.bootstrap) bootstrap.Toast.getOrCreateInstance(toastEl).hide();
    onRetry();
  });
  body.appendChild(btn);
  if (window.bootstrap) {
    // 버튼을 누를 시간이 있도록 기본보다 길게 표시
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    toast._config.delay = 12000;
    toast.show();
  }
}

/**
 * AI 생성 실패 공통 표시: 입력칸은 그대로 두고 실패 사유 + [다시 시도]
 */
function showAiFailure(res, label, onRetry) {
  if (res && res.code === 'network') return; // postToGasBackend에서 이미 안내함
  const reason = (res && res.message) ? res.message : `${label} 생성에 실패했습니다.`;
  if (res && res.debug) console.warn(`[${label} AI 실패 디버그]`, res.debug);
  if (res && res.code === 'preview_mode') {
    showToast(reason, 'warning');
    return;
  }
  showRetryToast(`⚠️ ${reason}`, onRetry);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * [코치 대시보드] 선택된 회원의 전용 마이페이지 링크 복사 (스마트폰 직결용)
 * - gas 파라미터를 자동으로 포함하여 회원이 모바일 브라우저로 열었을 때 설정 없이 즉시 시트 데이터 로드
 */
function copyMemberViewLink() {
  const mem = AppState.selectedMember;
  if (!mem) {
    showToast('선택된 회원이 없습니다. 좌측 목록에서 회원을 먼저 선택해 주세요.', 'warning');
    return;
  }
  // [회원 식별 원칙] 회원 페이지는 회원번호 정확 일치로만 열리므로 이름 링크는 만들지 않음
  const memberId = getMemberNo(mem);
  if (!memberId) {
    showToast('이 회원은 회원번호가 비어 있어 전용 링크를 만들 수 없습니다. Members 시트에 회원번호를 먼저 입력해 주세요.', 'warning');
    return;
  }
  const gasUrl = (AppState.gasUrl || localStorage.getItem(STORAGE_GAS_URL_KEY) || DEFAULT_GAS_API_URL || '').trim();

  let currentPath = window.location.pathname;
  if (currentPath.endsWith('index.html')) {
    currentPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  } else if (!currentPath.endsWith('/')) {
    currentPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  }
  const baseUrl = `${window.location.origin}${currentPath}view.html`;
  let fullUrl = `${baseUrl}?id=${encodeURIComponent(memberId)}`;
  if (gasUrl) {
    fullUrl += `&gas=${encodeURIComponent(gasUrl)}`;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast(`🔗 [${getMemberName(mem)}] 회원의 마이페이지 전용 링크가 복사되었습니다!\n회원님께 카카오톡/문자로 전달해 주세요.`, 'success', 5000);
    }).catch(() => {
      prompt('아래 회원 전용 링크를 복사하여 회원님께 전달해 주세요:', fullUrl);
    });
  } else {
    prompt('아래 회원 전용 링크를 복사하여 회원님께 전달해 주세요:', fullUrl);
  }
}
window.copyMemberViewLink = copyMemberViewLink;
