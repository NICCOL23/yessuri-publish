# 전문가 카드 관리

`expert-card.js`의 create()가 메인과 검색에서 공통 카드 DOM을 만듭니다. `expert-card.css`는 두 목록에만 적용됩니다. 상세는 기존 expert.html?id=고유ID를 유지합니다.

공개 데이터는 현재 data.js의 정적 목록이며, 비공개 신청과 사진은 Supabase technician_private 및 private bucket에 따로 보관됩니다. 이 변경은 신청 DB를 조회하거나 수정하지 않습니다. public API나 공개 프로필 DB는 아직 없습니다. 현재는 공개된 정적 목록을 브라우저에서 필터링하고 12건씩 렌더링합니다. 서버에서 조건별 12건 조회하는 것은 이번 정적 사이트 배포에 포함되지 않습니다. 이를 구현하려면 공개 동의를 받은 정보만 저장하는 별도 공개 저장소와 읽기 API, Supabase 배포 권한이 필요합니다. 비공개 신청 테이블에 공개 읽기 권한을 부여하면 안 됩니다.

## 정보 추가와 교체

data.js에 고유 id, name, fields 배열, serviceAreas 배열, publicationStatus:'approved', isExample:false인 공개 동의 프로필을 추가합니다. 미승인 레코드는 표시되지 않습니다. 같은 id는 하나만 표시합니다. 하나의 업체에 여러 fields를 기록합니다. 실제 프로필을 예시 표시 매핑이 덮어쓰지 않습니다. 공개 총원은 isExample:false인 승인 프로필만 셉니다. 기존 예시 6건은 보존됩니다.

image는 assets/images 기준 파일명 또는 https URL/루트 경로를 사용합니다. imageAlt는 사진 설명, imageType:'card'는 명함 전체 표시, imagePosition:'50% 30%'는 작업 사진 초점 위치입니다. 이미지가 실패하면 업체명 첫 글자를 표시합니다. 원본을 덮어쓰지 말고 새 파일명으로 교체합니다.

workPhotos:[{image:'파일명',imageAlt:'설명'}], businessCard:{image:'명함파일',imageAlt:'업체 명함'}를 선택적으로 추가하면 프로필에 표시됩니다. 명함·연락처는 공개 동의 범위만 등록합니다. phonePublic와 phone의 기존 전화 공개 조건을 유지합니다.

## 노출과 검색

메인은 최대 8건을 분야별로 고르게 선택하며 일 단위 순환합니다. 방문 도중 타이머로 바뀌지 않습니다. 현재 예시가 6건이므로 6건만 나옵니다. 8건을 만들기 위해 실제 데이터를 조작하지 않습니다. 검색은 12건씩 표시합니다. 분야·지역 즉시 필터, URL q/region/category/page, 기존 세션 상태 복귀, 관심 저장과 비교 기능을 유지합니다. PC 4열, 중간 3열, 태블릿 2열, 모바일 1열입니다. 모바일 페이지 이동은 이전 / 현재·전체 / 다음입니다.

57/100/200건은 review/expert-final-release-20261021/test.cjs의 브라우저 요청 가로채기로만 주입합니다. 운영 파일이나 서버에는 저장하지 않습니다. 테스트는 쓰기 요청을 차단합니다.
