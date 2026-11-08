/**
 * ==============================================================================
 * [4주 온라인 습관화 코칭 - 회원 전용 마이페이지 view.js v3.0.0]
 * ==============================================================================
 * 1. URL 쿼리 파라미터(?id=회원번호) 기반 전용 회원 식별
 * 2. 휴대폰 번호 뒷 4자리 본인 인증 모달 및 로컬 저장
 * 3. 운동 루틴 & 식단 플랜: 표가 아닌 한눈에 쏙 들어오는 프리미엄 서식 박스로 표기 (수정 지침 100% 비공개)
 * 4. 공복 체중: 달력에서 날짜별 입력·수정·삭제 (WeightLog 시트), 체중 그래프·기록 목록
 * ==============================================================================
 */

// 로컬 스토리지 키 (코치 대시보드와 연동)
const STORAGE_GAS_URL_KEY = 'coach_dash_gas_api_url_v2';

// 기본 구글 Apps Script 웹앱 연동 URL (회원이 별도 파라미터나 설정 없이도 전용 링크로 즉시 직결되는 기본 백엔드 주소)
const DEFAULT_GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzkKdXbM2KNOC2PvBcOtzxR13wt5Em_JUQdvotr22wdb2hxwYTc2eGZmzSHUArqGSNYWQ/exec';

// 오프라인/테스트용 기본 Mock DB (app.js의 MOCK_DB와 완전 동기화)
const VIEW_MOCK_DB = {
  members: [
    {
      '회원번호': 'M001',
      '이름': '김민수',
      '상태': '유효',
      '태그': '4주-체중감량반',
      '연락처': '010-1234-5678',
      '전화번호': '010-1234-5678',
      '나이': 31,
      '성별': '남성',
      '키': 178,
      '체중': 82.5,
      '시작 체중': 82.5,
      '직업/근무시간': 'IT 개발자 (09:00~19:00, 좌식근무)',
      '운동 경력': '헬스 3개월 미만',
      '주당 운동 횟수': '주 1회',
      '참여목적': '4주 체중 -3kg 감량 (82.5kg → 79.5kg) 및 저녁 야식 습관 개선',
      '현재 제안 운동 루틴': `[루틴 소개]
좌식 근무와 허리 부담을 고려해 맨몸·머신 위주로 주 3회 구성했습니다.

[루틴]
| DAY1 [가슴, 삼두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 동적 스트레칭 | 10분 | 1세트 | - | |
| 벤치프레스 | 12회 | 3세트 | 60초 | |
| 인클라인 덤벨프레스 | 12회 | 3세트 | 60초 | |
| 트레드밀 경사도 걷기 | 30분 | 1세트 | - | |

DAY2 (휴식) - 가벼운 스트레칭 및 회복 휴식

| DAY3 [등, 이두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 랫풀다운 | 12회 | 3세트 | 60초 | |
| 바벨 로우 | 8~12회 | 3세트 | 60초 | |
| 플랭크 | 30초 | 3세트 | 45초 | |`,
      '현재 제안 식단': `[김민수 회원 맞춤 식단]
- 아침: 그릭요거트 100g + 사과 반 쪽 + 삶은 달걀 1개
- 점심 (구내식당): 밥 2/3 공기 + 국물 제외 건더기 위주 + 단백질 반찬 2배
- 간식: 견과류 1봉 또는 아몬드브리즈 언스위트
- 저녁: 닭가슴살 샐러드 (발사믹 드레싱) + 삶은 고구마 100g
- 수분: 하루 2L 이상 (텀블러 4회 나누어 마시기)`
    },
    {
      '회원번호': 'M002',
      '이름': '이지원',
      '상태': '유효',
      '태그': '4주-식단집중반',
      '연락처': '010-9876-4321',
      '전화번호': '010-9876-4321',
      '나이': 28,
      '성별': '여성',
      '키': 164,
      '체중': 58.2,
      '시작 체중': 58.2,
      '직업/근무시간': '브랜드 마케터 (외근 잦음)',
      '운동 경력': '필라테스 1년',
      '주당 운동 횟수': '주 2회',
      '참여목적': '군살 정리, 클린 식단 정착 및 퇴근 후 디저트 폭식 방지',
      '현재 제안 운동 루틴': `[이지원 회원 주간 운동 플랜]
- 화/목/토: 매트 필라테스 코어 강화 30분 + 인터벌 실내 사이클 20분
- 월/수/금: 퇴근 후 하체 림프 순환 스트레칭 & 족욕 15분`,
      '현재 제안 식단': `[이지원 회원 식단]
- 아침: 무가당 두유 1팩 + 사과 1개 + 삶은 계란 1개
- 점심: 현미 연어 포케볼 (드레싱은 절반만)
- 간식: 방울토마토 10알
- 저녁: 단호박 에그슬럿 + 오이 1개
- 수분: 미온수 하루 1.8L 이상`
    },
    {
      '회원번호': 'M003',
      '이름': '박준혁',
      '상태': '휴면',
      '태그': '4주-직장인루틴반',
      '연락처': '010-5555-9999',
      '전화번호': '010-5555-9999',
      '나이': 35,
      '성별': '남성',
      '키': 172,
      '체중': 75.0,
      '시작 체중': 75.0,
      '직업/근무시간': '해외영업팀 과장 (회식 잦음)',
      '운동 경력': '웨이트 2년차',
      '주당 운동 횟수': '주 3회',
      '참여목적': '복부 내장지방 감량 및 주 1회 이하 음주 절제',
      '현재 제안 운동 루틴': '상담 후 맞춤 루틴 등록 예정',
      '현재 제안 식단': '상담 후 맞춤 식단 등록 예정'
    }
  ],
  // M001 회원의 WeightLog 기록 (서버는 본인 회원번호 행의 날짜·체중만 보냄)
  weights: [
    { '날짜': '2026-10-08', '체중': 82.5 },
    { '날짜': '2026-10-09', '체중': 82.1 },
    { '날짜': '2026-10-10', '체중': 81.9 },
    { '날짜': '2026-10-11', '체중': 81.6 },
    { '날짜': '2026-10-12', '체중': 81.4 },
    { '날짜': '2026-10-13', '체중': 81.5 },
    { '날짜': '2026-10-15', '체중': 81.1 }
  ],
  // M001 회원의 CoachLog 중 회원 공개 칸 (서버는 본인 회원번호 행의 날짜·코치 한마디만 보냄)
  coachNotes: [
    { '날짜': '2026-10-15', '코치 한마디': '어제 식단 완벽했어요 👍 오늘도 물 2L 챙겨 주세요.' },
    { '날짜': '2026-10-12', '코치 한마디': '야근하셨는데도 운동 챙기신 거 멋져요! 무릎은 하루 쉬어 주세요.' },
    { '날짜': '2026-10-09', '코치 한마디': '첫 주 잘 시작하셨어요. 체중은 매일 아침 같은 시간에 재 주세요.' }
  ],
  // M001 회원의 WeightLog 일일 기록 (체중·운동·식단, 서버는 본인 회원번호 행만 보냄)
  dailyLogs: [
    { '날짜': '2026-10-12', '체중': 81.4, '운동': [], '식단': [], '휴식': '계획된 휴식' },
    { '날짜': '2026-10-14', '체중': '', '운동': [{ '종목': '트레드밀 경사도 걷기', '횟수': '30분', '세트': 1, '무게': '', '비고': '' }], '식단': [] },
    { '날짜': '2026-10-15', '체중': 81.1,
      '운동': [{ '종목': '벤치프레스', '횟수': '12', '세트': 3, '무게': 40, '비고': '' }, { '종목': '랫풀다운', '횟수': '12', '세트': 3, '무게': 35, '비고': '마지막 세트 힘듦' }],
      '식단': [{ '항목': '아침', '음식': '사과 1/2개', '비고': '' }, { '항목': '아침', '음식': '삶은 달걀 2개', '비고': '' }, { '항목': '점심', '음식': '현미밥 2/3공기 + 닭가슴살', '비고': '회사 근처' }] }
  ],
  // ExerciseList '등록' 상태만 (자동완성용)
  exerciseList: [
    { '운동명': '벤치프레스', '부위': '가슴' }, { '운동명': '인클라인 벤치프레스', '부위': '가슴' }, { '운동명': '덤벨 벤치프레스', '부위': '가슴' },
    { '운동명': '랫풀다운', '부위': '등' }, { '운동명': '바벨 로우', '부위': '등' }, { '운동명': '바벨 스쿼트', '부위': '하체' },
    { '운동명': '레그 프레스', '부위': '하체' }, { '운동명': '플랭크', '부위': '코어' }, { '운동명': '트레드밀 경사도 걷기', '부위': '유산소' },
    { '운동명': '사이드 레터럴 레이즈', '부위': '어깨' }
  ]
};

// 현재 회원 상태
let CurrentMemberState = {
  member: null,
  weights: [], // [{ 날짜, 체중 }] 본인 공복 체중 기록 (WeightLog)
  coachNotes: [], // [{ 날짜, 코치 한마디 }] 코치가 남긴 한마디 (CoachLog의 회원 공개 칸만, 최신순)
  dailyLogs: [], // [{ 날짜, 체중, 운동: [], 식단: [], 휴식 }] 본인 일일 기록 (WeightLog, 체중 빈 날 포함)
  exerciseList: [], // [{ 운동명, 부위 }] 자동완성용 운동 목록 (ExerciseList '등록'만)
  isUsingMock: false,
  targetId: '', // URL 회원 식별값 (서버 인증 요청용)
  gasUrl: '',
  charts: {
    weight: null
  }
};

/**
 * [초정밀 모바일 & 크로스플랫폼 URL 회원 식별자 추출기]
 * 1. 대소문자 완전 무시 (?id, ?ID, ?Id, ?memberId, ?member_id, ?no, ?name, ?user)
 * 2. 해시태그 (#id=..., #M001, #김민수) 및 쿼리 단독값 (?M001, ?김민수) 완벽 감지
 * 3. 메신저(카카오톡, 문자 등) 복사 과정에서 끝에 붙은 슬래시, 해시, 따옴표 자동 정제
 * 4. 이중 URL 디코딩 안전 방어
 */
function extractMemberIdSmartly() {
  const href = window.location.href;
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  const TARGET_KEYS = ['id', 'memberid', 'member_id', 'member', 'user', 'name', 'no', 'num', 'code'];

  // 1. URLSearchParams 전체 키 대소문자 무시 검색 (표준 ?id=...)
  if (search) {
    try {
      const urlParams = new URLSearchParams(search);
      for (const [key, val] of urlParams.entries()) {
        const cleanKey = key.trim().toLowerCase();
        if (TARGET_KEYS.includes(cleanKey)) {
          const cleanVal = cleanParamVal(val);
          if (cleanVal) return cleanVal;
        }
      }
    } catch (e) {}
  }

  // 2. 해시(#) 내 파라미터 검사 (#id=... 또는 #M001)
  if (hash) {
    const rawHash = hash.replace(/^#\/?/, '').trim();
    if (rawHash.includes('=')) {
      try {
        const hashParams = new URLSearchParams(rawHash);
        for (const [key, val] of hashParams.entries()) {
          const cleanKey = key.trim().toLowerCase();
          if (TARGET_KEYS.includes(cleanKey)) {
            const cleanVal = cleanParamVal(val);
            if (cleanVal) return cleanVal;
          }
        }
      } catch (e) {}
    } else if (rawHash && !rawHash.includes('&') && !rawHash.includes('/')) {
      const cleanVal = cleanParamVal(rawHash);
      if (cleanVal) return cleanVal;
    }
  }

  // 3. 정규식 전체 URL 스캔 (인앱 브라우저 트래킹 파라미터 방어)
  const regex = /[?&#](?:id|memberid|member_id|member|user|name|no)=([^&#\s\/\?]+)/i;
  const match = href.match(regex);
  if (match && match[1]) {
    const cleanVal = cleanParamVal(match[1]);
    if (cleanVal) return cleanVal;
  }

  // 4. 쿼리스트링에 키 없이 값만 들어온 경우 (예: ?M001 또는 ?김민수)
  if (search && search.length > 1) {
    const rawQuery = search.substring(1).trim();
    if (!rawQuery.includes('=') && !rawQuery.includes('&')) {
      const cleanVal = cleanParamVal(rawQuery);
      if (cleanVal) return cleanVal;
    }
  }

  return '';
}

function cleanParamVal(val) {
  if (!val) return '';
  let str = String(val).trim();
  // 끝에 붙은 특수기호(#, /, ?, &, ", ') 제거
  str = str.replace(/[\/#'"?&]+$/, '').trim();
  try {
    str = decodeURIComponent(str);
  } catch (e) {}
  str = str.replace(/[\/#'"?&]+$/, '').trim();
  return str;
}

/**
 * 초기화 진입점
 */
document.addEventListener('DOMContentLoaded', async () => {
  const targetId = extractMemberIdSmartly();

  // 1. 회원 ID가 URL에 없는 경우
  if (!targetId) {
    showInvalidAccessScreen(`
      <strong>URL에 회원 식별 정보가 없습니다.</strong><br>
      주소 끝에 <code>?id=회원번호</code>(예: <code>?id=M001</code>)를 포함하여 접속해 주세요.
    `);
    return;
  }

  // 2. 데이터 로드 (GAS 백엔드 또는 Mock)
  await loadMemberPageData(targetId);
});

/**
 * 올바르지 않은 접근 또는 통신 지연 화면 표시 (원인별 지능형 힌트 및 제목 제공)
 */
function showInvalidAccessScreen(reasonHint = '', customTitle = '', customDesc = '') {
  document.getElementById('pageLoadingScreen')?.classList.add('d-none');
  const invalidScreen = document.getElementById('invalidAccessScreen');
  if (invalidScreen) {
    invalidScreen.classList.remove('d-none');
  }
  document.getElementById('memberPageContent')?.classList.add('d-none');

  const titleEl = document.getElementById('invalidAccessTitle');
  if (titleEl) {
    titleEl.textContent = customTitle || '올바르지 않은 접근입니다';
  }

  const descEl = document.getElementById('invalidAccessMainDesc');
  if (descEl && customDesc) {
    descEl.innerHTML = customDesc;
  }

  const reasonEl = document.getElementById('invalidAccessReasonHint');
  if (reasonEl) {
    if (reasonHint) {
      reasonEl.innerHTML = reasonHint;
      reasonEl.classList.remove('d-none');
    } else {
      reasonEl.classList.add('d-none');
    }
  }
}

// 회원 본인 데이터 전용 캐시 & 서버 발급 회원 인증 토큰 (URL 회원 식별값 기준 저장)
const MEMBER_VIEW_CACHE_PREFIX = 'coach_dash_view_member_v7_';
const MEMBER_VIEW_TOKEN_PREFIX = 'member_view_token_';

function storageGet(key) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || '';
  } catch (e) {
    return '';
  }
}

function storageSet(key, val) {
  try { localStorage.setItem(key, val); } catch (e) {}
  try { sessionStorage.setItem(key, val); } catch (e) {}
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
  try { sessionStorage.removeItem(key); } catch (e) {}
}

/**
 * 구버전 전체 회원 캐시 및 브라우저 전용 인증 플래그(member_auth_*) 정리
 */
function purgeLegacyMemberViewStorage() {
  storageRemove('coach_dash_view_cache_v3');
  [window.localStorage, window.sessionStorage].forEach(store => {
    try {
      Object.keys(store).forEach(k => {
        if (k.indexOf('member_auth_') === 0 || k.indexOf('coach_dash_view_member_v4_') === 0 || k.indexOf('coach_dash_view_member_v5_') === 0 || k.indexOf('coach_dash_view_member_v6_') === 0) store.removeItem(k);
      });
    } catch (e) {}
  });
}

function saveMemberSession(targetId, memberToken, data) {
  if (memberToken) storageSet(MEMBER_VIEW_TOKEN_PREFIX + targetId, memberToken);
  storageSet(MEMBER_VIEW_CACHE_PREFIX + targetId, JSON.stringify({
    member: data.member,
    weights: data.weights,
    coachNotes: data.coachNotes !== undefined ? data.coachNotes : CurrentMemberState.coachNotes,
    dailyLogs: data.dailyLogs !== undefined ? data.dailyLogs : CurrentMemberState.dailyLogs,
    exerciseList: data.exerciseList !== undefined ? data.exerciseList : CurrentMemberState.exerciseList,
    regenRemaining: data.regenRemaining,
    timestamp: Date.now()
  }));
}

function clearMemberSession(targetId) {
  storageRemove(MEMBER_VIEW_TOKEN_PREFIX + targetId);
  storageRemove(MEMBER_VIEW_CACHE_PREFIX + targetId);
}

/**
 * 구글 Apps Script(GAS) 회원 전용 API(getMemberView) 호출 (지능형 2회 재시도 & 넉넉한 콜드스타트 대기)
 * - 서버에서 휴대폰 뒷 4자리/회원 토큰을 검증하고 본인 데이터만 반환
 * 1차: 38초 (구글 클라우드 컨테이너 콜드스타트 및 302 리다이렉트 대기)
 * 2차: 20초 (1차 실패 시 1.2초 대기 후 활성화된 컨테이너로 초고속 재시도)
 * - 네트워크 실패 시에만 재시도하며, 서버가 응답한 오류(인증 필요 등)는 그대로 반환
 */
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

async function fetchMemberViewWithRetry(apiUrl, body) {
  if (!apiUrl) return null;

  // [읽기 요청(토큰 재방문/회원 확인)] 병렬 재요청(헤징)으로 콜드스타트·구글 일시 오류 대기 최소화
  // ※ PIN 제출은 오류 횟수가 중복 집계되지 않도록 아래 순차 재시도 사용
  if (!body.pin) {
    try {
      return await fetchJsonHedged(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      }, { isTransient: json => !json || !json.status || json.code === 'unauthorized' });
    } catch (err) {
      console.warn('[회원 뷰어] GAS 조회 실패:', err.message || err);
      return null;
    }
  }
  const attempts = [
    { timeoutMs: 38000, delayMs: 0 },
    { timeoutMs: 20000, delayMs: 1200 },
    { timeoutMs: 20000, delayMs: 800 }
  ];

  for (let i = 0; i < attempts.length; i++) {
    const { timeoutMs, delayMs } = attempts[i];
    if (delayMs > 0) {
      console.log(`[회원 뷰어] ⏳ 구글 서버 콜드스타트 대기 후 ${delayMs}ms 뒤 ${i + 1}차 재시도...`);
      await new Promise(res => setTimeout(res, delayMs));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const json = await res.json();
      // [구글 리다이렉트 오류 방어] getMemberView는 'unauthorized'를 반환하지 않음
      // -> 이 응답은 POST가 리다이렉트 중 GET으로 바뀌어 doPost가 실행되지 않은 경우이므로 재시도
      if (json && json.code === 'unauthorized') {
        console.warn(`[회원 뷰어] GAS 리다이렉트 오류 감지 (${i + 1}차) -> 재시도`);
        continue;
      }
      if (json && json.status) return json;
    } catch (err) {
      console.warn(`[회원 뷰어] GAS 통신 ${i + 1}차 시도 실패:`, err.message || err);
    }
  }
  return null;
}

/**
 * 회원 데이터 로드 (본인 캐시 우선 렌더링 + 서버 인증 기반 최신 동기화)
 */
async function loadMemberPageData(targetId) {
  const loadingScreen = document.getElementById('pageLoadingScreen');

  const urlParams = new URLSearchParams(window.location.search);
  const urlGas = (urlParams.get('gas') || urlParams.get('apiUrl') || urlParams.get('gasUrl') || '').trim();
  const storageGas = (localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
  const gasUrl = urlGas || storageGas || DEFAULT_GAS_API_URL;

  // 유효한 GAS URL은 로컬 스토리지에 자동 보관하여 이후 브라우저 재방문 시에도 즉시 활용
  if (gasUrl && storageGas !== gasUrl) {
    try {
      localStorage.setItem(STORAGE_GAS_URL_KEY, gasUrl);
    } catch (e) {}
  }

  CurrentMemberState.targetId = targetId;
  CurrentMemberState.gasUrl = gasUrl;
  purgeLegacyMemberViewStorage();

  // [미리보기 전용] 시트 연동 URL이 없을 때만 샘플 데이터로 화면 미리보기 (인증·저장 없음)
  if (!gasUrl) {
    if (loadingScreen) loadingScreen.classList.add('d-none');
    const previewMember = findMemberInList(VIEW_MOCK_DB.members, targetId);
    if (previewMember) {
      applyMemberData(previewMember, VIEW_MOCK_DB.weights, true, { coachNotes: VIEW_MOCK_DB.coachNotes, dailyLogs: VIEW_MOCK_DB.dailyLogs, exerciseList: VIEW_MOCK_DB.exerciseList });
      unlockAndRenderMemberPage();
    } else {
      showInvalidAccessScreen('', '미리보기 회원 없음', '구글 시트 연동 URL이 설정되지 않았습니다. 담당 코치님께 받은 링크로 다시 접속해 주세요.');
    }
    return;
  }

  // -------------------------------------------------------------------------
  // [1단계: 인증된 본인 캐시가 있으면 즉시 렌더링]
  // -------------------------------------------------------------------------
  const savedToken = storageGet(MEMBER_VIEW_TOKEN_PREFIX + targetId);
  let hasRenderedFromCache = false;
  if (savedToken) {
    try {
      const rawCache = storageGet(MEMBER_VIEW_CACHE_PREFIX + targetId);
      const cached = rawCache ? JSON.parse(rawCache) : null;
      if (cached && cached.member) {
        console.log(`[회원 뷰어] ⚡ 캐시 데이터로 즉시 렌더링: ${getMemberName(cached.member)}`);
        applyMemberData(cached.member, cached.weights || [], false, { regenRemaining: cached.regenRemaining, coachNotes: cached.coachNotes, dailyLogs: cached.dailyLogs, exerciseList: cached.exerciseList });

        const statusBadge = document.getElementById('dataConnectionStatusBadge');
        if (statusBadge) {
          statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle';
          statusBadge.textContent = '🟢 저장된 데이터 표시 중 (최신 동기화 확인 중...)';
          statusBadge.title = '이전에 정상 동기화된 회원 데이터가 즉시 표시되었습니다. 구글 서버와 최신 내용을 확인하는 중입니다.';
        }

        if (loadingScreen) loadingScreen.classList.add('d-none');
        unlockAndRenderMemberPage();
        hasRenderedFromCache = true;
      }
    } catch (e) {
      console.warn('[회원 뷰어] 캐시 복원 예외 무시:', e);
    }
  }

  // -------------------------------------------------------------------------
  // [2단계: 서버 인증 기반 최신 데이터 동기화 (38s + 20s 자동 재시도)]
  // -------------------------------------------------------------------------
  const res = await fetchMemberViewWithRetry(gasUrl, {
    action: 'getMemberView',
    id: targetId,
    memberToken: savedToken || undefined
  });

  if (loadingScreen) loadingScreen.classList.add('d-none');

  if (res && res.status === 'success' && res.data) {
    // [성공] 저장된 회원 토큰이 유효 -> 최신 데이터로 갱신
    saveMemberSession(targetId, res.memberToken, res.data);
    applyMemberData(res.data.member, res.data.weights || [], false, { regenRemaining: res.data.regenRemaining, coachNotes: res.data.coachNotes, dailyLogs: res.data.dailyLogs, exerciseList: res.data.exerciseList });
    unlockAndRenderMemberPage();
    console.log(`[회원 뷰어] 최신 시트 데이터 동기화 완료: ${getMemberName(res.data.member)} (ID: ${targetId})`);
    return;
  }

  if (res && res.code === 'not_found') {
    clearMemberSession(targetId);
    console.warn(`[회원 뷰어] 시트 내 회원 매칭 실패: ${targetId}`);
    showInvalidAccessScreen(`
      <div><strong>입력된 회원 식별값:</strong> <code>${escapeHtml(targetId)}</code></div>
      <div class="text-secondary small mt-1">
        등록된 회원 정보와 일치하지 않습니다. 담당 코치님께 받은 회원 전용 링크(회원번호)로 다시 접속해 주세요.
      </div>
    `);
    return;
  }

  if (res && res.code) {
    // [인증 필요] 토큰 없음/만료/휴대폰 번호 변경 등 -> 본인 인증 모달 표시
    clearMemberSession(targetId);
    if (hasRenderedFromCache) {
      document.getElementById('memberPageContent')?.classList.add('d-none');
    }
    CurrentMemberState.isUsingMock = false;
    showMemberAuthModal();
    return;
  }

  // [실패 / 지연 발생 시 방어 로직]
  if (hasRenderedFromCache) {
    // ★ [핵심 방어] 이미 캐시된 본인 데이터로 화면을 보고 있는 중이라면 기존 화면 유지
    console.log('[회원 뷰어] 🛡️ 통신 지연에도 불구하고 기존 캐시된 실제 회원 화면을 안전하게 보존합니다.');
    const statusBadge = document.getElementById('dataConnectionStatusBadge');
    if (statusBadge) {
      statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle';
      statusBadge.textContent = '🟢 저장된 데이터 표시 중 (실시간 재동기화 대기)';
      statusBadge.title = '구글 서버 응답이 지연되어 최근 저장된 정상 데이터를 안전하게 표시하고 있습니다. 화면은 계속 정상 이용하실 수 있습니다.';
    }
    return;
  }

  // [실패는 실패로] 캐시가 없는 첫 접속에서 서버가 지연되면 샘플(Mock) 화면 대신 재시도 안내
  showInvalidAccessScreen(`
    <div class="alert alert-warning border text-start mb-3">
      <div class="fw-bold mb-1"><i class="bi bi-clock-history me-1"></i>구글 시트 서버 응답 지연</div>
      <div class="small">
        회원님의 코칭 데이터를 구글 시트에서 불러오는 도중 통신 지연이 발생했습니다.<br>
        잠시 후 아래 <strong>[🔄 다시 시도]</strong> 버튼을 눌러주시면 즉시 정상 연결됩니다.
      </div>
    </div>
    <div class="text-muted small mb-2">
      확인 대상 회원 식별값: <code>${escapeHtml(targetId)}</code>
    </div>
  `, '구글 시트 서버 응답 지연', `
    코치님께서 회원님의 데이터를 정상 등록하셨으나, 구글 서버의 응답이 일시적으로 지연되고 있습니다.<br>
    <span class="small text-secondary">아래 [다시 시도]를 누르시거나 잠시 후 다시 접속해 주세요.</span>
  `);
}

/**
 * 회원 목록에서 targetId와 일치하는 회원 검색
 * - [회원 식별 원칙] '회원번호' 열 값과 정확히 일치하는 회원만 인정 (서버 memberViewFindMember와 동일 규칙)
 * - 아무 칸 일치·숫자만 일치·행 순번·이름·휴대폰 매칭 금지, 같은 회원번호가 2명 이상이면 매칭하지 않음
 */
function findMemberInList(members, targetId) {
  if (!members || !Array.isArray(members) || members.length === 0) return null;
  const target = String(targetId || '').trim();
  if (!target) return null;
  const matches = members.filter(m => getMemberNo(m) === target);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * 상태에 회원 및 공복 체중 기록 바인딩
 * - 체중 기록은 서버가 본인 회원번호 행만 보냄 (미리보기 Mock은 회원 1명분)
 */
function applyMemberData(member, weights, isMock, serverInfo) {
  CurrentMemberState.member = member;
  CurrentMemberState.weights = Array.isArray(weights) ? weights : [];
  CurrentMemberState.regenRemaining = (serverInfo && serverInfo.regenRemaining) || null;
  CurrentMemberState.coachNotes = (serverInfo && Array.isArray(serverInfo.coachNotes)) ? serverInfo.coachNotes : [];
  CurrentMemberState.dailyLogs = (serverInfo && Array.isArray(serverInfo.dailyLogs)) ? serverInfo.dailyLogs : [];
  CurrentMemberState.exerciseList = (serverInfo && Array.isArray(serverInfo.exerciseList)) ? serverInfo.exerciseList : [];
  CurrentMemberState.isUsingMock = isMock;

  // 하단 연동 상태 뱃지 업데이트
  const statusBadge = document.getElementById('dataConnectionStatusBadge');
  if (statusBadge) {
    if (isMock) {
      statusBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      statusBadge.textContent = '🟡 오프라인 Mock 모드';
      statusBadge.title = '구글 시트 연동 URL이 설정되지 않아 샘플 데이터가 표시 중입니다. [연동설정]을 눌러 실제 시트 URL을 입력해 주세요.';
    } else {
      statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle';
      statusBadge.textContent = `🟢 실시간 연결됨 (체중 기록 ${CurrentMemberState.weights.length}건)`;
      statusBadge.title = '구글 스프레드시트와 정상 연결되었습니다.';
    }
  }
}

/**
 * 휴대폰 뒷 4자리 본인 인증 모달 표시
 */
function showMemberAuthModal() {
  const modalEl = document.getElementById('memberAuthModal');
  if (modalEl && window.bootstrap) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false });
    modal.show();

    setTimeout(() => {
      document.getElementById('memberPinInput')?.focus();
    }, 400);
  }
}

/**
 * 회원 로그인 검증 실행
 * - 휴대폰 뒷 4자리는 GAS 서버에서만 검증 (브라우저에서 비교하지 않음)
 */
async function handleMemberAuthLogin() {
  const inputEl = document.getElementById('memberPinInput');
  const errorEl = document.getElementById('memberAuthErrorMsg');
  const btnEl = document.getElementById('btnMemberAuthSubmit');
  const enteredPin = String(inputEl ? inputEl.value : '').replace(/[^0-9]/g, '').trim();

  if (enteredPin.length < 4) {
    if (errorEl) errorEl.textContent = '휴대폰 번호 뒤 4자리를 모두 입력해 주세요.';
    inputEl?.focus();
    return;
  }

  const failAuth = (message) => {
    if (inputEl) {
      inputEl.value = '';
      inputEl.classList.add('shake-effect');
      setTimeout(() => inputEl.classList.remove('shake-effect'), 500);
    }
    if (errorEl) errorEl.textContent = message;
    inputEl?.focus();
  };

  const closeModalAndRender = () => {
    if (errorEl) errorEl.textContent = '';
    const modalEl = document.getElementById('memberAuthModal');
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    unlockAndRenderMemberPage();
  };

  // 서버 검증
  const btnOriginalHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>확인 중...';
  }

  let res = null;
  try {
    res = await fetchMemberViewWithRetry(CurrentMemberState.gasUrl, {
      action: 'getMemberView',
      id: CurrentMemberState.targetId,
      pin: enteredPin
    });
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = btnOriginalHtml;
    }
  }

  if (res && res.status === 'success' && res.data) {
    saveMemberSession(CurrentMemberState.targetId, res.memberToken, res.data);
    applyMemberData(res.data.member, res.data.weights || [], false, { regenRemaining: res.data.regenRemaining, coachNotes: res.data.coachNotes, dailyLogs: res.data.dailyLogs, exerciseList: res.data.exerciseList });
    closeModalAndRender();
    return;
  }

  if (res && res.message) {
    failAuth(res.message);
  } else {
    failAuth('구글 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
  }
}

/**
 * 인증 완료 후 마이페이지 렌더링
 */
function unlockAndRenderMemberPage() {
  document.getElementById('invalidAccessScreen')?.classList.add('d-none');
  const contentEl = document.getElementById('memberPageContent');
  if (contentEl) {
    contentEl.classList.remove('d-none');
  }

  const member = CurrentMemberState.member;

  // 1. 코치 대시보드 인적사항 완전 일치 패널 렌더링
  updatePersonalInfoPanel(member);

  // 2. 상단 네비 & 히어로 정보 및 체중 계산 바인딩
  const memberName = getMemberName(member) || '회원';
  const memberTag = getMemberTag(member);
  const memberNo = getMemberNo(member);

  document.title = `${memberName}님의 4주 코칭 마이페이지`;
  setText('navMemberNameBadge', `${memberName}님 마이페이지`);
  setText('heroMemberTag', memberTag);
  setText('heroMemberNo', memberNo ? `No. ${memberNo}` : '');
  setText('heroMemberName', memberName);

  renderHeroWeights(member);
  renderCoachNotes();

  // 3. 운동 루틴 서식 박스 렌더링 (★ 표 없이 한눈에 잘 들어오게 표기, 수정 지침 100% 제외)
  renderWorkoutRoutineBox(member);

  // 4. 식단 플랜 서식 박스 렌더링 (★ 표 없이 한눈에 잘 들어오게 표기, 수정 지침 100% 제외)
  renderDietPlanBox(member);

  // 5-1. 회원 셀프 수정 패널 (AI 재생성 / 이전 버전 되돌리기) - 서버 인증된 실제 회원에게만 표시
  renderPlanRegenPanels(member);

  // 5. 기록 탭 (날짜별 체중·운동·식단 입력) + 공복 체중 그래프 + 날짜별 체중 목록
  initRecordForm();
  setRecordDate(RecordState.date || toLocalDateKey(new Date()));
  renderWeightChart();
  renderWeightList();

  // 7. 하단 탭바 / 좌우 스와이프 전환 연결 (최초 1회)
  initMemberTabs();
}

// 홈 '코치 한마디': 최신 1개는 크게, 나머지는 펼쳐서 보기 (서버가 날짜·한마디만 보냄)
const COACH_NOTES_PREVIEW = 3;
let coachNotesExpanded = false;

function formatCoachNoteDate(dateKey) {
  const m = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return escapeHtml(dateKey);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return `${+m[2]}월 ${+m[3]}일 (${wd})`;
}

function renderCoachNotes() {
  const box = document.getElementById('coachNotesCard');
  if (!box) return;
  const notes = (CurrentMemberState.coachNotes || [])
    .filter(n => String(n['코치 한마디'] || '').trim())
    .sort((a, b) => (String(a['날짜']) < String(b['날짜']) ? 1 : -1));
  box.classList.toggle('d-none', notes.length === 0);
  if (!notes.length) return;
  const shown = coachNotesExpanded ? notes : notes.slice(0, COACH_NOTES_PREVIEW);
  const [latest, ...rest] = shown;
  box.innerHTML = `
    <div class="mp-card-head">
      <h2 class="mp-card-title"><i class="bi bi-chat-heart-fill"></i>코치 한마디</h2>
      <span class="mp-chip">${notes.length}개</span>
    </div>
    <div class="mp-coach-note is-latest">
      <div class="mp-coach-note-date">${formatCoachNoteDate(latest['날짜'])}</div>
      <div class="mp-coach-note-text">${escapeHtml(latest['코치 한마디'])}</div>
    </div>
    ${rest.map(n => `<div class="mp-coach-note">
      <div class="mp-coach-note-date">${formatCoachNoteDate(n['날짜'])}</div>
      <div class="mp-coach-note-text">${escapeHtml(n['코치 한마디'])}</div>
    </div>`).join('')}
    ${notes.length > COACH_NOTES_PREVIEW ? `<button type="button" class="mp-link-btn mp-coach-note-more" onclick="toggleCoachNotes()">${coachNotesExpanded ? '접기' : `지난 한마디 ${notes.length - COACH_NOTES_PREVIEW}개 더 보기`}</button>` : ''}`;
}

function toggleCoachNotes() {
  coachNotesExpanded = !coachNotesExpanded;
  renderCoachNotes();
}
window.toggleCoachNotes = toggleCoachNotes;

// 날짜순 본인 체중 기록 [{ date, weight }] (같은 날짜는 마지막 값)
function getSortedWeights() {
  const map = getWeightByDate();
  return Object.keys(map).sort().map(date => ({ date, weight: map[date] }));
}

// 홈 상단 시작 체중 / 최근 체중 / 변화
function renderHeroWeights(member) {
  const startWeight = parseFloat(getField(member, '시작 체중', '시작체중', '체중', 'weight') || 0);
  const records = getSortedWeights();
  const latestWeight = records.length ? records[records.length - 1].weight : startWeight;

  setText('heroStartWeight', startWeight > 0 ? startWeight.toFixed(1) : '-');
  setText('heroCurrentWeight', latestWeight > 0 ? latestWeight.toFixed(1) : '-');

  const diff = latestWeight - startWeight;
  const diffBox = document.getElementById('heroWeightDiff');
  if (diffBox && startWeight > 0) {
    if (diff < 0) {
      diffBox.textContent = `${diff.toFixed(1)} kg`;
      diffBox.className = 'mp-diff is-down';
    } else if (diff > 0) {
      diffBox.textContent = `+${diff.toFixed(1)} kg`;
      diffBox.className = 'mp-diff is-up';
    } else {
      diffBox.textContent = `유지`;
      diffBox.className = 'mp-diff';
    }
  }
}

/**
 * [코치 대시보드와 100% 동일] 인적 사항 패널 렌더링
 */
function updatePersonalInfoPanel(mem) {
  if (!mem) return;

  const memberId = getMemberNo(mem);
  const name = getMemberName(mem);
  const age = getField(mem, '나이', '연령', 'age') || '-';
  const gender = getField(mem, '성별', 'gender') || '-';
  const height = getField(mem, '키', '신장', 'height') || '-';
  const weight = getField(mem, '시작 체중', '시작체중', '체중', '공복 몸무게', '공복몸무게', '현재체중', 'weight') || '-';
  const job = getField(mem, '직업/근무시간', '직업', '근무시간', '직업및근무시간', '근무 형태', '근무형태', '직무', 'job') || '-';
  const exp = getField(mem, '운동 경력', '운동경력', '운동 경험', '운동경험', '경력', 'experience') || '-';
  const freq = getField(mem, '주당 운동 횟수', '주당운동횟수', '주당 운동횟수', '운동 횟수', '운동횟수', '주당 횟수', '주당횟수', '주당운동', 'frequency') || '-';
  const goal = getField(mem, '참여목적', '참여 목적', '프로그램 참여 목적', '목표', 'goal', '목적') || '-';
  const status = getField(mem, '상태', 'status') || '유효';
  const tag = getMemberTag(mem);

  setText('valMemberId', memberId);
  setText('valNameAgeGender', `${name} (${age}세 / ${gender})`);
  setText('valHeightWeight', `${height} cm / ${weight} kg`);
  setText('valJobSchedule', `${job}`);
  setText('valExperience', `${exp}`);
  setText('valFrequency', `${freq}`);
  setText('valGoal', `${goal}`);

  const badgeMemberId = document.getElementById('badgeMemberId');
  if (badgeMemberId) {
    badgeMemberId.textContent = memberId;
  }

  const badgeStatus = document.getElementById('badgeMemberStatus');
  if (badgeStatus) {
    const isActive = (status === '유효' || status.toLowerCase() === 'active');
    badgeStatus.textContent = status;
    badgeStatus.className = `mp-chip ${isActive ? 'mp-chip-success' : 'mp-chip-muted'}`;
  }

  const badgeTag = document.getElementById('badgeMemberTag');
  if (badgeTag) {
    badgeTag.innerHTML = `<i class="bi bi-tag-fill"></i>${escapeHtml(tag)}`;
  }
}

/**
 * [1. 운동 루틴 표기: 아코디언 & Colspan=5 테이블 UI]
 * AI가 생성한 [루틴 소개] + [DAY1~DAY7 마크다운 테이블]을 스마트 파싱하여
 * 접기/펼치기 아코디언 및 colspan="5" 가로 병합 표로 렌더링
 * ★ 수정 지침 내용은 회원 화면에서 100% 절대 노출하지 않음
 */
function renderWorkoutRoutineBox(member) {
  const container = document.getElementById('workoutRoutineBox');
  if (!container) return;

  const rawRoutine = String(getField(withoutSelfEditFields(member), '현재 제안 운동 루틴', '현재제안운동루틴', '운동루틴', 'workoutRoutine') || '').trim();

  if (!rawRoutine) {
    container.classList.remove('has-accordion');
    container.innerHTML = '<div class="text-muted text-center py-4">등록된 운동 루틴이 없습니다.<br>코치님과의 상담 후 맞춤 루틴이 업데이트됩니다.</div>';
    return;
  }

  container.classList.add('has-accordion');
  container.innerHTML = parseWorkoutRoutineToAccordionHtml(rawRoutine, 'viewRoutine');
}

/**
 * 마크다운 운동 루틴 텍스트를 [루틴 소개 카드] + [DAY1~DAY7 접기/펼치기 아코디언 표]로 변환하여 렌더링
 */
function parseWorkoutRoutineToAccordionHtml(rawText, prefix = 'routine') {
  if (!rawText || !rawText.trim()) {
    return '<div class="text-muted text-center py-4">등록된 운동 루틴이 없습니다.<br>코치님과의 상담 후 맞춤 루틴이 업데이트됩니다.</div>';
  }

  // 1. 수정 지침 제거 (회원 뷰 보안 완벽 보호)
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
        <div class="mp-plain-plan" style="white-space: pre-wrap;">${escapeHtml(cleanText)}</div>
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
        <div class="mp-plain-plan mt-2" style="white-space: pre-wrap;">${escapeHtml(sanitizedRoutineBody)}</div>
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
 * [2. 식단 플랜 표기]
 * 마크다운 식단 플랜 텍스트를 [식단 소개 알림 박스] + [클린데이 & 주말/휴일 아코디언 표] + [Plan B 가이드라인 카드]로 변환하여 렌더링
 * ★ 수정 지침 내용은 회원 화면에서 100% 절대 노출하지 않음
 */
function renderDietPlanBox(member) {
  const container = document.getElementById('dietPlanBox');
  if (!container) return;

  const rawDiet = String(getField(withoutSelfEditFields(member), '현재 제안 식단', '현재제안식단', '식단', 'dietPlan') || '').trim();
  container.innerHTML = parseDietPlanToAccordionHtml(rawDiet, 'viewDiet');
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
    return '<div class="text-muted text-center py-4">등록된 맞춤 식단이 없습니다.<br>코치님과의 상담 후 맞춤 식단이 업데이트됩니다.</div>';
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
        <div class="mp-plain-plan mt-2">${formatCellContent(cleanText).replace(/\n/g, '<br>')}</div>
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
 * [3. 공복 체중 그래프] WeightLog 본인 기록 (날짜순)
 */
function renderWeightChart() {
  if (CurrentMemberState.charts.weight) {
    CurrentMemberState.charts.weight.destroy();
    CurrentMemberState.charts.weight = null;
  }
  const records = getSortedWeights();
  const emptyEl = document.getElementById('weightChartEmpty');
  if (emptyEl) emptyEl.classList.toggle('d-none', records.length > 0);
  const ctxWeight = document.getElementById('chartWeight');
  if (!ctxWeight || records.length === 0 || !window.Chart) return;

  const values = records.map(r => r.weight);
  CurrentMemberState.charts.weight = new Chart(ctxWeight, {
    type: 'line',
    data: {
      labels: records.map(r => {
        const [, mm, dd] = r.date.split('-');
        return `${+mm}/${+dd}`;
      }),
      datasets: [{
        label: '공복 몸무게',
        data: values,
        borderColor: '#3182f6',
        backgroundColor: 'rgba(49, 130, 246, 0.12)',
        borderWidth: 2.5,
        tension: 0.25,
        fill: true,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#3182f6'
      }]
    },
    options: createMemberChartOptions('kg', Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1))
  });
}

// [4. 날짜별 체중 기록 목록] 최근 날짜가 위, 전 기록 대비 변화 (누르면 기록 탭에서 그 날짜 열기)
function renderWeightList() {
  const list = document.getElementById('weightRecordList');
  const countBadge = document.getElementById('weightCountBadge');
  const records = getSortedWeights();
  if (countBadge) countBadge.textContent = `누적 ${records.length}건`;
  if (!list) return;
  if (records.length === 0) {
    list.innerHTML = '<div class="mp-empty-note">아직 체중 기록이 없어요. 위에서 오늘 아침 체중을 남겨 보세요.</div>';
    return;
  }
  list.innerHTML = records.map((r, i) => {
    const diff = i > 0 ? Math.round((r.weight - records[i - 1].weight) * 10) / 10 : null;
    const cls = diff === null || diff === 0 ? '' : (diff < 0 ? 'is-down' : 'is-up');
    const [y, m, d] = r.date.split('-');
    return `<button type="button" class="mp-wlog-row" onclick="openRecordDate('${r.date}')">
      <span class="mp-wlog-row-date">${+m}월 ${+d}일 <small>${y}</small></span>
      <span class="mp-wlog-row-val">${r.weight.toFixed(1)}kg</span>
      <span class="mp-wlog-row-diff ${cls}">${diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`}</span>
    </button>`;
  }).reverse().join('');
}

function createMemberChartOptions(unit, minVal, maxVal, stepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 12, right: 8, bottom: 8, left: 4 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => item.raw !== null && item.raw !== undefined,
        callbacks: {
          label: (context) => ` ${context.parsed.y !== null ? context.parsed.y : '-'} ${unit}`
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
          callback: (value) => `${value} ${unit}`
        },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      }
    }
  };
}

/**
 * 헬퍼 함수
 */
function getMemberName(m) {
  return String(getField(m, '이름', 'name', '성명', '회원명', '참여자이름', '참여자 이름') || '회원').trim();
}

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

function getMemberTag(m) {
  if (!m) return '4주-체중감량반';
  return String(getField(m, '태그', 'tag', 'tags', '분류', '코스', '프로그램', '프로그램명') || '4주-체중감량반').trim();
}

/**
 * [코치 대시보드(app.js)와 100% 동일한 3단계 다단계 필드 추출기]
 * 1단계: 원본 키 직접 일치
 * 2단계: 공백 및 줄바꿈 제거 후 100% 완전 일치 비교
 * 3단계: 부분 일치 비교 (2글자 이상 키워드가 헤더에 포함되어 있거나 헤더가 키워드를 포함)
 * 구글 폼 사전 설문 질문이 긴 문장 형태여도 정확하게 감지!
 */
function getField(obj, ...candidates) {
  if (!obj || typeof obj !== 'object') return '';

  // 1단계: 원본 키 직접 일치
  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i];
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
      return obj[key];
    }
  }

  const keys = Object.keys(obj);

  // 2단계: 공백(\s+) 및 줄바꿈 제거 후 100% 일치 비교 (대소문자 무관)
  for (let i = 0; i < candidates.length; i++) {
    const cleanCand = String(candidates[i]).replace(/[\s\r\n]+/g, '').toLowerCase();
    if (!cleanCand) continue;
    for (let j = 0; j < keys.length; j++) {
      const cleanK = String(keys[j]).replace(/[\s\r\n]+/g, '').toLowerCase();
      if (cleanK === cleanCand) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
    }
  }

  // 3단계: 부분 일치 (2글자 이상 키워드 포함 비교)
  for (let i = 0; i < candidates.length; i++) {
    const cleanCand = String(candidates[i]).replace(/[\s\r\n]+/g, '').toLowerCase();
    if (!cleanCand || cleanCand.length < 2) continue;
    for (let j = 0; j < keys.length; j++) {
      const cleanK = String(keys[j]).replace(/[\s\r\n]+/g, '').toLowerCase();
      if (cleanK.includes(cleanCand) || cleanCand.includes(cleanK)) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
    }
  }

  return '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 구글 Apps Script 웹앱 연동 URL 수동 설정 헬퍼
function promptGasUrl() {
  const current = (localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
  const input = prompt(
    '구글 스프레드시트 Apps Script 웹 앱 배포 URL을 입력해 주세요:\n(예: https://script.google.com/macros/s/.../exec)\n\n※ 비워두고 확인을 누르면 오프라인 Mock 모드로 전환됩니다.',
    current
  );
  if (input !== null) {
    const trimmed = input.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_GAS_URL_KEY, trimmed);
      alert('연동 URL이 브라우저에 저장되었습니다. 최신 구글 시트 데이터를 불러옵니다.');
    } else {
      localStorage.removeItem(STORAGE_GAS_URL_KEY);
      alert('연동 URL이 초기화되었습니다 (오프라인 Mock 모드).');
    }
    window.location.reload();
  }
}

// 모바일 기기에서도 즉시 열리는 완전한 회원 전용 링크 복사 함수
function copyFullMemberLink() {
  const member = CurrentMemberState.member;
  // 회원 페이지는 회원번호 정확 일치로만 열리므로 회원번호(없으면 현재 접속 식별값)로만 링크 생성
  const memberId = (member && getMemberNo(member)) || CurrentMemberState.targetId || extractMemberIdSmartly() || '';
  const gasUrl = (localStorage.getItem(STORAGE_GAS_URL_KEY) || DEFAULT_GAS_API_URL || '').trim();

  const baseUrl = window.location.origin + window.location.pathname;
  let fullUrl = `${baseUrl}?id=${encodeURIComponent(memberId)}`;
  
  if (gasUrl) {
    fullUrl += `&gas=${encodeURIComponent(gasUrl)}`;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert(`[모바일 전용 링크 복사 완료]\n\n카카오톡이나 문자메시지로 전송해 주세요:\n${fullUrl}\n\n※ 모바일에서 이 링크를 누르면 구글 시트 연동 정보가 자동 동기화되어 즉시 정상 접속됩니다.`);
    }).catch(() => {
      prompt('아래 링크를 복사하여 모바일에 전달해 주세요:', fullUrl);
    });
  } else {
    prompt('아래 링크를 복사하여 모바일에 전달해 주세요:', fullUrl);
  }
}

// 전역 노출
window.handleMemberAuthLogin = handleMemberAuthLogin;
window.promptGasUrl = promptGasUrl;
window.copyFullMemberLink = copyFullMemberLink;

/**
 * ==============================================================================
 * [회원 셀프 수정] AI 운동 루틴/식단 재생성 & 이전 버전 되돌리기
 * - 기본 지침서 5종·코치 수정 지침은 서버에서만 읽으며 회원은 '수정 요청'만 입력
 * - 하루 종류별 3회 제한, 결과는 즉시 반영되고 코치 대시보드에 알림
 * ==============================================================================
 */
const SELF_EDIT_FIELDS = {
  exercise: { current: '현재 제안 운동 루틴', request: '회원 운동 요청', previous: '이전 버전(운동)', changedAt: '회원 운동 변경일시', note: '회원 운동 요청 결과', label: '운동 루틴', prefix: 'workout', btnClass: 'mp-btn-workout', placeholder: '예) 무릎이 아파서 점프 동작은 빼 주세요 / 주 3회만 가능해요' },
  diet: { current: '현재 제안 식단', request: '회원 식단 요청', previous: '이전 버전(식단)', changedAt: '회원 식단 변경일시', note: '회원 식단 요청 결과', label: '식단', prefix: 'diet', btnClass: 'mp-btn-diet', placeholder: '예) 점심은 회사 식당이라 바꾸기 어려워요 / 유당불내증이 있어요' }
};
const SELF_EDIT_ALL_KEYS = Object.values(SELF_EDIT_FIELDS).reduce((acc, f) => acc.concat([f.request, f.previous, f.changedAt, f.note]), []);

// 루틴/식단 표시용 필드 탐색 시 셀프 수정 열(요청/이전 버전/변경일시)이 오매칭되지 않도록 제외
function withoutSelfEditFields(member) {
  if (!member) return member;
  const blocked = SELF_EDIT_ALL_KEYS.map(k => k.replace(/\s+/g, ''));
  const out = {};
  Object.keys(member).forEach(k => {
    if (!blocked.includes(String(k).replace(/\s+/g, ''))) out[k] = member[k];
  });
  return out;
}

function getMemberFieldExact(member, name) {
  if (!member) return '';
  const clean = name.replace(/\s+/g, '');
  const key = Object.keys(member).find(k => String(k).replace(/\s+/g, '') === clean);
  return key ? String(member[key] == null ? '' : member[key]) : '';
}

function setMemberFieldExact(member, name, value) {
  const clean = name.replace(/\s+/g, '');
  let found = false;
  Object.keys(member).forEach(k => {
    if (String(k).replace(/\s+/g, '') === clean) { member[k] = value; found = true; }
  });
  if (!found) member[name] = value;
}

function canMemberSelfEdit() {
  return !CurrentMemberState.isUsingMock &&
    !!storageGet(MEMBER_VIEW_TOKEN_PREFIX + CurrentMemberState.targetId);
}

function renderPlanRegenPanels(member) {
  ['exercise', 'diet'].forEach(kind => renderPlanRegenPanel(kind, member));
}

function renderPlanRegenPanel(kind, member) {
  const f = SELF_EDIT_FIELDS[kind];
  const panel = document.getElementById(`${f.prefix}RegenPanel`);
  if (!panel) return;
  if (!member || !canMemberSelfEdit()) {
    panel.classList.add('d-none');
    panel.innerHTML = '';
    return;
  }

  const remainingMap = CurrentMemberState.regenRemaining || {};
  const remaining = (typeof remainingMap[kind] === 'number') ? remainingMap[kind] : 3;
  const hasPrevious = !!getMemberFieldExact(member, f.previous).trim();
  const lastRequest = getMemberFieldExact(member, f.request);
  const changedAt = getMemberFieldExact(member, f.changedAt);
  const requestNote = getMemberFieldExact(member, f.note).trim();

  panel.classList.remove('d-none');
  panel.innerHTML = `
    <div class="mp-regen">
      <div class="mp-regen-head">
        <span class="mp-regen-icon"><i class="bi bi-magic"></i></span>
        <div class="flex-grow-1">
          <label class="mp-regen-title" for="${f.prefix}RegenRequest">${f.label} 수정 요청</label>
          <div class="mp-regen-sub">원하는 변경을 적으면 AI가 다시 만들어 드려요</div>
        </div>
        <span class="mp-chip mp-chip-muted" id="${f.prefix}RegenQuota">오늘 ${remaining}회 남음</span>
      </div>
      <textarea id="${f.prefix}RegenRequest" class="form-control mp-textarea" rows="3" maxlength="1000" placeholder="${escapeHtml(f.placeholder)}">${escapeHtml(lastRequest)}</textarea>
      <div class="mp-regen-actions">
        <button type="button" class="mp-btn ${f.btnClass}" id="${f.prefix}RegenBtn" ${remaining <= 0 ? 'disabled' : ''} onclick="memberRegeneratePlan('${kind}')">
          <i class="bi bi-robot"></i>AI로 다시 만들기
        </button>
        <button type="button" class="mp-btn mp-btn-ghost" id="${f.prefix}RevertBtn" ${hasPrevious ? '' : 'disabled'}
                title="${hasPrevious ? '직전 버전으로 되돌립니다' : 'AI로 한 번 이상 다시 만든 뒤 사용할 수 있어요'}" onclick="memberRevertPlan('${kind}')">
          <i class="bi bi-arrow-counterclockwise"></i>되돌리기
        </button>
      </div>
      ${hasPrevious ? '' : `<div class="mp-regen-hint"><i class="bi bi-info-circle me-1"></i>되돌리기는 AI로 한 번 이상 다시 만든 뒤 사용할 수 있어요.</div>`}
      <div class="small mt-2" id="${f.prefix}RegenStatus">${changedAt ? `<span class="text-muted">최근 변경: ${escapeHtml(changedAt)}</span>` : ''}</div>
      ${renderRequestNoteBox(requestNote)}
      <div class="mp-regen-hint">
        최대 1000자 · 코치님의 기본 지침과 안전 원칙 안에서 반영되며, 변경 내용은 코치님께 알림으로 전달됩니다.
      </div>
    </div>
  `;
}

// AI가 정리한 '요청 반영 안내' (반영한 내용 / 코치님 지침과 다른 부분 / 반영하지 못한 내용과 이유) 표시
function renderRequestNoteBox(note) {
  if (!note) return '';
  const hasUnapplied = /반영하지\s*못한\s*내용\s*:\s*(?!없음)\S/.test(note);
  const hasCoachConflict = /코치님?\s*지침과\s*다른\s*부분\s*:\s*(?!없음)\S/.test(note);
  const tone = (hasUnapplied || hasCoachConflict) ? 'is-warn' : 'is-ok';
  return `
      <div class="mp-note-box ${tone}">
        <div class="fw-bold mb-1"><i class="bi bi-clipboard-check me-1"></i>요청 반영 안내${hasCoachConflict ? ' <span class="badge bg-info text-dark ms-1">코치님 지침과 다름</span>' : ''}${hasUnapplied ? ' <span class="badge bg-warning text-dark ms-1">일부 미반영</span>' : ''}</div>
        <div class="text-dark" style="white-space: pre-wrap;">${escapeHtml(note)}</div>
      </div>`;
}

function setRegenBusy(kind, busy, message) {
  const f = SELF_EDIT_FIELDS[kind];
  const regenBtn = document.getElementById(`${f.prefix}RegenBtn`);
  const revertBtn = document.getElementById(`${f.prefix}RevertBtn`);
  const statusEl = document.getElementById(`${f.prefix}RegenStatus`);
  if (regenBtn) regenBtn.disabled = busy;
  if (revertBtn) revertBtn.disabled = busy;
  if (statusEl && message !== undefined) statusEl.innerHTML = message;
}

/**
 * 셀프 수정 요청 전송 (데이터 변경 요청이므로 병렬 재요청 금지)
 * - 구글 리다이렉트 오류(unauthorized: 서버 미실행)만 재전송, 그 외 응답은 그대로 반환
 */
async function postMemberSelfEdit(body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);
    try {
      const res = await fetch(CurrentMemberState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await res.text();
      clearTimeout(timeoutId);
      let json = null;
      try { json = JSON.parse(raw); } catch (e) {
        return { status: 'error', code: 'unknown_result', message: '서버 응답을 확인하지 못했습니다. 새로고침하여 반영 여부를 확인해 주세요.' };
      }
      if (json && json.code === 'unauthorized') continue;
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      return { status: 'error', code: 'unknown_result', message: '서버 응답이 지연되었습니다. 잠시 후 새로고침하여 반영 여부를 확인해 주세요.' };
    }
  }
  return { status: 'error', code: 'unknown_result', message: '서버 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.' };
}

function applySelfEditResult(kind, res) {
  const f = SELF_EDIT_FIELDS[kind];
  const member = CurrentMemberState.member;
  // [다른 회원 오반영 차단] 서버가 처리한 회원과 현재 화면의 회원이 다르면 화면/저장본에 반영하지 않음
  const currentKey = getMemberNo(member);
  if (!res.memberKey || res.memberKey !== currentKey) {
    console.warn('[회원 셀프 수정] 응답 회원 불일치 - 반영 차단', { expected: currentKey, got: res.memberKey });
    return false;
  }
  setMemberFieldExact(member, f.current, res.plan || '');
  setMemberFieldExact(member, f.previous, res.previous || '');
  if (res.request !== undefined) setMemberFieldExact(member, f.request, res.request);
  if (res.changedAt) setMemberFieldExact(member, f.changedAt, res.changedAt);
  if (res.requestNote !== undefined) setMemberFieldExact(member, f.note, res.requestNote || '');
  if (typeof res.remaining === 'number') {
    CurrentMemberState.regenRemaining = { ...(CurrentMemberState.regenRemaining || {}), [kind]: res.remaining };
  }
  if (kind === 'exercise') renderWorkoutRoutineBox(member);
  else renderDietPlanBox(member);
  renderPlanRegenPanel(kind, member);
  saveMemberSession(CurrentMemberState.targetId, null, {
    member: member,
    weights: CurrentMemberState.weights,
    regenRemaining: CurrentMemberState.regenRemaining
  });
  return true;
}

function handleSelfEditError(kind, res) {
  if (res && res.code === 'auth_required') {
    clearMemberSession(CurrentMemberState.targetId);
    document.getElementById('memberPageContent')?.classList.add('d-none');
    showMemberAuthModal();
    return;
  }
  if (res && typeof res.remaining === 'number') {
    CurrentMemberState.regenRemaining = { ...(CurrentMemberState.regenRemaining || {}), [kind]: res.remaining };
    const f = SELF_EDIT_FIELDS[kind];
    const quotaEl = document.getElementById(`${f.prefix}RegenQuota`);
    if (quotaEl) quotaEl.textContent = `오늘 ${res.remaining}회 남음`;
  }
  setRegenBusy(kind, false, `<span class="text-danger fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>${escapeHtml((res && res.message) || '요청을 처리하지 못했습니다.')}</span>`);
  if (res && res.code === 'quota_exceeded') {
    const regenBtn = document.getElementById(`${SELF_EDIT_FIELDS[kind].prefix}RegenBtn`);
    if (regenBtn) regenBtn.disabled = true;
  }
}

async function memberRegeneratePlan(kind) {
  const f = SELF_EDIT_FIELDS[kind];
  if (!f || !canMemberSelfEdit()) return;
  const inputEl = document.getElementById(`${f.prefix}RegenRequest`);
  const request = String(inputEl ? inputEl.value : '').trim();
  if (!request) {
    setRegenBusy(kind, false, '<span class="text-danger fw-semibold">어떻게 바꾸고 싶은지 수정 요청을 입력해 주세요.</span>');
    inputEl?.focus();
    return;
  }

  setRegenBusy(kind, true, `<span class="text-primary fw-semibold"><span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>AI가 새 ${f.label}을(를) 만드는 중입니다... (보통 20~40초)</span>`);
  const res = await postMemberSelfEdit({
    action: 'memberRegeneratePlan',
    id: CurrentMemberState.targetId,
    memberToken: storageGet(MEMBER_VIEW_TOKEN_PREFIX + CurrentMemberState.targetId),
    kind: kind,
    request: request
  });

  if (res && res.status === 'success') {
    if (!applySelfEditResult(kind, res)) {
      setRegenBusy(kind, false, '<span class="text-danger fw-semibold">회원 정보 확인에 실패해 화면에 반영하지 않았습니다. 새로고침해 주세요.</span>');
      return;
    }
    setRegenBusy(kind, false, `<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>새 ${f.label}이(가) 반영되었습니다. 아래 '요청 반영 안내'를 확인해 주세요. 마음에 들지 않으면 [이전 버전으로 되돌리기]를 눌러 주세요.</span>`);
    return;
  }
  handleSelfEditError(kind, res);
}

async function memberRevertPlan(kind) {
  const f = SELF_EDIT_FIELDS[kind];
  if (!f || !canMemberSelfEdit()) return;
  if (!confirm(`${f.label}을(를) 이전 버전으로 되돌릴까요?`)) return;

  setRegenBusy(kind, true, '<span class="text-primary fw-semibold"><span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>이전 버전으로 되돌리는 중입니다...</span>');
  const res = await postMemberSelfEdit({
    action: 'memberRevertPlan',
    id: CurrentMemberState.targetId,
    memberToken: storageGet(MEMBER_VIEW_TOKEN_PREFIX + CurrentMemberState.targetId),
    kind: kind
  });

  if (res && res.status === 'success') {
    if (!applySelfEditResult(kind, res)) {
      setRegenBusy(kind, false, '<span class="text-danger fw-semibold">회원 정보 확인에 실패해 화면에 반영하지 않았습니다. 새로고침해 주세요.</span>');
      return;
    }
    setRegenBusy(kind, false, `<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>이전 버전으로 되돌렸습니다.</span>`);
    return;
  }
  handleSelfEditError(kind, res);
}

window.memberRegeneratePlan = memberRegeneratePlan;
window.memberRevertPlan = memberRevertPlan;

/**
 * ==============================================================================
 * [하단 탭바 & 좌우 스와이프 화면 전환]
 * - 홈/운동/식단/체중 4개 화면을 가로 스크롤 스냅으로 배치 (손가락으로 넘기기)
 * - 탭바 버튼 또는 data-tab-target 요소를 누르면 해당 화면으로 부드럽게 이동
 * ==============================================================================
 */
const MEMBER_TABS = ['home', 'workout', 'diet', 'record'];
let memberTabsReady = false;

function initMemberTabs() {
  const track = document.getElementById('memberTabTrack');
  if (!track || memberTabsReady) return;
  memberTabsReady = true;
  CurrentMemberState.activeTab = 'home';

  // 동적으로 그려지는 버튼(홈 미리보기 등)도 동작하도록 위임 처리
  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest ? e.target.closest('[data-tab-target]') : null;
    if (target) goToMemberTab(target.dataset.tabTarget);
  });

  let frame = 0;
  track.addEventListener('scroll', () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const width = track.clientWidth || 1;
      setActiveMemberTab(MEMBER_TABS[Math.round(track.scrollLeft / width)] || 'home');
    });
  }, { passive: true });

  // 화면 회전/크기 변경 시 현재 탭 위치 유지
  if (window.addEventListener) {
    window.addEventListener('resize', () => goToMemberTab(CurrentMemberState.activeTab || 'home', false));
  }
}

function goToMemberTab(name, smooth = true) {
  const idx = MEMBER_TABS.indexOf(name);
  const track = document.getElementById('memberTabTrack');
  if (idx < 0 || !track) return;
  if (typeof track.scrollTo === 'function') {
    track.scrollTo({ left: idx * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }
  setActiveMemberTab(name);
}

function setActiveMemberTab(name) {
  if (CurrentMemberState.activeTab === name) return;
  CurrentMemberState.activeTab = name;
  document.querySelectorAll('#memberTabBar [data-tab-target]').forEach(btn => {
    const on = btn.dataset.tabTarget === name;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (name === 'record') resizeMemberCharts();
}

function resizeMemberCharts() {
  Object.values(CurrentMemberState.charts || {}).forEach(chart => {
    if (chart && typeof chart.resize === 'function') chart.resize();
  });
}

/**
 * ==============================================================================
 * [기록 탭] 날짜별 체중·운동·식단을 한 번에 기록 (구글 폼 대체)
 * - 서버(memberSaveDailyLog)가 WeightLog의 본인 회원번호+날짜 행을 덮어쓰거나 새로 씀 (체중·운동·식단·휴식이 모두 비면 행 삭제)
 * - 운동 휴식: 계획된 휴식 / 미계획된 휴식 체크박스 (둘 중 하나만)
 * - 입력 중인 내용은 회원·날짜별로 localStorage에 임시 보관 (저장 성공 시 삭제)
 * - 저장 성공 후 화면의 기록도 같은 규칙으로 고쳐 바로 반영 (새로고침하면 시트 값으로 다시 받음)
 * ==============================================================================
 */
const RECORD_DRAFT_PREFIX = 'coach_dash_view_draft_v1_';
const DIET_MEALS = ['아침', '점심', '저녁', '간식'];
const RECORD_LIMITS = { exerciseRows: 30, dietRows: 30, exerciseName: 40, food: 100, note: 100 };
const AUTOCOMPLETE_MAX = 8;
// 운동 휴식 표시 (둘 중 하나만, 서버 EXERCISE_REST_TYPES와 같은 값)
const EXERCISE_REST_TYPES = ['계획된 휴식', '미계획된 휴식'];
const RecordState = {
  date: '', weight: '', exercise: [], diet: [], rest: '',
  busy: false, status: '', draftRestored: false, routineOpen: false, acIndex: -1
};
const WeightCalendarState = { year: 0, month: 0 };

function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftLocalDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return toLocalDateKey(new Date(y, m - 1, d + days));
}

// 날짜별 체중 { 'yyyy-MM-dd': kg } (같은 날짜가 여러 행이면 뒤쪽 행 우선)
function getWeightByDate() {
  const map = {};
  (CurrentMemberState.weights || []).forEach(r => {
    const date = String(r['날짜'] || '').trim();
    const w = parseFloat(r['체중']);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(w) && w > 0) map[date] = w;
  });
  return map;
}

function getDailyLog(date) {
  return (CurrentMemberState.dailyLogs || []).find(r => r['날짜'] === date) || null;
}

/* --------------------------- 입력 상태 ↔ 저장 형식 --------------------------- */

function emptyExerciseRow() {
  return { '종목': '', '횟수': '', '세트': '', '무게': '', '비고': '' };
}

function emptyDietGroup(meal) {
  return { meal: meal || '아침', items: [{ '음식': '', '비고': '' }] };
}

// 저장된 식단 [{항목, 음식, 비고}] → 항목별 묶음 (처음 나온 순서)
function groupDietRows(rows) {
  const groups = [];
  (rows || []).forEach(r => {
    const meal = DIET_MEALS.indexOf(r['항목']) >= 0 ? r['항목'] : '간식';
    let g = groups.find(x => x.meal === meal);
    if (!g) {
      g = { meal, items: [] };
      groups.push(g);
    }
    g.items.push({ '음식': String(r['음식'] || ''), '비고': String(r['비고'] || '') });
  });
  return groups;
}

function flattenDietGroups(groups) {
  const out = [];
  (groups || []).forEach(g => g.items.forEach(it => out.push({ '항목': g.meal, '음식': it['음식'], '비고': it['비고'] })));
  return out;
}

function stateFromLog(log) {
  const exercise = (log && Array.isArray(log['운동']) ? log['운동'] : []).map(r => ({
    '종목': String(r['종목'] || ''), '횟수': String(r['횟수'] === undefined ? '' : r['횟수']),
    '세트': String(r['세트'] === undefined ? '' : r['세트']), '무게': String(r['무게'] === undefined ? '' : r['무게']), '비고': String(r['비고'] || '')
  }));
  const diet = groupDietRows(log && log['식단']);
  return {
    weight: log && log['체중'] !== '' && log['체중'] !== undefined ? String(log['체중']) : '',
    exercise: exercise.length ? exercise : [emptyExerciseRow()],
    diet: diet.length ? diet : [emptyDietGroup('아침')],
    rest: log && EXERCISE_REST_TYPES.indexOf(log['휴식']) >= 0 ? log['휴식'] : ''
  };
}

/* ------------------------------ 임시 보관 (localStorage) ------------------------------ */

function recordDraftKey(date) {
  return RECORD_DRAFT_PREFIX + (getMemberNo(CurrentMemberState.member) || CurrentMemberState.targetId) + '_' + date;
}

function readRecordDraft(date) {
  try {
    const d = JSON.parse(localStorage.getItem(recordDraftKey(date)) || 'null');
    return d && Array.isArray(d.exercise) && Array.isArray(d.diet) ? d : null;
  } catch (e) {
    return null;
  }
}

let recordDraftTimer = 0;
function scheduleRecordDraftSave() {
  clearTimeout(recordDraftTimer);
  const date = RecordState.date;
  const snapshot = JSON.stringify({ weight: RecordState.weight, exercise: RecordState.exercise, diet: RecordState.diet, rest: RecordState.rest, at: Date.now() });
  recordDraftTimer = setTimeout(() => {
    try { localStorage.setItem(recordDraftKey(date), snapshot); } catch (e) {}
  }, 300);
}

function clearRecordDraft(date) {
  clearTimeout(recordDraftTimer);
  try { localStorage.removeItem(recordDraftKey(date)); } catch (e) {}
}

/* ---------------------------------- 날짜 이동 ---------------------------------- */

// 날짜를 열면 저장된 기록을 채우고, 저장 안 된 임시 입력이 있으면 그것을 먼저 보여 줌
function setRecordDate(dateKey) {
  const today = toLocalDateKey(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey || '') && dateKey <= today ? dateKey : today;
  const draft = readRecordDraft(date);
  const base = stateFromLog(getDailyLog(date));
  RecordState.date = date;
  RecordState.weight = draft ? String(draft.weight || '') : base.weight;
  RecordState.exercise = draft && draft.exercise.length ? draft.exercise : base.exercise;
  RecordState.diet = draft && draft.diet.length ? draft.diet : base.diet;
  RecordState.rest = draft ? (EXERCISE_REST_TYPES.indexOf(draft.rest) >= 0 ? draft.rest : '') : base.rest;
  RecordState.draftRestored = !!draft;
  RecordState.status = '';
  RecordState.routineOpen = false;
  renderRecordTab();
}

function discardRecordDraft() {
  clearRecordDraft(RecordState.date);
  setRecordDate(RecordState.date);
}

// 홈 '오늘 기록하기' / 체중 목록의 날짜 → 기록 탭으로 이동
function openRecordDate(dateKey) {
  setRecordDate(dateKey || toLocalDateKey(new Date()));
  goToMemberTab('record');
  const pane = document.querySelector('.mp-pane[data-tab="record"]');
  if (pane && typeof pane.scrollTo === 'function') pane.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------------- 그리기 ---------------------------------- */

function formatRecordDateLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

function renderRecordTab() {
  const root = document.getElementById('recordForm');
  if (!root || !RecordState.date) return;
  const today = toLocalDateKey(new Date());
  const date = RecordState.date;
  setText('recordDateLabel', date === today ? `오늘 · ${formatRecordDateLabel(date)}` : formatRecordDateLabel(date));
  const nextBtn = document.getElementById('btnRecordNextDay');
  if (nextBtn) nextBtn.disabled = date >= today;

  const note = (CurrentMemberState.coachNotes || []).find(n => n['날짜'] === date && String(n['코치 한마디'] || '').trim());
  const prevWeights = getSortedWeights().filter(r => r.date < date);
  const prevW = prevWeights.length ? prevWeights[prevWeights.length - 1] : null;
  const canSave = canMemberSelfEdit();
  const busy = RecordState.busy;

  const exerciseHtml = RecordState.exercise.map((r, i) => `
    <div class="mp-rec-ex" data-ex="${i}">
      <div class="mp-rec-ex-top">
        <span class="mp-rec-ex-no">${i + 1}</span>
        <div class="mp-rec-ac-wrap">
          <input type="text" class="form-control" data-rec="ex" data-i="${i}" data-f="종목" value="${escapeHtml(r['종목'])}"
                 placeholder="종목 (예: 벤치프레스, ㅂㅊ)" maxlength="${RECORD_LIMITS.exerciseName}" autocomplete="off" enterkeyhint="next">
          <div class="mp-rec-ac d-none" data-ac="${i}" role="listbox"></div>
        </div>
        <button type="button" class="mp-rec-icon-btn is-danger" data-act="ex-del" data-i="${i}" aria-label="${i + 1}번째 운동 삭제"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="mp-rec-ex-grid">
        <label><span>횟수</span><input type="text" class="form-control" data-rec="ex" data-i="${i}" data-f="횟수" value="${escapeHtml(r['횟수'])}" placeholder="12 / 30분" maxlength="10" autocomplete="off"></label>
        <label><span>세트</span><input type="text" inputmode="numeric" class="form-control" data-rec="ex" data-i="${i}" data-f="세트" value="${escapeHtml(r['세트'])}" placeholder="3" maxlength="2" autocomplete="off"></label>
        <label><span>무게(kg)</span><input type="text" inputmode="decimal" class="form-control" data-rec="ex" data-i="${i}" data-f="무게" value="${escapeHtml(r['무게'])}" placeholder="40" maxlength="6" autocomplete="off"></label>
      </div>
      <input type="text" class="form-control mp-rec-note" data-rec="ex" data-i="${i}" data-f="비고" value="${escapeHtml(r['비고'])}" placeholder="비고 (선택)" maxlength="${RECORD_LIMITS.note}" autocomplete="off">
    </div>`).join('');

  const routineDays = parseRoutineDays();
  const routineHtml = RecordState.routineOpen ? `
    <div class="mp-rec-routine">
      ${routineDays.length ? `<div class="mp-rec-routine-title">불러올 DAY를 골라 주세요</div>
        <div class="mp-rec-routine-days">${routineDays.map((d, i) => `<button type="button" class="mp-rec-chip" data-act="routine-day" data-i="${i}">${escapeHtml(d.label)} <small>${d.rows.length}개</small></button>`).join('')}</div>`
        : '<div class="mp-empty-note">불러올 운동 루틴이 없어요.</div>'}
    </div>` : '';

  const dietHtml = RecordState.diet.map((g, gi) => `
    <div class="mp-rec-meal" data-g="${gi}">
      <div class="mp-rec-meal-head">
        <select class="form-select" data-rec="meal" data-g="${gi}" aria-label="식사 항목">
          ${DIET_MEALS.map(m => `<option value="${m}" ${g.meal === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <button type="button" class="mp-rec-icon-btn" data-act="meal-add" data-g="${gi}" aria-label="식사 항목 추가"><i class="bi bi-plus-lg"></i></button>
      </div>
      ${g.items.map((it, ii) => `
        <div class="mp-rec-food">
          <input type="text" class="form-control" data-rec="food" data-g="${gi}" data-ii="${ii}" data-f="음식" value="${escapeHtml(it['음식'])}" placeholder="음식" maxlength="${RECORD_LIMITS.food}" autocomplete="off">
          <input type="text" class="form-control" data-rec="food" data-g="${gi}" data-ii="${ii}" data-f="비고" value="${escapeHtml(it['비고'])}" placeholder="비고" maxlength="${RECORD_LIMITS.note}" autocomplete="off">
          <button type="button" class="mp-rec-icon-btn" data-act="food-add" data-g="${gi}" data-ii="${ii}" aria-label="같은 항목 음식 추가"><i class="bi bi-plus-lg"></i></button>
          <button type="button" class="mp-rec-icon-btn is-danger" data-act="food-del" data-g="${gi}" data-ii="${ii}" aria-label="음식 삭제"><i class="bi bi-x-lg"></i></button>
        </div>`).join('')}
    </div>`).join('');

  root.innerHTML = `
    ${note ? `<div class="mp-rec-coachnote"><i class="bi bi-chat-heart-fill"></i><div><b>코치 한마디</b><p>${escapeHtml(note['코치 한마디'])}</p></div></div>` : ''}
    ${RecordState.draftRestored ? `<div class="mp-rec-draft"><i class="bi bi-pencil-square"></i><span>저장 안 된 입력을 불러왔어요.</span><button type="button" class="mp-link-btn" data-act="draft-discard">버리기</button></div>` : ''}

    <section class="mp-card mp-rec-card">
      <div class="mp-rec-head"><h3><i class="bi bi-speedometer2"></i>아침 공복 체중</h3><small>선택</small></div>
      <div class="mp-rec-weight">
        <input type="text" inputmode="decimal" class="form-control" data-rec="weight" value="${escapeHtml(RecordState.weight)}" placeholder="예) 72.4" maxlength="6" autocomplete="off">
        <span>kg</span>
      </div>
      <div class="mp-rec-hint">${prevW ? `지난 기록 ${formatRecordDateLabel(prevW.date)}: <b>${prevW.weight.toFixed(1)}kg</b>` : '첫 체중 기록이에요.'}</div>
    </section>

    <section class="mp-card mp-rec-card">
      <div class="mp-rec-head"><h3><i class="bi bi-lightning-charge-fill"></i>운동</h3>
        <button type="button" class="mp-link-btn" data-act="routine-toggle"><i class="bi bi-list-check me-1"></i>오늘 루틴 불러오기</button>
      </div>
      <div class="mp-rec-rest" role="group" aria-label="오늘 운동 휴식">
        ${EXERCISE_REST_TYPES.map(t => `<label class="mp-rec-rest-opt ${RecordState.rest === t ? 'is-on' : ''} ${t === '미계획된 휴식' ? 'is-unplanned' : ''}">
          <input type="checkbox" class="form-check-input" data-rec="rest" value="${t}" ${RecordState.rest === t ? 'checked' : ''}>${t}</label>`).join('')}
      </div>
      ${RecordState.rest ? `<div class="mp-rec-hint mb-2">${RecordState.rest === '계획된 휴식' ? '루틴대로 쉬는 날로 기록돼요.' : '계획에 없던 휴식으로 기록돼요.'} 쉬면서 스트레칭 등을 했다면 아래에 함께 적어도 돼요.</div>` : ''}
      ${routineHtml}
      <div class="mp-rec-ex-list">${exerciseHtml}</div>
      <button type="button" class="mp-btn mp-btn-ghost mp-btn-block mt-2" data-act="ex-add" ${RecordState.exercise.length >= RECORD_LIMITS.exerciseRows ? 'disabled' : ''}><i class="bi bi-plus-lg"></i>운동 추가</button>
    </section>

    <section class="mp-card mp-rec-card">
      <div class="mp-rec-head"><h3><i class="bi bi-egg-fried"></i>식단</h3><small>항목 옆 + 는 식사 추가, 음식 옆 + 는 같은 식사에 음식 추가</small></div>
      <div class="mp-rec-meals">${dietHtml}</div>
    </section>

    <div class="mp-rec-savebar">
      <button type="button" class="mp-btn mp-btn-primary mp-btn-block" data-act="save" ${busy || !canSave ? 'disabled' : ''}>
        ${busy ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>저장 중...' : '<i class="bi bi-check-lg"></i>저장'}
      </button>
      <div class="mp-rec-status" id="recordStatus">${RecordState.status || (canSave ? '' : '<span class="text-danger">미리보기 화면에서는 저장되지 않아요.</span>')}</div>
    </div>`;
}

function setRecordStatus(html) {
  RecordState.status = html;
  const el = document.getElementById('recordStatus');
  if (el) el.innerHTML = html;
}

/* ------------------------------ 운동 자동완성 (초성 검색) ------------------------------ */

const HANGUL_INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function hangulInitial(ch) {
  const code = ch.charCodeAt(0) - 0xAC00;
  return code >= 0 && code <= 11171 ? HANGUL_INITIALS[Math.floor(code / 588)] : ch;
}

// 검색어 글자가 초성(ㄱ~ㅎ)이면 이름 글자의 초성과, 아니면 글자 그대로 비교 (예: 'ㅂㅊ', '벤ㅊ' → 벤치프레스)
function matchExerciseQuery(name, query) {
  const n = name.replace(/\s+/g, '').toLowerCase();
  const q = query.replace(/\s+/g, '').toLowerCase();
  if (!q) return -1;
  for (let start = 0; start + q.length <= n.length; start++) {
    let ok = true;
    for (let k = 0; k < q.length; k++) {
      const qc = q[k];
      const nc = n[start + k];
      if (HANGUL_INITIALS.indexOf(qc) >= 0 ? hangulInitial(nc) !== qc && nc !== qc : nc !== qc) {
        ok = false;
        break;
      }
    }
    if (ok) return start;
  }
  return -1;
}

function searchExercises(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  return (CurrentMemberState.exerciseList || [])
    .map(e => ({ name: e['운동명'], part: e['부위'], pos: matchExerciseQuery(String(e['운동명'] || ''), q) }))
    .filter(e => e.pos >= 0 && e.name.replace(/\s+/g, '') !== q.replace(/\s+/g, ''))
    .sort((a, b) => a.pos - b.pos || a.name.length - b.name.length)
    .slice(0, AUTOCOMPLETE_MAX);
}

function renderAutocomplete(i, query) {
  document.querySelectorAll('#recordForm .mp-rec-ac').forEach(el => {
    if (el.dataset.ac !== String(i)) el.classList.add('d-none');
  });
  const box = document.querySelector(`#recordForm .mp-rec-ac[data-ac="${i}"]`);
  if (!box) return;
  const list = searchExercises(query);
  box.classList.toggle('d-none', list.length === 0);
  box.innerHTML = list.map(e => `<button type="button" role="option" data-act="ac-pick" data-i="${i}" data-name="${escapeHtml(e.name)}">${escapeHtml(e.name)}${e.part ? `<small>${escapeHtml(e.part)}</small>` : ''}</button>`).join('');
}

function hideAutocomplete() {
  document.querySelectorAll('#recordForm .mp-rec-ac').forEach(el => el.classList.add('d-none'));
}

/* ------------------------------ 오늘 루틴 불러오기 ------------------------------ */

// 현재 운동 루틴 표 → [{ label: 'DAY1 [가슴]', rows: [{종목, 횟수, 세트}] }] (휴식 DAY는 제외)
function parseRoutineDays() {
  const raw = String(getField(withoutSelfEditFields(CurrentMemberState.member || {}), '현재 제안 운동 루틴', '현재제안운동루틴') || '');
  const days = [];
  let cur = null;
  raw.split('\n').forEach(line => {
    const t = line.trim();
    if (!t.startsWith('|')) {
      cur = null;
      return;
    }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.replace(/\*\*/g, '').trim());
    const first = cells[0] || '';
    const dayMatch = first.match(/^DAY\s*(\d+)\s*(.*)$/i);
    if (dayMatch) {
      cur = { label: `DAY${dayMatch[1]}${dayMatch[2] ? ' ' + dayMatch[2] : ''}`.slice(0, 30), rows: [] };
      days.push(cur);
      return;
    }
    if (!cur || !first || /^:?-{2,}/.test(first) || first.replace(/\s+/g, '').indexOf('운동종목') >= 0) return;
    const reps = normalizeRoutineReps(cells[1] || '');
    const sets = String(cells[2] || '').match(/\d{1,2}/);
    cur.rows.push({ '종목': first.slice(0, RECORD_LIMITS.exerciseName), '횟수': reps.reps, '세트': sets ? sets[0] : '', '무게': '', '비고': reps.note });
  });
  return days.filter(d => d.rows.length);
}

// '12회' → 12, '30분'/'30초' → 그대로, 그 밖(예: 8~12회)은 횟수를 비우고 비고에 원래 글자
function normalizeRoutineReps(text) {
  const t = String(text || '').replace(/\s+/g, '');
  let m = t.match(/^(\d{1,4})회?$/);
  if (m) return { reps: m[1], note: '' };
  m = t.match(/^(\d{1,3})(분|초)$/);
  if (m) return { reps: `${m[1]}${m[2]}`, note: '' };
  return { reps: '', note: t && t !== '-' ? t.slice(0, RECORD_LIMITS.note) : '' };
}

function loadRoutineDay(i) {
  const day = parseRoutineDays()[i];
  if (!day) return;
  const kept = RecordState.exercise.filter(r => Object.values(r).some(v => String(v).trim()));
  RecordState.exercise = kept.concat(day.rows.map(r => Object.assign({}, r))).slice(0, RECORD_LIMITS.exerciseRows);
  RecordState.routineOpen = false;
  scheduleRecordDraftSave();
  renderRecordTab();
}

/* ---------------------------------- 입력 처리 ---------------------------------- */

function initRecordForm() {
  const root = document.getElementById('recordForm');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  root.addEventListener('input', (e) => {
    const el = e.target;
    const kind = el.dataset.rec;
    if (!kind) return;
    if (kind === 'weight') RecordState.weight = el.value;
    if (kind === 'ex') {
      RecordState.exercise[+el.dataset.i][el.dataset.f] = el.value;
      if (el.dataset.f === '종목') renderAutocomplete(+el.dataset.i, el.value);
    }
    if (kind === 'food') RecordState.diet[+el.dataset.g].items[+el.dataset.ii][el.dataset.f] = el.value;
    scheduleRecordDraftSave();
  });
  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.rec === 'meal') {
      RecordState.diet[+el.dataset.g].meal = el.value;
      scheduleRecordDraftSave();
    }
    // 휴식 체크박스는 둘 중 하나만 (다시 누르면 해제)
    if (el.dataset.rec === 'rest') {
      RecordState.rest = el.checked ? el.value : '';
      scheduleRecordDraftSave();
      renderRecordTab();
    }
  });
  root.addEventListener('focusin', (e) => {
    if (e.target.dataset.rec === 'ex' && e.target.dataset.f === '종목' && e.target.value) renderAutocomplete(+e.target.dataset.i, e.target.value);
  });
  root.addEventListener('focusout', (e) => {
    if (e.target.dataset.rec === 'ex' && e.target.dataset.f === '종목') setTimeout(hideAutocomplete, 150);
  });
  // 자동완성 항목은 입력칸 포커스를 잃기 전에 고르도록 pointerdown에서 처리
  root.addEventListener('pointerdown', (e) => {
    const pick = e.target.closest('[data-act="ac-pick"]');
    if (!pick) return;
    e.preventDefault();
    const i = +pick.dataset.i;
    RecordState.exercise[i]['종목'] = pick.dataset.name;
    const input = root.querySelector(`input[data-rec="ex"][data-i="${i}"][data-f="종목"]`);
    if (input) input.value = pick.dataset.name;
    hideAutocomplete();
    scheduleRecordDraftSave();
    const next = root.querySelector(`input[data-rec="ex"][data-i="${i}"][data-f="횟수"]`);
    if (next) next.focus();
  });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.dataset.act === 'ac-pick') return;
    const act = btn.dataset.act;
    const i = +btn.dataset.i;
    const gi = +btn.dataset.g;
    const ii = +btn.dataset.ii;
    let focusSel = '';
    if (act === 'ex-add' && RecordState.exercise.length < RECORD_LIMITS.exerciseRows) {
      RecordState.exercise.push(emptyExerciseRow());
      focusSel = `input[data-rec="ex"][data-i="${RecordState.exercise.length - 1}"][data-f="종목"]`;
    } else if (act === 'ex-del') {
      RecordState.exercise.splice(i, 1);
      if (!RecordState.exercise.length) RecordState.exercise.push(emptyExerciseRow());
    } else if (act === 'meal-add') {
      const used = RecordState.diet.map(g => g.meal);
      RecordState.diet.splice(gi + 1, 0, emptyDietGroup(DIET_MEALS.find(m => used.indexOf(m) < 0) || '간식'));
      focusSel = `input[data-rec="food"][data-g="${gi + 1}"][data-ii="0"][data-f="음식"]`;
    } else if (act === 'food-add') {
      RecordState.diet[gi].items.splice(ii + 1, 0, { '음식': '', '비고': '' });
      focusSel = `input[data-rec="food"][data-g="${gi}"][data-ii="${ii + 1}"][data-f="음식"]`;
    } else if (act === 'food-del') {
      RecordState.diet[gi].items.splice(ii, 1);
      if (!RecordState.diet[gi].items.length) RecordState.diet.splice(gi, 1);
      if (!RecordState.diet.length) RecordState.diet.push(emptyDietGroup('아침'));
    } else if (act === 'routine-toggle') {
      RecordState.routineOpen = !RecordState.routineOpen;
    } else if (act === 'routine-day') {
      loadRoutineDay(i);
      return;
    } else if (act === 'draft-discard') {
      discardRecordDraft();
      return;
    } else if (act === 'save') {
      saveDailyRecord();
      return;
    } else {
      return;
    }
    if (act !== 'routine-toggle') scheduleRecordDraftSave();
    renderRecordTab();
    if (focusSel) {
      const el = root.querySelector(focusSel);
      if (el) el.focus();
    }
  });
}

/* ---------------------------------- 저장 ---------------------------------- */

// 서버와 같은 규칙으로 미리 확인 → { payload } 또는 { error }
function buildDailyRecordPayload() {
  const weight = String(RecordState.weight || '').trim();
  if (weight && (!/^\d{1,3}(\.\d{1,2})?$/.test(weight) || +weight < 20 || +weight > 250)) return { error: '체중은 20~250kg 사이 숫자로 입력해 주세요. 예) 72.4' };
  const exercise = [];
  for (const r of RecordState.exercise) {
    const row = {};
    Object.keys(r).forEach(k => { row[k] = String(r[k] || '').trim(); });
    if (!Object.values(row).some(v => v)) continue;
    const label = `운동 ${exercise.length + 1}번째 줄`;
    if (!row['종목']) return { error: `${label}: 종목을 입력해 주세요.` };
    const reps = row['횟수'].replace(/\s+/g, '');
    if (reps && !/^\d{1,4}회?$/.test(reps) && !/^\d{1,3}(분|초)$/.test(reps) && !/^\d{1,3}분\d{1,2}초$/.test(reps)) return { error: `${label}: 횟수는 숫자(예: 12) 또는 시간(예: 30분, 30초)으로 입력해 주세요.` };
    if (row['세트'] && !/^\d{1,2}$/.test(row['세트'])) return { error: `${label}: 세트는 0~99 사이 정수로 입력해 주세요.` };
    const w = row['무게'].replace(/kg$/i, '').trim();
    if (w && (!/^\d{1,3}(\.\d{1,2})?$/.test(w) || +w > 500)) return { error: `${label}: 무게는 0~500kg 사이 숫자로 입력해 주세요.` };
    row['무게'] = w;
    exercise.push(row);
  }
  if (exercise.length > RECORD_LIMITS.exerciseRows) return { error: `운동은 하루 ${RECORD_LIMITS.exerciseRows}줄까지 기록할 수 있어요.` };
  const diet = flattenDietGroups(RecordState.diet)
    .map(r => ({ '항목': r['항목'], '음식': String(r['음식'] || '').trim(), '비고': String(r['비고'] || '').trim() }))
    .filter(r => r['음식'] || r['비고']);
  const noFood = diet.findIndex(r => !r['음식']);
  if (noFood >= 0) return { error: `식단 ${noFood + 1}번째 줄: 음식을 입력해 주세요.` };
  if (diet.length > RECORD_LIMITS.dietRows) return { error: `식단은 하루 ${RECORD_LIMITS.dietRows}줄까지 기록할 수 있어요.` };
  const rest = EXERCISE_REST_TYPES.indexOf(RecordState.rest) >= 0 ? RecordState.rest : '';
  return { payload: { weight, exercise, diet, rest } };
}

async function saveDailyRecord() {
  if (RecordState.busy || !canMemberSelfEdit()) return;
  const built = buildDailyRecordPayload();
  if (built.error) {
    setRecordStatus(`<span class="text-danger fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>${escapeHtml(built.error)}</span>`);
    return;
  }
  const date = RecordState.date;
  const isEmpty = !built.payload.weight && !built.payload.exercise.length && !built.payload.diet.length && !built.payload.rest;
  if (isEmpty && getDailyLog(date) && !confirm(`${formatRecordDateLabel(date)} 기록을 모두 지울까요?`)) return;

  RecordState.busy = true;
  RecordState.status = '<span class="text-primary fw-semibold">저장 중입니다...</span>';
  renderRecordTab();
  const res = await postMemberSelfEdit(Object.assign({
    action: 'memberSaveDailyLog',
    id: CurrentMemberState.targetId,
    memberToken: storageGet(MEMBER_VIEW_TOKEN_PREFIX + CurrentMemberState.targetId),
    date: date
  }, built.payload));
  RecordState.busy = false;

  if (res && res.status === 'success') {
    // [다른 회원 오반영 차단] 서버가 처리한 회원·날짜가 지금 화면과 같을 때만 화면에 반영
    if (res.memberKey !== getMemberNo(CurrentMemberState.member) || res.date !== date || !res.log) {
      RecordState.status = '<span class="text-danger fw-semibold">회원 정보 확인에 실패해 화면에 반영하지 않았습니다. 새로고침해 주세요.</span>';
      renderRecordTab();
      return;
    }
    clearRecordDraft(date);
    applyLocalDailyLog(res.log, res.mode === 'deleted' || res.mode === 'none');
    if (RecordState.date === date) {
      const base = stateFromLog(getDailyLog(date));
      Object.assign(RecordState, base, { draftRestored: false });
    }
    RecordState.status = `<span class="text-success fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>${res.mode === 'deleted' ? '기록을 지웠어요.' : '저장했어요. 코치님 화면에도 바로 반영돼요.'}</span>`;
    renderRecordTab();
    return;
  }
  if (res && res.code === 'auth_required') {
    clearMemberSession(CurrentMemberState.targetId);
    document.getElementById('memberPageContent')?.classList.add('d-none');
    showMemberAuthModal();
    return;
  }
  // 실패: 입력은 그대로 (임시 보관도 유지) + 다시 시도
  RecordState.status = `<span class="text-danger fw-semibold"><i class="bi bi-exclamation-circle me-1"></i>${escapeHtml((res && res.message) || '저장하지 못했습니다.')}</span>
    <button type="button" class="mp-link-btn ms-1" data-act="save">다시 시도</button>`;
  renderRecordTab();
}

// 서버와 같은 규칙으로 화면 기록 수정: 회원번호+날짜 1건 (셋 다 비면 삭제)
function applyLocalDailyLog(log, removed) {
  const member = CurrentMemberState.member;
  const date = log['날짜'];
  CurrentMemberState.dailyLogs = (CurrentMemberState.dailyLogs || []).filter(r => r['날짜'] !== date);
  if (!removed) CurrentMemberState.dailyLogs.push({ '날짜': date, '체중': log['체중'], '운동': log['운동'] || [], '식단': log['식단'] || [], '휴식': log['휴식'] || '' });
  CurrentMemberState.weights = (CurrentMemberState.weights || []).filter(r => String(r['날짜'] || '').trim() !== date);
  if (!removed && log['체중'] !== '' && log['체중'] !== undefined) CurrentMemberState.weights.push({ '날짜': date, '체중': Number(log['체중']) });

  renderHeroWeights(member);
  renderWeightChart();
  renderWeightList();
  saveMemberSession(CurrentMemberState.targetId, null, {
    member: member,
    weights: CurrentMemberState.weights,
    dailyLogs: CurrentMemberState.dailyLogs,
    exerciseList: CurrentMemberState.exerciseList,
    regenRemaining: CurrentMemberState.regenRemaining
  });
}

/* ---------------------------------- 날짜 달력 ---------------------------------- */

function openWeightCalendar() {
  const key = RecordState.date || toLocalDateKey(new Date());
  WeightCalendarState.year = +key.slice(0, 4);
  WeightCalendarState.month = +key.slice(5, 7) - 1;
  renderWeightCalendar();
  const modalEl = document.getElementById('weightCalendarModal');
  if (modalEl && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function moveWeightCalendarMonth(delta) {
  const d = new Date(WeightCalendarState.year, WeightCalendarState.month + delta, 1);
  WeightCalendarState.year = d.getFullYear();
  WeightCalendarState.month = d.getMonth();
  renderWeightCalendar();
}

function selectWeightCalendarDate(key) {
  bootstrap.Modal.getInstance(document.getElementById('weightCalendarModal'))?.hide();
  openRecordDate(key);
}

// 기록 있는 날 표시: 체중이 있으면 체중, 운동·식단만 있으면 점
function renderWeightCalendar() {
  const body = document.getElementById('weightCalendarBody');
  if (!body) return;
  const { year, month } = WeightCalendarState;
  const todayKey = toLocalDateKey(new Date());
  const weights = getWeightByDate();
  const logged = {};
  (CurrentMemberState.dailyLogs || []).forEach(r => { logged[r['날짜']] = true; });
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  let cells = ['일', '월', '화', '수', '목', '금', '토']
    .map((d, i) => `<div class="mp-wcal-dow ${i === 0 ? 'is-sun' : ''}">${d}</div>`).join('');
  const firstDow = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDow; i++) cells += '<span class="mp-wcal-day is-empty"></span>';
  for (let d = 1; d <= lastDate; d++) {
    const key = toLocalDateKey(new Date(year, month, d));
    const w = weights[key];
    const has = w !== undefined || logged[key];
    const cls = ['mp-wcal-day', key === todayKey ? 'is-today' : '', key === RecordState.date ? 'is-selected' : '', has ? 'has-weight' : ''].join(' ');
    cells += `<button type="button" class="${cls}" ${key > todayKey ? 'disabled' : ''} onclick="selectWeightCalendarDate('${key}')">
        <span>${d}</span>${w !== undefined ? `<span class="mp-wcal-w">${w.toFixed(1)}</span>` : (logged[key] ? '<span class="mp-wcal-dot"></span>' : '')}
      </button>`;
  }
  body.innerHTML = `
    <div class="mp-wcal-nav">
      <button type="button" onclick="moveWeightCalendarMonth(-1)" aria-label="이전 달"><i class="bi bi-chevron-left"></i></button>
      <strong>${year}년 ${month + 1}월</strong>
      <button type="button" onclick="moveWeightCalendarMonth(1)" aria-label="다음 달" ${isCurrentMonth ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
    </div>
    <div class="mp-wcal-grid">${cells}</div>
    <div class="small text-muted mt-2"><span class="mp-wcal-dot is-inline"></span>운동·식단만 기록한 날 · 숫자는 체중</div>`;
}

window.openWeightCalendar = openWeightCalendar;
window.moveWeightCalendarMonth = moveWeightCalendarMonth;
window.selectWeightCalendarDate = selectWeightCalendarDate;
window.openRecordDate = openRecordDate;
window.setRecordDate = setRecordDate;
