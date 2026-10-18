/**
 * ==============================================================================
 * [4주 온라인 습관화 코칭 - 회원 전용 마이페이지 view.js]
 * ==============================================================================
 * 1. URL 쿼리 파라미터(?id=회원번호) 기반 전용 회원 식별
 * 2. 휴대폰 번호 뒷 4자리 본인 인증 모달 및 세션 관리
 * 3. 인적사항, 요일별 운동 루틴 표, 끼니별 식단 표 스마트 파싱 렌더링
 * 4. 피드백 로그 렌더링 (★ 문제점 분석 완전 비공개, 칭찬/성취 요약만 표시)
 * 5. 체중 및 실천 점수 변화 추이 차트 (Chart.js)
 * ==============================================================================
 */

// 로컬 스토리지 키 (코치 대시보드와 공유)
const STORAGE_GAS_URL_KEY = 'coach_dash_gas_api_url_v2';

// 오프라인/테스트용 기본 Mock DB
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
      '현재 제안 운동 루틴': `[김민수 회원 주간 운동 루틴]
- 월/수/금 (저녁 20:30, 35분):
  1. 웜업: 고관절 스트레칭 & 버드독 10회 3세트
  2. 맨몸 스쿼트 15회 4세트
  3. 무릎 대고 푸시업 10회 3세트
  4. 슬로우 버피 12회 3세트
  5. 쿨다운: 폼롤러 허리/둔근 이완 10분
- 화/목: 퇴근길 가벼운 파워워킹 30분 또는 인터벌 걷기
- 주말(토/일 중 택1): 충분한 휴식 및 가벼운 산책`,
      '현재 제안 식단': `[김민수 회원 맞춤 식단 플랜]
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
      '직업/근무시간': '브랜드 마케터 (외근/야근 유동적)',
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
      '피드백_요약': '첫날 멋진 출발입니다! 밥 양 2/3 조절과 수분 2L 달성 정말 훌륭합니다. 야식의 유혹도 잘 이겨내셨어요!',
      '문제점_분석': '[비공개] 저녁 단백질 섭취가 다소 부족함',
      '운동 내용': '맨몸 스쿼트 4세트 + 런지 3세트 + 코어 스트레칭 15분',
      '식단 내용': '아침 그릭요거트, 점심 소불고기 백반(밥 반공기), 저녁 닭가슴살 샐러드'
    },
    {
      '피드백번호': 'FB02',
      '날짜': '2026-10-09',
      '이름': '김민수',
      '공복 몸무게': 82.1,
      '운동 점수': 9,
      '식단 점수': 8,
      '운동_실행률_점수': 5.0,
      '식단_실행률_점수': 4.5,
      '피드백_요약': '야근 후에도 폼롤러 스트레칭을 잊지 않고 실천해 주셔서 감동입니다! 체중도 순조롭게 반응하고 있습니다.',
      '문제점_분석': '[비공개] 수면 시간이 5시간 미만으로 다소 짧음',
      '운동 내용': '인터벌 조깅 30분 + 스트레칭 10분',
      '식단 내용': '아침 프로틴 쉐이크, 점심 서브웨이 위트, 저녁 연어 샐러드'
    },
    {
      '피드백번호': 'FB03',
      '날짜': '2026-10-10',
      '이름': '김민수',
      '공복 몸무게': 81.8,
      '운동 점수': 9,
      '식단 점수': 9,
      '운동_실행률_점수': 5.0,
      '식단_실행률_점수': 5.0,
      '피드백_요약': '완벽한 3일 차 실천입니다! 몸이 한결 가벼워지셨다는 소식에 코치로서도 너무 기쁩니다. 주말도 무리 없는 페이스로 이어가 봐요!',
      '문제점_분석': '[비공개] 특이사항 없음',
      '운동 내용': '하체 웨이트 루틴 완료',
      '식단 내용': '아침 사과+계란, 점심 닭가슴살 볶음밥, 저녁 단호박 샐러드'
    }
  ]
};

// 현재 회원 상태
let CurrentMemberState = {
  member: null,
  feedbacks: [],
  chartInstance: null,
  activeChartTab: 'weight' // 'weight' | 'score'
};

/**
 * 초기화 진입점
 */
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawId = (urlParams.get('id') || urlParams.get('memberId') || urlParams.get('member') || '').trim();
  let targetId = rawId;
  try {
    targetId = decodeURIComponent(rawId);
  } catch (e) {}
  targetId = targetId.trim();

  // 1. 회원 ID가 URL에 없는 경우
  if (!targetId) {
    showInvalidAccessScreen();
    return;
  }

  // 2. 데이터 로드 (GAS 백엔드 또는 Mock)
  await loadMemberPageData(targetId);
});

/**
 * 올바르지 않은 접근 화면 표시
 */
function showInvalidAccessScreen() {
  document.getElementById('invalidAccessScreen')?.classList.remove('d-none');
  document.getElementById('memberPageContent')?.classList.add('d-none');
}

/**
 * 회원 데이터 로드 (구글 시트 연동 시 실시간 조회)
 */
async function loadMemberPageData(targetId) {
  let allMembers = [];
  let allFeedbacks = [];

  const gasUrl = (localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
  if (gasUrl) {
    try {
      const fetchUrl = `${gasUrl}?action=getAll&t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        allMembers = json.data.members || [];
        allFeedbacks = json.data.feedbacks || [];
      }
    } catch (e) {
      console.warn('[회원 뷰어] GAS 연동 실패, Mock 데이터로 진행합니다.', e);
    }
  }

  // 데이터가 없거나 로드 실패 시 Mock DB 사용
  if (!allMembers || allMembers.length === 0) {
    allMembers = VIEW_MOCK_DB.members;
    allFeedbacks = VIEW_MOCK_DB.feedbacks;
  }

  // 회원 매칭 (회원번호 우선 ➔ 이름 ➔ 보조 키)
  const cleanTargetId = targetId.replace(/\s+/g, '').toLowerCase();
  const matchedMember = allMembers.find(m => {
    const no = String(getField(m, '회원번호', 'memberNo', 'id') || '').replace(/\s+/g, '').toLowerCase();
    const name = String(getField(m, '이름', 'name', '성명') || '').replace(/\s+/g, '').toLowerCase();
    return no === cleanTargetId || name === cleanTargetId;
  });

  if (!matchedMember) {
    showInvalidAccessScreen();
    return;
  }

  CurrentMemberState.member = matchedMember;
  const memberName = getField(matchedMember, '이름', 'name', '성명');
  CurrentMemberState.feedbacks = allFeedbacks.filter(f => {
    const fName = getField(f, '이름', 'name', '성명');
    return fName && String(fName).replace(/\s+/g, '') === String(memberName).replace(/\s+/g, '');
  });

  // 3. 본인 인증 체크 (휴대폰 번호 뒷 4자리)
  checkMemberAuthAndDisplay();
}

/**
 * 휴대폰 뒷 4자리 인증 상태 체크 및 모달 표시
 */
function checkMemberAuthAndDisplay() {
  const member = CurrentMemberState.member;
  const memberId = getField(member, '회원번호', 'memberNo', 'id') || getField(member, '이름', 'name');
  const authKey = `member_auth_${memberId}`;

  // 이미 인증된 경우
  if (localStorage.getItem(authKey) === 'true' || sessionStorage.getItem(authKey) === 'true') {
    unlockAndRenderMemberPage();
    return;
  }

  // 미인증 시 비밀번호 모달 띄우기
  const modalEl = document.getElementById('memberAuthModal');
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    modal.show();

    setTimeout(() => {
      document.getElementById('memberPinInput')?.focus();
    }, 400);
  }
}

/**
 * 휴대폰 번호 뒷 4자리 추출 헬퍼
 */
function getMemberPhoneLast4(member) {
  if (!member) return '0000';
  const keys = Object.keys(member);
  let rawPhone = '';

  for (const k of keys) {
    const cleanK = k.replace(/\s+/g, '').toLowerCase();
    if (cleanK.includes('연락처') || cleanK.includes('전화') || cleanK.includes('휴대폰') || cleanK.includes('핸드폰') || cleanK.includes('phone')) {
      const val = String(member[k] || '').trim();
      if (val) {
        rawPhone = val;
        break;
      }
    }
  }

  // 숫자만 추출
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }

  // 전화번호 열이 없는 데이터 대비 기본값
  return '0000';
}

/**
 * 회원 로그인 검증 실행
 */
function handleMemberAuthLogin() {
  const inputEl = document.getElementById('memberPinInput');
  const errorEl = document.getElementById('memberAuthErrorMsg');
  const enteredPin = String(inputEl ? inputEl.value : '').trim();

  const correctPin = getMemberPhoneLast4(CurrentMemberState.member);

  if (enteredPin.length < 4) {
    if (errorEl) errorEl.textContent = '휴대폰 번호 뒤 4자리를 모두 입력해 주세요.';
    inputEl?.focus();
    return;
  }

  // 정답 비교 (등록된 전화번호 뒷 4자리 또는 등록 누락 시 0000 허용)
  if (enteredPin === correctPin || (correctPin === '0000' && (enteredPin === '0000' || enteredPin === '1234'))) {
    // 인증 성공!
    const member = CurrentMemberState.member;
    const memberId = getField(member, '회원번호', 'memberNo', 'id') || getField(member, '이름', 'name');
    const authKey = `member_auth_${memberId}`;
    localStorage.setItem(authKey, 'true');

    // 모달 닫기
    const modalEl = document.getElementById('memberAuthModal');
    if (modalEl && window.bootstrap) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    unlockAndRenderMemberPage();
  } else {
    // 인증 실패
    if (inputEl) {
      inputEl.value = '';
      inputEl.classList.add('shake-effect');
      setTimeout(() => inputEl.classList.remove('shake-effect'), 500);
    }
    if (errorEl) {
      errorEl.textContent = '비밀번호가 일치하지 않습니다. 등록하신 휴대폰 번호 뒤 4자리를 입력해 주세요.';
    }
    inputEl?.focus();
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
  const feedbacks = CurrentMemberState.feedbacks;

  // 1. 상단 네비 & 히어로 정보 바인딩
  const memberName = getField(member, '이름', 'name', '성명') || '회원';
  const memberTag = getField(member, '태그', '코스', 'tag') || '4주 습관화 코칭';
  const memberNo = getField(member, '회원번호', 'id') || '';
  const memberPurpose = getField(member, '참여목적', '목적', 'purpose') || '건강한 운동 및 식단 습관 형성';
  const memberJob = getField(member, '직업/근무시간', '직업', '근무시간') || '직장인';
  const memberExp = getField(member, '운동 경력', '운동경력') || '초보';
  const memberFreq = getField(member, '주당 운동 횟수', '운동횟수') || '주 2~3회';

  document.title = `${memberName}님의 4주 코칭 마이페이지`;
  setText('navMemberNameBadge', `${memberName}님 마이페이지`);
  setText('heroMemberTag', memberTag);
  setText('heroMemberNo', memberNo ? `No. ${memberNo}` : '');
  setText('heroMemberName', memberName);
  setText('heroMemberPurpose', `🎯 참여 목적: ${memberPurpose}`);
  setText('heroMemberJob', memberJob);
  setText('heroMemberExp', memberExp);
  setText('heroMemberFreq', memberFreq);

  // 체중 계산
  const startWeight = parseFloat(getField(member, '시작 체중', '시작체중', '체중') || 0);
  let latestWeight = startWeight;

  if (feedbacks && feedbacks.length > 0) {
    const sortedFbs = feedbacks.slice().sort((a, b) => new Date(getField(b, '날짜') || 0) - new Date(getField(a, '날짜') || 0));
    const recentW = parseFloat(getField(sortedFbs[0], '공복 몸무게', '공복몸무게', '체중') || 0);
    if (recentW > 0) latestWeight = recentW;
  }

  setText('heroStartWeight', startWeight > 0 ? startWeight.toFixed(1) : '-');
  setText('heroCurrentWeight', latestWeight > 0 ? latestWeight.toFixed(1) : '-');

  const diff = latestWeight - startWeight;
  const diffBox = document.getElementById('heroWeightDiff');
  if (diffBox && startWeight > 0) {
    if (diff < 0) {
      diffBox.textContent = `${diff.toFixed(1)} kg 감량 👏`;
      diffBox.className = 'fs-5 text-warning fw-extrabold ms-2';
    } else if (diff > 0) {
      diffBox.textContent = `+${diff.toFixed(1)} kg`;
      diffBox.className = 'fs-5 text-white fw-bold ms-2';
    } else {
      diffBox.textContent = `변화 유지 중 (0.0 kg)`;
      diffBox.className = 'fs-5 text-white fw-bold ms-2';
    }
  }

  // 2. 운동 루틴 표 렌더링 (★ 수정 지침 절대 제외)
  renderWorkoutRoutineTable(member);

  // 3. 식단 플랜 표 렌더링 (★ 수정 지침 절대 제외)
  renderDietPlanTable(member);

  // 4. 피드백 타임라인 렌더링 (★ 문제점 분석 완전 비공개 처리!)
  renderFeedbackTimeline(feedbacks);

  // 5. 변화 추이 차트 초기화
  initMemberProgressChart();
}

/**
 * 맞춤 운동 루틴 표 렌더링 (지능형 요일별 파싱)
 * ★ '운동 루틴 수정 제안 지침'은 절대 노출하지 않음
 */
function renderWorkoutRoutineTable(member) {
  const routineRaw = String(getField(member, '현재 제안 운동 루틴', '현재제안운동루틴', '운동루틴', 'workoutRoutine') || '').trim();
  const descBox = document.getElementById('workoutDescBox');
  const tbody = document.getElementById('workoutRoutineTableBody');
  if (!tbody) return;

  if (!routineRaw) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">등록된 운동 루틴이 없습니다. 코치님과의 상담 후 맞춤 루틴이 업데이트됩니다.</td></tr>';
    return;
  }

  const lines = routineRaw.split('\n');
  const rows = [];
  let generalDesc = [];
  let currentDay = '';
  let currentContent = [];

  const dayRegex = /^[-*•]?\s*(\[?[월화수목금토일\/\s,·]+(요일)?\]?|\d+일차|주말\(?[^)]*\)?|상체|하체|유산소|스트레칭)/i;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // ★ [보안/규칙] 루틴 수정 지침 내용은 회원 화면에 절대 노출하지 않음
    if (trimmed.includes('수정 지침') || trimmed.includes('수정지침') || trimmed.includes('수정 제안') || trimmed.includes('제안 지침') || trimmed.includes('제안지침')) {
      return;
    }

    // 헤더/설명 줄 감지
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      generalDesc.push(trimmed);
      return;
    }

    // 요일/분할 패턴 감지
    const isDayHeader = trimmed.startsWith('- ') || trimmed.startsWith('* ') || dayRegex.test(trimmed);

    if (isDayHeader && (trimmed.includes('월') || trimmed.includes('화') || trimmed.includes('수') || trimmed.includes('목') || trimmed.includes('금') || trimmed.includes('토') || trimmed.includes('일') || trimmed.includes('일차') || trimmed.includes('주간') || trimmed.includes('주말'))) {
      if (currentDay || currentContent.length > 0) {
        rows.push({ day: currentDay || '기본 루틴', content: currentContent.slice() });
        currentContent = [];
      }
      currentDay = trimmed.replace(/^[-*•]\s*/, '').replace(/:$/, '').trim();
    } else {
      if (currentDay) {
        currentContent.push(trimmed);
      } else {
        generalDesc.push(trimmed);
      }
    }
  });

  if (currentDay || currentContent.length > 0) {
    rows.push({ day: currentDay || '기본 루틴', content: currentContent.slice() });
  }

  // 상단 안내문 표시 (수정 지침 키워드 철저 배제)
  const safeGeneralDesc = generalDesc.filter(d => 
    !d.includes('수정') && !d.includes('지침')
  );
  if (safeGeneralDesc.length > 0 && descBox) {
    descBox.textContent = safeGeneralDesc.join('\n');
    descBox.classList.remove('d-none');
  }

  // 테이블 생성
  if (rows.length === 0) {
    // 줄글 형태일 경우 단순 줄 분리 표시
    tbody.innerHTML = `
      <tr>
        <td class="fw-bold text-primary align-top"><span class="day-badge">주간 플랜</span></td>
        <td class="text-break">${escapeHtml(routineRaw).replace(/\n/g, '<br>')}</td>
      </tr>
    `;
  } else {
    let html = '';
    rows.forEach(r => {
      const formattedContent = r.content.map(c => escapeHtml(c)).join('<br>');
      html += `
        <tr>
          <td class="align-top"><span class="day-badge">${escapeHtml(r.day)}</span></td>
          <td class="text-dark leading-relaxed">${formattedContent || '코칭 안내에 따라 진행해 주세요.'}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
}

/**
 * 맞춤 식단 플랜 표 렌더링 (지능형 끼니별 파싱)
 * ★ '식단 수정 제안 지침'은 절대 노출하지 않음
 */
function renderDietPlanTable(member) {
  const dietRaw = String(getField(member, '현재 제안 식단', '현재제안식단', '식단', 'dietPlan') || '').trim();
  const descBox = document.getElementById('dietDescBox');
  const tbody = document.getElementById('dietPlanTableBody');
  if (!tbody) return;

  if (!dietRaw) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">등록된 맞춤 식단이 없습니다. 코치님과의 상담 후 맞춤 식단이 업데이트됩니다.</td></tr>';
    return;
  }

  const lines = dietRaw.split('\n');
  const rows = [];
  let generalDesc = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // ★ [보안/규칙] 식단 수정 지침 내용은 회원 화면에 절대 노출하지 않음
    if (trimmed.includes('수정 지침') || trimmed.includes('수정지침') || trimmed.includes('수정 제안') || trimmed.includes('제안 지침') || trimmed.includes('제안지침')) {
      return;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      generalDesc.push(trimmed);
      return;
    }

    // 끼니 패턴 감지 (- 아침:, - 점심:, - 저녁:, - 간식:, - 수분:)
    const mealMatch = trimmed.match(/^[-*•]?\s*([아점저간수][침심녁식분물]|오전|오후|취침전)\s*[:：]\s*(.*)$/i)
      || trimmed.match(/^[-*•]?\s*(아침|점심|저녁|간식|수분|물)\s*[:：]?\s*(.*)$/i);

    if (mealMatch) {
      const mealType = mealMatch[1].trim();
      const content = mealMatch[2].trim();
      rows.push({ type: mealType, content: content });
    } else {
      if (rows.length > 0) {
        rows[rows.length - 1].content += ' ' + trimmed;
      } else {
        generalDesc.push(trimmed);
      }
    }
  });

  // 상단 안내문 표시 (수정 지침 키워드 배제)
  const safeDietDesc = generalDesc.filter(d => 
    !d.includes('수정') && !d.includes('지침')
  );
  if (safeDietDesc.length > 0 && descBox) {
    descBox.textContent = safeDietDesc.join('\n');
    descBox.classList.remove('d-none');
  }

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td class="align-top"><span class="meal-badge lunch">식단 가이드</span></td>
        <td class="text-break">${escapeHtml(dietRaw).replace(/\n/g, '<br>')}</td>
      </tr>
    `;
  } else {
    let html = '';
    rows.forEach(r => {
      let badgeClass = 'dinner';
      if (r.type.includes('아침')) badgeClass = 'breakfast';
      else if (r.type.includes('점심')) badgeClass = 'lunch';
      else if (r.type.includes('간식')) badgeClass = 'snack';
      else if (r.type.includes('수분') || r.type.includes('물')) badgeClass = 'water';

      html += `
        <tr>
          <td class="align-top"><span class="meal-badge ${badgeClass}">${escapeHtml(r.type)}</span></td>
          <td class="text-dark leading-relaxed">${escapeHtml(r.content || '코치 안내에 맞춰 섭취')}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
}

/**
 * 피드백 타임라인 렌더링
 * ★ 중요 규칙: '문제점 분석' 및 '피드백 분석' 등 지적성 내용은 100% 필터링! 오직 칭찬/성취 코멘트만 표시!
 */
function renderFeedbackTimeline(feedbacks) {
  const container = document.getElementById('feedbackTimelineList');
  const countBadge = document.getElementById('feedbackCountBadge');
  if (!container) return;

  if (!feedbacks || feedbacks.length === 0) {
    container.innerHTML = '<div class="text-center py-5 text-muted small"><i class="bi bi-chat-square-dots fs-3 d-block mb-2"></i>아직 작성된 피드백 기록이 없습니다.<br>오늘의 첫 피드백을 제출해 보세요! 👏</div>';
    if (countBadge) countBadge.textContent = '0건';
    return;
  }

  // 최신 날짜순 정렬
  const sorted = feedbacks.slice().sort((a, b) => new Date(getField(b, '날짜') || 0) - new Date(getField(a, '날짜') || 0));
  if (countBadge) countBadge.textContent = `${sorted.length}건`;

  let html = '';
  sorted.forEach(fb => {
    const date = getField(fb, '날짜', 'date', '일자') || '-';
    const weight = getField(fb, '공복 몸무게', '공복몸무게', '체중') || '-';
    const exScore = getField(fb, '운동_실행률_점수', '운동실행률점수', '운동 점수', '운동점수', 'exerciseScore') || '-';
    const dietScore = getField(fb, '식단_실행률_점수', '식단실행률점수', '식단 점수', '식단점수', 'dietScore') || '-';

    // ★ 칭찬과 성취 격려 중심의 피드백 요약만 추출! (문제점 분석 및 지침 제안은 완전히 배제)
    let coachComment = getField(fb, '피드백_요약', '피드백 요약', '피드백요약', '피드백 요약(코멘트)', '요약', '피드백 코멘트', '피드백_코멘트', '코치 피드백', '코치피드백', '피드백 내용', '피드백내용') || '';
    
    // 혹시 통합 코멘트에 '문제점 분석'이나 '보완점 및 개선방안' 등이 섞여있다면 확실하게 잘라내기
    const cutKeywords = [
      '[문제점 분석]', '[문제점분석]', '[문제점', '[피드백 분석]', '[피드백분석]', 
      '[보완점 및 개선방안]', '[보완점]', '[개선방안]', 
      '문제점 분석:', '문제점분석:', '문제점:', '피드백 분석:'
    ];
    for (const kw of cutKeywords) {
      if (coachComment.includes(kw)) {
        coachComment = coachComment.split(kw)[0].trim();
      }
    }
    if (!coachComment) {
      coachComment = '오늘도 성실하게 일지를 기록해 주셔서 감사합니다! 꾸준한 실천이 멋진 변화를 만듭니다.';
    }

    const exDetail = getField(fb, '운동 내용', '운동내용') || '';
    const dietDetail = getField(fb, '식단 내용', '식단내용') || '';

    html += `
      <div class="feedback-timeline-item">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <span class="fw-bold text-dark fs-6">${escapeHtml(date)}</span>
          <span class="badge bg-light text-secondary border small">${weight !== '-' ? `${weight} kg` : '체중 기록 없음'}</span>
        </div>

        <div class="d-flex gap-2 mb-2">
          <span class="badge bg-success-subtle text-success border border-success-subtle small">
            <i class="bi bi-fire me-1"></i>운동 실천 ${exScore}점
          </span>
          <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
            <i class="bi bi-cup-hot me-1"></i>식단 실천 ${dietScore}점
          </span>
        </div>

        ${(exDetail || dietDetail) ? `
          <div class="small text-muted mb-2 ps-1">
            ${exDetail ? `<div>🏃 <strong>운동:</strong> ${escapeHtml(exDetail)}</div>` : ''}
            ${dietDetail ? `<div>🥗 <strong>식단:</strong> ${escapeHtml(dietDetail)}</div>` : ''}
          </div>
        ` : ''}

        <!-- 칭찬 중심 코치 코멘트 말풍선 -->
        <div class="feedback-bubble">
          <div class="d-flex align-items-center gap-2 mb-1 text-primary fw-bold small">
            <i class="bi bi-chat-quote-fill"></i>
            <span>코치님의 응원 한마디</span>
          </div>
          <div class="text-dark small leading-relaxed">
            ${escapeHtml(coachComment)}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Chart.js 변화 추이 차트 렌더링
 */
function initMemberProgressChart() {
  const canvas = document.getElementById('memberProgressChart');
  if (!canvas || !window.Chart) return;

  const feedbacks = CurrentMemberState.feedbacks;
  if (!feedbacks || feedbacks.length === 0) return;

  // 날짜 오름차순 정렬
  const sorted = feedbacks.slice().sort((a, b) => new Date(getField(a, '날짜') || 0) - new Date(getField(b, '날짜') || 0));

  const labels = sorted.map(f => getField(f, '날짜', '일자') || '');
  const weightData = sorted.map(f => parseFloat(getField(f, '공복 몸무게', '공복몸무게', '체중') || 0) || null);
  const exScores = sorted.map(f => parseFloat(getField(f, '운동_실행률_점수', '운동 점수') || 0) || null);
  const dietScores = sorted.map(f => parseFloat(getField(f, '식단_실행률_점수', '식단 점수') || 0) || null);

  if (CurrentMemberState.chartInstance) {
    CurrentMemberState.chartInstance.destroy();
  }

  const isWeight = CurrentMemberState.activeChartTab === 'weight';

  const datasets = isWeight ? [
    {
      label: '공복 몸무게 (kg)',
      data: weightData,
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderWidth: 2.5,
      tension: 0.3,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: '#4f46e5'
    }
  ] : [
    {
      label: '운동 실천 점수',
      data: exScores,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4
    },
    {
      label: '식단 실천 점수',
      data: dietScores,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4
    }
  ];

  CurrentMemberState.chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isWeight,
          position: 'top',
          labels: { boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: { font: { size: 10 } },
          min: isWeight ? undefined : 0,
          max: isWeight ? undefined : 5.5
        }
      }
    }
  });
}

/**
 * 차트 탭 전환 (체중 vs 실천점수)
 */
function switchMemberChart(type) {
  CurrentMemberState.activeChartTab = type;
  document.getElementById('btnChartWeight')?.classList.toggle('active', type === 'weight');
  document.getElementById('btnChartScore')?.classList.toggle('active', type === 'score');
  initMemberProgressChart();
}

/**
 * 헬퍼 함수
 */
function getField(obj, ...candidateKeys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const cand of candidateKeys) {
    if (obj[cand] !== undefined && obj[cand] !== null && String(obj[cand]).trim() !== '') {
      return obj[cand];
    }
  }
  const keys = Object.keys(obj);
  for (const cand of candidateKeys) {
    const cleanCand = cand.replace(/\s+/g, '').toLowerCase();
    for (const k of keys) {
      if (k.replace(/\s+/g, '').toLowerCase() === cleanCand) {
        const val = obj[k];
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

// 전역 노출
window.handleMemberAuthLogin = handleMemberAuthLogin;
window.switchMemberChart = switchMemberChart;
