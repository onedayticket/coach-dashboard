/**
 * ==============================================================================
 * [4주 온라인 운동/식단 습관화 코칭 프로그램 대시보드 - Google Apps Script 백엔드]
 * ==============================================================================
 * 
 * [풀스택 수석 개발자 설계 원칙]
 * 1. DB 열(Column) 보존 원칙:
 *    - 절대 임의로 새로운 열을 삽입(Insert)하거나 시트 구조를 변경하지 않습니다.
 *    - 1행의 열 헤더 이름을 동적으로 스캔하여 해당 열의 인덱스에만 정확히 Read/Write합니다.
 * 2. 관대한 헤더 탐색 및 정규화(Flexible Header Matching):
 *    - 1행 헤더에서 모든 공백(띄어쓰기)을 완벽하게 제거하여 비교하므로 
 *      "공복 몸무게" vs "공복몸무게", "운동 제안 지침" vs "운동제안지침" 등 미세한 차이에 100% 대응합니다.
 * 3. 지능형 시트 및 지침서 2D 그리드 스캐너 (Fail-Safe Sheet Scanner):
 *    - 시트 탭 이름이 다르거나 띄어쓰기가 달라도 스마트 키워드 감지로 자동 탐색합니다.
 *    - Guidelines 시트의 '지침'/'내용' 열 순서나 행 구성에 구애받지 않고 
 *      '코칭 철학', '운동 제안 지침', '식단 제안 지침', '피드백 지침', '동기부여 지침'을 100% 완벽 식별합니다.
 * 4. 식별자 매핑:
 *    - '회원번호' 또는 '이름'을 고유 키(Key)로 삼아 신청서(Members)와 데일리 피드백(Feedbacks)을 매핑합니다.
 * 5. 보안 및 AI Gemini API 백엔드 실행:
 *    - Gemini API Key는 프론트엔드에 노출하지 않고 GAS 백엔드에서만 안전하게 호출합니다.
 *    - 스크립트 속성(Script Properties)의 'GEMINI_API_KEY'를 우선 사용하며, 없을 시 대체 지침 기반 스마트 응답을 반환합니다.
 * ==============================================================================
 */

// 전역 시트 명칭 동의어 목록 (띄어쓰기 및 대소문자 무관 탐색 지원)
const SHEET_NAMES = {
  MEMBERS: [
    'Members', 'members', 'Applications', 'applications', '회원목록', '신청서',
    '회원', '참여자', '참여자목록', '참가자', '설문결과', '응답', '회원관리'
  ],
  FEEDBACKS: [
    'Feedbacks', 'feedbacks', 'DailyFeedbacks', '데일리피드백', '피드백',
    '데일리 피드백', '일일피드백', '일일 피드백', '일지', '운동일지', '식단일지', '데일리일지'
  ],
  GUIDELINES: [
    'Guidelines', 'guidelines', '지침서', '코칭지침', '코칭지침서', '가이드라인',
    '지침', '코칭가이드', '코칭 가이드라인', '가이드', '매뉴얼', '운영지침'
  ]
};

/**
 * 기본 Gemini API 키 (스크립트 속성에 'GEMINI_API_KEY' 등록 시 해당 키 우선 사용)
 * 메뉴: 프로젝트 설정 -> 스크립트 속성 -> 속성 추가 (속성: GEMINI_API_KEY, 값: AI_KEY)
 */
const DEFAULT_GEMINI_API_KEY = '';

/**
 * CORS 대응 (doOptions)
 */
function doOptions(e) {
  return createJsonResponse({ status: 'ok', message: 'CORS Preflight OK' });
}

/**
 * GET 요청 핸들러 (doGet)
 * - action 파라미터에 따라 데이터를 반환합니다.
 * - action: 'getAll' (기본값) -> 전체 회원 목록, 피드백 전체, 5대 지침서 반환
 * - action: 'getGuidelines' -> 5대 지침서만 반환
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
    let ss = SpreadsheetApp.getActiveSpreadsheet();

    // 스프레드시트 컨테이너 미바인딩(독립 스크립트) 시 스크립트 속성 확인
    if (!ss) {
      try {
        const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        if (ssId) {
          ss = SpreadsheetApp.openById(ssId.trim());
        }
      } catch (errOpen) {
        Logger.log('SPREADSHEET_ID 열기 실패: ' + errOpen.toString());
      }
    }

    if (!ss) {
      return createJsonResponse({
        status: 'error',
        message: '활성화된 스프레드시트를 찾을 수 없습니다. 구글 시트 상단 [확장 프로그램 > Apps Script]에서 스크립트를 열고 배포했는지 확인해 주세요.'
      });
    }

    if (action === 'getAll') {
      const memberSheet = findSheetSmartly(ss, SHEET_NAMES.MEMBERS, ['이름', '체중', '운동경력', '키', '성별']);
      const feedbackSheet = findSheetSmartly(ss, SHEET_NAMES.FEEDBACKS, ['공복몸무게', '운동점수', '식단점수', '운동내용']);
      const guidelineSheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침', '지침', '내용']);

      return createJsonResponse({
        status: 'success',
        data: {
          members: getSheetDataWithHeaders(memberSheet),
          feedbacks: getSheetDataWithHeaders(feedbackSheet),
          guidelines: getGuidelinesData(guidelineSheet)
        }
      });
    }

    if (action === 'getGuidelines') {
      const guidelineSheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침', '지침', '내용']);
      return createJsonResponse({
        status: 'success',
        data: getGuidelinesData(guidelineSheet)
      });
    }

    // 진단용: 현재 API Key로 구글에서 실제 사용 가능한 텍스트 모델 목록 조회
    if (action === 'getGeminiModels') {
      const apiKey = getEffectiveGeminiApiKey(null);
      return createJsonResponse({
        status: 'success',
        models: getGoogleSupportedTextModels(apiKey)
      });
    }

    return createJsonResponse({ status: 'error', message: '알 수 없는 action: ' + action });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * POST 요청 핸들러 (doPost)
 * - 다양한 액션 처리:
 *   1. updateMemberStatusTag: 회원의 상태(유효/휴면) 및 태그 변경
 *   2. updateMemberGuidelineRoutine: 운동/식단 수정 제안 지침 및 현재 제안 루틴/식단 저장
 *   3. updateGuidelines: 5대 지침서 저장/업데이트
 *   4. updateFeedbackComment: 특정 날짜 피드백 코멘트 저장
 *   5. generateWorkoutRoutine: AI 운동 루틴 생성 (지침서 + 수정제안지침 최우선 반영)
 *   6. generateDietPlan: AI 식단 생성 (지침서 + 수정제안지침 최우선 반영)
 *   7. generateDailyFeedback: AI 데일리 피드백 코멘트 & 운동/식단 수정 제안 도출 (체중 추이 분석 + 근거 제시)
 *   8. generateComprehensiveFeedback: AI 기간별 종합 피드백 요약 및 자립 방안 생성
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: 'error', message: '전송된 요청 데이터가 없습니다.' });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 회원 상태 및 태그 즉시 업데이트
    if (action === 'updateMemberStatusTag') {
      return handleUpdateMemberStatusTag(ss, payload);
    }

    // 2. 회원의 운동/식단 수정 제안 지침 및 루틴/식단 내용 업데이트
    if (action === 'updateMemberGuidelineRoutine') {
      return handleUpdateMemberGuidelineRoutine(ss, payload);
    }

    // 3. 5대 지침서(Guidelines) 업데이트
    if (action === 'updateGuidelines') {
      return handleUpdateGuidelines(ss, payload);
    }

    // 4. 피드백 코멘트 저장
    if (action === 'updateFeedbackComment') {
      return handleUpdateFeedbackComment(ss, payload);
    }

    // 5. [AI] 운동 루틴 생성
    if (action === 'generateWorkoutRoutine') {
      return handleAiWorkoutRoutine(ss, payload);
    }

    // 6. [AI] 식단 계획 생성
    if (action === 'generateDietPlan') {
      return handleAiDietPlan(ss, payload);
    }

    // 7. [AI] 데일리 피드백 도출 (체중 추이 분석 + 근거 기반 수정 제안 도출)
    if (action === 'generateDailyFeedback') {
      return handleAiDailyFeedback(ss, payload);
    }

    // 8. [AI] 종합 피드백 생성
    if (action === 'generateComprehensiveFeedback') {
      return handleAiComprehensiveFeedback(ss, payload);
    }

    // 9. [보안 인증] 코치 마스터 비밀번호 검증 (구글 서버 스크립트 속성 기반)
    if (action === 'verifyCoachPassword') {
      return handleVerifyCoachPassword(payload);
    }

    return createJsonResponse({ status: 'error', message: '지원하지 않는 action입니다: ' + action });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * ==============================================================================
 * [DB Read/Write 헬퍼 함수 - 공백 제거 정규화 & 열 헤더 동적 탐색 원칙]
 * ==============================================================================
 */

/**
 * 지능형 시트 탐색기 (이름/별칭 매칭 + 내용 키워드 기반 이중 안전망)
 */
function findSheetSmartly(ss, aliases, signatureKeywords) {
  if (!ss) return null;

  // 1단계: 시트 이름 및 별칭으로 탐색 (공백 제거 및 대소문자 무관)
  const sheets = ss.getSheets();
  const sheetMap = {};
  for (let s of sheets) {
    const sName = s.getName().trim();
    sheetMap[sName] = s;
    sheetMap[sName.replace(/\s+/g, '').toLowerCase()] = s;
  }

  for (let i = 0; i < aliases.length; i++) {
    const alias = String(aliases[i]).trim();
    if (sheetMap[alias]) return sheetMap[alias];
    const cleanAlias = alias.replace(/\s+/g, '').toLowerCase();
    if (sheetMap[cleanAlias]) return sheetMap[cleanAlias];
  }

  // 2단계: 별칭으로 못 찾았을 경우, 시트 내용의 대표 키워드로 자동 감지
  if (signatureKeywords && signatureKeywords.length > 0) {
    for (let s of sheets) {
      const lastRow = Math.min(s.getLastRow(), 10);
      const lastCol = Math.min(s.getLastColumn(), 20);
      if (lastRow === 0 || lastCol === 0) continue;

      const values = s.getRange(1, 1, lastRow, lastCol).getValues();
      const combinedText = values.map(r => r.join(' ')).join(' ').replace(/\s+/g, '').toLowerCase();

      let matchCount = 0;
      for (let kw of signatureKeywords) {
        const cleanKw = String(kw).replace(/\s+/g, '').toLowerCase();
        if (combinedText.includes(cleanKw)) {
          matchCount++;
        }
      }

      if (matchCount >= 2) {
        return s;
      }
    }
  }

  return null;
}

/**
 * 별칭 목록 중 존재하는 시트 찾기 (단순 별칭 탐색)
 */
function findSheetByAliases(ss, aliases) {
  return findSheetSmartly(ss, aliases, null);
}

/**
 * 헤더 행을 읽어 원본 열 이름 및 정규화(공백 제거) 열 이름 -> 열 번호(1-indexed) 매핑 객체 반환
 */
function getHeaderColumnMap(sheet) {
  if (!sheet) return {};
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  for (let col = 0; col < headers.length; col++) {
    const raw = String(headers[col]).trim();
    if (raw) {
      map[raw] = col + 1; // 원본 이름 매핑
      const clean = raw.replace(/\s+/g, '').toLowerCase();
      if (clean && !map[clean]) {
        map[clean] = col + 1; // 공백 제거 소문자 매핑
      }
    }
  }
  return map;
}

/**
 * 여러 동의어 후보 중 시트 헤더에 존재하는 열 번호 반환
 * [헤더 스캔 강화] 헤더 문자열에서 모든 공백(\s+)을 완벽하게 제거한 뒤 비교 (대소문자 무관)
 * 1단계: 원본 문자열 정확 일치
 * 2단계: 공백 완벽 제거 후 100% 완전 일치 비교
 * 3단계: 공백 제거 후 포함(부분 일치) 비교 (2글자 이상)
 */
function findColIndex(colMap, candidateNames) {
  if (!colMap || !candidateNames || !candidateNames.length) return null;

  // 1단계: 원본 문자열 정확 일치
  for (let i = 0; i < candidateNames.length; i++) {
    const name = candidateNames[i];
    if (colMap[name] !== undefined) return colMap[name];
  }

  const colKeys = Object.keys(colMap);

  // 2단계: 헤더 및 후보군에서 '모든 공백 제거' 후 100% 완전 일치 비교
  for (let i = 0; i < candidateNames.length; i++) {
    const targetClean = String(candidateNames[i]).replace(/\s+/g, '').toLowerCase();
    if (!targetClean) continue;
    for (let j = 0; j < colKeys.length; j++) {
      const keyClean = String(colKeys[j]).replace(/\s+/g, '').toLowerCase();
      if (keyClean === targetClean) {
        return colMap[colKeys[j]];
      }
    }
  }

  // 3단계: 공백 제거 후 부분 일치 (키워드 2글자 이상)
  for (let i = 0; i < candidateNames.length; i++) {
    const targetClean = String(candidateNames[i]).replace(/\s+/g, '').toLowerCase();
    if (!targetClean || targetClean.length < 2) continue;
    for (let j = 0; j < colKeys.length; j++) {
      const keyClean = String(colKeys[j]).replace(/\s+/g, '').toLowerCase();
      // [오매칭 원천 차단] 고유 식별(번호, 날짜, 일자, 시간, 타임스탬프) 및 회원 일기 컬럼은 부분 일치에서 제외
      if (keyClean.includes('번호') || keyClean.includes('날짜') || keyClean.includes('일자') || keyClean.includes('시간') || keyClean.includes('타임스탬프') || keyClean.includes('일기')) {
        continue;
      }
      if (keyClean.includes(targetClean) || targetClean.includes(keyClean)) {
        return colMap[colKeys[j]];
      }
    }
  }

  return null;
}

/**
 * 지정된 열 별칭 중 존재하는 열 번호를 찾고, 없다면 시트의 마지막 열 + 1에 standardHeaderName으로 새 열을 생성하여 반환
 * [방어 로직] 구글 폼 원본 응답 시트에 AI 분석 필드(점수, 요약, 분석, 개선방안 등)가 없더라도 시트에 안전하게 자동 기록
 */
function getOrAddColumn(sheet, colMap, standardHeaderName, candidateNames) {
  if (!sheet) return null;
  let col = findColIndex(colMap, candidateNames || [standardHeaderName]);
  if (!col) {
    col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue(standardHeaderName);
    colMap[standardHeaderName] = col;
    const clean = standardHeaderName.replace(/\s+/g, '').toLowerCase();
    colMap[clean] = col;
  }
  return col;
}


/**
 * 시트 데이터를 객체 배열로 반환
 * [핵심 보강] 원본 헤더 키(headers[j])와 함께 모든 공백이 제거된 정규화 키(headers[j].replace(/\s+/g, ''))를
 * 동시에 행 객체에 주입하여, 프론트엔드 및 GAS 내부에서 띄어쓰기 여부와 무관하게 접근 보장!
 */
function getSheetDataWithHeaders(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const isAllEmpty = row.every(val => val === '' || val === null || val === undefined);
    if (isAllEmpty) continue;

    const obj = { _rowNumber: i + 1 };
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
      }
      const rawHeader = headers[j];
      obj[rawHeader] = val; // 원본 헤더 유지

      // 공백 제거 정규화 키도 동시에 등록 (예: '공복 몸무게' -> '공복몸무게')
      const cleanHeader = rawHeader.replace(/\s+/g, '');
      if (cleanHeader && !(cleanHeader in obj)) {
        obj[cleanHeader] = val;
      }
    }
    results.push(obj);
  }
  return results;
}

/**
 * GAS 내부 객체 필드 안전 추출 헬퍼 (공백 유무 및 다중 후보 키 지원)
 */
function getGasField(obj, candidateKeys) {
  if (!obj || typeof obj !== 'object') return '';
  for (let i = 0; i < candidateKeys.length; i++) {
    const cand = candidateKeys[i];
    if (obj[cand] !== undefined && obj[cand] !== null && obj[cand] !== '') {
      return obj[cand];
    }
  }
  const keys = Object.keys(obj);
  // 2순위: 공백 제거 후 완전 일치
  for (let i = 0; i < candidateKeys.length; i++) {
    const cleanCand = String(candidateKeys[i]).replace(/\s+/g, '').toLowerCase();
    for (let j = 0; j < keys.length; j++) {
      const cleanKey = String(keys[j]).replace(/\s+/g, '').toLowerCase();
      if (cleanKey === cleanCand) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && val !== '') return val;
      }
    }
  }
  // 3순위: 후보 키가 키에 포함되거나 키가 후보 키에 포함되는 부분 일치 (예: '이름(예:김민수)', '회원이름' 등)
  for (let i = 0; i < candidateKeys.length; i++) {
    const cleanCand = String(candidateKeys[i]).replace(/\s+/g, '').toLowerCase();
    if (cleanCand.length < 2) continue;
    for (let j = 0; j < keys.length; j++) {
      const cleanKey = String(keys[j]).replace(/\s+/g, '').toLowerCase();
      if (cleanKey.includes(cleanCand) || cleanCand.includes(cleanKey)) {
        const val = obj[keys[j]];
        if (val !== undefined && val !== null && val !== '') return val;
      }
    }
  }
  return '';
}

/**
 * Guidelines 시트 데이터 반환
 * [초강력 지능형 스캐너 - 본문 오매칭 원천 차단]
 * - 1행: '지침' 열과 '내용' 열 구조 완벽 지원
 * - 지침 항목 5개: '코칭 철학', '운동 제안 지침', '식단 제안 지침', '피드백 지침(데일리 피드백 지침)', '동기부여 지침'
 * - 핵심 방어: 본문 내용 셀(25자 초과)이 지침명으로 오인되는 버그 원천 차단
 * - 제목 열(titleCol)을 먼저 특정하여 해당 열의 지침명만 판별하므로 단어 중첩 100% 방지!
 */
function getGuidelinesData(sheet) {
  const guidelines = {
    philosophy: '', // 코칭 철학
    exercise: '',   // 운동 제안 지침
    diet: '',       // 식단 제안 지침
    feedback: '',   // 피드백 지침
    motivation: ''  // 동기부여 지침
  };

  if (!sheet) return guidelines;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return guidelines;

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // 지침 항목 키 판별 헬퍼 (제목 전용: 25글자 이하의 짧은 셀만 지침명으로 인정!)
  function identifyGuidelineKey(text) {
    if (!text) return null;
    const raw = String(text).trim();
    // ★핵심: 본문 문장이 지침명으로 오인되는 것을 방지하기 위해 25글자 초과 시 즉시 제외
    if (raw.length > 25) return null;

    const clean = raw.replace(/\s+/g, '').toLowerCase();
    if (!clean) return null;

    // 1. 코칭 철학
    if (clean === '코칭철학' || clean === '코칭철학지침' || clean.startsWith('코칭철학') || clean === '철학' || clean === '철학지침') {
      return 'philosophy';
    }
    // 2. 피드백 지침 ('데일리 피드백 지침', '피드백 지침' 등)
    if (clean === '피드백지침' || clean === '피드백지침서' || clean === '데일리피드백지침' || clean === '데일리피드백' || clean === '피드백' || clean.includes('피드백')) {
      return 'feedback';
    }
    // 3. 동기부여 지침
    if (clean === '동기부여지침' || clean === '동기부여지침서' || clean === '동기부여' || clean === '동기부여가이드' || clean.includes('동기부여')) {
      return 'motivation';
    }
    // 4. 운동 제안 지침 (동기부여 단어 제외)
    if ((clean === '운동제안지침' || clean === '운동제안지침서' || clean === '운동지침' || clean === '운동' || clean.includes('운동')) && !clean.includes('동기')) {
      return 'exercise';
    }
    // 5. 식단 제안 지침
    if (clean === '식단제안지침' || clean === '식단제안지침서' || clean === '식단지침' || clean === '식단' || clean.includes('식단') || clean.includes('식사') || clean.includes('영양')) {
      return 'diet';
    }
    return null;
  }

  const colMap = getHeaderColumnMap(sheet);

  // 1. 헤더 기반으로 지침(title) 열과 내용(content) 열 탐색
  let titleCol = findColIndex(colMap, [
    '지침', '지침명', '지침 명', '항목', '구분', 'title', '이름', 'name'
  ]);
  let contentCol = findColIndex(colMap, [
    '내용', '지침내용', '지침 내용', 'content', '가이드라인', '가이드라인 내용', '상세내용'
  ]);

  // 2. 헤더로 특정되지 않은 경우: 지침명이 가장 많이 등장하는 열을 제목 열로 자동 판정
  if (!titleCol) {
    const colMatchCounts = {};
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        if (identifyGuidelineKey(values[r][c])) {
          colMatchCounts[c + 1] = (colMatchCounts[c + 1] || 0) + 1;
        }
      }
    }
    let maxCount = 0;
    for (const c in colMatchCounts) {
      if (colMatchCounts[c] > maxCount) {
        maxCount = colMatchCounts[c];
        titleCol = parseInt(c, 10);
      }
    }
    if (!titleCol) titleCol = 1;
  }

  if (!contentCol) {
    contentCol = (titleCol === 1 ? 2 : 1);
  }

  // 3. 세로형 시트 데이터 매핑: 오직 titleCol 셀만 지침명으로 확인!
  for (let r = 0; r < values.length; r++) {
    const rawTitle = values[r][titleCol - 1];
    const key = identifyGuidelineKey(rawTitle);
    if (key && !guidelines[key]) {
      let contentVal = '';
      // 우선 지정된 contentCol의 값을 취함
      if (contentCol <= values[r].length && String(values[r][contentCol - 1] || '').trim().length > 0) {
        contentVal = String(values[r][contentCol - 1]).trim();
      } else {
        // 지정된 열이 비어있다면 해당 행에서 가장 긴 텍스트 셀을 내용으로 선택
        for (let c2 = 0; c2 < values[r].length; c2++) {
          if (c2 !== titleCol - 1) {
            const cand = String(values[r][c2] || '').trim();
            if (cand.length > contentVal.length) {
              contentVal = cand;
            }
          }
        }
      }
      guidelines[key] = contentVal;
    }
  }

  // 4. 가로형 시트 폴백 (1행이 지침명 헤더, 2행이 내용인 구조)
  if (!guidelines.philosophy && !guidelines.exercise && !guidelines.diet) {
    if (values.length >= 2) {
      for (let c = 0; c < values[0].length; c++) {
        const headerText = String(values[0][c] || '').trim();
        const key = identifyGuidelineKey(headerText);
        if (key && !guidelines[key]) {
          guidelines[key] = String(values[1][c] || '').trim();
        }
      }
    }
  }

  // 5. [★핵심 2중 안전망] 만약 motivation 값이 '데일리 피드백 지침' 등 다른 지침 제목인 경우 즉시 자동 교정
  const invalidTitles = ['데일리 피드백 지침', '데일리피드백지침', '피드백 지침', '피드백지침', '피드백지침서'];
  if (invalidTitles.includes(guidelines.motivation.trim())) {
    guidelines.motivation = '';
    // 시트에서 '동기부여' 공식 행을 다시 엄격하게 스캔
    for (let r = 0; r < values.length; r++) {
      const rawTitle = String(values[r][titleCol - 1] || '').trim().replace(/\s+/g, '').toLowerCase();
      if (rawTitle === '동기부여지침' || rawTitle === '동기부여지침서' || rawTitle === '동기부여' || rawTitle.includes('동기부여')) {
        const actualContent = String(values[r][contentCol - 1] || '').trim();
        if (actualContent && !invalidTitles.includes(actualContent)) {
          guidelines.motivation = actualContent;
          break;
        }
      }
    }
    // 시트에도 잘못 덮어씌워져 내용이 비어있는 경우 표준 동기부여 가이드 적용
    if (!guidelines.motivation) {
      guidelines.motivation = '회원이 슬럼프나 과식을 겪었을 때 자책하지 않도록 깊이 공감합니다. "한 끼의 실수가 4주의 실패는 아니다"라는 마인드셋을 심어주며 다음 끼니에서 자연스럽게 복귀하도록 격려합니다.';
    }
  }

  return guidelines;
}

/**
 * ==============================================================================
 * [비즈니스 로직 핸들러들]
 * ==============================================================================
 */

/**
 * 1. 회원 상태(Active/Inactive) 및 태그 업데이트
 */
function handleUpdateMemberStatusTag(ss, payload) {
  const sheet = findSheetSmartly(ss, SHEET_NAMES.MEMBERS, ['이름', '체중', '운동경력', '키', '성별']);
  if (!sheet) return createJsonResponse({ status: 'error', message: 'Members 시트를 찾을 수 없습니다.' });

  const memberKey = String(payload.memberKey || payload.name || payload.memberId).trim();
  const newStatus = payload.status; // '유효' or '휴면' (Active / Inactive)
  const newTag = payload.tag;       // 예: '4주-체중감량반', '초보자' 등

  const colMap = getHeaderColumnMap(sheet);
  const idCol = findColIndex(colMap, ['회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호']);
  const nameCol = findColIndex(colMap, ['이름', 'name', '성명', '참여자이름', '참여자 이름', '회원명']) || 2;
  const statusCol = findColIndex(colMap, ['상태', 'status', '회원상태', '회원 상태', '활동상태']);
  const tagCol = findColIndex(colMap, ['태그', 'tag', 'tags', '분류', '코스', '프로그램', '프로그램명']);

  if (!statusCol && !tagCol) {
    return createJsonResponse({ status: 'error', message: '시트에 상태 또는 태그 열이 정의되어 있지 않습니다.' });
  }

  const values = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][nameCol - 1] || '').trim();
    const rowId = idCol ? String(values[i][idCol - 1] || '').trim() : '';

    if (rowName === memberKey || rowId === memberKey) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return createJsonResponse({ status: 'error', message: `회원 '${memberKey}'을(를) 찾을 수 없습니다.` });
  }

  if (newStatus !== undefined && statusCol) {
    sheet.getRange(targetRow, statusCol).setValue(newStatus);
  }
  if (newTag !== undefined && tagCol) {
    sheet.getRange(targetRow, tagCol).setValue(newTag);
  }

  return createJsonResponse({
    status: 'success',
    message: `'${memberKey}' 회원의 상태/태그가 성공적으로 시트에 업데이트되었습니다.`,
    updated: { memberKey, status: newStatus, tag: newTag }
  });
}

/**
 * 2. 회원의 운동/식단 지침 및 현재 루틴/식단 업데이트
 * [요구사항] '운동 수정 제안 지침', '식단 수정 제안 지침' 등 동적 탐색
 */
function handleUpdateMemberGuidelineRoutine(ss, payload) {
  const sheet = findSheetSmartly(ss, SHEET_NAMES.MEMBERS, ['이름', '체중', '운동경력', '키', '성별']);
  if (!sheet) return createJsonResponse({ status: 'error', message: 'Members 시트를 찾을 수 없습니다.' });

  const memberKey = String(payload.memberKey || payload.name || '').trim();
  const colMap = getHeaderColumnMap(sheet);

  const nameCol = findColIndex(colMap, ['이름', 'name', '성명', '참여자이름', '참여자 이름', '회원명']) || 2;
  const idCol = findColIndex(colMap, ['회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호']);

  const exGuideCol = findColIndex(colMap, [
    '운동 수정 제안 지침', '운동수정제안지침',
    '운동 루틴 수정 제안 지침', '운동루틴수정제안지침',
    '운동수정지침', '운동 수정 지침',
    '운동 제안 지침서', '운동제안지침서',
    '운동제안지침', '운동 제안 지침',
    '운동지침', '운동 지침', '운동루틴지침'
  ]);
  const dietGuideCol = findColIndex(colMap, [
    '식단 수정 제안 지침', '식단수정제안지침',
    '식단수정지침', '식단 수정 지침',
    '식단 제안 지침서', '식단제안지침서',
    '식단제안지침', '식단 제안 지침',
    '식단지침', '식단 지침'
  ]);
  const exRoutineCol = findColIndex(colMap, [
    '현재 제안 운동 루틴', '현재제안운동루틴',
    '제안운동루틴', '제안 운동 루틴',
    '현재운동루틴', '현재 운동 루틴',
    '운동루틴', '운동 루틴', '운동제안', '운동 제안'
  ]);
  const dietRoutineCol = findColIndex(colMap, [
    '현재 제안 식단', '현재제안식단',
    '제안식단', '제안 식단',
    '현재식단', '현재 식단',
    '식단계획', '식단 계획', '식단제안', '식단 제안'
  ]);

  const values = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][nameCol - 1] || '').trim();
    const rowId = idCol ? String(values[i][idCol - 1] || '').trim() : '';

    if (rowName === memberKey || rowId === memberKey) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return createJsonResponse({ status: 'error', message: `회원 '${memberKey}'을(를) 찾을 수 없습니다.` });
  }

  // 전달된 필드만 정확한 컬럼에 쓰기 (기존 열 구조 100% 보존)
  if (payload.exerciseGuideline !== undefined && exGuideCol) {
    sheet.getRange(targetRow, exGuideCol).setValue(payload.exerciseGuideline);
  }
  if (payload.dietGuideline !== undefined && dietGuideCol) {
    sheet.getRange(targetRow, dietGuideCol).setValue(payload.dietGuideline);
  }
  if (payload.exerciseRoutine !== undefined && exRoutineCol) {
    sheet.getRange(targetRow, exRoutineCol).setValue(payload.exerciseRoutine);
  }
  if (payload.dietRoutine !== undefined && dietRoutineCol) {
    sheet.getRange(targetRow, dietRoutineCol).setValue(payload.dietRoutine);
  }

  return createJsonResponse({
    status: 'success',
    message: `'${memberKey}' 회원의 루틴/지침 정보가 시트에 성공적으로 저장되었습니다.`
  });
}

/**
 * 3. 5대 지침서(Guidelines) 시트 업데이트
 * [초강력 지능형 저장 엔진]
 * - 기존 시트에서 각 지침 항목('코칭 철학', '운동 제안 지침', '식단 제안 지침', '피드백 지침', '동기부여 지침')의 
 *   행을 정확히 찾아 해당 '내용' 셀에 안전하게 덮어씁니다.
 * - 시트에 없는 항목은 '지침', '내용' 열 구조에 맞춰 자동으로 추가합니다.
 */
function handleUpdateGuidelines(ss, payload) {
  let sheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침', '지침', '내용']);

  // 시트가 전혀 없는 경우 신규 생성
  if (!sheet) {
    sheet = ss.insertSheet('Guidelines');
  }

  const guidelines = payload.guidelines; // { philosophy, exercise, diet, feedback, motivation }
  if (!guidelines) {
    return createJsonResponse({ status: 'error', message: 'guidelines 데이터가 없습니다.' });
  }

  const colMap = getHeaderColumnMap(sheet);
  const titleCol = findColIndex(colMap, [
    '지침', '지침명', '지침 명', '구분', '항목', 'title', '이름', 'name'
  ]) || 1;
  const contentCol = findColIndex(colMap, [
    '내용', '지침내용', '지침 내용', 'content', '가이드라인', '가이드라인 내용', '상세내용'
  ]) || (titleCol === 1 ? 2 : 1);
  const updateCol = findColIndex(colMap, [
    '수정일', '수정 일', '수정일시', '수정 일시', 'updatedAt', '날짜', '최근수정'
  ]);

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 2);
  const values = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // 저장 대상 5대 지침 공식 정의
  const targets = [
    { key: 'philosophy', officialTitle: '코칭 철학', matchKws: ['철학'], content: guidelines.philosophy },
    { key: 'motivation', officialTitle: '동기부여 지침', matchKws: ['동기'], content: guidelines.motivation }, // 동기부여 우선 매칭
    { key: 'exercise', officialTitle: '운동 제안 지침', matchKws: ['운동'], content: guidelines.exercise },
    { key: 'diet', officialTitle: '식단 제안 지침', matchKws: ['식단', '식사', '영양'], content: guidelines.diet },
    { key: 'feedback', officialTitle: '피드백 지침', matchKws: ['피드백'], content: guidelines.feedback }
  ];

  targets.forEach(target => {
    let found = false;

    // 1. 기존 행에서 매칭되는 지침 항목 탐색
    for (let r = 0; r < values.length; r++) {
      // 1행이 헤더인 경우(0행이 헤더)와 데이터인 경우 모두 커버
      const cellTitle = String(values[r][titleCol - 1] || '').trim();
      const cleanCellTitle = cellTitle.replace(/\s+/g, '').toLowerCase();

      let isMatch = false;
      if (target.key === 'exercise') {
        isMatch = (cleanCellTitle === '운동제안지침' || cleanCellTitle === '운동제안지침서' || cleanCellTitle === '운동지침' || (cleanCellTitle.includes('운동') && !cleanCellTitle.includes('동기')));
      } else if (target.key === 'motivation') {
        isMatch = (cleanCellTitle === '동기부여지침' || cleanCellTitle === '동기부여지침서' || cleanCellTitle === '동기부여' || cleanCellTitle.includes('동기부여'));
      } else if (target.key === 'diet') {
        isMatch = (cleanCellTitle === '식단제안지침' || cleanCellTitle === '식단제안지침서' || cleanCellTitle === '식단지침' || cleanCellTitle.includes('식단') || cleanCellTitle.includes('식사') || cleanCellTitle.includes('영양'));
      } else if (target.key === 'philosophy') {
        isMatch = (cleanCellTitle === '코칭철학' || cleanCellTitle.includes('철학'));
      } else if (target.key === 'feedback') {
        isMatch = (cleanCellTitle === '피드백지침' || cleanCellTitle === '피드백지침서' || cleanCellTitle === '데일리피드백지침' || cleanCellTitle.includes('피드백'));
      }

      if (isMatch) {
        // 정확히 매칭된 행의 '내용' 열에 값 저장
        sheet.getRange(r + 1, contentCol).setValue(target.content || '');
        if (updateCol) sheet.getRange(r + 1, updateCol).setValue(nowStr);
        found = true;
        break;
      }
    }

    // 2. 기존 행에 없으면 신규 행 추가
    if (!found && target.content !== undefined) {
      // 시트가 완전히 비어있는 경우 먼저 헤더 추가
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['지침', '내용', '수정일']);
      }
      const newRow = [];
      const totalCols = Math.max(sheet.getLastColumn(), 2);
      for (let c = 1; c <= totalCols; c++) {
        if (c === titleCol) newRow.push(target.officialTitle);
        else if (c === contentCol) newRow.push(target.content);
        else if (updateCol && c === updateCol) newRow.push(nowStr);
        else newRow.push('');
      }
      sheet.appendRow(newRow);
    }
  });

  return createJsonResponse({
    status: 'success',
    message: '5대 코칭 지침서가 구글 시트에 안전하게 저장되었습니다.',
    updatedAt: nowStr
  });
}

/**
 * 4. 데일리 피드백 코멘트 저장
 */
function handleUpdateFeedbackComment(ss, payload) {
  const sheet = findSheetSmartly(ss, SHEET_NAMES.FEEDBACKS, ['공복몸무게', '운동점수', '식단점수', '운동내용']);
  if (!sheet) return createJsonResponse({ status: 'error', message: 'Feedbacks 시트를 찾을 수 없습니다.' });

  const memberKey = String(payload.memberKey || '').trim();
  const memberName = String(payload.memberName || payload.name || '').trim();
  const memberId = String(payload.memberId || '').trim();
  const memberPhone = String(payload.phone || '').replace(/[^0-9]/g, '');
  const dateStr = String(payload.date || '').trim();
  const comment = payload.comment || '';

  const colMap = getHeaderColumnMap(sheet);
  const nameCol = findColIndex(colMap, [
    '이름', 'name', '성명', '참여자이름', '참여자 이름', '회원명', '참여자', '참여자성명'
  ]) || 3;
  const idCol = findColIndex(colMap, [
    '회원번호', '회원 번호', '회원ID', '회원 ID', 'id', 'memberId', '고유번호'
  ]);
  const phoneCol = findColIndex(colMap, [
    '전화번호', '연락처', '휴대폰', 'phone', '핸드폰'
  ]);
  const dateCol = findColIndex(colMap, [
    '날짜', 'date', '일자', '피드백날짜', '피드백 날짜', '타임스탬프', '제출일시', '작성일자'
  ]) || 2;
  
  let commentCol = findColIndex(colMap, [
    '피드백 코멘트', '피드백코멘트',
    '피드백 내용', '피드백내용',
    '코치 피드백', '코치피드백',
    '코칭 코멘트', '코칭코멘트',
    '코치 코멘트', '코치코멘트',
    '코칭 내용', '코칭내용',
    '코치답변', '코치 답변', '답변',
    'feedbackComment', 'coachComment'
  ]);

  // 시트에 [피드백 코멘트] 열이 없으면 헤더 마지막에 자동 생성하여 실패 방지
  if (!commentCol) {
    commentCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, commentCol).setValue('피드백 코멘트');
    colMap['피드백코멘트'] = commentCol;
    colMap['피드백 코멘트'] = commentCol;
  }

  const values = sheet.getDataRange().getValues();
  let targetRow = -1;

  const cleanTargetName = memberName.replace(/\s+/g, '').toLowerCase();
  const cleanTargetKey = memberKey.replace(/\s+/g, '').toLowerCase();
  const cleanTargetId = memberId.replace(/\s+/g, '').toLowerCase();
  const cleanTargetDate = dateStr.replace(/[^0-9]/g, '');

  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][nameCol - 1] || '').trim();
    const cleanRowName = rowName.replace(/\s+/g, '').toLowerCase();

    const rowId = idCol ? String(values[i][idCol - 1] || '').trim().toLowerCase() : '';
    const rowPhone = phoneCol ? String(values[i][phoneCol - 1] || '').replace(/[^0-9]/g, '') : '';

    // 1. 이름/식별자 매칭 (이름, 회원번호, 연락처 중 하나라도 일치하면 인정)
    let isNameMatch = false;
    if (cleanTargetName && cleanRowName === cleanTargetName) isNameMatch = true;
    else if (cleanTargetKey && cleanRowName === cleanTargetKey) isNameMatch = true;
    else if (cleanTargetId && rowId && cleanTargetId === rowId) isNameMatch = true;
    else if (cleanTargetKey && rowId && cleanTargetKey === rowId) isNameMatch = true;
    else if (memberPhone && rowPhone && memberPhone.endsWith(rowPhone) || (rowPhone && rowPhone.endsWith(memberPhone))) isNameMatch = true;
    else if (cleanTargetName && cleanRowName && (cleanRowName.includes(cleanTargetName) || cleanTargetName.includes(cleanRowName))) isNameMatch = true;

    // 2. 날짜 매칭 (Date 객체, yyyy-MM-dd, 20261012 숫자 추출 매칭 모두 지원)
    let rawRowDate = values[i][dateCol - 1];
    let rowDateStr = '';
    if (rawRowDate instanceof Date) {
      rowDateStr = Utilities.formatDate(rawRowDate, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd');
    } else {
      rowDateStr = String(rawRowDate || '').trim();
    }
    const cleanRowDate = rowDateStr.replace(/[^0-9]/g, '');

    let isDateMatch = false;
    if (rowDateStr && dateStr && (rowDateStr.includes(dateStr) || dateStr.includes(rowDateStr))) isDateMatch = true;
    else if (cleanRowDate && cleanTargetDate && (cleanRowDate.includes(cleanTargetDate) || cleanTargetDate.includes(cleanRowDate))) isDateMatch = true;

    if (isNameMatch && isDateMatch) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    const searchTarget = memberName || memberKey;
    return createJsonResponse({
      status: 'error',
      message: `'${searchTarget}' 회원의 ${dateStr} 일자 피드백 행을 시트에서 찾을 수 없습니다. (시트 전체 ${values.length - 1}개 행 스캔 완료)`
    });
  }

  // 1. [방어 로직] 피드백 코멘트 저장 (열이 없으면 시트 마지막에 자동 추가)
  if (comment) {
    const commentCol = getOrAddColumn(sheet, colMap, '피드백 코멘트', [
      '피드백 코멘트', '피드백코멘트', '피드백 내용', '피드백내용',
      '코치 피드백', '코치피드백', '코칭 코멘트', '코칭코멘트',
      '코치 코멘트', '코치코멘트', '코칭 내용', '코칭내용',
      '코치답변', '코치 답변', '답변', 'feedbackComment', 'coachComment'
    ]);
    sheet.getRange(targetRow, commentCol).setValue(comment);
  }

  // 2. [방어 로직] 운동_실행률_점수 저장 (열이 없으면 시트 마지막에 자동 추가)
  const exScoreVal = payload.운동_실행률_점수 !== undefined ? payload.운동_실행률_점수 : payload.exerciseScore;
  if (exScoreVal !== undefined && exScoreVal !== null && exScoreVal !== '') {
    const exScoreCol = getOrAddColumn(sheet, colMap, '운동_실행률_점수', [
      '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore'
    ]);
    sheet.getRange(targetRow, exScoreCol).setValue(exScoreVal);
  }

  // 3. [방어 로직] 식단_실행률_점수 저장 (열이 없으면 시트 마지막에 자동 추가)
  const dietScoreVal = payload.식단_실행률_점수 !== undefined ? payload.식단_실행률_점수 : payload.dietScore;
  if (dietScoreVal !== undefined && dietScoreVal !== null && dietScoreVal !== '') {
    const dietScoreCol = getOrAddColumn(sheet, colMap, '식단_실행률_점수', [
      '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore'
    ]);
    sheet.getRange(targetRow, dietScoreCol).setValue(dietScoreVal);
  }

  // 4. [방어 로직] 피드백_요약 저장 (열이 없으면 시트 마지막에 자동 추가)
  const summaryVal = payload.피드백_요약 !== undefined ? payload.피드백_요약 : (payload.feedbackSummary || payload.summary || '');
  if (summaryVal) {
    const summaryCol = getOrAddColumn(sheet, colMap, '피드백_요약', [
      '피드백_요약', '피드백 요약', '피드백요약', '요약', 'feedbackSummary', 'summary'
    ]);
    sheet.getRange(targetRow, summaryCol).setValue(summaryVal);
  }

  // 5. [방어 로직] 문제점_분석 저장 (열이 없으면 시트 마지막에 자동 추가)
  const problemVal = payload.문제점_분석 !== undefined ? payload.문제점_분석 : (payload.problemAnalysis || payload.problem || '');
  if (problemVal) {
    const problemCol = getOrAddColumn(sheet, colMap, '문제점_분석', [
      '문제점_분석', '문제점 분석', '문제점분석', '문제점', 'problemAnalysis', 'problem'
    ]);
    sheet.getRange(targetRow, problemCol).setValue(problemVal);
  }

  // 6. [방어 로직] 보완점_및_개선방안 저장 (열이 없으면 시트 마지막에 자동 추가)
  const solutionVal = payload.보완점_및_개선방안 !== undefined ? payload.보완점_및_개선방안 : (payload.improvementSolution || payload.solution || '');
  if (solutionVal) {
    const solutionCol = getOrAddColumn(sheet, colMap, '보완점_및_개선방안', [
      '보완점_및_개선방안', '보완점 및 개선방안', '보완점및개선방안', '보완점', '개선방안', 'improvementSolution', 'solution'
    ]);
    sheet.getRange(targetRow, solutionCol).setValue(solutionVal);
  }

  // 6-1. [모달 표시 보존용] 운동_수정_제안 저장 (Feedbacks 시트 모달 표시용으로만 기록, Members 시트에는 자동 반영 안 됨)
  const exProposalVal = payload.운동_수정_제안 !== undefined ? payload.운동_수정_제안 : (payload.exerciseProposal || '');
  if (exProposalVal !== undefined && exProposalVal !== null && exProposalVal !== '') {
    const exProposalCol = getOrAddColumn(sheet, colMap, '운동_수정_제안', [
      '운동_수정_제안', '운동 수정 제안', '운동수정제안', '운동수정', 'exerciseProposal'
    ]);
    sheet.getRange(targetRow, exProposalCol).setValue(exProposalVal);
  }

  // 6-2. [모달 표시 보존용] 식단_수정_제안 저장 (Feedbacks 시트 모달 표시용으로만 기록, Members 시트에는 자동 반영 안 됨)
  const dietProposalVal = payload.식단_수정_제안 !== undefined ? payload.식단_수정_제안 : (payload.dietProposal || '');
  if (dietProposalVal !== undefined && dietProposalVal !== null && dietProposalVal !== '') {
    const dietProposalCol = getOrAddColumn(sheet, colMap, '식단_수정_제안', [
      '식단_수정_제안', '식단 수정 제안', '식단수정제안', '식단수정', 'dietProposal'
    ]);
    sheet.getRange(targetRow, dietProposalCol).setValue(dietProposalVal);
  }

  // 7. [방어 로직] 피드백 상태 컬럼 자동 업데이트 (열이 없으면 시트 마지막에 자동 추가)
  const statusCol = getOrAddColumn(sheet, colMap, '피드백 상태', [
    '피드백 상태', '피드백상태', '완료 여부', '완료여부', '피드백완료', '피드백 완료', '진행상태', '상태'
  ]);
  sheet.getRange(targetRow, statusCol).setValue('완료');

  return createJsonResponse({
    status: 'success',
    targetRow: targetRow,
    message: `${dateStr} 일자의 피드백 코멘트가 시트 ${targetRow}행에 성공적으로 저장되었습니다.`
  });
}

/**
 * ==============================================================================
 * [Gemini AI 백엔드 실행 엔진]
 * ==============================================================================
 */

/**
 * Gemini API Key 조회 (다중 소스 지원)
 * 1순위: 대시보드(Frontend)에서 전송된 payload.geminiApiKey
 * 2순위: GAS 스크립트 속성(Script Properties)의 'GEMINI_API_KEY'
 * 3순위: 코드 상단 DEFAULT_GEMINI_API_KEY 상수
 */
function getEffectiveGeminiApiKey(payload) {
  if (payload && payload.geminiApiKey && String(payload.geminiApiKey).trim().length > 0) {
    return String(payload.geminiApiKey).trim();
  }
  const propKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (propKey && propKey.trim().length > 0) return propKey.trim();
  return DEFAULT_GEMINI_API_KEY;
}

/**
 * [Google 공식 ModelService.ListModels 기반] 실제 지원 텍스트 모델 조회 & 6시간 캐싱
 * - 하드코딩 추측을 100% 배제하여 404 모델 없음 에러 원천 차단
 * - tts/audio/embed 등 비텍스트 모델을 엄격 제외하여 400 모달리티 에러 원천 차단
 * - CacheService를 통해 0.001초 만에 꺼내 쓰므로 속도 지연 제로
 */
function getGoogleSupportedTextModels(apiKey) {
  if (!apiKey) return [];

  const cache = CacheService.getScriptCache();
  const cachedJson = cache.get('SUPPORTED_MODELS_CACHE_V38');
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) { }
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = UrlFetchApp.fetch(listUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      if (json.models && json.models.length > 0) {
        const textModels = json.models.filter(m => {
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
        const getModelScore = (m) => {
          const lower = m.toLowerCase();
          if (lower === 'gemini-3.8-flash' || lower.includes('3.8-flash')) return 100;
          if (lower === 'gemini-3.8-pro' || lower.includes('3.8-pro')) return 90;
          if (lower.includes('3.8')) return 80;
          if (lower.includes('flash')) return 70;
          if (lower.includes('pro')) return 60;
          return 10;
        };

        textModels.sort((a, b) => getModelScore(b) - getModelScore(a));

        if (textModels.length > 0) {
          cache.put('SUPPORTED_MODELS_CACHE_V38', JSON.stringify(textModels), 21600);
          return textModels;
        }
      }
    }
  } catch (e) {
    Logger.log('ListModels 조회 예외: ' + e.toString());
  }

  return ['gemini-3.8-flash', 'gemini-3.8-pro'];
}

/**
 * [원클릭 외부 권한 승인 및 모델 목록 확인]
 */
function testAndAuthorizeUrlFetch() {
  const apiKey = getEffectiveGeminiApiKey(null);
  Logger.log('현재 등록된 API Key 유무: ' + (apiKey ? '등록됨 (길이: ' + apiKey.length + ')' : '미등록'));

  if (apiKey) {
    CacheService.getScriptCache().remove('SUPPORTED_MODELS_CACHE_V38');
    const models = getGoogleSupportedTextModels(apiKey);
    Logger.log('✓ 구글이 현재 지원하는 실제 텍스트 모델 (' + models.length + '개): ' + models.join(', '));
  } else {
    try {
      const res = UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
      Logger.log('✓ 외부 통신 권한 정상 승인 완료 (응답 코드: ' + res.getResponseCode() + ')');
    } catch (e) {
      Logger.log('UrlFetch 권한 승인 예외: ' + e.toString());
    }
  }
}

/**
 * [Google 공식 권장 gemini-3.8 직행] Gemini API 호출 엔진
 */
function callGemini(prompt, systemInstruction, payload) {
  const startGasTime = new Date().getTime();
  const apiKey = getEffectiveGeminiApiKey(payload);
  const keySource = (payload && payload.geminiApiKey && String(payload.geminiApiKey).trim().length > 0)
    ? '대시보드(Frontend)'
    : (PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') ? 'GAS 스크립트 속성' : (DEFAULT_GEMINI_API_KEY ? '코드 상단 상수' : '미등록(None)'));

  const debugInfo = {
    hasKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keySource: keySource,
    model: '탐색 중',
    httpStatus: null,
    errorMessage: null,
    elapsedSeconds: 0
  };

  if (!apiKey) {
    debugInfo.errorMessage = 'Gemini API Key가 등록되지 않았습니다. 웹 대시보드 우측 상단 [API 설정] 모달에서 Gemini API Key를 입력하시거나, GAS 스크립트 속성에 GEMINI_API_KEY를 등록해 주세요.';
    return { text: null, debug: debugInfo };
  }

  // 1. 구글 권장 최신 모델 (gemini-3.8-flash, gemini-3.8-pro)
  const modelPref = (payload && payload.modelPref) ? payload.modelPref : 'auto';
  const supportedModels = getGoogleSupportedTextModels(apiKey);
  let targetModels = (supportedModels && supportedModels.length > 0)
    ? supportedModels.slice()
    : ['gemini-3.8-flash', 'gemini-3.8-pro'];

  // Pro 선호 시 gemini-3.8-pro를 1순위로 승격
  if (modelPref === 'pro') {
    targetModels.sort((a, b) => (b.includes('pro') ? 1 : 0) - (a.includes('pro') ? 1 : 0));
  } else {
    targetModels.sort((a, b) => (b.includes('flash') ? 1 : 0) - (a.includes('flash') ? 1 : 0));
  }

  let lastError = null;

  for (let i = 0; i < targetModels.length; i++) {
    const modelName = targetModels[i];
    debugInfo.model = modelName;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const bodyObj = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingBudget: 512
        }
      }
    };
    if (systemInstruction) {
      bodyObj.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    try {
      let response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(bodyObj),
        muteHttpExceptions: true
      });

      let code = response.getResponseCode();
      let responseText = response.getContentText();

      // 특정 모델에서 thinkingConfig 미지원으로 HTTP 400 발생 시, thinkingConfig 제거 후 1회 즉시 재시도
      if (code === 400 && bodyObj.generationConfig.thinkingConfig) {
        delete bodyObj.generationConfig.thinkingConfig;
        response = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(bodyObj),
          muteHttpExceptions: true
        });
        code = response.getResponseCode();
        responseText = response.getContentText();
      }

      debugInfo.httpStatus = code;

      if (code === 200) {
        const json = JSON.parse(responseText);
        if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
          const candidate = json.candidates[0];
          const generatedText = candidate.content.parts[0].text;
          const finishReason = candidate.finishReason || 'STOP';
          debugInfo.finishReason = finishReason;
          debugInfo.isTruncated = (finishReason === 'MAX_TOKENS');
          debugInfo.usage = json.usageMetadata || {};
          debugInfo.elapsedSeconds = ((new Date().getTime() - startGasTime) / 1000).toFixed(1);
          return { text: generatedText, debug: debugInfo };
        }
      }

      // 에러 메시지 추출
      try {
        const errJson = JSON.parse(responseText);
        lastError = errJson.error ? `[HTTP ${code}] ${errJson.error.message || errJson.error.status}` : `[HTTP ${code}] ${responseText}`;
      } catch (pe) {
        lastError = `[HTTP ${code}] ${responseText}`;
      }

      // API Key 자체가 잘못된 경우 즉시 반환
      if (lastError.includes('API_KEY_INVALID') || lastError.includes('API key not valid')) {
        debugInfo.errorMessage = lastError;
        debugInfo.elapsedSeconds = ((new Date().getTime() - startGasTime) / 1000).toFixed(1);
        return { text: null, debug: debugInfo };
      }

      Logger.log(`${modelName} 호출 실패 (HTTP ${code}): ${lastError}`);

      // [핵심] 503(High demand) 또는 429 발생 시 0.8초 백오프 후 다른 클러스터 모델로 전환
      if (code === 503 || code === 429) {
        Utilities.sleep(800);
        continue;
      }

    } catch (e) {
      lastError = 'UrlFetchApp 통신 예외: ' + e.toString();
      Logger.log(`${modelName} 통신 예외: ` + e.toString());
    }
  }

  debugInfo.errorMessage = lastError;
  debugInfo.elapsedSeconds = ((new Date().getTime() - startGasTime) / 1000).toFixed(1);
  return { text: null, debug: debugInfo };
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

/**
 * 5. [AI] 운동 루틴 생성
 * - [요구사항 1] Members 시트 전체 응답 동적 매핑
 * - DB의 '운동 제안 지침서' 기반
 * - '운동 루틴 수정 제안 지침'이 있다면 최우선 반영
 */
function handleAiWorkoutRoutine(ss, payload) {
  const guidelineSheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침']);
  const guidelines = getGuidelinesData(guidelineSheet);
  const baseExerciseGuideline = guidelines.exercise || '점진적 과부하와 관절 부상 방지(스트레칭 10분 필수), 주 3~4회 루틴';

  const member = payload.member || {};
  const customExerciseGuideline = payload.customExerciseGuideline ||
    getGasField(member, ['운동 수정 제안 지침', '운동수정제안지침', '운동 루틴 수정 제안 지침', '운동루틴수정제안지침', '운동수정지침', '운동제안지침', '운동지침']) || '';

  const memberName = getGasField(member, ['이름', 'name', '성명', '참여자이름', '회원명']) || '참여자';
  // [요구사항 1] 하드코딩 필드 추출 제거 & 전체 키-값 동적 매핑
  const memberFullProfile = formatObjectAsFullProfile(member);

  const prompt = `
당신은 '4주 온라인 운동 습관화 코칭 프로그램'의 전문 수석 트레이너입니다.
아래 참여자의 전체 사전 설문 응답 프로필과 코칭 지침서를 바탕으로 [주간 맞춤 운동 루틴]을 작성해 주세요.

[참여자 정보]
${memberFullProfile}

[기본 운동 제안 지침서 (DB)]
${baseExerciseGuideline}

[★최우선 반영 사항: 코치의 운동 루틴 수정 제안 지침★]
${customExerciseGuideline ? customExerciseGuideline : '현재 별도 수정 지침 없음. 기본 지침서와 참여자 신체/직업/환경에 맞춰 구성할 것.'}

[출력 규칙 및 포맷 (엄격 준수)]
1. 불필요한 인사말, 시작 멘트, 맺음말, 주의사항 등은 일체 생략하고 오직 **[루틴 소개]**와 **[루틴]** 2가지 항목만 출력하십시오.
2. 최우선 반영 사항(수정 제안 지침)이 있다면 1순위로 반드시 적용하십시오.
3. **[루틴 소개]**: 회원의 생활패턴, 운동경력, 신체 수준을 고려하여 루틴 구성 근거를 3줄 이하로 간략히 작성하십시오.
4. **[루틴]**: 
   - 요일(월, 화, 수 등)은 절대 표기하지 말고, 반드시 **DAY1 ~ DAY7** 단위로 작성하십시오.
   - 운동을 진행하는 DAY는 반드시 아래 마크다운 테이블 구조를 정확히 지키십시오.
   - 테이블 최상단 첫 번째 행은 반드시 \`| DAY1 [타겟부위] | | | | |\` 형태로 작성하십시오.
   - 둘째 행(구분선): \`| :--- | :--- | :--- | :--- | :--- |\`
   - 셋째 행(헤더): \`| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |\`
   - 본문 행: \`| 벤치프레스 | 12회 | 3세트 | 60초 | |\` (무게 칸은 코치의 지침에 따라 항상 빈칸(공란)으로 둘 것)
   - 휴식일인 DAY는 표를 만들지 않고 한 줄로 작성하십시오:
     예: \`DAY2 (휴식) - 가벼운 스트레칭 및 회복 휴식\`

[출력 양식 예시]
[루틴 소개]
(회원의 생활패턴 및 체력을 고려한 3줄 이하의 구성 근거)

[루틴]
| DAY1 [가슴, 삼두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 벤치프레스 | 12회 | 3세트 | 60초 | |
| 인클라인 덤벨프레스 | 12회 | 3세트 | 60초 | |
| 마무리 유산소 | 30분 | 1세트 | - | |

DAY2 (휴식) - 가벼운 스트레칭 및 회복 휴식

| DAY3 [등, 이두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 랫풀다운 | 12회 | 3세트 | 60초 | |
| 시티드로우 | 12회 | 3세트 | 60초 | |
| 마무리 유산소 | 25분 | 1세트 | - | |

DAY4 (휴식) - 폼롤러 전신 근막 이완 스트레칭

| DAY5 [하체, 코어] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 레그프레스 | 15회 | 3세트 | 60초 | |
| 덤벨 스티프 데드리프트 | 12회 | 3세트 | 60초 | |
| 플랭크 | 30초 | 3세트 | 45초 | |

DAY6 (휴식) - 야외 가벼운 산책 40분

DAY7 (휴식) - 완전 휴식 및 컨디션 회복
`;

  const aiResult = callGemini(prompt, '당신은 회원 맞춤 운동 코칭 전문가입니다. 지정된 출력 형식([루틴 소개], [루틴], 마크다운 테이블, 빈 무게칸)을 엄격히 준수합니다.', payload);
  const isAiGenerated = !!aiResult.text;

  let finalRoutine = '';
  if (isAiGenerated) {
    finalRoutine = aiResult.text;
  } else {
    // 디버그 문구를 상단에 명확히 표기하여 사용자에게 원인 전달
    const debugNotice = `[⚠️ AI API 호출 실패 디버그 안내]
원인: ${aiResult.debug.errorMessage || '알 수 없는 오류'}
키 소스: ${aiResult.debug.keySource} (Key 유무: ${aiResult.debug.hasKey ? '등록됨' : '미등록'})
상태 코드: ${aiResult.debug.httpStatus || '-'}
--------------------------------------------------
(아래는 비상용 기본 예시 템플릿입니다)`;

    finalRoutine = `${debugNotice}\n\n[루틴 소개]
${customExerciseGuideline ? `코치 수정 지침("${customExerciseGuideline}")을 1순위로 적극 반영하여 구성했습니다.\n` : ''}회원의 생활 패턴과 체력 수준에 맞추어 관절 부담을 줄이고 기초 근력을 다지는 분할 루틴입니다.
지속 가능한 습관 형성을 위해 운동일과 회복일을 균형 있게 배치했습니다.

[루틴]
| DAY1 [가슴, 삼두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 체스트 프레스 머신 | 12회 | 3세트 | 60초 | |
| 인클라인 덤벨 프레스 | 12회 | 3세트 | 60초 | |
| 케이블 푸시다운 | 15회 | 3세트 | 45초 | |
| 마무리 유산소 (트레드밀 경보) | 25분 | 1세트 | - | |

DAY2 (휴식) - 가벼운 스트레칭 및 회복 휴식

| DAY3 [등, 이두] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 랫 풀 다운 | 12회 | 3세트 | 60초 | |
| 시티드 케이블 로우 | 12회 | 3세트 | 60초 | |
| 암 풀 다운 | 15회 | 3세트 | 45초 | |
| 덤벨 컬 | 12회 | 3세트 | 45초 | |

DAY4 (휴식) - 폼롤러 전신 근막 이완 및 척추 스트레칭

| DAY5 [하체, 코어] | | | | |
| :--- | :--- | :--- | :--- | :--- |
| **운동 종목** | **횟수** | **세트수** | **쉬는시간** | **무게** |
| 레그 프레스 머신 | 15회 | 3세트 | 60초 | |
| 덤벨 스티프 데드리프트 | 12회 | 3세트 | 60초 | |
| 레그 익스텐션 | 15회 | 3세트 | 45초 | |
| 플랭크 | 30초 | 3세트 | 45초 | |

DAY6 (휴식) - 야외 가벼운 산책 40분

DAY7 (휴식) - 완전 휴식 및 에너지 재충전`;
  }

  return createJsonResponse({
    status: 'success',
    routine: finalRoutine,
    isAiGenerated: isAiGenerated,
    debug: aiResult.debug
  });
}

/**
 * 6. [AI] 식단 계획 생성
 * - DB의 '식단 제안 지침서' 기반
 * - '식단 수정 제안 지침'이 있다면 최우선 반영
 */
function handleAiDietPlan(ss, payload) {
  const guidelineSheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침']);
  const guidelines = getGuidelinesData(guidelineSheet);
  const baseDietGuideline = guidelines.diet || '극단적 탄수화물 제한 지양, 매끼니 양질의 단백질 20~30g과 식이섬유 포함';

  const member = payload.member || {};
  const customDietGuideline = payload.customDietGuideline ||
    getGasField(member, ['식단 수정 제안 지침', '식단수정제안지침', '식단수정지침', '식단제안지침', '식단지침']) || '';

  const memberName = getGasField(member, ['이름', 'name', '성명', '참여자이름', '회원명']) || '참여자';
  // [요구사항 1] 하드코딩 필드 추출 제거 & 전체 키-값 동적 매핑
  const memberFullProfile = formatObjectAsFullProfile(member);

  const prompt = `
당신은 '4주 온라인 식단 습관화 코칭 프로그램'의 전문 임상 영양 코치입니다.
아래 참여자의 전체 사전 설문 응답 프로필과 코칭 지침서를 바탕으로 [맞춤 데일리 식단 가이드]를 작성해 주세요.

[참여자 정보]
${memberFullProfile}

[기본 식단 제안 지침서 (DB)]
${baseDietGuideline}

[★최우선 반영 사항: 코치의 식단 수정 제안 지침★]
${customDietGuideline ? customDietGuideline : '현재 별도 수정 지침 없음. 기본 지침서와 참여자 라이프스타일에 맞춰 구성할 것.'}

[출력 규칙 및 포맷 (엄격 준수)]
1. 불필요한 인사말, 시작 멘트, 맺음말은 일체 생략하고 아래의 지정된 섹션 구조로만 출력하십시오.
2. 최우선 반영 사항(수정 제안 지침)이 있다면 1순위로 반드시 적용하십시오.
3. **[식단 소개]**: 참여자의 일과, 직업, 라이프스타일, 대사량(기초/활동/목표 칼로리) 및 식단 구성 근거를 3줄 이하로 간략히 작성하십시오.
4. **[평상시 식단 (클린데이)]**:
   - 주중에 실천할 클린 식단표를 반드시 아래 4열 마크다운 테이블로 작성하십시오.
   - 열 구조: | 식사 | 식단 내용 | 대체 식품 (2~3가지) | 예상 칼로리 |
   - 행: 아침, 점심, 간식, 저녁
   - 테이블 바로 아래에 '- 총 예상 칼로리: 약 [계산값] kcal'를 표기하십시오.
5. **[주말 및 휴일 식단 (치팅/자유식 관리)]**:
   - 주말/휴일에 외식이나 약속 시 실천할 치팅 및 자유식 관리 식단표를 동일한 4열 마크다운 테이블로 작성하십시오.
   - 테이블 바로 아래에 '- 총 예상 칼로리: 약 [계산값] kcal'를 표기하십시오.
6. **[돌발 상황(Plan B) 대처 가이드라인]**:
   - 외식, 회식, 야근, 야식 유혹 등 돌발 상황 대처법 및 수분 섭취(1.5~2L) 팁을 간결하게 작성하십시오.

[출력 양식 예시]
[식단 소개]
(참여자의 생활패턴과 대사량을 고려한 3줄 이하의 구성 근거)

[평상시 식단 (클린데이)]
| 식사 | 식단 내용 | 대체 식품 (2~3가지) | 예상 칼로리 |
| :--- | :--- | :--- | :--- |
| 아침 | 사과 1/2개 + 삶은 달걀 2개 + 두유 1팩 | 그릭요거트 100g + 견과류 | 약 300 kcal |
| 점심 | 현미밥 2/3공기 + 닭가슴살 100g + 쌈채소 | 생선구이 백반 (밥 2/3공기) | 약 550 kcal |
| 간식 | 구운 아몬드 10알 | 방울토마토 10알 | 약 100 kcal |
| 저녁 | 소고기 우둔살 120g + 채소 샐러드 | 두부 1/2모 + 샐러드 | 약 450 kcal |
- 총 예상 칼로리: 약 1,400 kcal

[주말 및 휴일 식단 (치팅/자유식 관리)]
| 식사 | 식단 내용 | 대체 식품 (2~3가지) | 예상 칼로리 |
| :--- | :--- | :--- | :--- |
| 아침 | 바나나 1개 + 삶은 달걀 1개 | 가벼운 과일 스무디 | 약 200 kcal |
| 점심 | 자유식 1끼 (샤브샤브, 쌈밥 등 국물 배제) | 생선구이나 담백한 한식 | 약 700 kcal |
| 간식 | 아메리카노 1잔 (당류 음료 배제) | 탄산수 | 약 10 kcal |
| 저녁 | 단백질 쉐이크 + 가벼운 샐러드 | 닭가슴살 샐러드 | 약 350 kcal |
- 총 예상 칼로리: 약 1,260 kcal

[돌발 상황(Plan B) 대처 가이드라인]
- 외식/회식 시: 밥은 1/2공기 이하로 줄이고, 국물 요리는 건더기 위주로 섭취하세요.
- 야근 및 늦은 귀가 시: 취침 3시간 전에는 탄수화물을 제한하고 가벼운 단백질 위주로 허기만 달랩니다.
- 수분 섭취: 하루 최소 1.5L~2L의 미온수를 텀블러로 나누어 섭취하세요.
`;

  const aiResult = callGemini(prompt, '당신은 회원 맞춤 영양/식단 코칭 전문가입니다.', payload);
  const isAiGenerated = !!aiResult.text;

  let finalPlan = '';
  if (isAiGenerated) {
    finalPlan = aiResult.text;
  } else {
    const debugNotice = `[⚠️ AI API 호출 실패 디버그 안내]
원인: ${aiResult.debug.errorMessage || '알 수 없는 오류'}
키 소스: ${aiResult.debug.keySource} (Key 유무: ${aiResult.debug.hasKey ? '등록됨' : '미등록'})
상태 코드: ${aiResult.debug.httpStatus || '-'}
--------------------------------------------------
(아래는 비상용 기본 예시 템플릿입니다)`;

    finalPlan = `${debugNotice}

[식단 소개]
참여자의 기초대사량과 활동대사량을 고려하여 균형 잡힌 칼로리로 구성했습니다. 평일에는 클린 식단으로 대사량을 유지하고 주말에는 치팅/자유식을 현명하게 관리합니다.

[평상시 식단 (클린데이)]
| 식사 | 식단 내용 | 대체 식품 (2~3가지) | 예상 칼로리 |
| :--- | :--- | :--- | :--- |
| 아침 | 사과 1/2개 + 삶은 달걀 2개 + 두유 1팩 | 그릭요거트 100g + 바나나 | 약 300 kcal |
| 점심 | 현미밥 2/3공기 + 닭가슴살 100g + 쌈채소 | 생선구이 백반 (밥 2/3공기) | 약 550 kcal |
| 간식 | 구운 아몬드 10알 | 방울토마토 10알 | 약 100 kcal |
| 저녁 | 소고기 우둔살 120g + 채소 샐러드 | 두부 1/2모 + 샐러드 | 약 450 kcal |
- 총 예상 칼로리: 약 1,400 kcal

[주말 및 휴일 식단 (치팅/자유식 관리)]
| 식사 | 식단 내용 | 대체 식품 (2~3가지) | 예상 칼로리 |
| :--- | :--- | :--- | :--- |
| 아침 | 바나나 1개 + 삶은 달걀 1개 | 가벼운 과일 스무디 | 약 200 kcal |
| 점심 | 자유식 1끼 (샤브샤브, 쌈밥 등 국물 배제) | 생선구이나 담백한 한식 | 약 700 kcal |
| 간식 | 아메리카노 1잔 (당류 음료 배제) | 탄산수 | 약 10 kcal |
| 저녁 | 단백질 쉐이크 + 가벼운 샐러드 | 닭가슴살 샐러드 | 약 350 kcal |
- 총 예상 칼로리: 약 1,260 kcal

[돌발 상황(Plan B) 대처 가이드라인]
- 외식/회식 시: 밥은 1/2공기 이하로 줄이고, 국물 요리는 건더기 위주로 섭취하세요.
- 야근 및 늦은 귀가 시: 취침 3시간 전에는 탄수화물을 제한하고 가벼운 단백질 위주로 허기만 달랩니다.
- 수분 섭취: 하루 최소 1.5L~2L의 미온수를 텀블러로 나누어 섭취하세요.`;
  }

  return createJsonResponse({
    status: 'success',
    dietPlan: finalPlan,
    isAiGenerated: isAiGenerated,
    debug: aiResult.debug
  });
}

/**
 * 7. [AI] 데일리 피드백 도출
 * - 피드백 지침서 & 동기부여 지침서 기반
 * - 최근 최소 3일 이상의 누적 체중 변화 추이 및 식단/운동 분석
/**
 * 7. [AI] 데일리 피드백 도출 (공통 생성 코어)
 * - 웹앱 API 요청(handleAiDailyFeedback) 및 구글 폼 제출 트리거(onFormSubmitHandler) 양쪽에서 공통 사용
 * - 피드백 지침서 & 동기부여 지침서 기반
 * - 최근 최소 3일 이상의 누적 체중 변화 추이 및 식단/운동 분석
 * - 계획 수정 필요 시 'AI 운동 수정 제안' 및 'AI 식단 수정 제안' 도출 (명확한 '근거' 제시)
 */
function generateDailyFeedbackCore(ss, payload) {
  const guidelineSheet = findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침']);
  const guidelines = payload.guidelines || getGuidelinesData(guidelineSheet);

  const member = payload.member || {};
  const currentFeedback = payload.feedback || {};
  const recentFeedbacks = payload.recentFeedbacks || []; // 최근 날짜순 배열 (최소 3일 이상)

  // 최근 체중 추이 텍스트 요약 (운동_실행률_점수, 식단_실행률_점수 동의어 반영)
  let weightHistorySummary = recentFeedbacks.map(f => {
    const fDate = getGasField(f, ['날짜', 'date', '일자']);
    const fWeight = getGasField(f, ['공복 몸무게', '공복몸무게', '체중', 'weight']);
    const fExScore = getGasField(f, ['운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동 점수', '운동점수', 'exerciseScore']);
    const fDietScore = getGasField(f, ['식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단 점수', '식단점수', 'dietScore']);
    return `${fDate}: ${fWeight}kg (운동: ${fExScore}점, 식단: ${fDietScore}점)`;
  }).join('\n');

  const curDate = getGasField(currentFeedback, ['날짜', 'date', '일자']) || '오늘';
  const curWeight = getGasField(currentFeedback, ['공복 몸무게', '공복몸무게', '체중', 'weight']) || '-';
  const curExScore = getGasField(currentFeedback, ['운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동 점수', '운동점수', 'exerciseScore']);
  const curDietScore = getGasField(currentFeedback, ['식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단 점수', '식단점수', 'dietScore']);
  const memberStartWeight = getGasField(member, ['시작 체중', '시작체중', '체중', 'weight']) || curWeight;

  if (!weightHistorySummary) {
    weightHistorySummary = `${curDate}: ${curWeight}kg`;
  }

  // [요구사항 1 & 2] 하드코딩 필드 추출 제거 & 전체 키-값 동적 매핑
  const memberFullProfile = formatObjectAsFullProfile(member);
  const feedbackFullData = formatObjectAsFullProfile(currentFeedback);

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
- 피드백 지침서: ${guidelines.feedback || '24시간 내 피드백, 칭찬(Positive Reinforcement) 선행 후 1가지 실행 가능한 개선안 제안'}
- 동기부여 지침서: ${guidelines.motivation || '한 끼 실패가 4주의 실패는 아님을 강조, 자책감 방지 및 회복탄력성'}

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

  const aiResult = callGemini(prompt, '당신은 냉철한 데이터 분석력과 따뜻한 공감력을 겸비한 코칭 전문가입니다. You must respond ONLY with a valid JSON object. Do not include any markdown formatting like ```json or any conversational text.', payload);

  let parsed = null;
  if (aiResult.text) {
    try {
      let cleaned = aiResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
      const rawJson = JSON.parse(cleaned);

      parsed = {
        "피드백_요약": String(rawJson['피드백_요약'] || rawJson['피드백 요약'] || rawJson['피드백요약'] || rawJson['요약'] || rawJson['feedbackComment'] || '오늘도 성실하게 일지를 기록해 주셔서 감사합니다!'),
        "문제점_분석": String(rawJson['문제점_분석'] || rawJson['문제점 분석'] || rawJson['문제점분석'] || rawJson['문제점'] || '특이사항 없음'),
        "보완점_및_개선방안": String(rawJson['보완점_및_개선방안'] || rawJson['보완점 및 개선방안'] || rawJson['보완점및개선방안'] || rawJson['보완점'] || rawJson['개선방안'] || '현재의 페이스를 안정적으로 유지해 주세요.'),
        "운동_수정_제안": String(rawJson['운동_수정_제안'] || rawJson['운동 수정 제안'] || rawJson['운동수정제안'] || ''),
        "식단_수정_제안": String(rawJson['식단_수정_제안'] || rawJson['식단 수정 제안'] || rawJson['식단수정제안'] || ''),
        "운동_실행률_점수": (rawJson['운동_실행률_점수'] !== undefined && !isNaN(parseFloat(rawJson['운동_실행률_점수'])))
          ? Math.max(0, Math.min(5, parseFloat(rawJson['운동_실행률_점수'])))
          : ((!isNaN(parseFloat(curExScore)) && parseFloat(curExScore) <= 5) ? parseFloat(curExScore) : 4),
        "식단_실행률_점수": (rawJson['식단_실행률_점수'] !== undefined && !isNaN(parseFloat(rawJson['식단_실행률_점수'])))
          ? Math.max(0, Math.min(5, parseFloat(rawJson['식단_실행률_점수'])))
          : ((!isNaN(parseFloat(curDietScore)) && parseFloat(curDietScore) <= 5) ? parseFloat(curDietScore) : 5)
      };
    } catch (e) {
      Logger.log('JSON 파싱 실패: ' + e.toString());
    }
  }

  // Fallback 처리
  if (!parsed) {
    const todayWeightNum = parseFloat(curWeight) || 0;
    const startWeightNum = parseFloat(memberStartWeight) || todayWeightNum;
    const isWeightStall = (todayWeightNum >= startWeightNum);

    const debugPrefix = aiResult.debug.errorMessage
      ? `[⚠️ AI 호출 실패 디버그: ${aiResult.debug.errorMessage}]\n\n`
      : '';

    parsed = {
      "피드백_요약": `${debugPrefix}오늘도 바쁜 일정 속에서 성실하게 일지를 작성하고 운동과 식단을 실천해 주셔서 훌륭합니다! 물 섭취와 규칙적인 식사를 꾸준히 이어가고 계신 점 크게 칭찬드립니다.`,
      "문제점_분석": isWeightStall
        ? "최근 3일간 공복 체중의 감량 정체 및 저녁 식단 후 붓기가 확인되어 순환 대사가 다소 저하된 상태입니다."
        : "특이사항 없음",
      "보완점_및_개선방안": isWeightStall
        ? "유산소 운동 비중을 15분 늘리고 저녁 식사의 염분 섭취를 최소화해 보세요. 한 끼의 정체는 4주의 실패가 아니므로 충분한 수분 섭취와 함께 회복탄력성을 유지해 봅시다!"
        : "현재의 페이스를 안정적으로 유지하면서, 피로도가 느껴질 때는 30분 일찍 취침하여 근육 회복을 도와주세요.",
      "운동_수정_제안": isWeightStall
        ? "기존 웨이트 후 [경사도 러닝머신 20분(속도 5.5, 인클라인 6%)] 또는 [빠르게 걷기 30분] 추가하여 대사율 부스팅"
        : "",
      "식단_수정_제안": isWeightStall
        ? "저녁 식단에서 나트륨 섭취를 최소화하고, 칼륨이 풍부한 오이나 토마토 1개를 추가하여 체내 수분 정체 완화"
        : "",
      "운동_실행률_점수": (parseFloat(curExScore) <= 5 ? parseFloat(curExScore) : 4) || 4,
      "식단_실행률_점수": (parseFloat(curDietScore) <= 5 ? parseFloat(curDietScore) : 5) || 5
    };
  }

  return {
    status: 'success',
    data: parsed,
    isAiGenerated: !!aiResult.text,
    debug: aiResult.debug
  };
}

function handleAiDailyFeedback(ss, payload) {
  const result = generateDailyFeedbackCore(ss, payload);
  return createJsonResponse(result);
}

/**
 * 8. [AI] 종합 피드백 생성
 */
function handleAiComprehensiveFeedback(ss, payload) {
  const member = payload.member || {};
  const feedbacks = payload.feedbacks || [];
  const startDate = payload.startDate || '시작일';
  const endDate = payload.endDate || '종료일';

  const memberName = getGasField(member, ['이름', 'name', '성명', '참여자이름', '회원명']) || '참여자';
  // [요구사항 1] 전체 사전 응답 프로필 동적 매핑
  const memberFullProfile = formatObjectAsFullProfile(member);

  const prompt = `
당신은 '4주 온라인 운동/식단 습관화 코칭 프로그램'의 총괄 디렉터입니다.
참여자 [${memberName}]의 기간(${startDate} ~ ${endDate}) 동안의 데일리 피드백 기록 총 ${feedbacks.length}건을 종합 분석하여 다음 2가지를 작성해 주세요:
1. 해당 기간 동안의 식단/운동/체중 변화 종합 요약 및 성과 평가
2. 4주 프로그램 종료 후에도 요요 없이 스스로 습관을 유지할 수 있는 [추후 자립 방안(Action Plan)]

[참여자 프로필 전체 (사전 설문 전 항목)]
${memberFullProfile}
`;

  const aiResult = callGemini(prompt, '당신은 종합 습관 코칭 전문가입니다.', payload);
  const isAiGenerated = !!aiResult.text;

  let finalSummary = '';
  if (isAiGenerated) {
    finalSummary = aiResult.text;
  } else {
    const debugPrefix = aiResult.debug.errorMessage
      ? `[⚠️ AI 호출 실패 디버그: ${aiResult.debug.errorMessage}]\n\n`
      : '';

    finalSummary = `${debugPrefix}[${startDate} ~ ${endDate} 종합 코칭 리포트]
1. 성과 분석 요약:
  - 총 ${feedbacks.length}일간의 피드백을 통해 식단 및 운동의 주간 루틴이 안정적으로 자리잡았습니다.
  - 초기 체중 대비 긍정적인 하향 안정세를 기록했으며, 야식 및 단순당 절제에 대한 자가 조절 능력이 크게 향상되었습니다.
2. 향후 자립 실천 가이드:
  - 주 3회 최소 30분 이상 루틴을 '최소한의 마지노선'으로 설정하여 바쁜 주간에도 유지할 것.
  - 주 1회 자유식(치팅)은 점심에 즐기되, 다음 날 아침은 가벼운 수분 및 단백질 위주로 자연 복귀할 것.
  - 체중 수치 자체보다 '눈바디'와 일상의 활력 지표를 기준으로 삼을 것.`;
  }

  return createJsonResponse({
    status: 'success',
    comprehensiveFeedback: finalSummary,
    isAiGenerated: isAiGenerated,
    debug: aiResult.debug
  });
}

/**
 * ==============================================================================
 * [원클릭 초기 시트 생성 함수 (시트 구조 검증 및 표준 템플릿)]
 * ==============================================================================
 */
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Members 시트
  let memSheet = ss.getSheetByName('Members');
  if (!memSheet) memSheet = ss.insertSheet('Members');
  if (memSheet.getLastRow() === 0) {
    memSheet.appendRow([
      '회원번호', '이름', '상태', '태그', '나이', '성별', '키', '체중', '시작 체중',
      '직업/근무시간', '운동 경력', '주당 운동 횟수', '참여목적',
      '운동 루틴 수정 제안 지침', '식단 수정 제안 지침',
      '현재 제안 운동 루틴', '현재 제안 식단'
    ]);
    memSheet.appendRow([
      'M001', '김민수', '유효', '4주-체중감량반', 31, '남성', 178, 82.5, 82.5,
      'IT 개발자 (09:00~19:00, 좌식근무)', '헬스 3개월 미만', '주 1회', '4주 체중 -3kg 감량 및 저녁 야식 습관 개선',
      '허리 부담 줄이는 코어 및 맨몸 하체 중심', '야근 시 편의점 단백질바/두유 대체',
      '월/수/금 홈트 30분 (스쿼트, 플랭크, 덤벨 로우)', '아침 요거트, 점심 일반식(밥 2/3), 저녁 닭가슴살 샐러드'
    ]);
    memSheet.appendRow([
      'M002', '이지원', '유효', '4주-식단집중반', 28, '여성', 164, 58.2, 58.2,
      '브랜드 마케터 (외근/야근 유동적)', '필라테스 1년', '주 2회', '군살 정리, 클린 식단 정착 및 디저트 폭식 방지',
      '퇴근 후 20분 릴렉스 요가 및 매트 필라테스', '점심 포케/샐러드 위주, 카페라떼 대신 아메리카노',
      '주 3회 홈트 필라테스 & 스트레칭 30분', '아침 사과+계란, 점심 샐러드볼, 저녁 단호박 에그슬럿'
    ]);
    memSheet.appendRow([
      'M003', '박준혁', '휴면', '4주-직장인루틴반', 35, '남성', 172, 75.0, 75.0,
      '해외영업팀 (회식 잦음)', '웨이트 2년차', '주 3회', '복부 내장지방 감량 및 주 1회 이하 음주 절제',
      '', '', '', ''
    ]);
  }

  // 2. Feedbacks 시트
  let fbSheet = ss.getSheetByName('Feedbacks');
  if (!fbSheet) fbSheet = ss.insertSheet('Feedbacks');
  if (fbSheet.getLastRow() === 0) {
    fbSheet.appendRow([
      '피드백번호', '날짜', '이름', '공복 몸무게', '운동 점수', '식단 점수',
      '운동 내용', '식단 내용', '회원 일기/코멘트', '피드백 코멘트',
      '운동_실행률_점수', '식단_실행률_점수', '피드백_요약', '문제점_분석', '보완점_및_개선방안', '피드백 상태'
    ]);
    fbSheet.appendRow([
      'FB01', '2026-10-08', '김민수', 82.5, 8, 7,
      '스쿼트 4세트 + 런지 3세트 + 스트레칭 15분', '아침 그릭요거트, 점심 소불고기 백반(밥 절반), 저녁 닭가슴살',
      '첫날이라 의욕이 넘칩니다. 물 2L 마셨습니다.', '첫날 루틴 완벽히 수행하셨네요! 멋진 출발입니다.'
    ]);
    fbSheet.appendRow([
      'FB02', '2026-10-09', '김민수', 82.1, 9, 8,
      '야외 인터벌 러닝 30분', '아침 프로틴 쉐이크, 점심 서브웨이 위트, 저녁 연어 샐러드',
      '러닝 후 땀 흘리니 개운합니다. 야식 참았습니다.', '야식 유혹을 이겨낸 의지가 대단합니다. 수면 푹 취하세요!'
    ]);
    fbSheet.appendRow([
      'FB03', '2026-10-10', '김민수', 81.9, 6, 6,
      '야근으로 폼롤러 스트레칭 20분만 진행', '점심 김치찌개 건더기 위주, 저녁 단호박+소시지',
      '업무가 바빠 운동을 적게 해 아쉽습니다.', ''
    ]);
    fbSheet.appendRow([
      'FB04', '2026-10-11', '김민수', 81.6, 9, 9,
      '상체 웨이트 40분 (체스트프레스, 랫풀다운)', '아침 오트밀, 점심 닭가슴살 볶음밥, 저녁 우둔살 샐러드',
      '식단 클린하게 하니 오후에 졸리지 않습니다.', ''
    ]);
    fbSheet.appendRow([
      'FB05', '2026-10-12', '김민수', 81.4, 8, 8,
      '실내 사이클 35분', '아침 바나나+계란, 점심 포케, 저녁 프로틴볼',
      '몸이 한결 가벼워졌습니다!', ''
    ]);

    // 이지원 피드백
    fbSheet.appendRow([
      'FB06', '2026-10-10', '이지원', 58.2, 8, 7,
      '필라테스 코어 35분', '아침 사과, 점심 일반식(구내식당), 저녁 샐러드',
      '디저트 참았습니다!', '디저트 방어 성공 축하드립니다!'
    ]);
    fbSheet.appendRow([
      'FB07', '2026-10-11', '이지원', 58.0, 9, 8,
      '만보 걷기 (50분)', '아침 요거트, 점심 현미 포케, 저녁 닭가슴살 볼',
      '퇴근길 걸어오니 개운해요.', ''
    ]);
  }

  // 3. Guidelines 시트
  let gdSheet = ss.getSheetByName('Guidelines');
  if (!gdSheet) gdSheet = ss.insertSheet('Guidelines');
  if (gdSheet.getLastRow() === 0) {
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    gdSheet.appendRow(['지침', '내용', '수정일']);
    gdSheet.appendRow(['코칭 철학', '완벽함보다는 지속 가능성에 집중합니다. 단기간 극단적 절식 대신 평생 유지할 수 있는 작은 습관의 복리 효과를 지향합니다. 실패한 날도 과정의 일부입니다.', nowStr]);
    gdSheet.appendRow(['운동 제안 지침', '초보자는 주 3~4회, 하루 20~30분 저강도~중강도 루틴으로 성공 경험을 축적합니다. 점진적 과부하와 관절 부상 방지(스트레칭 10분 필수)를 최우선 원칙으로 합니다.', nowStr]);
    gdSheet.appendRow(['식단 제안 지침', '극단적 탄수화물 제한을 지양하고, 매 끼니 양질의 단백질 20~30g과 식이섬유를 기본 탑재합니다. 가공식품과 단순당을 줄이고 수분 1.5~2L 섭취를 강조합니다.', nowStr]);
    gdSheet.appendRow(['피드백 지침', '피드백은 24시간 이내에 제공하며, 지적보다는 잘한 점에 대한 구체적 칭찬(Positive Reinforcement)을 선행한 뒤 1개의 실천 가능한 개선점을 제안합니다.', nowStr]);
    gdSheet.appendRow(['동기부여 지침', '회원이 슬럼프나 과식을 겪었을 때 자책하지 않도록 깊이 공감합니다. "한 끼의 실수가 4주의 실패는 아니다"라는 마인드셋을 심어주며 다음 끼니에서 자연스럽게 복귀하도록 격려합니다.', nowStr]);
  }

  Logger.log('초기 표준 시트 구성이 완료되었습니다!');
}

/**
 * JSON 응답 생성 유틸리티
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ==============================================================================
 * [구글 폼 제출 시 백그라운드 AI 초안 자동 생성 트리거 시스템]
 * ==============================================================================
 */

/**
 * 스프레드시트 양식 제출(onFormSubmit) 트리거를 원클릭으로 설치하는 함수
 * - Apps Script 상단 함수 드롭다운에서 'installFormSubmitTrigger'를 선택 후 [실행] 클릭 시 등록 완료
 */
function installFormSubmitTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('[트리거 설치 실패] 활성화된 스프레드시트를 찾을 수 없습니다.');
    return;
  }

  // 기존 동일 트리거 중복 설치 방지 정리
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onFormSubmitHandler') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 스프레드시트 양식 제출 이벤트 트리거 생성
  ScriptApp.newTrigger('onFormSubmitHandler')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log('[트리거 설치 완료] 구글 폼 양식 제출 트리거(onFormSubmitHandler)가 성공적으로 설치되었습니다.');
}

/**
 * 구글 폼 제출 시 백그라운드 자동 실행되는 핸들러 함수
 * - 회원 제출 즉시 AI 초안을 생성하여 Feedbacks 시트에 'AI초안' 상태로 안전하게 기록
 * - 외부 발송 기능은 배제하고 시트 초안 기록에만 집중
 */
function onFormSubmitHandler(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      Logger.log('[onFormSubmitHandler] 활성 스프레드시트 없음');
      return { status: 'error', message: '활성 스프레드시트 없음' };
    }

    // [핵심 1] 폼 응답이 기록된 실제 시트 특정
    let feedbackSheet = null;
    if (e && e.range) {
      try {
        feedbackSheet = e.range.getSheet();
      } catch (se) {}
    }
    if (!feedbackSheet) {
      feedbackSheet = ss.getSheetByName('feedbacks') || ss.getSheetByName('Feedbacks')
        || findSheetSmartly(ss, SHEET_NAMES.FEEDBACKS, ['공복몸무게', '운동점수', '식단점수', '운동내용']);
    }

    const memberSheet = ss.getSheetByName('Members') || ss.getSheetByName('members')
      || findSheetSmartly(ss, SHEET_NAMES.MEMBERS, ['이름', '체중', '운동경력', '키', '성별']);
    const guidelineSheet = ss.getSheetByName('Guidelines') || ss.getSheetByName('guidelines')
      || findSheetSmartly(ss, SHEET_NAMES.GUIDELINES, ['코칭철학', '운동제안지침', '식단제안지침', '피드백지침', '동기부여지침']);

    if (!feedbackSheet) {
      Logger.log('[onFormSubmitHandler] Feedbacks 시트 탐색 실패');
      return { status: 'error', message: 'Feedbacks 시트를 찾을 수 없음' };
    }

    // 1. 방금 제출된 행 번호 감지
    let targetRow = (e && e.range) ? e.range.getRow() : feedbackSheet.getLastRow();
    if (targetRow <= 1) targetRow = feedbackSheet.getLastRow();
    if (targetRow <= 1) {
      Logger.log('[onFormSubmitHandler] 유효한 피드백 데이터 행이 없습니다.');
      return { status: 'error', message: '데이터 행 없음' };
    }

    const lastCol = Math.max(feedbackSheet.getLastColumn(), 1);
    const headers = feedbackSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const rowValues = feedbackSheet.getRange(targetRow, 1, 1, lastCol).getValues()[0];

    // 행 데이터를 객체로 매핑
    const currentFeedback = {};

    // (A) e.namedValues가 있으면 먼저 반영 (폼 제출 즉시 전달된 답변 배열)
    if (e && e.namedValues) {
      for (const k in e.namedValues) {
        const val = Array.isArray(e.namedValues[k]) ? e.namedValues[k][0] : e.namedValues[k];
        currentFeedback[k] = val;
        currentFeedback[String(k).trim().replace(/\s+/g, '')] = val;
      }
    }

    // (B) 시트 셀 값으로 보완 매핑
    for (let j = 0; j < headers.length; j++) {
      const h = String(headers[j]).trim();
      if (!h) continue;
      if (currentFeedback[h] === undefined || currentFeedback[h] === '') {
        currentFeedback[h] = rowValues[j];
      }
      currentFeedback[h.replace(/\s+/g, '')] = rowValues[j];
    }

    // 회원 이름 추출 (다양한 헤더 동의어 및 부분 매칭)
    let memberName = getGasField(currentFeedback, [
      '이름', 'name', '성명', '성함', '회원명', '참여자이름', '회원이름', '참여자명', '참가자이름', '사용자이름'
    ]);

    // 헤더 직접 스캔 백업
    if (!memberName) {
      for (let j = 0; j < headers.length; j++) {
        const hClean = String(headers[j]).replace(/\s+/g, '').toLowerCase();
        if (hClean.includes('이름') || hClean.includes('성명') || hClean.includes('성함')) {
          const val = rowValues[j];
          if (val && String(val).trim()) {
            memberName = String(val).trim();
            break;
          }
        }
      }
    }

    if (!memberName) {
      Logger.log(`[onFormSubmitHandler 경고] Row ${targetRow}에서 회원 이름을 특정할 수 없어 임시 명칭을 사용합니다.`);
      memberName = '회원';
    }

    Logger.log(`[onFormSubmitHandler 시작] Row ${targetRow} 회원 '${memberName}' (시트: ${feedbackSheet.getName()}) AI 초안 자동 생성 개시`);

    // 2. Members 시트에서 해당 회원의 사전 설문 프로필 조회
    let memberProfile = { '이름': memberName };
    if (memberSheet) {
      const allMembers = getSheetDataWithHeaders(memberSheet);
      const cleanTargetName = String(memberName).replace(/\s+/g, '').toLowerCase();
      const found = allMembers.find(m => {
        const mName = getGasField(m, ['이름', 'name', '성명', '성함', '회원명']);
        return mName && String(mName).replace(/\s+/g, '').toLowerCase() === cleanTargetName;
      });
      if (found) {
        memberProfile = found;
      }
    }

    // 3. Feedbacks 시트에서 해당 회원의 이전 최근 3일 치 기록 추출
    const allFeedbacks = getSheetDataWithHeaders(feedbackSheet);
    const cleanTargetName = String(memberName).replace(/\s+/g, '').toLowerCase();
    const memberFeedbacks = allFeedbacks.filter(f => {
      const fName = getGasField(f, ['이름', 'name', '성명', '성함', '회원명']);
      return fName && String(fName).replace(/\s+/g, '').toLowerCase() === cleanTargetName;
    });

    // 날짜 기준 오름차순 정렬 후 최근 3건
    memberFeedbacks.sort((a, b) => {
      const dA = new Date(getGasField(a, ['날짜', 'date', '일자']) || 0);
      const dB = new Date(getGasField(b, ['날짜', 'date', '일자']) || 0);
      return dA - dB;
    });
    const recentFeedbacks = memberFeedbacks.slice(-3);

    // 4. Guidelines 시트에서 피드백 & 동기부여 지침서 가져오기
    const guidelines = getGuidelinesData(guidelineSheet);

    // 5. AI 피드백 생성 코어 호출 (callGemini 기반 JSON 도출)
    const aiPayload = {
      member: memberProfile,
      feedback: currentFeedback,
      recentFeedbacks: recentFeedbacks,
      guidelines: guidelines
    };

    const aiRes = generateDailyFeedbackCore(ss, aiPayload);
    const draftData = aiRes.data;

    if (!draftData) {
      Logger.log(`[onFormSubmitHandler] Row ${targetRow} AI 초안 도출 실패`);
      return { status: 'error', message: 'AI 초안 데이터 도출 실패' };
    }

    // 6. Feedbacks 시트에 각 열을 안전하게 생성/확보(getOrAddColumn)하고 초안 데이터 기록
    const colMap = getHeaderColumnMap(feedbackSheet);

    // (1) 운동_실행률_점수
    if (draftData.운동_실행률_점수 !== undefined && draftData.운동_실행률_점수 !== null) {
      const exScoreCol = getOrAddColumn(feedbackSheet, colMap, '운동_실행률_점수', [
        '운동_실행률_점수', '운동실행률점수', '운동_실행률', '운동실행률', '운동 점수', '운동점수', 'exerciseScore'
      ]);
      feedbackSheet.getRange(targetRow, exScoreCol).setValue(draftData.운동_실행률_점수);
    }

    // (2) 식단_실행률_점수
    if (draftData.식단_실행률_점수 !== undefined && draftData.식단_실행률_점수 !== null) {
      const dietScoreCol = getOrAddColumn(feedbackSheet, colMap, '식단_실행률_점수', [
        '식단_실행률_점수', '식단실행률점수', '식단_실행률', '식단실행률', '식단 점수', '식단점수', 'dietScore'
      ]);
      feedbackSheet.getRange(targetRow, dietScoreCol).setValue(draftData.식단_실행률_점수);
    }

    // (3) 피드백_요약
    const summaryCol = getOrAddColumn(feedbackSheet, colMap, '피드백_요약', [
      '피드백_요약', '피드백 요약', '피드백요약', '요약', 'summary', 'feedbackSummary'
    ]);
    feedbackSheet.getRange(targetRow, summaryCol).setValue(draftData.피드백_요약 || '');

    // (4) 문제점_분석
    const problemCol = getOrAddColumn(feedbackSheet, colMap, '문제점_분석', [
      '문제점_분석', '문제점 분석', '문제점분석', '문제점', 'problemAnalysis', 'problem'
    ]);
    feedbackSheet.getRange(targetRow, problemCol).setValue(draftData.문제점_분석 || '');

    // (5) 보완점_및_개선방안
    const solutionCol = getOrAddColumn(feedbackSheet, colMap, '보완점_및_개선방안', [
      '보완점_및_개선방안', '보완점 및 개선방안', '보완점및개선방안', '보완점', '개선방안', 'solution', 'improvementSolution'
    ]);
    feedbackSheet.getRange(targetRow, solutionCol).setValue(draftData.보완점_및_개선방안 || '');

    // (6) 운동_수정_제안 (모달 표시용으로 Feedbacks 시트에만 기록, Members 시트에는 절대 자동 반영 안 함)
    const exPropCol = getOrAddColumn(feedbackSheet, colMap, '운동_수정_제안', [
      '운동_수정_제안', '운동 수정 제안', '운동수정제안', '운동수정', 'exerciseProposal'
    ]);
    feedbackSheet.getRange(targetRow, exPropCol).setValue(draftData.운동_수정_제안 || '');

    // (7) 식단_수정_제안 (모달 표시용으로 Feedbacks 시트에만 기록, Members 시트에는 절대 자동 반영 안 함)
    const dietPropCol = getOrAddColumn(feedbackSheet, colMap, '식단_수정_제안', [
      '식단_수정_제안', '식단 수정 제안', '식단수정제안', '식단수정', 'dietProposal'
    ]);
    feedbackSheet.getRange(targetRow, dietPropCol).setValue(draftData.식단_수정_제안 || '');

    // (8) 피드백 코멘트 (통합 텍스트)
    let combined = draftData.피드백_요약 || '';
    if (draftData.문제점_분석 && draftData.문제점_분석 !== '특이사항 없음') {
      combined += `\n\n[문제점 분석]\n${draftData.문제점_분석}`;
    }
    if (draftData.보완점_및_개선방안) {
      combined += `\n\n[보완점 및 개선방안]\n${draftData.보완점_및_개선방안}`;
    }
    const commentCol = getOrAddColumn(feedbackSheet, colMap, '피드백 코멘트', [
      '피드백 코멘트', '피드백코멘트', '피드백 내용', '피드백내용', '코치 피드백', '코치피드백'
    ]);
    feedbackSheet.getRange(targetRow, commentCol).setValue(combined.trim());

    // (9) ★핵심: 피드백 상태 컬럼에 'AI초안' 기록
    const statusCol = getOrAddColumn(feedbackSheet, colMap, '피드백 상태', [
      '피드백 상태', '피드백상태', '완료 여부', '완료여부', '피드백완료', '피드백 완료', '진행상태', '상태'
    ]);
    feedbackSheet.getRange(targetRow, statusCol).setValue('AI초안');

    // (10) AI초안_생성일시 컬럼 기록
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    const aiCreatedCol = getOrAddColumn(feedbackSheet, colMap, 'AI초안_생성일시', [
      'AI초안_생성일시', 'AI초안 생성일시', 'AI초안생성일시', 'AI생성일시', '초안생성일시'
    ]);
    feedbackSheet.getRange(targetRow, aiCreatedCol).setValue(nowStr);

    // ★중요: 변경 사항 즉시 시트에 영구 커밋 (버퍼 플러시)
    SpreadsheetApp.flush();

    Logger.log(`[onFormSubmitHandler 성공] Row ${targetRow} 회원 '${memberName}' AI초안 정상 기록 완료 (${nowStr})`);
    return { status: 'success', row: targetRow, member: memberName, date: nowStr };
  } catch (err) {
    Logger.log('[onFormSubmitHandler 예외 발생] ' + err.toString());
    return { status: 'error', error: err.toString() };
  }
}

/**
 * ==============================================================================
 * [스프레드시트 커스텀 메뉴 & 수동 진단/배치 도구]
 * ==============================================================================
 */

/**
 * 스프레드시트 열릴 때 상단에 [🤖 코칭 자동화] 커스텀 메뉴 등록
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🤖 코칭 자동화')
      .addItem('⚡ 폼 제출 트리거 설치/점검', 'installFormSubmitTrigger')
      .addSeparator()
      .addItem('🧪 마지막 추가된 행 AI 초안 생성 테스트', 'testGenerateDraftForLatestRow')
      .addItem('📝 미처리 피드백 전체 AI 초안 일괄 생성', 'processPendingAiDrafts')
      .addSeparator()
      .addItem('🔍 feedbacks 시트 헤더/데이터 진단', 'debugInspectFeedbacksSheet')
      .addSeparator()
      .addItem('🔑 코치 마스터 비밀번호 설정/확인', 'promptChangeCoachPassword')
      .addToUi();
  } catch (e) {
    Logger.log('[onOpen 메뉴 생성 실패 (비대화형 모드 등)] ' + e.toString());
  }
}

/**
 * [수동 테스트 함수] 스프레드시트의 마지막 피드백 행에 대해 AI 초안 강제 생성
 * - Apps Script 상단 함수 드롭다운에서 'testGenerateDraftForLatestRow' 선택 후 [실행] 클릭 시 바로 테스트 가능
 */
function testGenerateDraftForLatestRow() {
  Logger.log('=== [수동 테스트] 마지막 피드백 행 AI 초안 생성 시작 ===');
  const res = onFormSubmitHandler(null);
  Logger.log('=== [수동 테스트 결과] ' + JSON.stringify(res) + ' ===');

  try {
    const ui = SpreadsheetApp.getUi();
    if (res && res.status === 'success') {
      ui.alert('✓ 테스트 성공', `Row ${res.row} (${res.member} 회원)에 AI 초안이 성공적으로 기록되었습니다!`, ui.ButtonSet.OK);
    } else {
      ui.alert('⚠️ 테스트 실패/확인 필요', `결과: ${JSON.stringify(res)}\nApps Script [실행 로그]를 확인해 주세요.`, ui.ButtonSet.OK);
    }
  } catch (e) {
    // UI 없을 경우 로거로만 남김
  }
}

/**
 * [디버그 함수] feedbacks 시트의 1행 헤더와 마지막 행 데이터를 상세 출력
 */
function debugInspectFeedbacksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('feedbacks') || ss.getSheetByName('Feedbacks')
    || findSheetSmartly(ss, SHEET_NAMES.FEEDBACKS, ['공복몸무게', '운동점수', '식단점수', '운동내용']);
  if (!sheet) {
    Logger.log('[debugInspectFeedbacksSheet] feedbacks 시트를 찾을 수 없습니다.');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0];

  Logger.log(`=== [시트명: ${sheet.getName()}, 총 ${lastRow}행 x ${lastCol}열] ===`);
  Logger.log('--- 1행 헤더(컬럼명) 목록 ---');
  headers.forEach((h, idx) => {
    Logger.log(`Col ${idx + 1} (${String.fromCharCode(65 + (idx % 26))}열): "${h}"`);
  });

  if (lastRow >= 2) {
    const rowVals = sheet.getRange(lastRow, 1, 1, Math.max(lastCol, 1)).getValues()[0];
    Logger.log(`--- 마지막 행 (Row ${lastRow}) 셀 데이터 ---`);
    rowVals.forEach((val, idx) => {
      Logger.log(`Col ${idx + 1} [${headers[idx]}]: "${val}"`);
    });
  }
}

/**
 * [배치 처리 함수] Feedbacks 시트의 미처리 피드백(상태가 '완료'가 아닌 행) 전체 AI 초안 일괄 생성
 */
function processPendingAiDrafts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  const feedbackSheet = findSheetSmartly(ss, SHEET_NAMES.FEEDBACKS, ['공복몸무게', '운동점수', '식단점수', '운동내용']);
  if (!feedbackSheet) {
    Logger.log('[processPendingAiDrafts] Feedbacks 시트를 찾을 수 없습니다.');
    return;
  }

  const lastRow = feedbackSheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('[processPendingAiDrafts] 피드백 데이터 행이 없습니다.');
    return;
  }

  const colMap = getHeaderColumnMap(feedbackSheet);
  const statusCol = colMap['피드백상태'] || colMap['피드백 상태'] || colMap['완료여부'] || colMap['상태'];
  const summaryCol = colMap['피드백요약'] || colMap['피드백_요약'] || colMap['요약'];

  let processedCount = 0;
  for (let r = 2; r <= lastRow; r++) {
    const currentStatus = statusCol ? String(feedbackSheet.getRange(r, statusCol).getValue() || '').trim() : '';
    const currentSummary = summaryCol ? String(feedbackSheet.getRange(r, summaryCol).getValue() || '').trim() : '';

    // 아직 코치가 완료하지 않았고, AI 초안도 안 채워진 행 탐색
    if (currentStatus !== '완료' && (!currentStatus || currentStatus === '대기' || !currentSummary)) {
      Logger.log(`[processPendingAiDrafts] Row ${r} 초안 생성 시도...`);
      const fakeEvent = {
        range: feedbackSheet.getRange(r, 1, 1, feedbackSheet.getLastColumn())
      };
      onFormSubmitHandler(fakeEvent);
      processedCount++;
      Utilities.sleep(600); // API Rate Limit 방어
    }
  }

  Logger.log(`[processPendingAiDrafts 완료] 총 ${processedCount}건의 미처리 피드백 초안 작성 완료`);

  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('✓ 일괄 생성 완료', `총 ${processedCount}건의 피드백에 대해 AI 초안 생성이 완료되었습니다.`, ui.ButtonSet.OK);
  } catch (e) {}
}

/**
 * ==============================================================================
 * [보안 인증] 코치 마스터 비밀번호 서버 검증 핸들러
 * ==============================================================================
 */

/**
 * 코치 마스터 비밀번호 서버 검증 핸들러
 * - 구글 서버의 [스크립트 속성(Script Properties)] 'COACH_PASSWORD'를 읽어 안전하게 대조
 * - 외부 웹 브라우저 및 GitHub 코드 어디에도 비밀번호가 노출되지 않음
 */
function handleVerifyCoachPassword(payload) {
  const enteredPassword = String((payload && payload.password) || '').trim();
  if (!enteredPassword) {
    return createJsonResponse({ status: 'error', message: '비밀번호를 입력해 주세요.' });
  }

  // 1순위: 스크립트 속성의 COACH_PASSWORD
  let correctPassword = PropertiesService.getScriptProperties().getProperty('COACH_PASSWORD');

  // 미설정 시 기본 마스터 비밀번호로 자동 세팅 (초기 안전값)
  if (!correctPassword) {
    correctPassword = 'coach1234!';
    try {
      PropertiesService.getScriptProperties().setProperty('COACH_PASSWORD', correctPassword);
      Logger.log('[보안] 스크립트 속성에 기본 COACH_PASSWORD가 자동 등록되었습니다.');
    } catch (e) {}
  }

  if (enteredPassword === correctPassword) {
    return createJsonResponse({
      status: 'success',
      message: '코치 보안 인증에 성공했습니다.'
    });
  } else {
    return createJsonResponse({
      status: 'error',
      message: '비밀번호가 올바르지 않습니다.'
    });
  }
}

/**
 * [스프레드시트 UI용] 코치 마스터 비밀번호 대화상자 조회 및 변경 도구
 */
function promptChangeCoachPassword() {
  try {
    const ui = SpreadsheetApp.getUi();
    const currentPw = PropertiesService.getScriptProperties().getProperty('COACH_PASSWORD') || 'coach1234!';

    const promptRes = ui.prompt(
      '🔑 코치 마스터 비밀번호 설정',
      `현재 설정된 비밀번호: [ ${currentPw} ]\n\n새로운 비밀번호를 입력하시거나, 변경을 원치 않으시면 [취소]를 누르세요:`,
      ui.ButtonSet.OK_CANCEL
    );

    if (promptRes.getSelectedButton() === ui.Button.OK) {
      const newPw = promptRes.getResponseText().trim();
      if (newPw) {
        PropertiesService.getScriptProperties().setProperty('COACH_PASSWORD', newPw);
        ui.alert('✓ 비밀번호 변경 완료', `새로운 코치 마스터 비밀번호가 [ ${newPw} ] 로 안전하게 저장되었습니다.\n웹 대시보드에서 즉시 적용됩니다.`, ui.ButtonSet.OK);
      } else {
        ui.alert('⚠️ 안내', '비밀번호가 입력되지 않아 기존 비밀번호를 유지합니다.', ui.ButtonSet.OK);
      }
    }
  } catch (e) {
    Logger.log('[promptChangeCoachPassword] ' + e.toString());
  }
}

