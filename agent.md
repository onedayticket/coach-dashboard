# 4주 온라인 습관화 코칭 대시보드 - Agent Guidelines (`agent.md`)

이 문서는 본 프로젝트의 아키텍처, 코드베이스 구조, 핵심 비즈니스 로직, 구글 시트(GAS) 연동 원칙 및 AI 어시스턴트(Agent)가 코드를 수정하고 개선할 때 반드시 준수해야 하는 지침을 정의합니다.

---

## 1. 프로젝트 개요 (Overview)

- **프로젝트명**: 4주 온라인 운동/식단 습관화 코칭 통합 대시보드
- **목적**: 참여자(회원)의 사전 설문 인적 사항, 일자별 데일리 피드백(체중, 운동/식단 점수 및 수행 내용), 5대 코칭 지침서를 통합 관리하고, Google Gemini AI를 활용해 맞춤형 루틴 및 피드백을 도출하는 코치용 통합 웹 애플리케이션
- **운영 형태**: 빌드 단계가 필요 없는 경량 순수 웹 애플리케이션 (Zero-Build Vanilla Web App) + Google Apps Script(GAS) 기반 Serverless 백엔드

---

## 2. 기술 스택 및 아키텍처 (Tech Stack & Architecture)

| 구분 | 사용 기술 및 라이브러리 | 비고 |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (`style.css`) | 프레임워크/번들러 미사용 (직접 브라우저 구동 가능) |
| **UI Framework** | Bootstrap 5.3.2 (CSS & JS 번들 CDN), Bootstrap Icons 1.11.3 | 모달, 탭, 드롭다운, 반응형 그리드 |
| **Data Visualization** | Chart.js 4.4.1 (UMD CDN) | 3개의 독립 단위 꺾은선 그래프 (체중, 운동 점수, 식단 점수) |
| **Backend & DB** | Google Apps Script (GAS) Web App + Google Spreadsheet | `gas_backend.js`를 웹 앱으로 배포하여 RESTful API 제공 |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`, `gemini-1.5-pro` 등) | 브라우저 직통 호출(Direct Mode) & GAS 백엔드 호출 하이브리드 지원 |
| **Persistence** | `localStorage` (설정 및 캐시) + Google Sheets (영구 DB) | 오프라인 시 완벽한 Mock DB Fall-Safe 제공 |

---

## 3. 프로젝트 디렉토리 및 파일 구성

```text
anti_gravity_test/
├── index.html         # 대시보드 단일 페이지 뷰 (참여자 관리 + 지침서 관리 인라인 뷰, 모달 4종)
├── app.js             # 프론트엔드 비즈니스 로직, 상태 관리(AppState), Gemini/GAS 통신, Mock DB
├── gas_backend.js     # 구글 앱스 스크립트 웹앱 백엔드 (doGet, doPost, 시트 스마트 스캐너, AI 프롬프트)
├── style.css          # 커스텀 스타일시트 (다크 내비게이션, 카드 시스템, 반응형 레이아웃, 모달 디자인)
├── agent.md           # [본 문서] AI 에이전트 개발 및 협업 가이드라인
└── .gitignore         # 형상 관리 제외 설정
```

---

## 4. 핵심 데이터 모델 및 구글 시트 연동 원칙

구글 스프레드시트는 아래 3개 시트로 구성되며, 에이전트는 시트 조작 시 다음 원칙을 반드시 엄수해야 합니다.

### 4.1 3대 핵심 시트 (Sheets)
1. **Members (신청서/회원목록)**:
   - 컬럼 예시: `회원번호`, `이름`, `상태`(유효/휴면), `태그`(참여 코스), `나이`, `성별`, `키`, `체중`(시작 체중), `직업/근무시간`, `운동 경력`, `주당 운동 횟수`, `참여목적`, `운동 루틴 수정 제안 지침`, `식단 수정 제안 지침`, `현재 제안 운동 루틴`, `현재 제안 식단`
2. **Feedbacks (데일리 피드백 일지)**:
   - 컬럼 예시: `피드백번호`, `날짜`, `이름`(또는 회원번호), `공복몸무게`, `운동점수`, `식단점수`, `운동내용`, `식단내용`, `코치피드백`(피드백 요약), `피드백상태`, `문제점분석`, `개선방안`
3. **Guidelines (5대 코칭 지침서)**:
   - 5대 핵심 지침: `코칭 철학`, `운동 제안 지침서`, `식단 제안 지침서`, `피드백 지침서`, `동기부여 지침서`

### 4.2 구글 시트 연동의 불변 원칙 (Critical Rules)
- **절대 열(Column) 임의 삽입/삭제 금지**:
  - 기존 구글 시트의 열 구조를 파괴하지 않고, 1행의 헤더 명칭을 동적으로 검색하여 해당 열에만 정확히 Read/Write합니다.
- **관대한 헤더 정규화 (Flexible Header Matching)**:
  - 띄어쓰기(`\s+`)나 미세한 단어 차이("공복 몸무게" vs "공복몸무게", "운동제안지침" vs "운동 제안 지침")에 구애받지 않도록 공백 제거 정규화를 적용하여 매핑합니다.
- **회원 식별 키 (Key Matching)**:
  - `회원번호`를 최우선 식별자로 사용하며, 누락 시 `이름`을 보조 키로 매핑합니다.
- **Fail-Safe & 타임아웃 보장**:
  - GAS 웹앱의 콜드스타트(첫 로딩 10~25초)를 고려하여 프론트엔드 통신 타임아웃은 **35초(`GAS_TIMEOUT_MS = 35000`)** 이상 넉넉히 대기하며, 실패 시 로컬 `MOCK_DB` 모드로 부드럽게 Fallback합니다.

---

## 5. 프론트엔드 아키텍처 및 상태 관리 (`app.js`)

### 5.1 전역 상태 객체 (`AppState`)
```javascript
const AppState = {
  gasUrl: '',            // Google Apps Script 웹앱 배포 URL
  geminiApiKey: '',      // 사용자 입력 Google Gemini API Key
  modelPref: 'auto',     // 모델 엔진 선호도 ('auto' | 'flash' | 'pro')
  isOnline: false,       // 현재 구글 시트 연동 여부 (온라인 vs Mock 모드)
  members: [],           // 회원 목록 배열
  feedbacks: [],         // 전체 피드백 일지 배열
  guidelines: {},        // 5대 코칭 지침서 객체
  selectedMemberKey: '', // 현재 선택된 회원의 고유 키 (회원번호 또는 이름)
  filter: {
    status: 'all',       // 'all' | 'active' | 'inactive'
    tag: 'all',          // 프로그램 코스 태그
    search: ''           // 이름, 회원번호, 태그 검색어
  },
  charts: { weight: null, exercise: null, diet: null } // Chart.js 인스턴스
};
```

### 5.2 주요 기능 모듈
1. **듀얼 뷰(Dual View) 시스템**:
   - `switchDashboardView('members' | 'guidelines')`: 모달이 아닌 대시보드 자체의 메인 화면 뷰를 전환.
2. **사이드바 접기/펼치기 (`toggleSidebar`)**:
   - 좌측 패널을 화면 밖으로 슬라이드 토글하며, 상태를 `localStorage`(`coach_dash_sidebar_collapsed`)에 보존.
3. **태그 및 상태 즉시 동기화**:
   - 리스트 내 드롭다운에서 회원 상태(유효/휴면) 및 Git Tag 스타일 코스 변경 시 구글 시트(GAS)로 비동기 POST 및 실시간 로컬 UI 반영.
4. **상단 2종 분리 알림 시스템 (AI 초안 알림 & 미완료 피드백 알림)**:
   - **🤖 AI 초안 작성 알림**: 백그라운드 구글 폼 트리거 또는 AI가 초안 작성을 완료한 기록(`피드백 상태 === 'AI초안'`)을 감지하여 뱃지 및 드롭다운 알림.
   - **🔔 미완료 피드백 알림**: 코치가 아직 최종 저장을 완료하지 않은 피드백 항목 알림.
   - **개별 및 [모두 읽음]**: `localStorage`(`coach_dashboard_read_ai_drafts`, `coach_dashboard_read_pending_notis`)에 `이름_날짜` 키 목록으로 영구 보존.
5. **독립된 3개의 Chart.js 그래프**:
   - 공복 몸무게(kg), 운동 점수(5점 만점), 식단 점수(5점 만점)를 각각의 독립 Y축 캔버스로 분리 렌더링.
6. **피드백 모달 즉시 오픈 & 수동 AI 분석/재생성**:
   - 테이블에서 클릭 시 로딩 없이 0.1초 만에 즉시 오픈되며, 회원의 금일 원본 설문 제출 박스(접기/펼치기) 제공.
   - 모달 내 **`[🤖 피드백 하기 (AI 분석/재생성)]`** 버튼을 누를 때만 선택적으로 AI 호출. 코치가 **[피드백 코멘트 저장]** 버튼을 눌러야만 `피드백 상태`가 `'완료'`로 시트에 최종 저장됨.
7. **코치 전용 보안 로그인 & 3회 오류 30초 잠금 시스템 (`coachAuthModal`)**:
   - 외부망 웹 배포 시 비인가자의 대시보드 접근 차단 (`COACH_MASTER_PASSWORD`).
   - `localStorage`(`coach_authenticated`)로 인증 세션 관리 및 상단 내비바 `[🔒 화면 잠금]` 버튼 제공.
   - 3회 연속 오답 시 `coach_lock_until`을 기록하여 30초 동안 입력창/버튼을 잠그고 실시간 잔여 초 카운트다운을 표시하여 무차별 대입 공격(Brute-force) 원천 방어.

---

## 6. AI 코칭 생성 엔진 및 비즈니스 룰

### 6.1 하이브리드 AI 호출 아키텍처
1. **1순위 (초고속 직통 브라우저 모드)**:
   - 사용자가 Gemini API Key를 등록한 경우, 브라우저에서 `https://generativelanguage.googleapis.com`를 직접 호출하여 1~2초 내 초고속 생성.
2. **2순위 (GAS 백엔드 프록시 모드)**:
   - 직통 모드 실패 시 또는 백엔드 속성 키를 사용하는 경우 GAS의 `doPost` (`action: generate*`)를 통해 안전하게 서버 호출.
3. **3순위 (스마트 Mock 모드)**:
   - 네트워크 단절이나 API 키 미등록 시 사전 정의된 지능형 템플릿 알고리즘으로 시뮬레이션 응답 반환.

### 6.2 AI 생성 프롬프트 및 코칭 원칙
- **지침서 및 코치 지침 최우선성**:
  - AI는 5대 지침서(`Guidelines`)의 원칙과 코치가 입력한 `수정 제안 지침`을 1순위 제약 조건으로 반영합니다.
- **체중 추이 분석 및 명확한 근거(Reason) 제시**:
  - 데일리 피드백 생성 시 최근 3일 이상의 공복 체중 추이와 식단/운동 점수를 종합 분석하고, 왜 이 제안을 도출했는지 반드시 근거 문장을 함께 출력해야 합니다.
- **수정 제안 선택적 반영 원칙 (안전 장치)**:
  - 데일리 피드백 모달에서 AI가 도출한 "운동/식단 수정 제안"은 회원 DB에 자동으로 덮어쓰여지지 않습니다.
  - 코치가 확인 후 **[중단 지침칸에 복사]** 버튼을 눌러 옮긴 뒤, 코치가 **[저장]** 버튼을 직접 클릭해야만 DB에 최종 반영됩니다.

---

## 7. AI 에이전트(Agent) 작업 수칙 및 주의사항

본 프로젝트를 유지보수하거나 새 기능을 추가할 때 AI 에이전트는 다음 규칙을 반드시 준수해야 합니다.

1. **빌드 도구 도입 금지**:
   - `npm`, `webpack`, `vite`, `next.js` 등의 빌드 도구나 별도 번들러를 임의로 도입하지 마십시오. 순수 HTML, CSS, Vanilla JS 구조를 100% 유지합니다.
2. **기존 방어 로직 및 주석 보존**:
   - 예외 처리(`try-catch-finally`), 비동기 AbortController(`currentTaskAbortController`), 로딩 오버레이 해제(`hideLoadingOverlay`), 공백 제거 헬퍼 등 견고하게 작성된 방어 코드를 함부로 제거하지 마십시오.
3. **UI 일관성 및 UX 가이드라인**:
   - Bootstrap 5 유틸리티와 `style.css`의 디자인 토큰을 활용하고, 임의의 인라인 스타일 남발을 지양합니다.
   - 긴 로딩 작업 시 반드시 `showLoadingOverlay`를 호출하고, 완료/실패 시 `hideLoadingOverlay` 및 `showToast`로 사용자에게 상태를 명확히 안내합니다.
4. **GAS 백엔드와의 계약(Contract) 준수**:
   - `gas_backend.js`의 `doGet`, `doPost` 인터페이스 파라미터(`action`, `payload`, 반환 JSON 스키마 `{ status: 'success' | 'error', data, message }`)를 수정할 경우, `app.js`와 상호 호환성을 반드시 동시에 검증하십시오.
5. **오프라인 Mock 호환성 유지**:
   - 새로운 데이터 필드가 추가될 경우, `MOCK_DB.members`, `MOCK_DB.feedbacks`, `MOCK_DB.guidelines`에도 동일한 스키마의 기본값을 반드시 추가하여 시트 미연동 상태에서도 에러 없이 작동하도록 보장하십시오.
