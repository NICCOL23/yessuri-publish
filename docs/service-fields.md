# 수리 분야 관리

`data/service-fields.json`이 메인 카드, 전문가 검색, 수리 종류 선택, 사전 모집 분야 목록의 공통 원본입니다.

- `label`: 화면 이름
- `value`: 검색 및 기존 업체 데이터와 연결하는 값 (컴퓨터 분야는 기존 `컴퓨터·IT` 유지)
- `description`, `image`, `href`: 메인 카드 설명, 이미지, 목적지

추가·삭제·변경한 뒤 `node tools/build-service-fields.cjs`를 실행합니다. 실행 결과는 공통 컴포넌트 `service-fields.js`와 자바스크립트가 꺼져 있어도 표시되는 HTML 목록에 반영됩니다. 배포 시 변경된 스크립트의 캐시 버전도 올립니다.

작업별 연결은 `data/work-catalog.json`의 `expertCategory`를 수정하고 `node tools/build-work-catalog.cjs`를 실행합니다. 위 분야 검사 도구는 모든 작업의 연결 값도 검증합니다. 독립 분야가 없는 작업은 `전체`를 사용하며 전체 전문가 검색으로 연결합니다. 해당 업체의 실제 세부 작업 가능 여부는 별도로 확인합니다.

## 수리 분야 선택 화면

`service-field-picker.js` / `service-field-picker.css`는 `data-service-field-picker`가 있는 선택 상자만 개선합니다. 현재 적용 범위는 전문가 찾기의 수리 분야 한 곳입니다. 목록은 공통 select의 옵션에서 생성하고, 컴퓨터 분야만 선택 목록 맨 앞으로 올립니다(전체 분야 다음). 메인 카드 순서는 바꾸지 않습니다.

원래 select는 폼 값과 검색의 원본으로 유지합니다. URL 복원·조건 해제·초기화에 따른 값 변경도 선택 상자에 반영합니다. 2열, 글자 16px, 항목 최소 44px, 간격 4px, 안쪽 여백 16px이며 모바일의 긴 이름은 최소 68px 행 안에서 줄바꿈합니다. 화면에 맞춰 내부 스크롤을 제공합니다. 방향키·Home·End·Enter·Space·Escape 및 바깥 클릭으로 조작할 수 있습니다. 자바스크립트를 사용할 수 없으면 기존 select가 표시됩니다.

지역 선택도 같은 컴포넌트를 사용합니다. `data-service-field-picker="region"`으로 지역용 제목·항목 수를 표시하며, 기존 `regions.js`가 생성한 16개 구·군과 부산 전체를 순서대로 사용합니다. 수리 분야 순서에는 영향을 주지 않습니다.

## 메인 → 공통 분야 상세 → 전문가 찾기

모든 메인 수리 박스는 `service-detail.html?field=id`로 연결됩니다. 화면은 `service-detail.js`와 `service-detail.css` 한 벌로 생성됩니다. 별도 분야별 HTML을 만들지 않습니다.

- `id`: 영문 고유 주소 값. 기존 링크 유지를 위해 가급적 변경하지 않습니다.
- `detail.fieldIds`: 기존 작업 카탈로그의 분야 전체를 포함합니다.
- `detail.taskIds`: 별도로 추가할 작업 ID입니다.
- 위 두 목록 외에도 `expertCategory`가 해당 분야 `value`와 일치하는 작업을 자동 포함합니다. 중복 작업은 한 번만 표시합니다.
- `detail.links`: 기존 별도 안내 연결. `{label, href}` 또는 기존 컴퓨터 안내의 `{catalogService}`를 사용합니다.
- 상세 설명·제품 규격·비용 조건·작업 전후 확인 사항은 `data/work-catalog.json`에서 읽습니다. 동일 내용을 새로 복사해 관리하지 않습니다. 사진과 상담 준비 기능을 포함한 기존 작업 상세 안내도 연결합니다.

분야 추가 시 이 파일의 배열에 항목을 추가하고 빌더를 실행하면 메인 카드·공통 상세·검색·등록 분야가 함께 반영됩니다. 삭제는 해당 항목 제거와 기존 작업의 `expertCategory` 재지정 후 실행합니다. 빌더는 고유 ID, 상세 주소, 작업·분야·추가 안내 연결과 빈 상세 화면을 검사합니다. `service-detail.js`/CSS를 바꾸면 모든 분야에 함께 적용됩니다. 전문가 찾기는 해당 분야 값과 복귀 주소를 자동 전달합니다.
