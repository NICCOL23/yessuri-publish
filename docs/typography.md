# 예스수리 공통 글자 기준

## 관리 위치

- `site-type-tokens.css`: 글꼴 등록, 크기·행간·색상 변수. 문서와 공통 푸터가 함께 사용합니다.
- `site-typography.css`: 전체 페이지의 본문·제목·메뉴·입력창·게시판 배치 규칙.
- `site-footer.css`: Shadow DOM 내부 푸터에 공통 변수를 적용합니다.
- `typography.css`: 기존 화면의 구조·줄바꿈 규칙만 유지하며 중복 크기·굵기·행간·자간 선언은 제거했습니다.

## 기준

| 요소 | 기본 16px 환경의 크기 | 굵기 | 행간 |
|---|---:|---:|---:|
| 본문 | 16px | 400 | 1.7 |
| 보조 설명 | 14px | 400–500 | 1.6 |
| 메뉴·버튼·입력창 | 15px | 500–600 | 1.5 |
| H1 | PC 32px / 모바일 28px | 700 | 1.35 |
| H2 | PC 24px / 모바일 22px | 700 | 1.35 |
| H3 | 18px | 700 | 1.35 |
| 질문 제목 | 15px | 500 | 1.6 |
| 분야·지역·작성자·날짜 | 14px | 400 | 1.6 |
| 상태·답변 | 13px | 600 | 1.5 |

본문·버튼 자간은 0, 제목은 -0.02em입니다. 수치는 웹 표준의 의무 크기가 아닌 예스수리의 디자인 기준입니다. 루트는 100%이고 실제 크기는 rem으로 관리합니다. 히어로 제목은 별도 반응형 변수를 사용합니다.

## 글꼴

기존 사이트가 사용하던 Noto Sans KR을 유지했습니다. Google Fonts의 원본 가변 글꼴(Version 2.004, wght 100–900)을 WOFF2로 압축해 자체 호스팅하며 `font-display: swap`을 사용합니다. 한글 글리프는 제거하지 않았습니다.

- 원본: https://github.com/google/fonts/tree/main/ofl/notosanskr
- 라이선스: `assets/fonts/noto-sans-kr/OFL.txt` (SIL OFL 1.1)
- 파일: `assets/fonts/noto-sans-kr/NotoSansKR-variable.woff2`
- 폴백: Noto Sans KR → Malgun Gothic → system-ui → sans-serif

## 접근성 검증

명도 대비는 일반 글자 4.5:1 이상을 기준으로 관리합니다. 사용자 글자 간격 검증값은 기본 디자인에 그대로 적용하지 않습니다.

- WCAG 대비: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 200% 글자 확대: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- 사용자 간격 변경 시 내용 보존: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

글자 간격 검증은 사용자 스타일 확장 기능을 모사하는 테스트 환경에서 수행하며, 사이트의 CSP 정책을 완화하지 않습니다. 운영 게시글·신청 데이터는 검증을 위해 생성하거나 수정하지 않습니다.
