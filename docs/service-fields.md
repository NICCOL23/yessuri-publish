# 수리 분야 관리

`data/service-fields.json`이 메인 카드, 전문가 검색, 수리 종류 선택, 사전 모집 분야 목록의 공통 원본입니다.

- `label`: 화면 이름
- `value`: 검색 및 기존 업체 데이터와 연결하는 값 (컴퓨터 분야는 기존 `컴퓨터·IT` 유지)
- `description`, `image`, `href`: 메인 카드 설명, 이미지, 목적지

추가·삭제·변경한 뒤 `node tools/build-service-fields.cjs`를 실행합니다. 실행 결과는 공통 컴포넌트 `service-fields.js`와 자바스크립트가 꺼져 있어도 표시되는 HTML 목록에 반영됩니다. 배포 시 변경된 스크립트의 캐시 버전도 올립니다.

작업별 연결은 `data/work-catalog.json`의 `expertCategory`를 수정하고 `node tools/build-work-catalog.cjs`를 실행합니다. 위 분야 검사 도구는 모든 작업의 연결 값도 검증합니다. 독립 분야가 없는 작업은 `전체`를 사용하며 전체 전문가 검색으로 연결합니다. 해당 업체의 실제 세부 작업 가능 여부는 별도로 확인합니다.
