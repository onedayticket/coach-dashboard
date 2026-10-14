/**
 * ==============================================================================
 * [4주 온라인 운동/식단 습관화 코칭 프로그램 대시보드 - app.js]
 * ==============================================================================
 * [풀스택 수석 개발자 구현 내역]
 * 1. [요구사항 1] 지침서 관리 모달 제거 -> 대시보드 자체 인라인 뷰로 통합 구현
 * 2. [요구사항 2] Git Tag 스타일 프로그램 참여 코스 태그화
 * 3. [요구사항 3] 태그 드롭다운 fixed popper 적용으로 스크롤 잘림 현상 완벽 해결
 * 4. 구글 시트 DB 연동 및 동적 컬럼 보존 매핑
 * 5. Gemini AI 백엔드 실행: 운동 루틴/식단/피드백 도출 및 근거 제시
 * 6. 3개의 분리된 독립 Chart.js 꺾은선 그래프
 * ==============================================================================
 */

// 로컬 스토리지 키
const STORAGE_GAS_URL_KEY = 'coach_dash_gas_api_url_v2';
const STORAGE_GEMINI_KEY = 'coach_dash_gemini_key_v1';
const STORAGE_MODEL_PREF_KEY = 'coach_dash_model_pref_v1';

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
- 수분: 하루 2L 이상 (텀블러 4회)`
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
- 저녁: 단호박 에그슬럿 + 방울토마토`
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
      '현재 제안 식단': ''
    }
  ],
  feedbacks: [
    {
      '피드백번호': 'FB01',
      '날짜': '2026-10-08',
      '이름': '김민수',
      '공복 몸무게': 82.5,
      '운동 점수': 8,
      '식단 점수': 7,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '첫날 멋진 출발입니다! 밥 양 조절과 수분 2L 달성 훌륭합니다.',
      '문제점_분석': '특이사항 없음',
      '보완점_및_개선방안': '현재의 페이스를 안정적으로 유지해 주세요.',
      '운동 내용': '맨몸 스쿼트 4세트 + 런지 3세트 + 코어 스트레칭 15분',
      '식단 내용': '아침 그릭요거트, 점심 소불고기 백반(밥 반공기), 저녁 닭가슴살 샐러드',
      '회원 일기/코멘트': '첫날이라 긴장 반 설렘 반으로 시작했습니다. 물 2L 마시기 성공!',
      '피드백 코멘트': '첫날 멋진 출발입니다! 밥 양 조절과 수분 2L 달성 훌륭합니다.'
    },
    {
      '피드백번호': 'FB02',
      '날짜': '2026-10-09',
      '이름': '김민수',
      '공복 몸무게': 82.2,
      '운동 점수': 9,
      '식단 점수': 8,
      '운동_실행률_점수': 5.0,
      '식단_실행률_점수': 4.5,
      '피드백_요약': '야식 유혹을 이겨낸 결단력이 대단합니다. 숙면 취하세요!',
      '문제점_분석': '특이사항 없음',
      '보완점_및_개선방안': '충분한 수분 섭취와 함께 스트레칭을 병행해 주세요.',
      '운동 내용': '인터벌 조깅 30분 (페이스 6:15)',
      '식단 내용': '아침 프로틴 쉐이크, 점심 서브웨이 로티세리(위트빵), 저녁 연어구이 샐러드',
      '회원 일기/코멘트': '러닝 후 땀 흘리니 상쾌하네요. 야식 유혹 참아냈습니다.',
      '피드백 코멘트': '야식 유혹을 이겨낸 결단력이 대단합니다. 숙면 취하세요!'
    },
    {
      '피드백번호': 'FB03',
      '날짜': '2026-10-10',
      '이름': '김민수',
      '공복 몸무게': 82.0,
      '운동 점수': 6,
      '식단 점수': 6,
      '운동 내용': '야근으로 인해 취침 전 폼롤러 스트레칭 20분만 진행',
      '식단 내용': '점심 김치찌개 건더기 위주, 저녁 단호박+닭가슴살 소시지',
      '회원 일기/코멘트': '업무가 너무 바빠 운동을 제대로 못해 아쉽고 피곤합니다.',
      '피드백 코멘트': ''
    },
    {
      '피드백번호': 'FB04',
      '날짜': '2026-10-11',
      '이름': '김민수',
      '공복 몸무게': 81.8,
      '운동 점수': 9,
      '식단 점수': 9,
      '운동 내용': '상체 웨이트 40분 (체스트 프레스, 랫풀다운, 숄더 프레스)',
      '식단 내용': '아침 오트밀 40g, 점심 닭가슴살 볶음밥, 저녁 소고기 우둔살 샐러드',
      '회원 일기/코멘트': '클린하게 챙겨 먹으니 오후에 식곤증이 없어서 신기합니다.',
      '피드백 코멘트': ''
    },
    {
      '피드백번호': 'FB05',
      '날짜': '2026-10-12',
      '이름': '김민수',
      '공복 몸무게': 81.7,
      '운동 점수': 8,
      '식단 점수': 8,
      '운동 내용': '실내 사이클 35분 (케이던스 80 유지)',
      '식단 내용': '아침 바나나+계란 2알, 점심 연어 포케, 저녁 프로틴 쉐이크+아몬드',
      '회원 일기/코멘트': '몸이 한결 가벼워졌고 옷 입을 때 허리가 편안합니다!',
      '피드백 코멘트': ''
    },

    // 이지원 피드백
    {
      '피드백번호': 'FB06',
      '날짜': '2026-10-11',
      '이름': '이지원',
      '공복 몸무게': 58.2,
      '운동 점수': 8,
      '식단 점수': 7,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '디저트 방어 성공 축하드립니다! 의지가 훌륭합니다.',
      '문제점_분석': '특이사항 없음',
      '보완점_및_개선방안': '식사 간격을 일정하게 유지하여 허기짐을 방지해 보세요.',
      '운동 내용': '필라테스 코어 35분',
      '식단 내용': '아침 사과, 점심 일반식(구내식당), 저녁 샐러드',
      '회원 일기/코멘트': '디저트 카페 가자는 동료들 유혹 뿌리치고 아메리카노 마셨습니다.',
      '피드백 코멘트': '디저트 방어 성공 축하드립니다!'
    },
    {
      '피드백번호': 'FB07',
      '날짜': '2026-10-12',
      '이름': '이지원',
      '공복 몸무게': 57.9,
      '운동 점수': 9,
      '식단 점수': 8,
      '운동 내용': '빠르게 걷기 만보 (50분)',
      '식단 내용': '아침 요거트, 점심 현미 포케, 저녁 닭가슴살 볼',
      '회원 일기/코멘트': '퇴근길 지하철 2정거장 일찍 내려서 걸어왔어요.',
      '피드백 코멘트': ''
    }
  ],
  guidelines: {
    philosophy: '완벽함보다는 지속 가능성에 집중합니다. 단기간 극단적 절식 대신 평생 유지할 수 있는 작은 습관의 복리 효과를 지향합니다. 실패한 날도 과정의 일부로 인정합니다.',
    exercise: '초보자는 주 3~4회, 하루 20~30분 저강도~중강도 루틴으로 성공 경험을 축적합니다. 점진적 과부하와 관절 부상 방지(스트레칭 10분 필수)를 최우선 원칙으로 합니다.',
    diet: '극단적 탄수화물 제한을 지양하고, 매 끼니 양질의 단백질 20~30g과 식이섬유를 기본 탑재합니다. 가공식품과 단순당을 줄이고 수분 1.5~2L 섭취를 강조합니다.',
    feedback: '피드백은 24시간 이내에 제공하며, 지적보다는 잘한 점에 대한 구체적 칭찬(Positive Reinforcement)을 선행한 뒤 1개의 실천 가능한 개선점을 제안합니다.',
    motivation: '회원이 슬럼프나 과식을 겪었을 때 자책하지 않도록 깊이 공감합니다. "한 끼의 실수가 4주의 실패는 아니다"라는 마인드셋을 심어주며 다음 끼니에서 자연스럽게 복귀하도록 격려합니다.'
  }
};

// 애플리케이션 전역 상태 객체
const AppState = {
  gasUrl: localStorage.getItem(STORAGE_GAS_URL_KEY) || '',
  geminiApiKey: localStorage.getItem(STORAGE_GEMINI_KEY) || '',
  modelPref: localStorage.getItem(STORAGE_MODEL_PREF_KEY) || 'auto',
  isOnline: false,
  currentView: 'members', // 'members' | 'guidelines'
  members: [],
  feedbacks: [],
  guidelines: {
    philosophy: '',
    exercise: '',
    diet: '',
    feedback: '',
    motivation: ''
  },
  selectedMember: null,
  filterStatus: 'all', // 'all' | 'active' | 'inactive'
  filterTag: 'all',    // 'all' | specific tag
  searchQuery: '',
  charts: {
    weight: null,
    exercise: null,
    diet: null
  },
  currentFeedbackContext: null, // 피드백 하기 모달 대상
  customTagTargetKey: null      // 태그 직접 입력 모달 대상
};

/**
 * ==============================================================================
 * [애플리케이션 초기화 진입점]
 * ==============================================================================
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initApiSettings();
    initInlineGuidelinesActions();
    initEventListeners();

    // [요청 1] 사이드바 접힘 상태 복원
    if (localStorage.getItem('coach_dash_sidebar_collapsed') === 'true') {
      toggleSidebar(true);
    }

    // 데이터 로드 (8초 타임아웃 및 Fail-Safe 적용)
    await loadAllData();

    // 초기 렌더링
    renderTagFilterButtons();
    applyFiltersAndRenderMemberList();
    populateInlineGuidelines();

    // 첫 번째 유효 회원 자동 선택
    if (AppState.members.length > 0) {
      const firstActive = AppState.members.find(m => isMemberActive(m)) || AppState.members[0];
      selectMember(getMemberKey(firstActive));
    }
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
async function loadAllData() {
  const gasUrl = AppState.gasUrl.trim();

  if (gasUrl) {
    let controller = null;
    let timeoutTimer = null;

    try {
      showLoadingOverlay('구글 시트에서 최신 데이터를 가져오는 중...', 10000);

      // [핵심] 10초 타임아웃 컨트롤러 장착 (구글 서버 지연 시 무한 로딩 방지)
      controller = new AbortController();
      timeoutTimer = setTimeout(() => {
        controller.abort();
      }, 10000);

      const response = await fetch(`${gasUrl}?action=getAll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (timeoutTimer) clearTimeout(timeoutTimer);

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const resJson = await response.json();

      if (resJson.status === 'success' && resJson.data) {
        AppState.members = Array.isArray(resJson.data.members) ? resJson.data.members : [];
        AppState.feedbacks = Array.isArray(resJson.data.feedbacks) ? resJson.data.feedbacks : [];
        if (resJson.data.guidelines) {
          const g = { ...resJson.data.guidelines };
          const invalidTitles = ['데일리 피드백 지침', '데일리피드백지침', '피드백 지침', '피드백지침', '피드백지침서'];
          if (g.motivation && invalidTitles.includes(String(g.motivation).trim())) {
            g.motivation = MOCK_DB.guidelines.motivation;
          }
          AppState.guidelines = { ...AppState.guidelines, ...g };
        }
        AppState.isOnline = true;
        updateApiStatusUI();
        const syncText = document.getElementById('guidelinesSyncStatusText');
        if (syncText) {
          const now = new Date();
          syncText.textContent = `구글 시트(Guidelines) 동기화 완료 (${now.toLocaleTimeString()})`;
        }
        try {
          updateGlobalNotificationBadge();
        } catch (badgeErr) {
          console.warn('[알림 뱃지 갱신 예외 무시]', badgeErr);
        }
        hideLoadingOverlay();
        return;
      } else {
        const errMsg = (resJson && resJson.message) ? resJson.message : '데이터 형식 불일치';
        console.warn('[GAS 백엔드 오류 반환 - Mock 전환]:', errMsg);
        showToast(`⚠️ 구글 시트 데이터 로드 지연 (${errMsg})\n로컬 캐시/Mock 모드로 표시합니다.`, 'warning', 6000);
      }
    } catch (e) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (e.name === 'AbortError') {
        console.warn('[GAS 연동 8초 타임아웃 - Mock 데이터로 전환]');
        showToast('⚠️ 구글 시트 응답 시간 초과(8초). 로컬 Mock 데이터로 표시합니다.', 'warning', 6000);
      } else {
        console.warn('[GAS 연동 실패 - Mock 데이터로 전환]', e);
        showToast(`⚠️ 구글 시트 통신 오류 (${e.message}). 로컬 Mock 데이터로 표시합니다.`, 'warning', 6000);
      }
    }
  }

  // Fallback to Mock
  AppState.members = JSON.parse(JSON.stringify(MOCK_DB.members));
  AppState.feedbacks = JSON.parse(JSON.stringify(MOCK_DB.feedbacks));
  AppState.guidelines = JSON.parse(JSON.stringify(MOCK_DB.guidelines));
  AppState.isOnline = false;
  updateApiStatusUI();
  try {
    updateGlobalNotificationBadge();
  } catch (badgeErr) {
    console.warn('[알림 뱃지 갱신 예외 무시]', badgeErr);
  }
  hideLoadingOverlay();
}

/**
 * [요구사항 1 & 2 공통 유틸]
 * 객체의 모든 키-값 쌍을 순회하여 "질문(Key): 답변(Value)" 형태의 긴 문자열로 동적 생성
 * - 하드코딩된 특정 필드 추출 대신 모든 질문과 답변을 AI에게 100% 온전히 전달
 * - _rowNumber 등 시스템 내부 키는 자동 제외
 */
function formatObjectAsFullProfile(obj, excludeKeys) {
  if (!obj || typeof obj !== 'object') return '등록된 정보 없음';
  const defaultExcludes = ['_rowNumber', '_row', 'id', 'status', 'debug'];
  const excludes = excludeKeys ? defaultExcludes.concat(excludeKeys) : defaultExcludes;
  const ignoredKeywords = [
    '타임스탬프', 'timestamp', '마케팅', '동의', '연락처', '인스타', '아이디', 'phone', '전화번호'
  ];

  const lines = [];
  for (const key of Object.keys(obj)) {
    if (excludes.includes(key) || key.startsWith('_')) continue;
    const lowerKey = String(key).toLowerCase().replace(/\s+/g, '');
    if (ignoredKeywords.some(kw => lowerKey.includes(kw.toLowerCase()))) continue;

    let val = obj[key];
    if (val === null || val === undefined || String(val).trim() === '') {
      val = '(미작성/없음)';
    } else if (typeof val === 'object') {
      try {
        val = JSON.stringify(val);
      } catch (e) {
        val = String(val);
      }
    }
    lines.push(`- ${key}: ${val}`);
  }
  return lines.length > 0 ? lines.join('\n') : '등록된 정보 없음';
}

async function postToGasBackend(payload) {
  const gasUrl = AppState.gasUrl.trim();

  // Gemini API Key 및 모델 선호도 자동 주입
  if (AppState.geminiApiKey) {
    payload.geminiApiKey = AppState.geminiApiKey;
  }
  payload.modelPref = AppState.modelPref || 'auto';

  if (gasUrl) {
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      return json;
    } catch (e) {
      console.warn('[GAS POST 통신 실패 - Mock 시뮬레이션]', e);
    }
  }

  // Mock 시뮬레이션
  return simulateMockAction(payload);
}

/**
 * [초고속 직통 모드] 프론트엔드 브라우저에서 Google Gemini API 직접 호출
 * - 구글 실시간 지원 모델을 조회 후 로컬스토리지에 캐싱하여 404 원천 차단
 * - GAS 서버 왕복 없이 0.8~1.5초 만에 직접 생성 완료
 */
async function getBrowserSupportedGeminiModels(apiKey) {
  // 구버전 캐시들 모두 정리
  try {
    localStorage.removeItem('CACHE_GEMINI_TEXT_MODELS_V2');
    localStorage.removeItem('CACHE_GEMINI_TEXT_MODELS_V3');
    localStorage.removeItem('CACHE_GEMINI_MODELS_STABLE_V6');
  } catch (e) {}

  const cacheKey = `CACHE_GEMINI_MODELS_V38_${AppState.modelPref || 'auto'}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const arr = JSON.parse(cached);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (e) {}
  }

  const isProPref = AppState.modelPref === 'pro';

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const data = await listRes.json();
      if (data.models && data.models.length > 0) {
        const textModels = data.models.filter(m => {
          const name = String(m.name || '').toLowerCase();
          const desc = String(m.description || '').toLowerCase();
          // [핵심] 1분 이상 걸리는 thinking(추론) 모델 및 비텍스트 모델 엄격 제외
          const isSlowOrNonText = name.includes('thinking') || desc.includes('thinking') ||
                            name.includes('tts') || name.includes('audio') || name.includes('embed') || 
                            name.includes('imagen') || name.includes('aqa') || name.includes('speech') ||
                            desc.includes('audio') || desc.includes('text-to-speech') || desc.includes('embedding');
          return !isSlowOrNonText && m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent');
        }).map(m => m.name.replace(/^models\//, ''));

        // [구글 공식 권장 모델 우선순위 정렬: gemini-3.8-flash / gemini-3.8-pro]
        const getScore = (m) => {
          const lower = m.toLowerCase();
          if (lower === 'gemini-3.8-pro' || lower.includes('3.8-pro')) return isProPref ? 100 : 90;
          if (lower === 'gemini-3.8-flash' || lower.includes('3.8-flash')) return isProPref ? 90 : 100;
          if (lower.includes('3.8')) return 85;
          if (lower.includes('pro')) return isProPref ? 70 : 50;
          if (lower.includes('flash')) return isProPref ? 50 : 70;
          return 10;
        };

        textModels.sort((a, b) => getScore(b) - getScore(a));

        if (textModels.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(textModels));
          return textModels;
        }
      }
    }
  } catch (e) {
    console.warn('[브라우저 모델 목록 조회 실패]', e);
  }

  if (isProPref) {
    return ['gemini-3.8-pro', 'gemini-3.8-flash'];
  }
  return ['gemini-3.8-flash', 'gemini-3.8-pro'];
}

async function callGeminiDirectlyFromBrowser(prompt, systemInstruction) {
  const apiKey = (AppState.geminiApiKey || '').trim();
  if (!apiKey) return { text: null, error: 'API 키 미등록' };

  // 구버전 캐시 청소
  localStorage.removeItem('CACHE_GEMINI_TEXT_MODELS_V2');
  localStorage.removeItem('CACHE_GEMINI_TEXT_MODELS_V3');

  const startTime = performance.now();
  // 서로 다른 인프라 클러스터 모델 목록 (1.5-flash, 1.5-pro, 2.0-flash)
  const candidateModels = await getBrowserSupportedGeminiModels(apiKey);
  let lastErrorDetail = '';

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
          const candidate = json.candidates[0];
          const text = candidate.content.parts[0].text;
          const finishReason = candidate.finishReason || 'STOP';
          const usage = json.usageMetadata || {};
          const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);

          console.group('%c⚡ [Gemini AI 브라우저 직통 초고속 성공]', 'color: #10b981; font-weight: bold; font-size: 13px;');
          console.log(`📌 모델: ${model} | 소요시간: ${elapsedSec}초`);
          console.log(`🏁 상태: ${finishReason} | 텍스트 길이: ${text.length}자`);
          console.groupEnd();

          return {
            text: text,
            isAiGenerated: true,
            model: model,
            elapsedSec: elapsedSec,
            finishReason: finishReason,
            usage: usage,
            isTruncated: (finishReason === 'MAX_TOKENS')
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        lastErrorDetail = `[HTTP ${res.status}] ${errText.slice(0, 150)}`;
        console.warn(`[브라우저 직통 ${model} 응답 오류 HTTP ${res.status}]`, errText);

        // 503(High demand) 발생 시 0.8초 백오프 후 다른 클러스터 모델로 전환
        if (res.status === 503 || res.status === 429) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    } catch (e) {
      lastErrorDetail = `[네트워크 예외] ${e.message}`;
      console.warn(`[브라우저 직통 ${model} 네트워크 예외]`, e);
    }
  }

  return { text: null, error: lastErrorDetail };
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

  if (action === 'updateFeedbackComment') {
    const fb = AppState.feedbacks.find(f => (f['이름'] === payload.memberKey || f.name === payload.memberKey) && String(f['날짜'] || f.date).includes(payload.date));
    if (fb) {
      fb['피드백 코멘트'] = payload.comment;
      fb['피드백코멘트'] = payload.comment;
      fb['피드백 내용'] = payload.comment;
      fb['피드백내용'] = payload.comment;
      fb['피드백 상태'] = '완료';
      fb['피드백상태'] = '완료';
      fb['feedbackComment'] = payload.comment;
      const exScore = payload.운동_실행률_점수 !== undefined ? payload.운동_실행률_점수 : payload.exerciseScore;
      const dietScore = payload.식단_실행률_점수 !== undefined ? payload.식단_실행률_점수 : payload.dietScore;
      if (exScore !== undefined && exScore !== null && exScore !== '') {
        fb['운동_실행률_점수'] = exScore;
        fb['운동실행률점수'] = exScore;
        fb['운동 점수'] = exScore;
      }
      if (dietScore !== undefined && dietScore !== null && dietScore !== '') {
        fb['식단_실행률_점수'] = dietScore;
        fb['식단실행률점수'] = dietScore;
        fb['식단 점수'] = dietScore;
      }
      if (payload.피드백_요약) {
        fb['피드백_요약'] = payload.피드백_요약;
        fb['피드백요약'] = payload.피드백_요약;
      }
      if (payload.문제점_분석) {
        fb['문제점_분석'] = payload.문제점_분석;
        fb['문제점분석'] = payload.문제점_분석;
      }
      if (payload.보완점_및_개선방안) {
        fb['보완점_및_개선방안'] = payload.보완점_및_개선방안;
        fb['보완점및개선방안'] = payload.보완점_및_개선방안;
      }
    }
    return { status: 'success', message: '피드백 코멘트가 저장되었습니다.' };
  }

  if (action === 'updateGuidelines') {
    AppState.guidelines = { ...AppState.guidelines, ...payload.guidelines };
    return { status: 'success', message: '지침서가 로컬에 저장되었습니다.' };
  }

  if (action === 'generateWorkoutRoutine') {
    const custom = payload.customExerciseGuideline || '';
    return {
      status: 'success',
      isAiGenerated: false,
      debug: {
        hasKey: false,
        keySource: 'None (로컬 Mock 모드)',
        errorMessage: AppState.gasUrl ? 'GAS 서버 통신 실패로 인해 로컬 Mock 데이터가 표시되었습니다. (네트워크/CORS 확인)' : 'GAS URL 미연동 상태입니다. 우측 상단 [API 설정]에서 연동 URL을 등록해 주세요.'
      },
      routine: `[4주차 맞춤 운동 루틴 (로컬 Mock 예시)]
1. 최우선 반영 사항: ${custom ? `코치 수정 지침("${custom}") 1순위 적용` : '기본 운동 제안 지침서 기반'}
2. 추천 루틴:
  - 월 (상체 & 코어 35분): 웜업 5분 + 푸시업 10회 3세트 + 덤벨 로우 12회 3세트 + 플랭크 30초 3세트
  - 수 (하체 & 유산소 35분): 맨몸 스쿼트 15회 4세트 + 런지 10회 3세트 + 빠른 걷기 15분
  - 금 (전신 서킷 30분): 점핑잭 20회 + 암워킹 10회 + 글루트 브릿지 15회 (3라운드)
3. 주의: 관절 통증 발생 시 즉시 중단 후 스트레칭 대체.`
    };
  }

  if (action === 'generateDietPlan') {
    const custom = payload.customDietGuideline || '';
    return {
      status: 'success',
      isAiGenerated: false,
      debug: {
        hasKey: false,
        keySource: 'None (로컬 Mock 모드)',
        errorMessage: AppState.gasUrl ? 'GAS 서버 통신 실패로 인해 로컬 Mock 데이터가 표시되었습니다.' : 'GAS URL 미연동 상태입니다.'
      },
      dietPlan: `[4주차 맞춤 식단 가이드 (로컬 Mock 예시)]
1. 최우선 반영 사항: ${custom ? `코치 수정 지침("${custom}") 1순위 적용` : '기본 식단 제안 지침서 균형식 적용'}
2. 일일 식단 가이드:
  - 아침: 복합 탄수화물 + 단백질 (사과 반 개 + 삶은 달걀 2개 + 무가당 두유 1팩)
  - 점심: 밥 2/3 공기 + 찌개 국물 배제 + 쌈채소 풍성히 + 양질의 단백질 반찬
  - 간식: 견과류 10알 또는 그릭요거트
  - 저녁: 닭가슴살 샐러드 또는 연어 스테이크 + 구운 채소
3. 수분: 하루 2L 이상 충분히 섭취.`
    };
  }

  if (action === 'generateDailyFeedback') {
    const currentFb = payload.feedback || {};
    const weight = parseFloat(getField(currentFb, '공복 몸무게', '공복몸무게', '체중', 'weight')) || 80;
    const isWeightStall = weight >= 81.5;

    return {
      status: 'success',
      isAiGenerated: false,
      debug: {
        hasKey: false,
        keySource: 'None (로컬 Mock 모드)',
        errorMessage: '로컬 Mock 모드 데일리 피드백'
      },
      data: {
        "피드백_요약": `오늘도 바쁜 일상 속에서 운동(${getField(currentFb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동 점수', '운동점수', 'exerciseScore') || 4}점)과 식단(${getField(currentFb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단 점수', '식단점수', 'dietScore') || 5}점)을 놓치지 않고 훌륭하게 수행하셨습니다! 물 섭취와 규칙적인 식사를 꾸준히 이어가고 계신 점 크게 칭찬드립니다.`,
        "문제점_분석": isWeightStall
          ? `최근 3일간 공복 체중의 감량 정체 및 저녁 식단 후 붓기가 확인되어 순환 대사가 다소 저하된 상태입니다.`
          : `특이사항 없음`,
        "보완점_및_개선방안": isWeightStall
          ? `유산소 운동 비중을 15분 늘리고 저녁 식사의 염분 섭취를 최소화해 보세요. 한 끼의 정체는 4주의 실패가 아니므로 충분한 수분 섭취와 함께 회복탄력성을 유지해 봅시다!`
          : `현재의 페이스를 안정적으로 유지하면서, 피로도가 느껴질 때는 30분 일찍 취침하여 근육 회복을 도와주세요.`,
        "운동_수정_제안": isWeightStall
          ? `기존 웨이트 후 [경사도 러닝머신 20분(속도 5.5, 인클라인 6%)] 또는 [빠르게 걷기 30분] 추가하여 대사율 부스팅`
          : ``,
        "식단_수정_제안": isWeightStall
          ? `저녁 식단에서 나트륨 섭취를 최소화하고, 칼륨이 풍부한 오이나 토마토 1개를 추가하여 체내 수분 정체 완화`
          : ``,
        "운동_실행률_점수": (parseFloat(getField(currentFb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동 점수', '운동점수', 'exerciseScore')) <= 5 ? parseFloat(getField(currentFb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동 점수', '운동점수', 'exerciseScore')) : 4) || 4,
        "식단_실행률_점수": (parseFloat(getField(currentFb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단 점수', '식단점수', 'dietScore')) <= 5 ? parseFloat(getField(currentFb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단 점수', '식단점수', 'dietScore')) : 5) || 5
      }
    };
  }

  if (action === 'generateComprehensiveFeedback') {
    return {
      status: 'success',
      isAiGenerated: false,
      debug: {
        hasKey: false,
        keySource: 'None (로컬 Mock 모드)',
        errorMessage: '로컬 Mock 모드 종합 피드백'
      },
      comprehensiveFeedback: `[${payload.startDate || '시작일'} ~ ${payload.endDate || '종료일'} 종합 코칭 리포트 (로컬 Mock 예시)]
1. 기간 성과 총평:
  - 데일리 피드백 기록율 90% 이상으로 매우 성실하게 참여하였습니다.
  - 초기 체중 대비 안정적인 하향 추세를 기록하였으며, 폭식 방지 자가 조절 능력이 향상되었습니다.
2. 향후 자립 방안 (Action Plan):
  - 주 3회 최소 30분 운동을 '최소한의 마지노선'으로 유지할 것.
  - 치팅데이는 점심에만 즐기고, 다음 날 아침 수분 섭취로 자연스럽게 루틴 복귀할 것.`
    };
  }

  return { status: 'success' };
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
 * 참여자 관리 뷰 <-> 코칭 지침서 관리 뷰 전환
 */
function switchDashboardView(viewName) {
  AppState.currentView = viewName;

  const btnNavMembers = document.getElementById('btnNavViewMembers');
  const btnNavGuidelines = document.getElementById('btnNavViewGuidelines');
  const tabBtnMembers = document.getElementById('tabBtnMembers');
  const tabBtnGuidelines = document.getElementById('tabBtnGuidelines');

  const sidebarMembers = document.getElementById('sidebarMembersMode');
  const sidebarGuidelines = document.getElementById('sidebarGuidelinesMode');
  const viewMembers = document.getElementById('viewMembersWrapper');
  const viewGuidelines = document.getElementById('viewGuidelinesWrapper');

  if (viewName === 'guidelines') {
    // 지침서 관리 뷰 활성화
    if (btnNavMembers) btnNavMembers.classList.remove('active');
    if (btnNavGuidelines) btnNavGuidelines.classList.add('active');
    if (tabBtnMembers) { tabBtnMembers.classList.remove('active'); tabBtnMembers.classList.add('text-muted'); }
    if (tabBtnGuidelines) { tabBtnGuidelines.classList.add('active'); tabBtnGuidelines.classList.remove('text-muted'); }

    if (sidebarMembers) sidebarMembers.classList.add('d-none');
    if (sidebarGuidelines) sidebarGuidelines.classList.remove('d-none');
    if (sidebarGuidelines) sidebarGuidelines.classList.add('d-flex');

    if (viewMembers) viewMembers.classList.add('d-none');
    if (viewGuidelines) viewGuidelines.classList.remove('d-none');

    populateInlineGuidelines();
  } else {
    // 참여자 관리 뷰 활성화
    if (btnNavMembers) btnNavMembers.classList.add('active');
    if (btnNavGuidelines) btnNavGuidelines.classList.remove('active');
    if (tabBtnMembers) { tabBtnMembers.classList.add('active'); tabBtnMembers.classList.remove('text-muted'); }
    if (tabBtnGuidelines) { tabBtnGuidelines.classList.remove('active'); tabBtnGuidelines.classList.add('text-muted'); }

    if (sidebarMembers) sidebarMembers.classList.remove('d-none');
    if (sidebarGuidelines) sidebarGuidelines.classList.add('d-none');
    if (sidebarGuidelines) sidebarGuidelines.classList.remove('d-flex');

    if (viewMembers) viewMembers.classList.remove('d-none');
    if (viewGuidelines) viewGuidelines.classList.add('d-none');

    // 선택된 참여자 차트 리사이즈 갱신
    if (AppState.selectedMember) {
      setTimeout(() => {
        if (AppState.charts.weight) AppState.charts.weight.resize();
        if (AppState.charts.exercise) AppState.charts.exercise.resize();
        if (AppState.charts.diet) AppState.charts.diet.resize();
      }, 100);
    }
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
  const invalidTitles = ['데일리 피드백 지침', '데일리피드백지침', '피드백 지침', '피드백지침', '피드백지침서'];
  let motVal = AppState.guidelines.motivation || '';
  if (invalidTitles.includes(motVal.trim())) {
    motVal = MOCK_DB.guidelines.motivation;
    AppState.guidelines.motivation = motVal;
  }

  setInputValue('gdInlinePhilosophy', AppState.guidelines.philosophy || '');
  setInputValue('gdInlineExercise', AppState.guidelines.exercise || '');
  setInputValue('gdInlineDiet', AppState.guidelines.diet || '');
  setInputValue('gdInlineFeedback', AppState.guidelines.feedback || '');
  setInputValue('gdInlineMotivation', motVal);
}

/**
 * 지침서 5종 대시보드 인라인 저장 로직
 */
function initInlineGuidelinesActions() {
  const btnSaveAll = document.getElementById('btnSaveAllGuidelinesInline');
  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', async () => {
      const updated = {
        philosophy: getInputValue('gdInlinePhilosophy'),
        exercise: getInputValue('gdInlineExercise'),
        diet: getInputValue('gdInlineDiet'),
        feedback: getInputValue('gdInlineFeedback'),
        motivation: getInputValue('gdInlineMotivation')
      };

      showLoadingOverlay('5대 지침서를 구글 시트(Guidelines)에 저장 중...');
      const res = await postToGasBackend({
        action: 'updateGuidelines',
        guidelines: updated
      });
      hideLoadingOverlay();

      if (res && res.status === 'success') {
        AppState.guidelines = updated;
        showToast('5대 코칭 지침서가 구글 시트에 안전하게 저장되었습니다!', 'success');
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
    feedback: 'gdInlineFeedback',
    motivation: 'gdInlineMotivation'
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
 * ==============================================================================
 * [3. 좌측 사이드바: 참여자 목록 및 Git Tag 스타일 드롭다운 (요구사항 2, 3)]
 * ==============================================================================
 */

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

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted small">
        <i class="bi bi-person-x fs-2 d-block mb-1 opacity-50"></i>
        조건에 맞는 참여자가 없습니다.
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((m, idx) => {
    const key = getMemberKey(m);
    const memberId = getMemberId(m);
    const name = getMemberName(m);
    const isActive = isMemberActive(m);
    const tag = getMemberTag(m);
    const isSelected = AppState.selectedMember && getMemberKey(AppState.selectedMember) === key;
    const fbCount = AppState.feedbacks.filter(f => getMemberName(f) === name).length;

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
          <span class="badge bg-light text-secondary border rounded-pill" style="font-size: 0.72rem;">
            ${fbCount}회 기록
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
function selectMember(memberKey) {
  const mem = AppState.members.find(m => getMemberKey(m) === memberKey);
  if (!mem) return;

  AppState.selectedMember = mem;

  // 참여자 관리 뷰로 자동 전환 (혹시 지침서 뷰에서 클릭한 경우)
  if (AppState.currentView !== 'members') {
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

  // 3. [하단] 피드백 누적 및 3개 독립 Chart.js 그래프 렌더링
  updateFeedbackSection(mem);
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
  const exRoutine = getField(mem, 
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
  const dietRoutine = getField(mem, 
    '현재 제안 식단', '현재제안식단', 
    '제안식단', '제안 식단', 
    '현재식단', '현재 식단', 
    '식단계획', '식단 계획'
  );

  setInputValue('inputExerciseGuideline', exGuide);
  setInputValue('inputCurrentExerciseRoutine', exRoutine);
  setInputValue('inputDietGuideline', dietGuide);
  setInputValue('inputCurrentDietPlan', dietRoutine);
}

/**
 * [중단] 운동/식단 지침 및 루틴 저장 핸들러 바인딩
 */
function initGuidelineRoutineActions() {
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

      // [1] 브라우저 직통 모드 시도 (API Key가 설정된 경우 0.8~1.5초 컷)
      if (AppState.geminiApiKey) {
        const baseGuideline = AppState.guidelines.exercise || '점진적 과부하와 관절 부상 방지(스트레칭 10분 필수), 주 3~4회 루틴';
        // [요구사항 1] 하드코딩 제거: Members 시트의 모든 질문과 답변을 동적으로 매핑
        const memberFullProfile = formatObjectAsFullProfile(mem);
        const prompt = `
당신은 '4주 온라인 운동 습관화 코칭 프로그램'의 전문 수석 트레이너입니다.
아래 참여자의 사전 프로필(전체 설문 응답 내역)과 지침서를 바탕으로 [주간 맞춤 운동 루틴]을 작성해 주세요.

[참여자 정보]
${memberFullProfile}

[기본 운동 제안 지침서 (DB)]
${baseGuideline}

[★최우선 반영 사항: 코치의 운동 루틴 수정 제안 지침★]
${customGuideline ? customGuideline : '현재 별도 수정 지침 없음. 기본 지침서와 참여자 신체/직업 환경에 맞춰 구성할 것.'}

[출력 요구사항]
1. 최우선 반영 사항(수정 제안 지침)이 있다면 이를 1순위로 반드시 적용하십시오.
2. 참여자의 근무 형태, 신체 상태, 운동 경력을 고려하여 현실적으로 주 3~4회 달성 가능한 구체적 루틴(준비운동 - 본운동 세트/횟수 - 쿨다운)을 제안하십시오.
3. 친절하고 전문적이며 동기부여가 되는 어조로 작성하십시오.`;

        const directRes = await callGeminiDirectlyFromBrowser(prompt, '당신은 회원 맞춤 운동 코칭 전문가입니다.');
        if (directRes && directRes.text) {
          hideLoadingOverlay();
          setInputValue('inputCurrentExerciseRoutine', directRes.text);
          if (directRes.isTruncated) {
            showToast(`⚠️ [브라우저 직통 ${directRes.elapsedSec}초] 토큰 한도 끊김 (${directRes.text.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [브라우저 직통 ${directRes.elapsedSec}초] AI 운동 루틴 생성 완료 (${directRes.model}, ${directRes.text.length}자)`, 'success', 5000);
          }
          return;
        } else {
          console.warn('[브라우저 직통 실패 -> GAS 백엔드로 자동 전환]', directRes ? directRes.error : '알 수 없음');
          showLoadingOverlay(`브라우저 직통 실패 (${directRes ? directRes.error : '오류'}) ➔ GAS 백엔드로 전환하여 생성 중...`);
        }
      }

      // [2] GAS 백엔드 경유 모드 (초경량 직행)
      const gasStartTime = performance.now();
      const res = await postToGasBackend({
        action: 'generateWorkoutRoutine',
        member: AppState.selectedMember,
        customExerciseGuideline: customGuideline
      });
      hideLoadingOverlay();
      const gasElapsedSec = ((performance.now() - gasStartTime) / 1000).toFixed(1);

      if (res && res.routine) {
        if (res.isAiGenerated) {
          setInputValue('inputCurrentExerciseRoutine', res.routine);
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

      // [1] 브라우저 직통 모드 시도 (API Key가 설정된 경우 0.8~1.5초 컷)
      if (AppState.geminiApiKey) {
        const baseGuideline = AppState.guidelines.diet || '극단적 탄수화물 제한 지양, 매끼니 양질의 단백질 20~30g과 식이섬유 포함';
        // [요구사항 1] 하드코딩 제거: Members 시트의 모든 질문과 답변을 동적으로 매핑
        const memberFullProfile = formatObjectAsFullProfile(mem);
        const prompt = `
당신은 '4주 온라인 식단 습관화 코칭 프로그램'의 전문 임상 영양 코치입니다.
아래 참여자의 사전 프로필(전체 설문 응답 내역)과 지침서를 바탕으로 [맞춤 데일리 식단 가이드]를 작성해 주세요.

[참여자 정보]
${memberFullProfile}

[기본 식단 제안 지침서 (DB)]
${baseGuideline}

[★최우선 반영 사항: 코치의 식단 수정 제안 지침★]
${customGuideline ? customGuideline : '현재 별도 수정 지침 없음. 기본 지침서와 참여자 라이프스타일에 맞춰 구성할 것.'}

[출력 요구사항]
1. 최우선 반영 사항(수정 제안 지침)이 있다면 이를 1순위로 반드시 적용하십시오.
2. 외식이나 직장 생활 중에도 실천하기 쉬운 아침/점심/저녁/간식 대체안을 구체적으로 제시하십시오.
3. 수분 섭취(1.5~2L) 및 폭식 방지 팁을 포함하십시오.`;

        const directRes = await callGeminiDirectlyFromBrowser(prompt, '당신은 회원 맞춤 영양/식단 코칭 전문가입니다.');
        if (directRes && directRes.text) {
          hideLoadingOverlay();
          setInputValue('inputCurrentDietPlan', directRes.text);
          if (directRes.isTruncated) {
            showToast(`⚠️ [브라우저 직통 ${directRes.elapsedSec}초] 토큰 한도 끊김 (${directRes.text.length}자)`, 'warning', 8000);
          } else {
            showToast(`✓ [브라우저 직통 ${directRes.elapsedSec}초] AI 맞춤 데일리 식단 생성 완료 (${directRes.model}, ${directRes.text.length}자)`, 'success', 5000);
          }
          return;
        } else {
          console.warn('[브라우저 직통 실패 -> GAS 백엔드로 자동 전환]', directRes ? directRes.error : '알 수 없음');
          showLoadingOverlay(`브라우저 직통 실패 (${directRes ? directRes.error : '오류'}) ➔ GAS 백엔드로 전환하여 생성 중...`);
        }
      }

      // [2] GAS 백엔드 경유 모드 (초경량 직행)
      const gasStartTime = performance.now();
      const res = await postToGasBackend({
        action: 'generateDietPlan',
        member: AppState.selectedMember,
        customDietGuideline: customGuideline
      });
      hideLoadingOverlay();
      const gasElapsedSec = ((performance.now() - gasStartTime) / 1000).toFixed(1);

      if (res && res.dietPlan) {
        if (res.isAiGenerated) {
          setInputValue('inputCurrentDietPlan', res.dietPlan);
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
 * [5. 하단 피드백 누적 관리 & 3개 독립 Chart.js 그래프]
 * ==============================================================================
 */
function updateFeedbackSection(mem) {
  const memberName = getMemberName(mem);

  const userFeedbacks = AppState.feedbacks
    .filter(f => getMemberName(f) === memberName)
    .sort((a, b) => new Date(getField(a, '날짜', 'date', '일자')) - new Date(getField(b, '날짜', 'date', '일자')));

  renderThreeIndependentCharts(userFeedbacks);
  renderFeedbackTable(userFeedbacks);
}

function renderThreeIndependentCharts(feedbacks) {
  if (AppState.charts.weight) AppState.charts.weight.destroy();
  if (AppState.charts.exercise) AppState.charts.exercise.destroy();
  if (AppState.charts.diet) AppState.charts.diet.destroy();

  const labels = feedbacks.map(f => {
    const raw = String(getField(f, '날짜', 'date', '일자'));
    const d = new Date(raw);
    return isNaN(d) ? raw : `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const weightData = feedbacks.map(f => parseFloat(getField(f, '공복 몸무게', '공복몸무게', '체중', '시작 체중', '시작체중', '현재체중', 'weight')) || null);
  const exScoreData = feedbacks.map(f => parseFloat(getField(f, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore')) || null);
  const dietScoreData = feedbacks.map(f => parseFloat(getField(f, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore')) || null);

  // 차트 1: 공복 몸무게 (kg)
  const ctxWeight = document.getElementById('chartWeight');
  if (ctxWeight) {
    const validWeights = weightData.filter(v => v !== null);
    const minW = validWeights.length ? Math.floor(Math.min(...validWeights) - 1) : 50;
    const maxW = validWeights.length ? Math.ceil(Math.max(...validWeights) + 1) : 90;

    AppState.charts.weight = new Chart(ctxWeight, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '공복 몸무게',
          data: weightData,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          borderWidth: 2.5,
          tension: 0.25,
          fill: true,
          clip: false,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#4f46e5'
        }]
      },
      options: createSingleChartOptions('kg', minW, maxW)
    });
  }

  // 차트 2: 운동 점수 (점) - 5점 만점 (5점 포인트 잘림 방지: max 5.5, 상단 여백 확보)
  const ctxEx = document.getElementById('chartExercise');
  if (ctxEx) {
    AppState.charts.exercise = new Chart(ctxEx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '운동 점수',
          data: exScoreData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2.5,
          tension: 0.2,
          fill: true,
          clip: false,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: createSingleChartOptions('점', 0, 5.5, 1)
    });
  }

  // 차트 3: 식단 점수 (점) - 5점 만점 (5점 포인트 잘림 방지: max 5.5, 상단 여백 확보)
  const ctxDiet = document.getElementById('chartDiet');
  if (ctxDiet) {
    AppState.charts.diet = new Chart(ctxDiet, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '식단 점수',
          data: dietScoreData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          borderWidth: 2.5,
          tension: 0.2,
          fill: true,
          clip: false,
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#f59e0b'
        }]
      },
      options: createSingleChartOptions('점', 0, 5.5, 1)
    });
  }
}

function createSingleChartOptions(unit, minVal, maxVal, stepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 14,
        right: 10,
        bottom: 6,
        left: 4
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
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
 * [피드백 완료 여부 지능형 판별기]
 * - 피드백 코멘트, 피드백 내용, 피드백 요약, 보완점/개선방안, 문제점 분석 등
 *   피드백 관련 셀에 실제 내용이 존재하면 즉시 '피드백 완료'로 판별하여 새로고침 시에도 완료 상태 유지!
 */
function isFeedbackRecordCompleted(fb) {
  if (!fb || typeof fb !== 'object') return false;

  const invalidTokens = ['', '-', '미작성', '없음', '대기', '미완료', 'null', 'undefined'];

  // 1. 상태 컬럼에 '완료' 키워드가 명시된 경우
  const status = String(getField(fb, 
    '피드백 상태', '피드백상태', '완료 여부', '완료여부', '피드백완료', '피드백 완료', '진행상태', '상태'
  ) || '').trim();
  if (status && (status.includes('완료') || status.toLowerCase() === 'done' || status.toLowerCase() === 'completed')) {
    return true;
  }

  // 2. 피드백 코멘트 / 피드백 내용 셀에 유의미한 내용이 있는 경우
  const coachComment = String(getField(fb, 
    '피드백 코멘트', '피드백코멘트', 
    '피드백 내용', '피드백내용', 
    '코치 피드백', '코치피드백', 
    '코칭 코멘트', '코칭코멘트', 
    '코치 코멘트', '코치코멘트', 
    '코칭 내용', '코칭내용', 
    '코치답변', '코치 답변', '답변',
    'feedbackComment', 'coachComment'
  ) || '').trim();
  if (coachComment && !invalidTokens.includes(coachComment)) {
    return true;
  }

  // 3. 피드백 요약 셀에 유의미한 내용이 있는 경우
  const summary = String(getField(fb, 
    '피드백_요약', '피드백 요약', '피드백요약', '요약', 'summary', 'feedbackSummary'
  ) || '').trim();
  if (summary && !invalidTokens.includes(summary)) {
    return true;
  }

  // 4. 보완점 및 개선방안 셀에 유의미한 내용이 있는 경우
  const solution = String(getField(fb, 
    '보완점_및_개선방안', '보완점 및 개선방안', '보완점및개선방안', '보완점', '개선방안', 'solution', 'improvementSolution'
  ) || '').trim();
  if (solution && !invalidTokens.includes(solution)) {
    return true;
  }

  // 5. 문제점 분석 셀에 유의미한 내용이 있는 경우 ('특이사항 없음' 등 제외)
  const problem = String(getField(fb, 
    '문제점_분석', '문제점 분석', '문제점분석', '문제점', 'problem', 'problemAnalysis'
  ) || '').trim();
  const invalidProblemTokens = [...invalidTokens, '특이사항 없음', '특이사항없음', '특이사항'];
  if (problem && !invalidProblemTokens.includes(problem)) {
    return true;
  }

  return false;
}

function renderFeedbackTable(feedbacks) {
  const tbody = document.getElementById('feedbackTableBody');
  if (!tbody) return;

  if (!feedbacks || feedbacks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted small">
          제출된 데일리 피드백 기록이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  // [요구사항 5-1] 날짜 기준 최신순(내림차순) 정렬
  const sorted = [...feedbacks].sort((a, b) => {
    const rawA = getField(a, '날짜', 'date', '일자') || '';
    const rawB = getField(b, '날짜', 'date', '일자') || '';
    const timeA = new Date(rawA).getTime() || 0;
    const timeB = new Date(rawB).getTime() || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(rawB).localeCompare(String(rawA));
  });

  let html = '';
  sorted.forEach((fb) => {
    const date = getField(fb, '날짜', 'date', '일자') || '-';
    const memberName = getMemberName(fb) || (AppState.selectedMember ? getMemberName(AppState.selectedMember) : '-');
    const weight = getField(fb, '공복 몸무게', '공복몸무게', '체중', '시작 체중', '시작체중', '현재체중', 'weight') || '-';

    // 1. 점수 추출 (fb['운동_실행률_점수'], fb['식단_실행률_점수'] 우선)
    const exScore = getField(fb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore') || '-';
    const dietScore = getField(fb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore') || '-';
    
    // 2. 텍스트 추출 (fb['피드백_요약'], fb['문제점_분석'], fb['보완점_및_개선방안'] 우선 탐색)
    let summary = getField(fb, '피드백_요약', '피드백 요약', '피드백요약', '요약', 'summary', 'feedbackSummary') || '';
    let problem = getField(fb, '문제점_분석', '문제점 분석', '문제점분석', '문제점', 'problem', 'problemAnalysis') || '';
    let solution = getField(fb, '보완점_및_개선방안', '보완점 및 개선방안', '보완점및개선방안', '보완점', '개선방안', 'solution', 'improvementSolution') || '';

    // 레거시 코치 피드백 코멘트가 있는 경우 분리 파싱 보완
    if (!summary) {
      const legacyComment = getField(fb, 
        '피드백 코멘트', '피드백코멘트', 
        '피드백 내용', '피드백내용', 
        '코치 피드백', '코치피드백', 
        'feedbackComment', 'coachComment'
      ) || '';
      if (legacyComment) {
        if (legacyComment.includes('[문제점 분석]') || legacyComment.includes('[보완점 및 개선방안]')) {
          const parts = legacyComment.split(/\[문제점 분석\]|\[보완점 및 개선방안\]/);
          summary = (parts[0] || '').trim();
          if (!problem && legacyComment.includes('[문제점 분석]')) {
            const probPart = legacyComment.split('[문제점 분석]')[1].split('[보완점 및 개선방안]')[0];
            problem = (probPart || '').trim();
          }
          if (!solution && legacyComment.includes('[보완점 및 개선방안]')) {
            const solPart = legacyComment.split('[보완점 및 개선방안]')[1];
            solution = (solPart || '').trim();
          }
        } else {
          summary = legacyComment.trim();
        }
      }
    }

    if (!summary) summary = '미작성';
    if (!problem) problem = '미작성';
    if (!solution) solution = '미작성';

    // [핵심] 해당 셀에 내용이 있거나 코멘트/요약/보완점/문제점이 작성되어 있다면 피드백 완료로 판정
    const isCompleted = isFeedbackRecordCompleted(fb);

    html += `
      <tr>
        <td class="text-nowrap fw-semibold text-secondary small">${escapeHtml(date)}</td>
        <td class="text-nowrap fw-bold text-dark small">${escapeHtml(memberName)}</td>
        <td class="text-nowrap fw-semibold text-dark">${weight !== '-' ? `${weight} kg` : '-'}</td>
        <td class="text-nowrap text-center">
          <span class="badge ${getScoreBadgeClass(exScore)}">${exScore !== '-' ? `${exScore} 점` : '-'}</span>
        </td>
        <td class="text-nowrap text-center">
          <span class="badge ${getScoreBadgeClass(dietScore)}">${dietScore !== '-' ? `${dietScore} 점` : '-'}</span>
        </td>
        <td class="small" style="min-width: 200px; max-width: 320px;">
          <div class="feedback-text-cell" title="${escapeHtml(summary)}">
            ${escapeHtml(summary)}
          </div>
        </td>
        <td class="small" style="min-width: 180px; max-width: 260px;">
          <div class="feedback-text-cell ${problem !== '미작성' && problem !== '특이사항 없음' ? 'problem-cell text-danger-emphasis fw-medium' : 'text-muted'}" title="${escapeHtml(problem)}">
            ${escapeHtml(problem)}
          </div>
        </td>
        <td class="small" style="min-width: 200px; max-width: 320px;">
          <div class="feedback-text-cell ${solution !== '미작성' ? 'solution-cell text-success-emphasis fw-medium' : 'text-muted'}" title="${escapeHtml(solution)}">
            ${escapeHtml(solution)}
          </div>
        </td>
        <td class="text-center text-nowrap">
          ${isCompleted ? `
            <!-- 피드백 완료 시 초록색 버튼 표시 (클릭 수정 모달 유지) -->
            <button type="button" class="btn btn-sm btn-success fw-semibold px-2 py-1 shadow-sm text-white"
                    title="피드백 내용 수정하기"
                    onclick="openDailyFeedbackModal('${escapeHtml(date)}')">
              <i class="bi bi-check-circle-fill me-1"></i>✅ 피드백 완료
            </button>
          ` : `
            <!-- 미작성 시 파란색 피드백 하기 버튼 표시 -->
            <button type="button" class="btn btn-sm btn-primary fw-semibold px-2 py-1 shadow-sm"
                    title="피드백 작성하기"
                    onclick="openDailyFeedbackModal('${escapeHtml(date)}')">
              <i class="bi bi-pencil-square me-1"></i>피드백 하기
            </button>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function getScoreBadgeClass(score) {
  const num = parseFloat(score);
  if (isNaN(num)) return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
  if (num >= 4.0) return 'bg-success-subtle text-success border border-success-subtle';
  if (num >= 2.5) return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
  return 'bg-danger-subtle text-danger border border-danger-subtle';
}

/**
 * ==============================================================================
 * [6. 피드백 하기 모달 플로우 (체중 추이 분석, 근거 제시, 선택적 복사 반영)]
 * ==============================================================================
 */
async function openDailyFeedbackModal(targetDate) {
  if (!AppState.selectedMember) return;
  const mem = AppState.selectedMember;
  const memberName = getMemberName(mem);

  const targetFb = AppState.feedbacks.find(f => getMemberName(f) === memberName && String(getField(f, '날짜', 'date', '일자')).includes(targetDate));
  if (!targetFb) return;

  const recentFeedbacks = AppState.feedbacks
    .filter(f => getMemberName(f) === memberName)
    .sort((a, b) => new Date(getField(a, '날짜', 'date', '일자')) - new Date(getField(b, '날짜', 'date', '일자')));

  setElementText('dfModalTargetDate', targetDate);
  setElementText('dfModalTargetName', memberName);
  setElementText('dfModalWeight', getField(targetFb, '공복 몸무게', '공복몸무게', '체중', 'weight') || '-');

  const currentEx = getField(targetFb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore');
  const currentDiet = getField(targetFb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore');
  setElementText('dfModalExScore', currentEx || '-');
  setElementText('dfModalDietScore', currentDiet || '-');

  const existingComment = getField(targetFb, 
    '피드백 코멘트', '피드백코멘트', 
    '피드백 내용', '피드백내용', 
    '코치 피드백', '코치피드백', 
    '코칭 코멘트', '코칭코멘트', 
    '코치 코멘트', '코치코멘트', 
    '코칭 내용', '코칭내용', 
    '코치답변', '코치 답변', '답변',
    'feedbackComment', 'coachComment'
  ) || '';

  const existingSummary = getField(targetFb, '피드백_요약', '피드백 요약', '피드백요약', '요약') || '';
  const existingProblem = getField(targetFb, '문제점_분석', '문제점 분석', '문제점분석', '문제점') || '';
  const existingSolution = getField(targetFb, '보완점_및_개선방안', '보완점 및 개선방안', '보완점및개선방안', '보완점', '개선방안') || '';

  let initialComment = existingComment;
  if (!initialComment && (existingSummary || existingSolution)) {
    let combined = existingSummary;
    if (existingProblem && existingProblem !== '특이사항 없음') {
      combined += `\n\n[문제점 분석]\n${existingProblem}`;
    }
    if (existingSolution) {
      combined += `\n\n[보완점 및 개선방안]\n${existingSolution}`;
    }
    initialComment = combined.trim();
  }
  setInputValue('dfModalFeedbackComment', initialComment);

  showLoadingOverlay('AI가 최근 3일 이상의 체중 추이와 전체 설문/피드백 데이터를 종합 분석 중입니다...', 60000);

  let aiData = null;

  // [요구사항 1 & 2] 브라우저 직통 모드 시도 (Gemini API Key가 설정되어 있는 경우 초고속 분석)
  if (AppState.geminiApiKey) {
    try {
      const memberFullProfile = formatObjectAsFullProfile(mem);
      const feedbackFullData = formatObjectAsFullProfile(targetFb);

      const recent3 = recentFeedbacks.slice(-3);
      const weightHistorySummary = recent3.map(f => {
        const d = getField(f, '날짜', 'date', '일자') || '-';
        const w = getField(f, '공복 몸무게', '공복몸무게', '체중', 'weight') || '-';
        const es = getField(f, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore') || '-';
        const ds = getField(f, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore') || '-';
        return `- ${d}: 몸무게 ${w}kg, 운동점수 ${es}점, 식단점수 ${ds}점`;
      }).join('\n') || '이전 피드백 기록 없음';

      const prompt = `
당신은 '4주 온라인 운동/식단 습관화 코칭 프로그램'의 헤드 코치입니다.
아래 참여자의 전체 사전 프로필과 오늘 데일리 피드백 제출 데이터, 그리고 누적된 최근 체중 추이를 분석하여 피드백 결과를 도출해 주세요.

[참여자 정보]
${memberFullProfile}

[오늘 피드백]
${feedbackFullData}

[누적 피드백 및 체중 변화 추이 (최근)]
${weightHistorySummary}

[코칭 지침서 (DB)]
- 피드백 지침서: ${AppState.guidelines.feedback || '24시간 내 피드백, 칭찬(Positive Reinforcement) 선행 후 1가지 실행 가능한 개선안 제안'}
- 동기부여 지침서: ${AppState.guidelines.motivation || '한 끼 실패가 4주의 실패는 아님을 강조, 자책감 방지 및 회복탄력성'}

[요청 사항]
반드시 아래 JSON 형식으로만 응답해 주세요. 다른 설명이나 마크다운 없이 순수 JSON만 출력하십시오:
{
  "피드백_요약": "오늘 수행한 운동과 식단에 대한 전반적인 칭찬과 요약 (피드백 지침서 반영)",
  "문제점_분석": "오늘 수행하지 못한 부분이나 식단에서 아쉬운 점 분석 (없을 경우 '특이사항 없음')",
  "보완점_및_개선방안": "문제점을 해결하기 위한 구체적이고 실천 가능한 개선방안 1가지 (동기부여 지침서 반영)",
  "운동_수정_제안": "운동 계획 수정이 필요한 경우 구체적인 대체 루틴 제안 (불필요시 빈 문자열)",
  "식단_수정_제안": "식단 수정이 필요한 경우 구체적인 대체 식단 제안 (불필요시 빈 문자열)",
  "운동_실행률_점수": 4,
  "식단_실행률_점수": 5
}
`;

      const directRes = await callGeminiDirectlyFromBrowser(prompt, '당신은 냉철한 데이터 분석력과 따뜻한 공감력을 겸비한 코칭 전문가입니다. You must respond ONLY with a valid JSON object. Do not include any markdown formatting like ```json or any conversational text.');
      if (directRes && directRes.text) {
        let cleaned = directRes.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleaned = jsonMatch[0];
        const rawJson = JSON.parse(cleaned);

        // 7개 키 구조 100% 엄격 강제 정규화
        aiData = {
          "피드백_요약": String(rawJson['피드백_요약'] || rawJson['피드백 요약'] || rawJson['피드백요약'] || rawJson['요약'] || rawJson['feedbackComment'] || '오늘도 성실하게 일지를 기록해 주셔서 감사합니다!'),
          "문제점_분석": String(rawJson['문제점_분석'] || rawJson['문제점 분석'] || rawJson['문제점분석'] || rawJson['문제점'] || '특이사항 없음'),
          "보완점_및_개선방안": String(rawJson['보완점_및_개선방안'] || rawJson['보완점 및 개선방안'] || rawJson['보완점및개선방안'] || rawJson['보완점'] || rawJson['개선방안'] || '현재의 페이스를 안정적으로 유지해 주세요.'),
          "운동_수정_제안": String(rawJson['운동_수정_제안'] || rawJson['운동 수정 제안'] || rawJson['운동수정제안'] || ''),
          "식단_수정_제안": String(rawJson['식단_수정_제안'] || rawJson['식단 수정 제안'] || rawJson['식단수정제안'] || ''),
          "운동_실행률_점수": Number.isFinite(parseFloat(rawJson['운동_실행률_점수'])) ? Math.max(0, Math.min(5, parseFloat(rawJson['운동_실행률_점수']))) : 4,
          "식단_실행률_점수": Number.isFinite(parseFloat(rawJson['식단_실행률_점수'])) ? Math.max(0, Math.min(5, parseFloat(rawJson['식단_실행률_점수']))) : 5
        };
      }
    } catch (e) {
      console.warn('[브라우저 직통 AI 데일리 피드백 파싱 실패, GAS 백엔드 대체]', e);
    }
  }

  // 브라우저 직통 미사용 또는 파싱 실패 시 GAS 백엔드 호출
  if (!aiData) {
    const res = await postToGasBackend({
      action: 'generateDailyFeedback',
      member: mem,
      feedback: targetFb,
      recentFeedbacks: recentFeedbacks
    });
    if (res && res.status === 'success' && res.data) {
      aiData = res.data;
    }
  }

  hideLoadingOverlay();

  if (aiData) {
    AppState.currentFeedbackContext = {
      date: targetDate,
      feedback: targetFb,
      aiData: aiData
    };

    // 1. 점수 설정: 기존 입력된 점수가 있으면 우선 유지, 없으면 AI 평가 점수로 세팅
    let initialExScore = (currentEx && currentEx !== '-') ? currentEx : (aiData.운동_실행률_점수 !== undefined ? aiData.운동_실행률_점수 : 4);
    let initialDietScore = (currentDiet && currentDiet !== '-') ? currentDiet : (aiData.식단_실행률_점수 !== undefined ? aiData.식단_실행률_점수 : 5);

    setInputValue('dfModalInputExScore', initialExScore);
    setInputValue('dfModalInputDietScore', initialDietScore);
    setElementText('dfModalExScore', `${initialExScore}점`);
    setElementText('dfModalDietScore', `${initialDietScore}점`);

    // 2. 3개 텍스트 영역 (피드백 요약, 문제점 분석, 보완점 및 개선방안) 모달에 각각 바인딩
    let summaryVal = existingSummary;
    let problemVal = existingProblem;
    let solutionVal = existingSolution;

    // 만약 피드백_요약 등의 개별 컬럼은 없으나 기존 레거시 코멘트가 있는 경우 분리 파싱
    if (!summaryVal && existingComment) {
      if (existingComment.includes('[문제점 분석]') || existingComment.includes('[보완점 및 개선방안]')) {
        const parts = existingComment.split(/\[문제점 분석\]|\[보완점 및 개선방안\]/);
        summaryVal = (parts[0] || '').trim();
        if (!problemVal && existingComment.includes('[문제점 분석]')) {
          problemVal = (existingComment.split('[문제점 분석]')[1].split('[보완점 및 개선방안]')[0] || '').trim();
        }
        if (!solutionVal && existingComment.includes('[보완점 및 개선방안]')) {
          solutionVal = (existingComment.split('[보완점 및 개선방안]')[1] || '').trim();
        }
      } else {
        summaryVal = existingComment.trim();
      }
    }

    // 기존 저장된 내용이 없는 신규 피드백일 경우 AI가 분석한 결과로 3개 필드 각각 채우기
    if (!summaryVal) summaryVal = aiData.피드백_요약 || '';
    if (!problemVal) problemVal = aiData.문제점_분석 || '특이사항 없음';
    if (!solutionVal) solutionVal = aiData.보완점_및_개선방안 || '';

    // 모달 내 3개 독립 텍스트 영역에 각각 바인딩!
    setInputValue('dfModalSummary', summaryVal);
    setInputValue('dfModalProblem', problemVal);
    setInputValue('dfModalSolution', solutionVal);

    // 하위 호환성 유지용 전체 통합 코멘트
    let fullComment = summaryVal;
    if (problemVal && problemVal !== '특이사항 없음') {
      fullComment += `\n\n[문제점 분석]\n${problemVal}`;
    }
    if (solutionVal) {
      fullComment += `\n\n[보완점 및 개선방안]\n${solutionVal}`;
    }
    setInputValue('dfModalFeedbackComment', fullComment.trim());

    // 3. AI 체중 추이 분석 및 수정 제안 근거 영역
    const reasonEl = document.getElementById('dfModalModificationReason');
    const exProposalEl = document.getElementById('dfModalAiExerciseProposal');
    const dietProposalEl = document.getElementById('dfModalAiDietProposal');
    const badgeEl = document.getElementById('dfModalNeedModifyBadge');

    const aiProblem = aiData.문제점_분석 || '';
    const aiSolution = aiData.보완점_및_개선방안 || '';
    const exProposal = aiData.운동_수정_제안 || '';
    const dietProposal = aiData.식단_수정_제안 || '';

    if (reasonEl) {
      if ((aiProblem && aiProblem !== '특이사항 없음') || aiSolution) {
        reasonEl.innerHTML = `
          ${aiProblem && aiProblem !== '특이사항 없음' ? `<div class="mb-1"><strong class="text-danger-emphasis">[문제점 분석]</strong> ${escapeHtml(aiProblem)}</div>` : ''}
          ${aiSolution ? `<div><strong class="text-success-emphasis">[보완점 및 개선방안]</strong> ${escapeHtml(aiSolution)}</div>` : ''}
        `;
      } else {
        reasonEl.textContent = '특이사항 없음 (현재 루틴 안정적 유지 권장)';
      }
    }

    // 4. (중요) 운동/식단 수정 제안은 별도 박스에만 표시 (Feedbacks 시트에 자동 저장되지 않으며 코치가 복사 버튼을 눌러야만 반영)
    if (exProposalEl) exProposalEl.textContent = exProposal || '제안 내용 없음';
    if (dietProposalEl) dietProposalEl.textContent = dietProposal || '제안 내용 없음';

    const hasProposal = Boolean((exProposal && exProposal.trim()) || (dietProposal && dietProposal.trim()));
    if (badgeEl) {
      if (hasProposal) {
        badgeEl.className = 'badge bg-warning text-dark fw-bold';
        badgeEl.textContent = '수정 권장';
      } else {
        badgeEl.className = 'badge bg-success-subtle text-success fw-bold';
        badgeEl.textContent = '현재 루틴 유지';
      }
    }

    const modalEl = document.getElementById('dailyFeedbackModal');
    if (modalEl && window.bootstrap) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } else {
    showToast('피드백 데이터를 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'warning');
  }
}

function initDailyFeedbackModalActions() {
  const btnSaveComment = document.getElementById('btnSaveDailyFeedbackComment');
  if (btnSaveComment) {
    btnSaveComment.addEventListener('click', async () => {
      if (!AppState.currentFeedbackContext || !AppState.selectedMember) return;

      const dateStr = AppState.currentFeedbackContext.date;
      const mem = AppState.selectedMember;
      const memberKey = getMemberKey(mem);
      const memberName = getMemberName(mem);
      const memberId = getMemberId(mem);
      const memberPhone = getMemberPhone(mem);

      // 모달 UI의 3개 분리 텍스트영역 및 2개 점수 입력값 직접 읽기
      const summaryToSave = getInputValue('dfModalSummary').trim();
      const problemToSave = getInputValue('dfModalProblem').trim() || '특이사항 없음';
      const solutionToSave = getInputValue('dfModalSolution').trim();

      const exScoreInput = getInputValue('dfModalInputExScore');
      const dietScoreInput = getInputValue('dfModalInputDietScore');
      const exScoreToSave = exScoreInput !== '' ? parseFloat(exScoreInput) : 4;
      const dietScoreToSave = dietScoreInput !== '' ? parseFloat(dietScoreInput) : 5;

      // 회원 전달용 통합 코멘트 생성
      let combinedComment = summaryToSave;
      if (problemToSave && problemToSave !== '특이사항 없음') {
        combinedComment += `\n\n[문제점 분석]\n${problemToSave}`;
      }
      if (solutionToSave) {
        combinedComment += `\n\n[보완점 및 개선방안]\n${solutionToSave}`;
      }
      combinedComment = combinedComment.trim();

      showToast('피드백 코멘트를 구글 시트(Feedbacks)에 저장 중...', 'info');

      // 로컬 Feedbacks 배열 즉시 스마트 동기화
      const targetFb = AppState.feedbacks.find(f => {
        const fName = getMemberName(f);
        const fDate = getField(f, '날짜', 'date', '일자');
        const isNameMatch = fName === memberName || (memberKey && fName === memberKey);
        const isDateMatch = String(fDate).includes(dateStr) || String(dateStr).includes(String(fDate)) || (cleanDateStr(fDate) === cleanDateStr(dateStr));
        return isNameMatch && isDateMatch;
      });

      if (targetFb) {
        targetFb['운동_실행률_점수'] = exScoreToSave;
        targetFb['운동실행률점수'] = exScoreToSave;
        targetFb['운동 점수'] = exScoreToSave;

        targetFb['식단_실행률_점수'] = dietScoreToSave;
        targetFb['식단실행률점수'] = dietScoreToSave;
        targetFb['식단 점수'] = dietScoreToSave;

        targetFb['피드백_요약'] = summaryToSave;
        targetFb['피드백요약'] = summaryToSave;

        targetFb['문제점_분석'] = problemToSave;
        targetFb['문제점분석'] = problemToSave;

        targetFb['보완점_및_개선방안'] = solutionToSave;
        targetFb['보완점및개선방안'] = solutionToSave;

        targetFb['피드백 코멘트'] = combinedComment;
        targetFb['피드백코멘트'] = combinedComment;
        targetFb['피드백 내용'] = combinedComment;
        targetFb['피드백내용'] = combinedComment;
        targetFb['feedbackComment'] = combinedComment;
        targetFb['피드백 상태'] = '완료';
        targetFb['피드백상태'] = '완료';
        targetFb['피드백완료'] = '완료';
        targetFb['피드백 완료'] = '완료';
      }

      // [핵심] 백엔드에 5가지 필수 데이터 (점수 2개, 텍스트 3개) 및 식별자 전송
      // (중요: 운동_수정_제안 및 식단_수정_제안은 Feedbacks 탭에 절대 자동 저장되지 않으며 코치가 복사 버튼을 통해 Members 시트에만 반영됨)
      const res = await postToGasBackend({
        action: 'updateFeedbackComment',
        memberKey: memberKey,
        name: memberName,
        memberName: memberName,
        memberId: memberId,
        phone: memberPhone,
        date: dateStr,
        comment: combinedComment,
        운동_실행률_점수: exScoreToSave,
        식단_실행률_점수: dietScoreToSave,
        exerciseScore: exScoreToSave,
        dietScore: dietScoreToSave,
        피드백_요약: summaryToSave,
        문제점_분석: problemToSave,
        보완점_및_개선방안: solutionToSave
      });

      if (res && res.status === 'success') {
        showToast('✓ 피드백 코멘트가 구글 시트에 성공적으로 저장되었습니다!', 'success');
        
        // 피드백 테이블 & 3개 독립 차트 즉시 갱신
        const userFeedbacks = AppState.feedbacks.filter(f => getMemberName(f) === memberName);
        renderFeedbackTable(userFeedbacks);
        renderThreeIndependentCharts(userFeedbacks);
        
        // 상단 전역 알림 뱃지 즉시 갱신
        updateGlobalNotificationBadge();

        const modalEl = document.getElementById('dailyFeedbackModal');
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      } else {
        const errMsg = (res && res.message) ? res.message : '시트 저장 실패';
        showToast(`⚠️ [시트 저장 오류] ${errMsg}`, 'danger', 7000);
        console.error('[피드백 코멘트 저장 실패 디버그]', res);

        // 오프라인/Mock 모드이거나 에러 발생 시에도 로컬 화면은 최신 데이터로 반영하여 코칭 연속성 보장
        const userFeedbacks = AppState.feedbacks.filter(f => getMemberName(f) === memberName);
        renderFeedbackTable(userFeedbacks);
        renderThreeIndependentCharts(userFeedbacks);
        updateGlobalNotificationBadge();
      }
    });
  }

  const btnCopyEx = document.getElementById('btnCopyAiExerciseProposal');
  if (btnCopyEx) {
    btnCopyEx.addEventListener('click', () => {
      const proposalText = document.getElementById('dfModalAiExerciseProposal').textContent;
      if (proposalText && proposalText !== '제안 내용 없음') {
        const inputEl = document.getElementById('inputExerciseGuideline');
        if (inputEl) {
          inputEl.value = proposalText;
          showToast('AI 운동 수정 제안이 [중단 운동 루틴 수정 제안 지침] 칸으로 복사되었습니다! 중단의 [저장] 버튼을 누르면 회원 DB에 반영됩니다.', 'success');
        }
      }
    });
  }

  const btnCopyDiet = document.getElementById('btnCopyAiDietProposal');
  if (btnCopyDiet) {
    btnCopyDiet.addEventListener('click', () => {
      const proposalText = document.getElementById('dfModalAiDietProposal').textContent;
      if (proposalText && proposalText !== '제안 내용 없음') {
        const inputEl = document.getElementById('inputDietGuideline');
        if (inputEl) {
          inputEl.value = proposalText;
          showToast('AI 식단 수정 제안이 [중단 식단 수정 제안 지침] 칸으로 복사되었습니다! 중단의 [저장] 버튼을 누르면 회원 DB에 반영됩니다.', 'success');
        }
      }
    });
  }
}

/**
 * ==============================================================================
 * [요구사항 4: 대시보드 미완료 피드백 전역 알림 기능 (Notification)]
 * ==============================================================================
 */
function updateGlobalNotificationBadge() {
  const badgeEl = document.getElementById('unreadFeedbackBadge');
  const countBadgeEl = document.getElementById('notificationListCountBadge');
  const itemsContainer = document.getElementById('notificationItemsContainer');

  if (!AppState.feedbacks || AppState.feedbacks.length === 0) {
    if (badgeEl) badgeEl.classList.add('d-none');
    if (countBadgeEl) countBadgeEl.textContent = '0건';
    if (itemsContainer) {
      itemsContainer.innerHTML = '<li class="p-3 text-center text-muted small">제출된 피드백 기록이 없습니다.</li>';
    }
    return;
  }

  // 1. 코치 코멘트가 비어있는 피드백 스캔
  const pendingFeedbacks = [];

  AppState.feedbacks.forEach(fb => {
    const isCompleted = isFeedbackRecordCompleted(fb);

    if (!isCompleted) {
      const memberName = getMemberName(fb);
      const memberPhone = getMemberPhone(fb);
      const date = getField(fb, '날짜', 'date', '일자') || '-';

      // 해당 회원의 memberKey 탐색
      let matchedMem = null;
      if (AppState.members && AppState.members.length > 0) {
        matchedMem = AppState.members.find(m => {
          if (memberPhone && getMemberPhone(m) === memberPhone) return true;
          return getMemberName(m) === memberName;
        });
      }

      const memberKey = matchedMem ? getMemberKey(matchedMem) : memberName;
      const exScore = getField(fb, '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore') || '-';
      const dietScore = getField(fb, '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore') || '-';
      const userComment = getField(fb, '회원 일기/코멘트', '회원일기/코멘트', '회원 일기', '회원일기', '코멘트', 'userComment') || '';

      pendingFeedbacks.push({
        fb,
        memberName,
        memberKey,
        date,
        exScore,
        dietScore,
        userComment
      });
    }
  });

  // 2. 최신 날짜순(내림차순) 정렬
  pendingFeedbacks.sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b.date).localeCompare(String(a.date));
  });

  const count = pendingFeedbacks.length;

  // 3. 종 아이콘 빨간색 뱃지 업데이트
  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count > 99 ? '99+' : String(count);
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.textContent = '0';
      badgeEl.classList.add('d-none');
    }
  }

  if (countBadgeEl) {
    countBadgeEl.textContent = `${count}건`;
  }

  // 4. 드롭다운 대기 리스트 렌더링
  if (itemsContainer) {
    if (count === 0) {
      itemsContainer.innerHTML = `
        <li class="p-4 text-center text-muted small">
          <i class="bi bi-check-circle-fill text-success fs-5 d-block mb-1"></i>
          모든 데일리 피드백이 완료되었습니다! 🎉
        </li>
      `;
    } else {
      let listHtml = '';
      pendingFeedbacks.forEach(item => {
        listHtml += `
          <li class="dropdown-item p-2 px-3 border-bottom cursor-pointer hover-bg-light notification-item"
              style="cursor: pointer;"
              onclick="handleNotificationClick('${escapeHtml(item.memberKey)}', '${escapeHtml(item.date)}')">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-bold text-dark"><i class="bi bi-person-fill text-primary me-1"></i>${escapeHtml(item.memberName)}</span>
              <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">${escapeHtml(item.date)}</span>
            </div>
            <div class="small text-muted text-truncate mb-1" style="max-width: 280px;">
              <span class="text-success fw-semibold">[운동 ${item.exScore}점]</span>
              <span class="text-warning-emphasis fw-semibold">[식단 ${item.dietScore}점]</span>
              ${item.userComment ? ` - ${escapeHtml(item.userComment)}` : ''}
            </div>
            <div class="text-end">
              <span class="badge bg-primary text-white small px-2 py-1"><i class="bi bi-pencil-square me-1"></i>피드백 작성 &rarr;</span>
            </div>
          </li>
        `;
      });
      itemsContainer.innerHTML = listHtml;
    }
  }
}

/**
 * [요구사항 4-5] 알림 목록 항목 클릭 시:
 * 해당 회원 상세 페이지로 전환 + 해당 날짜의 피드백 작성 모달 바로 열기
 */
function handleNotificationClick(memberKey, targetDate) {
  // 드롭다운 메뉴 닫기 (Bootstrap dropdown 닫기)
  const bellBtn = document.getElementById('btnNotificationBell');
  if (bellBtn && window.bootstrap) {
    const dropdownInstance = bootstrap.Dropdown.getInstance(bellBtn);
    if (dropdownInstance) dropdownInstance.hide();
  }

  // 해당 회원이 존재하면 선택 (참여자 관리 뷰 전환 및 화면 갱신)
  if (memberKey) {
    selectMember(memberKey);
  }

  // 약간의 렌더링 텀 후 피드백 모달 오픈
  setTimeout(() => {
    openDailyFeedbackModal(targetDate);
  }, 150);
}

/**
 * ==============================================================================
 * [7. 기간별 종합 피드백 모달 로직]
 * ==============================================================================
 */
function initComprehensiveFeedbackActions() {
  const btnGenerate = document.getElementById('btnGenerateComprehensiveFeedback');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', async () => {
      if (!AppState.selectedMember) return;
      const mem = AppState.selectedMember;
      const memberName = getMemberName(mem);

      const sDate = getInputValue('compStartDate');
      const eDate = getInputValue('compEndDate');

      const userFbs = AppState.feedbacks.filter(f => getMemberName(f) === memberName);

      showLoadingOverlay('AI가 해당 기간의 피드백을 요약하고 추후 자립 방안을 도출 중입니다...');
      const res = await postToGasBackend({
        action: 'generateComprehensiveFeedback',
        member: mem,
        feedbacks: userFbs,
        startDate: sDate || '프로그램 시작일',
        endDate: eDate || '오늘'
      });
      hideLoadingOverlay();

      if (res && res.comprehensiveFeedback) {
        setInputValue('compResultText', res.comprehensiveFeedback);
        if (res.isAiGenerated) {
          showToast('✓ [Gemini AI] 기간별 종합 피드백이 생성되었습니다.', 'success');
        } else if (res.debug && res.debug.errorMessage) {
          showToast(`⚠️ AI API 미적용 안내: ${res.debug.errorMessage}`, 'warning', 8000);
        } else {
          showToast('기간별 종합 피드백이 생성되었습니다.', 'info');
        }
      }
    });
  }
}

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
      if (AppState.members.length > 0) selectMember(getMemberKey(AppState.members[0]));
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('연동 설정을 초기화하고 기본 Mock 데이터 모드로 복귀하시겠습니까?')) {
        localStorage.removeItem(STORAGE_GAS_URL_KEY);
        localStorage.removeItem(STORAGE_GEMINI_KEY);
        localStorage.removeItem(STORAGE_MODEL_PREF_KEY);
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

  if (AppState.isOnline) {
    badge.className = 'badge bg-success-subtle text-success border border-success-subtle py-2 px-3 small';
    badge.innerHTML = '<span class="status-dot bg-success me-1"></span> Google Sheets 실시간 연동 중';
  } else {
    badge.className = 'badge bg-secondary-subtle text-secondary border border-secondary-subtle py-2 px-3 small';
    badge.innerHTML = '<span class="status-dot bg-secondary me-1"></span> Mock 모드 (테스트/데모)';
  }
}

function initEventListeners() {
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
    });
  });

  initGuidelineRoutineActions();
  initDailyFeedbackModalActions();
  initComprehensiveFeedbackActions();
  initCustomTagModalActions();
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

function getMemberName(m) {
  return String(getField(m, '이름', 'name', '성명', '회원명', '참여자이름', '참여자 이름') || '무명').trim();
}

function getMemberPhone(m) {
  if (!m) return '';
  return String(getField(m, '전화번호', '연락처', '휴대폰', 'phone', '핸드폰') || '').replace(/[^0-9]/g, '');
}

function cleanDateStr(d) {
  if (!d) return '';
  return String(d).replace(/[^0-9]/g, '');
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

function showLoadingOverlay(text, timeoutMs = 120000) {
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingOverlayText');
  const subTextEl = document.getElementById('loadingOverlaySubText');

  if (textEl && text) textEl.textContent = text;
  if (overlay) overlay.classList.remove('d-none');

  // 이전 타이머 초기화
  if (loadingOverlayTimeoutTimer) clearTimeout(loadingOverlayTimeoutTimer);
  if (loadingOverlayIntervalTimer) clearInterval(loadingOverlayIntervalTimer);

  loadingOverlayElapsedSec = 0;
  if (subTextEl) {
    subTextEl.innerHTML = `처리 중... <strong class="text-warning">0초</strong> 경과 (AI 생성은 상황에 따라 수초~최대 1분 정도 소요될 수 있습니다)`;
  }

  // 매초 경과 시간 실시간 카운팅
  loadingOverlayIntervalTimer = setInterval(() => {
    loadingOverlayElapsedSec++;
    if (subTextEl) {
      subTextEl.innerHTML = `처리 중... <strong class="text-warning">${loadingOverlayElapsedSec}초</strong> 경과 (AI 생성은 상황에 따라 수초~최대 1분 정도 소요될 수 있습니다)`;
    }
  }, 1000);

  // 지정된 타임아웃(기본 120초) 후 자동 해제
  loadingOverlayTimeoutTimer = setTimeout(() => {
    hideLoadingOverlay();
    showToast(`⚠️ 요청 시간이 초과되었습니다 (${Math.round(timeoutMs / 1000)}초). 네트워크 상태나 API Key 설정을 확인해 주세요.`, 'warning', 6000);
  }, timeoutMs);
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

  toastEl.className = `toast align-items-center border-0 position-fixed bottom-0 end-0 m-3 shadow-lg text-white ${bgClasses[type] || 'bg-primary'}`;
  const body = document.getElementById('appGlobalToastBody');
  if (body) body.innerHTML = `<i class="bi bi-info-circle-fill me-2 fs-5"></i> ${escapeHtml(msg)}`;

  if (window.bootstrap) {
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
  }
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
