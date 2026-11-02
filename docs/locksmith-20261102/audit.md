# 열쇠·도어락 추가 조사 보고서

조사 시점: 2026-11-02. 대상: rotation-deploy 운영 정적 소스. 코드와 운영 데이터는 변경하지 않았으며, 상품 시연몰/Mercur는 조사 대상에서 제외했다.

## 결론

공통 서비스 정의 1곳에 추가하면 메인·검색·등록의 상당 부분이 따라오지만, 수리 질문의 서버 허용 목록과 DB CHECK는 별도 반영이 필수다. 기존 19개 식별자와 기존 업체/신청/게시글을 수정하지 않고 추가할 수 있다. 권장 내부 안내 ID는 locksmith, 저장되는 전문 분야 값은 열쇠·도어락이다. doors(문·창호) 다음, aircon(에어컨) 앞에 배치한다.

## 사용처와 흐름

| 영역 | 원본/관련 파일 | 확인 사항 및 필요한 조치 |
|---|---|---|
| 공통 분야 | data/service-fields.json → tools/build-service-fields.cjs → service-fields.js | 기존 19개. value는 서버에 보내는 한국어 값, id는 안내 연결용 ASCII 값이다. 새 값·ID·이미지·guide href를 추가하고 생성기를 실행한다. |
| 메인 | index.html, app.js, 메인 CSS | app.js가 공통 items를 카드로 만든다. 기존 컴퓨터 카드 2칸 확장 규칙과 정적 HTML 폴백도 확인해 20개 10×2로 맞춘다. |
| 전문가 찾기 | find.html, find.js | 생성기가 select를 갱신하며 find.js 허용 값은 공통 values에서 읽는다. 신규 값 필터는 기존 업체 분야를 바꾸지 않고 동작한다. |
| 상담 요청 | request.html | repair-type 선택지를 같은 생성기가 갱신한다. |
| 기술자 신청 | technician-apply.html, technician-service-fields.js, technician-apply-form.js, technician.js | 공통 items의 다중선택. 기존 자유입력 분야를 보존한다. 도움말 19개 문구는 동적 개수로 바꿔야 한다. 신청 수정/재불러오기 경로도 확인한다. |
| 모집 안내 | technician-recruit.html | 생성기가 모집 분야 목록을 갱신한다. |
| 관리자 공개 프로필 편집 | technician-public-profile.js | 현재 전문 분야는 쉼표로 구분하는 자유입력란이다. 새 분야를 받는 데 서버 변경은 필요 없지만 공통 선택 양식 적용 요구는 별도 UI 연결이 필요하다. 기존 사용자 정의 분야를 지우지 않아야 한다. |
| 프로필·카드·관심·비교 | expert.js, expert-card.js 및 해당 소비 화면 | fields 배열을 표시하므로 고정 19개 enum을 추가할 필요가 없다. 기존 업체 정보는 그대로 두고 신규 분야를 가진 데이터의 표시를 검증한다. |
| 안내 페이지 | data/work-catalog.json → tools/build-work-catalog.cjs → work-guide-catalog.js; guide.html/work-guide-v3.js | 새 안내 field/task가 있어야 적절한 연결을 만든다. guide의 분류는 서비스 19개와 1:1이 아니다. 기존 task id lock은 doors/문·창호의 현관문·도어락이며 과거 참조 호환을 위해 유지하고 새 locksmith task ID를 추가하는 것이 안전하다. |
| 안내 리디렉션 | service-detail.html/service-detail.js | 공통 id로 href를 찾아 이동하므로 새 정의를 자동 인식한다. |
| 수리 질문 | board-fields.js, board-field-picker.js, board.js | questions/question-write/question/question-admin/questions-example/board-notice에서 공유. 새 분야에 작업 task가 최소 1개 있어야 build-board-fields가 통과한다. |
| 질문 서버 | supabase/functions/board-api/fields.json, catalog.json, field-rules.mjs, index.ts | 생성기가 공통 서비스+작업 카탈로그로 두 JSON을 생성한다. 서버 groups 허용 목록 및 작업-분야 관계에 쓰이므로 board-api 재배포 필수다. |
| 질문 DB | supabase/migrations/202610230001_board_fields.sql | board_questions_group_id_check는 기존 6개 legacy 값 +19개 한국어 값을 명시한다. 기존 값을 모두 포함하고 열쇠·도어락만 더한 새 마이그레이션이 필요하다. |

## 변경이 불필요한 서버 구조

- technician-api/index.ts의 신청 fields는 최대 2000자 문자열이며 분야 enum 검증이 없다. 새 분야 때문에 이 함수를 변경/재배포할 필요는 없다.
- technician-api/public-profile.ts의 공개 프로필 fields는 최대 30개, 각 문자열 최대 100자로 검증한다. 새 한국어 값을 허용한다.
- 202610210001_public_experts.sql에서 public_experts.fields는 text[]이고 검색 RPC는 p_category=any(fields) 또는 배열 겹침으로 검색한다. 19개 허용 목록이 없으므로 카테고리 추가를 위한 테이블/RPC 변경은 불필요하다.
- 기존 data.js의 예시 업체를 새 분야로 자동 변경할 필요가 없다. 부모로부터 별도 사용자 승인된 예시 3곳 추가는 구현 담당 범위다.

## 비활성/이전 파일

work-guide-data.js, work-guide-extra.js는 현재 guide.html이 로드하지 않으며 work-guide-catalog.js가 활성 소스다. technician-promo.js(19개 하드코딩), service-picker.js(별도 묶음 분야), register.js(미저장 시안)는 현재 HTML script 참조가 발견되지 않았다. 활성 경로로 오인해 불필요하게 광범위한 디자인 변경을 하지 않는다. docs/work-image-review.html 등 과거 문서의 19개 표시는 실행 카테고리 원본이 아니다.

## 배포 경로 및 권한 근거

- supabase/config.toml의 project_id=yessuri는 로컬 이름이며 원격 연결 완료의 증거가 아니다.
- 공개 브라우저 구성의 원격 프로젝트 ref는 buotlfllagjwxopnbeit다. 공개키/비밀키 값은 보고서에 기록하지 않았다.
- supabase/.temp에는 cli-latest만 보이며 project-ref 파일은 없다. PATH의 supabase 명령도 확인되지 않았다. 따라서 이 사본이 원격 CLI에 연결되어 있다고 확인할 수 없다. 계정/브라우저 또는 별도 CLI 인증 경로는 통합 담당이 확인해야 한다.
- 필요한 서버 작업은 신규 CHECK 마이그레이션 적용과 갱신된 board-api 배포다. 배포 권한이 확인되지 않으면 로컬 파일 준비를 운영 반영 완료로 보고하면 안 된다.
- 권장 순서: 새 DB CHECK(기존 값 모두 허용) → 새 board-api(기존 값 모두 허용) → 새 정적 프론트. 각 단계는 이전 화면과 호환된다. 롤백 때 새 분야 게시글이 생성되었다면 해당 값을 금지하는 옛 CHECK를 즉시 복원하지 않는다.

## 독립 검증 권장

공통 정의 20개/중복 없음/순서, 생성 산출물 일치, 모든 새 href 이미지 파일 존재, guide field/task 연결, board client/server 허용 목록 일치, SQL 기존 값 보존, 기존 lock 참조 보존을 정적으로 확인한다. 실제 등록 저장/재조회, 질문 새 분야 저장/검색, 관리자 편집, 10×2 및 모바일 넘침은 브라우저/시험 환경에서 확인해야 한다. 운영 테스트용 게시글/업체 생성은 별도 허용 없이 하지 않는다.

THREAD_DONE: locksmith_audit
