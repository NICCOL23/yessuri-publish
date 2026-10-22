# 공통 상단 내비게이션

모든 헤더는 메인 디자인을 기준으로 `<yessuri-site-header>` 인스턴스를 사용합니다.

- 메뉴 문구·주소·하위 메뉴: `site-header.js` 상단 `navigation` 배열에서 한 번 수정합니다.
- 로고·구조·현재 메뉴 분류: 같은 파일의 컴포넌트 템플릿과 `group` 판정을 수정합니다.
- 폭·색상·글꼴·모바일 배치: `site-header.css`에서 수정합니다.
- 기존 페이지별 헤더 CSS는 Shadow DOM 내부에 영향을 주지 않습니다.
- 페이지 본문·푸터·운영 API는 헤더와 독립적입니다.

새 페이지에는 다음을 추가합니다. 경로는 프로젝트 루트 파일 기준입니다.

```html
<link rel="stylesheet" href="site-header.css?v=1">
<script src="site-header.js?v=1" defer></script>
<yessuri-site-header>
  <a href="index.html">YESSURI 예스수리 홈</a>
  <nav aria-label="주요 메뉴">
    <a href="find.html">전문가 찾기</a>
    <a href="guide.html">비용·이용안내</a>
    <a href="questions.html">수리 질문</a>
    <a href="register.html">기술자 모집·등록</a>
  </nav>
</yessuri-site-header>
```

요소 내부 HTML은 JavaScript를 사용하지 못할 때의 기본 링크입니다. 정상 실행 시 공통 템플릿이 표시됩니다. 메뉴 변경 시 기본 링크도 함께 검토합니다. 기존 `home-refresh.js`, `guide-subnav.js`, `board-navigation.js`를 이 컴포넌트와 중복 로드하지 않습니다.

현재 메뉴는 `aria-current`로 구분하며 하위 화면은 `location`을 사용합니다. 모바일 메뉴와 안내 하위 메뉴는 링크·버튼으로 구성하며 Escape, 바깥 클릭, 포커스 이탈로 닫힙니다. 메뉴 설정 변경 후 PC·모바일에서 링크와 키보드 동작을 확인합니다.

캐시 갱신이 필요하면 변경한 파일의 `v` 값을 페이지 참조 및 컴포넌트의 스타일 참조에서 함께 올립니다.
