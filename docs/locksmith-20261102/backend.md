# 열쇠·도어락 분야 서버/DB 검토

담당: locksmith_backend. 2026-11-02.

## 필요한 변경

- `public.board_questions.group_id`의 기존 CHECK에는 19개 수리 분야와 legacy 6개 값만 있다.
- 신규 마이그레이션 `supabase/migrations/202611020001_locksmith_board_field.sql`은 기존 25개 허용값을 모두 유지하고 `열쇠·도어락` 한 값만 추가한다.
- 기존 migration은 수정하지 않았다. 신규 SQL은 한 트랜잭션에서 같은 제약 이름을 재생성하며, 행·함수·RLS·권한·기존 업체 데이터는 변경하지 않는다.
- board API는 `field-rules.mjs`가 `fields.json`과 `catalog.json`을 import한다. frontend 담당이 공통 소스로 생성한 두 JSON을 포함하여 `board-api`를 재배포해야 한다. `index.ts` 하드코딩 수정은 불필요하다.

## 변경이 필요 없는 부분

- `technician-api/index.ts`의 신청 전문 분야는 1~2000자 문자열 검사다. 지정된 19개 값만 허용하는 검사는 없다.
- `technician-api/public-profile.ts`의 공개 분야는 1~30개 문자열 배열, 각 항목 100자 이내 검사다. `열쇠·도어락`을 허용한다.
- `public_experts.fields`는 text[]이며 19개 허용값 제한이 없다. 공개 분야 검색도 배열 값으로 처리한다.
- 그러므로 technician API/공개 프로필 함수/기존 신청 데이터에 변경을 도입하지 않았다.

## 검증 방법과 범위

- `tools/test-locksmith-migration.cjs`는 로컬 PG에서 매 실행마다 새 `yessuri_locksmith_verify_<timestamp>_<random>` DB만 생성한다. 기존 Mercur/검증 DB나 운영 Supabase는 쓰지 않는다.
- 기존 CHECK와 25개 기존 행을 만든 뒤 새 migration을 실행하여 기존 행 보존·새 분야 저장/조회·임의값 차단을 검증한다.
- 종료 시 이번 실행이 직접 만든 정확한 검증 DB만 정리한다. 연결 주소/원본 DB 이름을 먼저 검사한다.
- 전체 운영 스키마 복제 검증이 아닌, 실제 제약 확장 SQL의 분리 환경 검증이다. 운영 반영 여부는 통합 담당의 배포 결과와 별개다.
- 구문 검사와 Root 실행 결과 `migration-results.json`을 직접 확인했다. 실제 로컬 분리 DB 검사 7개 PASS, 실패 0개다. `production_access:false`이며 운영 반영 검증과 구분한다.

## 배포 순서

1. 운영 DB의 현재 제약이 기존25값과 일치하는지 읽기 확인.
2. 새 migration 적용. 허용값 확장만 먼저 반영하면 구버전 API/화면과 호환된다.
3. 공통 정의에서 생성된 `fields.json`/`catalog.json`을 포함한 board-api 배포.
4. 새 분야를 선택하게 하는 공개 화면 배포.
5. 기존 질문 수/값 보존과 새 분야 경로를 확인. 운영에 가짜 실제 업체를 만들지 않는다.

## 롤백

화면/함수 코드만 이전 버전으로 되돌릴 수 있다. 추가 허용값은 남겨두는 것이 새 질문 데이터 보존에 안전하다. 원래 CHECK로 되돌리기 전에 새 분야의 질문이 없는지 확인해야 하며, 새 질문을 삭제하거나 다른 분야로 강제 변경하지 않는다.

## 권한 확인

로컬 PATH에서 Supabase CLI를 찾지 못했고 `supabase/.temp`에는 `cli-latest`만 있었다. 링크된 원격 프로젝트나 배포 인증은 확인되지 않았다. 통합 담당이 원격 권한을 확인하고 실제 배포를 수행한다. 이 담당은 외부 쓰기/배포를 하지 않았다.

THREAD_DONE: locksmith_backend
