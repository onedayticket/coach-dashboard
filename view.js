/**
 * ==============================================================================
 * [4주 온라인 습관화 코칭 - 회원 전용 마이페이지 view.js]
 * ==============================================================================
 * 1. URL 쿼리 파라미터(?id=회원번호) 기반 전용 회원 식별
 * 2. 휴대폰 번호 뒷 4자리 본인 인증 모달 및 로컬 저장
 * 3. 운동 루틴 & 식단 플랜: 표가 아닌 한눈에 쏙 들어오는 프리미엄 서식 박스로 표기 (수정 지침 100% 비공개)
 * 4. 피드백 관리: 코치 대시보드와 구조 완전 일치
 *    - 3개의 독립 꺾은선 차트 (공복 체중 변화, 운동 점수, 식단 점수)
 *    - 일자별 피드백 누적 테이블 (날짜, 공복체중, 운동점수, 식단점수, 코치 피드백, 실천일지)
 *    - 문제점 분석 및 비판성 내용은 회원 화면에서 완전히 제외
 * ==============================================================================
 */

// 로컬 스토리지 키 (코치 대시보드와 연동)
const STORAGE_GAS_URL_KEY = 'coach_dash_gas_api_url_v2';

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
      '현재 제안 운동 루틴': `[김민수 회원 주간 운동 루틴]
- 월/수/금 (저녁 20:30, 35분):
  1. 웜업: 고관절 스트레칭 & 버드독 10회 3세트
  2. 맨몸 스쿼트 15회 4세트
  3. 무릎 대고 푸시업 10회 3세트
  4. 슬로우 버피 12회 3세트
  5. 쿨다운: 폼롤러 허리/둔근 이완 10분
- 화/목: 퇴근길 가벼운 파워워킹 30분 또는 인터벌 걷기
- 주말(토/일 중 택1): 충분한 휴식 및 가벼운 산책`,
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
  feedbacks: [
    {
      '피드백번호': 'FB01',
      '날짜': '2026-10-08',
      '이름': '김민수',
      '회원번호': 'M001',
      '공복 몸무게': 82.5,
      '운동 점수': 8,
      '식단 점수': 7,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '첫날 멋진 출발입니다! 밥 양 2/3 조절과 수분 2L 달성 훌륭합니다.',
      '피드백 코멘트': '첫날 멋진 출발입니다! 밥 양 2/3 조절과 수분 2L 달성 훌륭합니다.',
      '운동 내용': '맨몸 스쿼트 4세트 + 런지 3세트 + 코어 스트레칭 15분',
      '식단 내용': '아침 그릭요거트, 점심 소불고기 백반(밥 반공기), 저녁 닭가슴살 샐러드',
      '회원 일기/코멘트': '첫날이라 긴장 반 설렘 반으로 시작했습니다. 물 2L 마시기 성공!'
    },
    {
      '피드백번호': 'FB02',
      '날짜': '2026-10-09',
      '이름': '김민수',
      '회원번호': 'M001',
      '공복 몸무게': 82.2,
      '운동 점수': 9,
      '식단 점수': 8,
      '운동_실행률_점수': 5.0,
      '식단_실행률_점수': 4.5,
      '피드백_요약': '야식 유혹을 이겨낸 결단력이 대단합니다. 숙면 취하세요!',
      '피드백 코멘트': '야식 유혹을 이겨낸 결단력이 대단합니다. 숙면 취하세요!',
      '운동 내용': '인터벌 조깅 30분 (페이스 6:15)',
      '식단 내용': '아침 프로틴 쉐이크, 점심 서브웨이 로티세리(위트빵), 저녁 연어구이 샐러드',
      '회원 일기/코멘트': '러닝 후 땀 흘리니 상쾌하네요. 야식 유혹 참아냈습니다.'
    },
    {
      '피드백번호': 'FB03',
      '날짜': '2026-10-10',
      '이름': '김민수',
      '회원번호': 'M001',
      '공복 몸무게': 82.0,
      '운동 점수': 6,
      '식단 점수': 6,
      '운동_실행률_점수': 4.0,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '야근 중에도 취침 전 폼롤러 스트레칭으로 몸을 이완해 주신 점 훌륭합니다!',
      '피드백 코멘트': '야근 중에도 취침 전 폼롤러 스트레칭으로 몸을 이완해 주신 점 훌륭합니다!',
      '운동 내용': '야근으로 인해 취침 전 폼롤러 스트레칭 20분만 진행',
      '식단 내용': '점심 김치찌개 건더기 위주, 저녁 단호박+닭가슴살 소시지',
      '회원 일기/코멘트': '업무가 너무 바빠 운동을 제대로 못해 아쉽고 피곤합니다.'
    },
    {
      '피드백번호': 'FB04',
      '날짜': '2026-10-11',
      '이름': '김민수',
      '회원번호': 'M001',
      '공복 몸무게': 81.8,
      '운동 점수': 9,
      '식단 점수': 9,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.5,
      '피드백_요약': '상체 웨이트와 클린 식단 모두 완벽하게 지켜주셨습니다! 몸의 가벼움이 지속될 거예요.',
      '피드백 코멘트': '상체 웨이트와 클린 식단 모두 완벽하게 지켜주셨습니다! 몸의 가벼움이 지속될 거예요.',
      '운동 내용': '상체 웨이트 40분 (체스트 프레스, 랫풀다운, 숄더 프레스)',
      '식단 내용': '아침 오트밀 40g, 점심 닭가슴살 볶음밥, 저녁 소고기 우둔살 샐러드',
      '회원 일기/코멘트': '클린하게 챙겨 먹으니 오후에 식곤증이 없어서 신기합니다.'
    },
    {
      '피드백번호': 'FB05',
      '날짜': '2026-10-12',
      '이름': '김민수',
      '회원번호': 'M001',
      '공복 몸무게': 81.7,
      '운동 점수': 8,
      '식단 점수': 8,
      '운동_실행률_점수': 4.0,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '실내 사이클 35분 꾸준한 실천 감사합니다! 체중 감량 추세가 아주 안정적입니다.',
      '피드백 코멘트': '실내 사이클 35분 꾸준한 실천 감사합니다! 체중 감량 추세가 아주 안정적입니다.',
      '운동 내용': '실내 사이클 35분 (케이던스 80 유지)',
      '식단 내용': '아침 바나나+계란 2알, 점심 연어 포케, 저녁 프로틴 쉐이크+아몬드',
      '회원 일기/코멘트': '몸이 한결 가벼워졌고 옷 입을 때 허리가 편안합니다!'
    },

    // 이지원 회원 피드백
    {
      '피드백번호': 'FB06',
      '날짜': '2026-10-11',
      '이름': '이지원',
      '회원번호': 'M002',
      '공복 몸무게': 58.2,
      '운동 점수': 8,
      '식단 점수': 7,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '디저트 방어 성공 축하드립니다! 결단력이 정말 훌륭합니다.',
      '피드백 코멘트': '디저트 방어 성공 축하드립니다! 결단력이 정말 훌륭합니다.',
      '운동 내용': '필라테스 코어 35분',
      '식단 내용': '아침 사과, 점심 일반식(구내식당), 저녁 샐러드',
      '회원 일기/코멘트': '디저트 카페 가자는 동료들 유혹 뿌리치고 아메리카노 마셨습니다.'
    },
    {
      '피드백번호': 'FB07',
      '날짜': '2026-10-12',
      '이름': '이지원',
      '회원번호': 'M002',
      '공복 몸무게': 57.9,
      '운동 점수': 9,
      '식단 점수': 8,
      '운동_실행률_점수': 4.5,
      '식단_실행률_점수': 4.0,
      '피드백_요약': '퇴근길 만보 걷기 달성 멋집니다! 체중도 57kg대로 진입하셨네요 축하드려요!',
      '피드백 코멘트': '퇴근길 만보 걷기 달성 멋집니다! 체중도 57kg대로 진입하셨네요 축하드려요!',
      '운동 내용': '빠르게 걷기 만보 (50분)',
      '식단 내용': '아침 요거트, 점심 현미 포케, 저녁 닭가슴살 볼',
      '회원 일기/코멘트': '퇴근길 지하철 2정거장 일찍 내려서 걸어왔어요.'
    }
  ]
};

// 현재 회원 상태
let CurrentMemberState = {
  member: null,
  feedbacks: [],
  rawFeedbacksTotal: 0,
  rawMembersTotal: 0,
  isUsingMock: false,
  charts: {
    weight: null,
    exercise: null,
    diet: null
  }
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
 * 피드백 행 객체에서 회원 이름 관대하게 추출 (질문형 헤더, '이름' 포함 컬럼 자동 감지)
 */
function extractFeedbackMemberName(f) {
  if (!f) return '';
  // 1. 표준 헤더 우선 탐색
  const directVal = getField(f, 
    '이름', 'name', '성명', '성함', '회원명', '참여자이름', '참여자 이름', 
    '참여자성함', '회원이름', '참가자이름', '신청자', '작성자', '회원'
  );
  if (directVal) return String(directVal).trim();

  // 2. 헤더 키에 '이름', '성명', '성함'이 포함된 열 동적 스캔 (구글 폼 긴 질문 대응)
  const keys = Object.keys(f);
  for (const k of keys) {
    const cleanK = k.replace(/\s+/g, '').toLowerCase();
    if ((cleanK.includes('이름') || cleanK.includes('성명') || cleanK.includes('성함')) && !cleanK.includes('코치')) {
      if (f[k]) return String(f[k]).trim();
    }
  }
  return '';
}

/**
 * 피드백 행 객체에서 회원번호 관대하게 추출
 */
function extractFeedbackMemberNo(f) {
  if (!f) return '';
  const directVal = getField(f, 
    '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호'
  );
  if (directVal) return String(directVal).trim();

  const keys = Object.keys(f);
  for (const k of keys) {
    const cleanK = k.replace(/\s+/g, '').toLowerCase();
    if (cleanK.includes('회원번호') || cleanK.includes('회원id') || cleanK.includes('고유번호')) {
      if (f[k]) return String(f[k]).trim();
    }
  }
  return '';
}

/**
 * 회원 데이터 로드 (구글 시트 연동 시 실시간 조회)
 */
async function loadMemberPageData(targetId) {
  let allMembers = [];
  let allFeedbacks = [];

  const urlParams = new URLSearchParams(window.location.search);
  const urlGas = (urlParams.get('gas') || urlParams.get('apiUrl') || urlParams.get('gasUrl') || '').trim();
  const storageGas = (localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
  const gasUrl = urlGas || storageGas;

  if (urlGas && urlGas !== storageGas) {
    try {
      localStorage.setItem(STORAGE_GAS_URL_KEY, urlGas);
    } catch (e) {}
  }

  console.log(`[회원 뷰어] 데이터 로드 시도: gasUrl=${gasUrl ? gasUrl.substring(0, 40) + '...' : '(없음/Mock)'}, targetId=${targetId}`);

  if (gasUrl) {
    try {
      const fetchUrl = `${gasUrl}?action=getAll&t=${Date.now()}`;
      const res = await fetch(fetchUrl);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        allMembers = Array.isArray(json.data.members) ? json.data.members : [];
        allFeedbacks = Array.isArray(json.data.feedbacks) ? json.data.feedbacks : [];
        console.log(`[회원 뷰어] GAS 통신 성공! 시트에서 가져온 회원: ${allMembers.length}명, 피드백: ${allFeedbacks.length}건`);
      } else {
        console.warn('[회원 뷰어] GAS 응답 오류:', json);
      }
    } catch (e) {
      console.warn('[회원 뷰어] GAS 연동 실패(CORS/네트워크), Mock 데이터로 진행합니다.', e);
    }
  } else {
    console.warn('[회원 뷰어] GAS URL이 설정되지 않아 로컬 Mock DB로 동작합니다.');
  }

  // 데이터가 없거나 로드 실패 시 Mock DB 사용
  const isUsingMock = (!allMembers || allMembers.length === 0);
  if (isUsingMock) {
    allMembers = VIEW_MOCK_DB.members;
    allFeedbacks = VIEW_MOCK_DB.feedbacks;
  }

  CurrentMemberState.rawMembersTotal = allMembers.length;
  CurrentMemberState.rawFeedbacksTotal = allFeedbacks.length;
  CurrentMemberState.isUsingMock = isUsingMock;

  // 하단 연동 상태 뱃지 업데이트
  const statusBadge = document.getElementById('dataConnectionStatusBadge');
  if (statusBadge) {
    if (isUsingMock) {
      statusBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      statusBadge.textContent = '🟡 오프라인 Mock 모드';
      statusBadge.title = '구글 시트 연동 URL이 설정되지 않아 샘플 데이터가 표시 중입니다. [연동설정]을 눌러 실제 시트 URL을 입력해 주세요.';
    } else {
      if (allFeedbacks.length === 0) {
        // [핵심 진단] 회원은 읽었으나 피드백 시트가 비어있거나 찾지 못한 경우
        statusBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
        statusBadge.textContent = `🟢 시트 연동됨 (${allMembers.length}명 / ⚠️ 피드백 시트 확인 필요)`;
        statusBadge.title = '회원 정보는 성공적으로 불러왔으나 Feedbacks 시트를 찾지 못했거나 내용이 없습니다. 구글 스프레드시트의 피드백 탭 이름을 "Feedbacks"로 변경해 주세요.';
      } else {
        statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle';
        statusBadge.textContent = `🟢 구글 시트 실시간 연동됨 (${allMembers.length}명 / 피드백 ${allFeedbacks.length}건)`;
        statusBadge.title = '구글 스프레드시트와 실시간으로 정상 연결되었습니다.';
      }
    }
  }

  // 회원 매칭 (회원번호 우선 ➔ 이름 ➔ 부분 일치)
  const cleanTargetId = targetId.replace(/\s+/g, '').toLowerCase();
  const matchedMember = allMembers.find(m => {
    const no = String(getField(m, '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호') || '').replace(/\s+/g, '').toLowerCase();
    const name = String(getField(m, '이름', 'name', '성명', '회원명', '참여자이름', '참여자 이름', '성함') || '').replace(/\s+/g, '').toLowerCase();
    return no === cleanTargetId || name === cleanTargetId || (name && cleanTargetId && (name.includes(cleanTargetId) || cleanTargetId.includes(name)));
  });

  if (!matchedMember) {
    console.warn(`[회원 뷰어] '${targetId}'에 해당하는 회원을 찾을 수 없습니다. (전체 회원 수: ${allMembers.length}명)`);
    showInvalidAccessScreen();
    return;
  }

  CurrentMemberState.member = matchedMember;

  // 피드백 필터링 (다양한 열 이름 및 부분 일치 지원)
  const memberName = getMemberName(matchedMember);
  const memberNo = getMemberNo(matchedMember);
  const memberPhone = getMemberPhoneLast4(matchedMember);
  const cleanMemberName = memberName.replace(/\s+/g, '').toLowerCase();
  const cleanMemberNo = memberNo.replace(/\s+/g, '').toLowerCase();

  CurrentMemberState.feedbacks = allFeedbacks.filter(f => {
    const fName = extractFeedbackMemberName(f).replace(/\s+/g, '').toLowerCase();
    const fNo = extractFeedbackMemberNo(f).replace(/\s+/g, '').toLowerCase();
    const fPhone = String(getField(f, '연락처', '전화번호', '휴대폰', '핸드폰', 'phone') || '').replace(/[^0-9]/g, '');

    // 1. 회원번호 일치
    if (cleanMemberNo && fNo && (fNo === cleanMemberNo || fNo.includes(cleanMemberNo))) return true;
    
    // 2. 이름 일치 (완전 일치 또는 괄호 제거 후 포함 비교)
    if (cleanMemberName && fName) {
      const pureFName = fName.split('(')[0].trim();
      const pureMemName = cleanMemberName.split('(')[0].trim();
      if (fName === cleanMemberName || pureFName === pureMemName || fName.includes(pureMemName) || pureMemName.includes(pureFName)) {
        return true;
      }
    }

    // 3. 휴대폰 뒷 4자리 일치
    if (memberPhone && memberPhone !== '0000' && fPhone && fPhone.slice(-4) === memberPhone) return true;

    return false;
  });

  console.log(`[회원 뷰어] 회원 매칭 완료: ${memberName}(${memberNo}), 필터링된 피드백: ${CurrentMemberState.feedbacks.length}건 (전체 ${allFeedbacks.length}건 중)`);

  // 3. 본인 인증 체크 (휴대폰 번호 뒷 4자리)
  checkMemberAuthAndDisplay();
}

/**
 * 휴대폰 뒷 4자리 인증 상태 체크 및 모달 표시
 */
function checkMemberAuthAndDisplay() {
  const member = CurrentMemberState.member;
  const memberId = getMemberNo(member) || getMemberName(member);
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
  
  // 1. 등록된 전화번호 열 탐색
  const rawPhone = getField(member, '연락처', '전화번호', '휴대폰', '핸드폰', 'phone', 'tel', 'mobile', '연락처(휴대폰)') || '';
  const digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }

  // 2. Mock 및 테스트 대비 기본 안전 핀코드
  const no = getMemberNo(member);
  const name = getMemberName(member);
  if (no === 'M001' || name === '김민수') return '5678';
  if (no === 'M002' || name === '이지원') return '4321';

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

  // 정답 비교 (등록된 전화번호 뒷 4자리 또는 등록 누락 시 안전 백업 허용)
  if (enteredPin === correctPin || (correctPin === '0000' && (enteredPin === '0000' || enteredPin === '1234' || enteredPin === '5678'))) {
    // 인증 성공!
    const member = CurrentMemberState.member;
    const memberId = getMemberNo(member) || getMemberName(member);
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

  // 체중 계산
  const startWeight = parseFloat(getField(member, '시작 체중', '시작체중', '체중', 'weight') || 0);
  let latestWeight = startWeight;

  if (feedbacks && feedbacks.length > 0) {
    const sortedFbs = feedbacks.slice().sort((a, b) => new Date(getField(b, '날짜') || 0) - new Date(getField(a, '날짜') || 0));
    const recentW = parseFloat(getField(sortedFbs[0], '공복 몸무게', '공복몸무게', '체중', 'weight') || 0);
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
      diffBox.textContent = `0.0 kg (유지)`;
      diffBox.className = 'fs-5 text-white fw-bold ms-2';
    }
  }

  // 3. 운동 루틴 서식 박스 렌더링 (★ 표 없이 한눈에 잘 들어오게 표기, 수정 지침 100% 제외)
  renderWorkoutRoutineBox(member);

  // 4. 식단 플랜 서식 박스 렌더링 (★ 표 없이 한눈에 잘 들어오게 표기, 수정 지침 100% 제외)
  renderDietPlanBox(member);

  // 5. 데일리 데이터 추이 3개의 독립 꺾은선 차트 (코치 대시보드와 동일)
  renderThreeIndependentCharts(feedbacks);

  // 6. 일자별 피드백 누적 테이블 렌더링 (코치 대시보드 목록 기준 그대로 가져옴)
  renderFeedbackTable(feedbacks);
}

/**
 * [코치 대시보드와 100% 동일] 인적 사항 패널 렌더링
 */
function updatePersonalInfoPanel(mem) {
  if (!mem) return;

  const memberId = getMemberNo(mem);
  const name = getMemberName(mem);
  const age = getField(mem, '나이', 'age') || '-';
  const gender = getField(mem, '성별', 'gender') || '-';
  const height = getField(mem, '키', 'height') || '-';
  const weight = getField(mem, '시작 체중', '시작체중', '체중', '공복 몸무게', '공복몸무게', 'weight') || '-';
  const job = getField(mem, '직업/근무시간', '직업', '근무시간', 'job') || '-';
  const exp = getField(mem, '운동 경력', '운동경력', '운동 경험', '운동경험', '경력', 'experience') || '-';
  const freq = getField(mem, '주당 운동 횟수', '주당운동횟수', '주당 운동횟수', '운동 횟수', '운동횟수', 'frequency') || '-';
  const goal = getField(mem, '참여목적', '목표', 'goal', '목적') || '-';
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
    badgeStatus.className = `badge ${isActive ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'} fw-normal`;
  }

  const badgeTag = document.getElementById('badgeMemberTag');
  if (badgeTag) {
    badgeTag.innerHTML = `<i class="bi bi-tag-fill text-primary me-1"></i>${escapeHtml(tag)}`;
  }
}

/**
 * [1. 운동 루틴 표기]
 * 표로 쪼개지 않고 코치가 작성한 형식 그대로 한눈에 쏙 들어오게 렌더링
 * ★ 수정 지침 내용은 회원 화면에서 100% 절대 노출하지 않음
 */
function renderWorkoutRoutineBox(member) {
  const container = document.getElementById('workoutRoutineBox');
  if (!container) return;

  const rawRoutine = String(getField(member, '현재 제안 운동 루틴', '현재제안운동루틴', '운동루틴', 'workoutRoutine') || '').trim();

  if (!rawRoutine) {
    container.innerHTML = '<div class="text-muted text-center py-4">등록된 운동 루틴이 없습니다.<br>코치님과의 상담 후 맞춤 루틴이 업데이트됩니다.</div>';
    return;
  }

  // ★ 수정 지침 관련 줄 철저 필터링
  const lines = rawRoutine.split('\n');
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.includes('수정 지침') || trimmed.includes('수정지침') || trimmed.includes('수정 제안') || trimmed.includes('제안 지침') || trimmed.includes('제안지침')) {
      return false;
    }
    return true;
  });

  const cleanedText = cleanLines.join('\n').trim();
  container.textContent = cleanedText || '등록된 운동 루틴이 없습니다.';
}

/**
 * [2. 식단 플랜 표기]
 * 표로 쪼개지 않고 코치가 작성한 형식 그대로 한눈에 쏙 들어오게 렌더링
 * ★ 수정 지침 내용은 회원 화면에서 100% 절대 노출하지 않음
 */
function renderDietPlanBox(member) {
  const container = document.getElementById('dietPlanBox');
  if (!container) return;

  const rawDiet = String(getField(member, '현재 제안 식단', '현재제안식단', '식단', 'dietPlan') || '').trim();

  if (!rawDiet) {
    container.innerHTML = '<div class="text-muted text-center py-4">등록된 맞춤 식단이 없습니다.<br>코치님과의 상담 후 맞춤 식단이 업데이트됩니다.</div>';
    return;
  }

  // ★ 수정 지침 관련 줄 철저 필터링
  const lines = rawDiet.split('\n');
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.includes('수정 지침') || trimmed.includes('수정지침') || trimmed.includes('수정 제안') || trimmed.includes('제안 지침') || trimmed.includes('제안지침')) {
      return false;
    }
    return true;
  });

  const cleanedText = cleanLines.join('\n').trim();
  container.textContent = cleanedText || '등록된 맞춤 식단이 없습니다.';
}

/**
 * [3. 데일리 데이터 추이 3개의 독립 꺾은선 차트]
 * 코치 대시보드(renderThreeIndependentCharts)와 완전히 동일한 차트 구성
 * 1. 공복 몸무게 (kg)
 * 2. 운동 점수 (5점 만점)
 * 3. 식단 점수 (5점 만점)
 */
function renderThreeIndependentCharts(feedbacks) {
  if (CurrentMemberState.charts.weight) CurrentMemberState.charts.weight.destroy();
  if (CurrentMemberState.charts.exercise) CurrentMemberState.charts.exercise.destroy();
  if (CurrentMemberState.charts.diet) CurrentMemberState.charts.diet.destroy();

  if (!feedbacks || feedbacks.length === 0 || !window.Chart) return;

  // 날짜 오름차순 정렬 (차트 좌->우 시간 흐름)
  const sorted = [...feedbacks].sort((a, b) => new Date(getField(a, '날짜') || 0) - new Date(getField(b, '날짜') || 0));

  const labels = sorted.map(f => {
    const raw = String(getField(f, '날짜', 'date', '일자'));
    const d = new Date(raw);
    return isNaN(d) ? raw : `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const weightData = sorted.map(f => parseFloat(getField(f, '공복 몸무게', '공복몸무게', '체중', 'weight')) || null);
  const exScoreData = sorted.map(f => parseFloat(getField(f, '운동_실행률_점수', '운동실행률점수', '운동 점수', '운동점수', 'exerciseScore')) || null);
  const dietScoreData = sorted.map(f => parseFloat(getField(f, '식단_실행률_점수', '식단실행률점수', '식단 점수', '식단점수', 'dietScore')) || null);

  // 차트 1: 공복 몸무게 (kg)
  const ctxWeight = document.getElementById('chartWeight');
  if (ctxWeight) {
    const validWeights = weightData.filter(v => v !== null);
    const minW = validWeights.length ? Math.floor(Math.min(...validWeights) - 1) : 50;
    const maxW = validWeights.length ? Math.ceil(Math.max(...validWeights) + 1) : 90;

    CurrentMemberState.charts.weight = new Chart(ctxWeight, {
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
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#4f46e5'
        }]
      },
      options: createMemberChartOptions('kg', minW, maxW)
    });
  }

  // 차트 2: 운동 점수 (5점 만점)
  const ctxEx = document.getElementById('chartExercise');
  if (ctxEx) {
    CurrentMemberState.charts.exercise = new Chart(ctxEx, {
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
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: createMemberChartOptions('점', 0, 5.5, 1)
    });
  }

  // 차트 3: 식단 점수 (5점 만점)
  const ctxDiet = document.getElementById('chartDiet');
  if (ctxDiet) {
    CurrentMemberState.charts.diet = new Chart(ctxDiet, {
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
          pointRadius: 4.5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#f59e0b'
        }]
      },
      options: createMemberChartOptions('점', 0, 5.5, 1)
    });
  }
}

function createMemberChartOptions(unit, minVal, maxVal, stepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 12, right: 8, bottom: 4, left: 4 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
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
 * [4. 일자별 피드백 누적 테이블]
 * 코치 대시보드(renderFeedbackTable)의 컬럼 및 구조를 기준으로 그대로 가져오되,
 * 문제점 분석/비판 내용은 회원 화면에서 완전히 제외하고 칭찬/성취 코멘트와 실천 일지만 노출
 */
function renderFeedbackTable(feedbacks) {
  const tbody = document.getElementById('feedbackTableBody');
  const countBadge = document.getElementById('feedbackCountBadge');
  if (!tbody) return;

  if (!feedbacks || feedbacks.length === 0) {
    const isMock = CurrentMemberState.isUsingMock;
    const totalFbs = CurrentMemberState.rawFeedbacksTotal;
    let hintMsg = '';

    if (!isMock && totalFbs === 0) {
      hintMsg = `
        <div class="alert alert-warning border small text-start mt-3 mb-0" style="max-width: 600px; margin: 0 auto;">
          <i class="bi bi-exclamation-triangle-fill me-1 text-warning"></i><strong>피드백 시트(Feedbacks) 확인 필요:</strong><br>
          스프레드시트에서 회원 정보는 성공적으로 불러왔으나, <strong>피드백 시트(Feedbacks) 데이터를 찾지 못했습니다.</strong><br>
          • 구글 시트의 피드백 탭 이름이 <code>Feedbacks</code> 또는 <code>피드백</code>으로 되어 있는지 확인해 주세요.<br>
          • (구글 폼 생성 기본 시트명인 <code>설문지 응답 1</code>로 되어 있다면 탭 이름을 <strong>Feedbacks</strong>로 변경해 주시면 즉시 연결됩니다.)
        </div>
      `;
    } else if (!isMock && totalFbs > 0) {
      hintMsg = `
        <div class="alert alert-info border small text-start mt-3 mb-0" style="max-width: 600px; margin: 0 auto;">
          <i class="bi bi-info-circle-fill me-1 text-primary"></i><strong>피드백 매칭 안내:</strong><br>
          피드백 시트(총 ${totalFbs}건)는 접근되었으나, 현재 회원님(<strong>${getMemberName(CurrentMemberState.member)}</strong>)의 이름 또는 회원번호와 일치하는 제출 기록이 없습니다.<br>
          새로운 일지를 제출해 주시면 자동으로 집계되어 표시됩니다.
        </div>
      `;
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted small">
          <i class="bi bi-chat-square-dots fs-3 d-block mb-2 text-secondary"></i>
          제출된 데일리 피드백 기록이 없습니다.<br>
          상단의 <strong>[📝 오늘의 데일리 피드백 제출하기]</strong> 버튼을 통해 오늘 첫 일지를 작성해 보세요! 👏
          ${hintMsg}
        </td>
      </tr>
    `;
    if (countBadge) countBadge.textContent = '누적 0건';
    return;
  }

  // 최신 제출일 순(내림차순) 정렬
  const sorted = [...feedbacks].sort((a, b) => {
    const rawA = getField(a, '날짜', 'date', '일자') || '';
    const rawB = getField(b, '날짜', 'date', '일자') || '';
    const timeA = new Date(rawA).getTime() || 0;
    const timeB = new Date(rawB).getTime() || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(rawB).localeCompare(String(rawA));
  });

  if (countBadge) countBadge.textContent = `누적 ${sorted.length}건`;

  let html = '';
  sorted.forEach(fb => {
    const date = getField(fb, '날짜', 'date', '일자') || '-';
    const weight = getField(fb, '공복 몸무게', '공복몸무게', '체중', 'weight') || '-';

    // 1. 점수 추출 (5점 만점 기준)
    const exScore = getField(fb, '운동_실행률_점수', '운동실행률점수', '운동 점수', '운동점수', 'exerciseScore') || '-';
    const dietScore = getField(fb, '식단_실행률_점수', '식단실행률점수', '식단 점수', '식단점수', 'dietScore') || '-';

    // 2. 코치 피드백 요약 코멘트 추출 (★ 문제점 분석 / 보완점 및 개선방안은 100% 잘라내고 비공개)
    let summary = getField(fb, '피드백_요약', '피드백 요약', '피드백요약', '요약', 'feedbackSummary', 'summary') || '';
    if (!summary) {
      summary = getField(fb, '피드백 코멘트', '피드백코멘트', '피드백 내용', '피드백내용', '코치 피드백', '코치피드백') || '';
    }

    // 혹시 통합 텍스트에 [문제점 분석]이나 [보완점 및 개선방안] 등이 포함되어 있다면 해당 지점부터 완전히 잘라냄
    const cutKeywords = [
      '[문제점 분석]', '[문제점분석]', '[문제점', '[피드백 분석]', '[피드백분석]', 
      '[보완점 및 개선방안]', '[보완점]', '[개선방안]', 
      '문제점 분석:', '문제점분석:', '문제점:', '피드백 분석:'
    ];
    for (const kw of cutKeywords) {
      if (summary.includes(kw)) {
        summary = summary.split(kw)[0].trim();
      }
    }

    // 3. 회원 일지 내용 (운동 내용, 식단 내용, 회원 소감)
    const exDetail = getField(fb, '운동 내용', '운동내용') || '';
    const dietDetail = getField(fb, '식단 내용', '식단내용') || '';
    const diaryDetail = getField(fb, '회원 일기/코멘트', '회원 일기', '회원일기', '코멘트', '일기') || '';

    html += `
      <tr>
        <td class="text-nowrap fw-bold text-secondary small">${escapeHtml(date)}</td>
        <td class="text-nowrap fw-bold text-dark">${weight !== '-' ? `${weight} kg` : '-'}</td>
        <td class="text-nowrap text-center">
          <span class="badge ${getScoreBadgeClass(exScore)}">${exScore !== '-' ? `${exScore} 점` : '-'}</span>
        </td>
        <td class="text-nowrap text-center">
          <span class="badge ${getScoreBadgeClass(dietScore)}">${dietScore !== '-' ? `${dietScore} 점` : '-'}</span>
        </td>
        <td class="small" style="min-width: 240px;">
          ${summary ? `
            <div class="feedback-comment-cell">
              <div class="d-flex align-items-center gap-1 fw-bold text-success mb-1">
                <i class="bi bi-chat-quote-fill"></i>
                <span>코치님의 응원 피드백</span>
              </div>
              <div class="leading-relaxed">${escapeHtml(summary)}</div>
            </div>
          ` : `
            <span class="badge bg-light text-secondary border px-2 py-1">코치 피드백 작성 대기 중</span>
          `}
        </td>
        <td class="small" style="min-width: 220px;">
          ${(exDetail || dietDetail || diaryDetail) ? `
            <div class="member-log-cell">
              ${exDetail ? `<div class="mb-1">🏃 <strong>운동:</strong> ${escapeHtml(exDetail)}</div>` : ''}
              ${dietDetail ? `<div class="mb-1">🥗 <strong>식단:</strong> ${escapeHtml(dietDetail)}</div>` : ''}
              ${diaryDetail ? `<div class="text-muted fst-italic">💬 "${escapeHtml(diaryDetail)}"</div>` : ''}
            </div>
          ` : `
            <span class="text-muted small">-</span>
          `}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

/**
 * 점수 뱃지 클래스
 */
function getScoreBadgeClass(score) {
  const num = parseFloat(score);
  if (isNaN(num)) return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
  if (num >= 4.0) return 'bg-success text-white';
  if (num >= 2.5) return 'bg-warning text-dark';
  return 'bg-danger text-white';
}

/**
 * 헬퍼 함수
 */
function getMemberName(m) {
  return String(getField(m, '이름', 'name', '성명', '회원명', '참여자이름', '참여자 이름') || '회원').trim();
}

function getMemberNo(m) {
  return String(getField(m, '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호') || '').trim();
}

function getMemberTag(m) {
  if (!m) return '4주-체중감량반';
  return String(getField(m, '태그', 'tag', 'tags', '분류', '코스', '프로그램', '프로그램명') || '4주-체중감량반').trim();
}

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

// 전역 노출
window.handleMemberAuthLogin = handleMemberAuthLogin;
window.promptGasUrl = promptGasUrl;
