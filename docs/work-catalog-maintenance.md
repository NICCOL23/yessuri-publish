# 작업·이미지 데이터 관리

`data/work-catalog.json`이 편집 기준 데이터입니다. `work-guide-catalog.js`는 정적 사이트에서 바로 읽기 위한 생성 파일이며 직접 편집하지 않습니다. 수정 후 `node tools/build-work-catalog.cjs`를 실행합니다. 이전 `work-guide-data.js`, `work-guide-extra.js`는 원본 보존용으로 남기고 안내 페이지에서는 로드하지 않습니다.

## 관계와 ID

- groups: 큰 분류. fields.groupId로 참조.
- fields: 분야. tasks.fieldId로 참조. representativeArt는 기존 분야 선택 이미지용이며 작업 상세 이미지와 별개입니다.
- tasks: 기존 작업 ID 유지. 이름·표시 순서가 바뀌어도 ID를 바꾸지 않습니다. imageIds로 이미지를 연결합니다.
- images: 이미지 ID, 소유 작업 ID, 상대 파일명, 대체 텍스트, 설명, 크기, 형식, 해시, 제작·검토 기록.

작업 설명·제품 규격·비용 조건은 기존 데이터를 보존했습니다. contentUpdatedDate가 null인 경우 원래 작성일을 알 수 없음을 뜻합니다. 이미지의 시각 검토는 작업 대상과 명백한 그림 오류 확인이며 특정 제조사 구조, 시공법, 안전 성능 인증을 뜻하지 않습니다. 확인하지 않은 출처·날짜는 채우지 않습니다.

## 이미지

웹용 파일은 `assets/images/work-tasks/v1/`에 있습니다. 경로 접두사는 JSON의 assetBase 한곳에서 관리합니다. 경로를 옮길 때 task/image ID를 바꾸지 않습니다. 향후 CDN 전체 주소를 접두사로 사용할 수 있습니다.

생성 프롬프트는 `docs/work-images/prompts/`에, 고해상도 원본은 작업공간의 `review/task-image-production/originals/`에 보관합니다. 웹에는 최적화본만 게시합니다. 프롬프트 수정·재제작 시 제작 기록과 해시, 검토 상태를 갱신합니다. 생성 도구는 기본 내장 imagegen입니다.

## 데이터베이스로 옮길 때

groups/fields/tasks/images를 같은 ID의 테이블로 옮기고, tasks.imageIds는 task_images 관계 테이블로 옮길 수 있습니다. rows/before/after/photoPreparation는 순서를 보존한 JSON 또는 하위 테이블로 이전합니다. 기존 `?work=작업ID` URL을 유지하고 표시용 HTML/CSS는 데이터에 저장하지 않습니다. 이미지는 저장소에 두고 DB에는 파일 키와 메타데이터를 기록합니다.

현재 서버, DB, 관리자, 장기 저장, 개인정보 수집을 추가하지 않았습니다.

## 검토 자료

- 전체 작업·이미지: `docs/work-image-review.html`
- 연결표: `docs/work-image-mapping.csv`
- 변경 전 원본: 작업공간 `review-backups/task-images-20261016/`

복원은 백업의 guide.html, work-guide-v3.js, guide-work-panel.css를 되돌리면 됩니다. 기존 데이터·이미지는 삭제하지 않았습니다. 새 파일은 이전 페이지에서 참조하지 않으므로 남아 있어도 원본 작동에 영향을 주지 않습니다. 배포 복원은 해당 파일을 복원·검증한 새 커밋으로 게시합니다.
