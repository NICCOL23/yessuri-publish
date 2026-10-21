# 전문가 카드 관리

`expert-card.js`의 create()가 메인과 검색에서 공통 카드 DOM을 만듭니다. `expert-card.css`는 두 목록에만 적용됩니다. 상세는 기존 expert.html?id=고유ID를 유지합니다.

실제 공개 프로필은 Supabase public.expert_profiles에서 관리합니다. public-experts.js가 GET RPC search_public_experts로 조건에 맞는 12건과 총원을 조회합니다. RLS는 approved + public_consent=true인 행만 허용하며 익명 쓰기는 금지합니다. 비공개 신청과 사진은 기존 technician_private와 private bucket에 그대로 보관됩니다. 공개 테이블은 신청 테이블을 참조하거나 자동 복사하지 않습니다. 현재 실제 공개 프로필 0건인 동안만 기존 정적 예시 6건을 별도 표시합니다.

## 정보 추가와 교체

Supabase 대시보드의 expert_profiles에 고유 id, name, fields 배열, service_areas 배열을 등록합니다. 사진과 소개를 확인하고 공개 동의를 받은 후 public_consent=true와 publication_status='approved'로 설정합니다. 미승인 레코드는 표시되지 않습니다. 기본키로 중복 ID를 막으며, 하나의 업체에 여러 fields를 기록합니다. 실제 프로필을 예시 표시 매핑이 덮어쓰지 않습니다. 공개 총원은 동의와 승인이 있는 실제 행만 셉니다. 기존 예시 6건은 data.js에 보존됩니다. 검증용 가상 인물을 실제 DB에 넣지 않습니다.

image는 assets/images 기준 파일명 또는 https URL/루트 경로를 사용합니다. image_alt는 사진 설명, image_type='card'는 명함 전체 표시, image_position='50% 30%'는 작업 사진 초점 위치입니다. 이미지가 실패하면 업체명 첫 글자를 표시합니다. 원본을 덮어쓰지 말고 새 파일명으로 교체합니다.

work_photos=[{"image":"파일명","imageAlt":"설명"}], business_card={"image":"명함파일","imageAlt":"업체 명함"}를 선택적으로 추가하면 프로필에 표시됩니다. 명함·연락처는 공개 동의 범위만 등록합니다. phone_public=true일 때만 phone에 공개할 번호를 넣습니다. 승인 프로필은 phone_public=false인 번호를 저장할 수 없게 제약합니다.

## 노출과 검색

메인은 최대 8건을 분야별로 고르게 선택하며 일 단위 순환합니다. 방문 도중 타이머로 바뀌지 않습니다. 현재 예시가 6건이므로 6건만 나옵니다. 8건을 만들기 위해 실제 데이터를 조작하지 않습니다. 검색은 12건씩 표시합니다. 분야·지역 즉시 필터, URL q/region/category/page, 기존 세션 상태 복귀, 관심 저장과 비교 기능을 유지합니다. PC 4열, 중간 3열, 태블릿 2열, 모바일 1열입니다. 모바일 페이지 이동은 이전 / 현재·전체 / 다음입니다.

57/100/200건은 review/expert-final-release-20261021/test.cjs의 브라우저 요청 가로채기로만 주입합니다. 운영 파일이나 서버에는 저장하지 않습니다. 테스트는 쓰기 요청을 차단합니다.
