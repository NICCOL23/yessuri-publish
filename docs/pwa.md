# 예스수리 설치형 웹앱

- 공통 헤더의 앱 설치 버튼: standalone 실행 시 숨김. 지원 브라우저의 beforeinstallprompt가 있으면 사용자 클릭으로 설치, 없으면 install.html 안내.
- 기존 192/512px 로고 아이콘 및 180px Apple touch icon 사용. 시작 index.html, standalone. 새 권한·로그인·알림 없음.
- SW는 오프라인 안내와 공개 아이콘 2개만 캐시. HTML은 network-only/no-store; 연결 실패 시 정적 안내. POST·API·하위 리소스 요청은 가로채지 않음. 신청 데이터/재전송 큐 없음.
- SW 업데이트는 updateViaCache:none 및 update(), skipWaiting/자동 reload 없음. 기존 창을 모두 닫은 뒤 다시 실행. 서비스 워커 변경 시 CACHE 버전 증가. 삭제는 yessuri-pwa- 접두사의 구버전에 한정.
- Chrome Android / Chrome·Edge PC: 브라우저 설치 메뉴 또는 지원 시 설치 프롬프트. Safari iPhone: 공유 → 홈 화면에 추가 (보이면 웹 앱으로 열기). 브라우저마다 UI 상이.
- 검증: node tools/test-pwa.cjs (8 navigation cases, POST/API/static bypass, cache allowlist, old-cache cleanup, manifest files, all shared headers). 로컬 브라우저 380px 폭과 실제 active SW/cache 3건 확인. 실제 Android/iPhone 홈 화면 설치 및 OS별 standalone, 브라우저 네이티브 설치 대화상자는 미검증.
- 기존 신청서/조회/관리자 데이터, 게시물 변경 없음.

공식 근거:
- https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=ko
- https://support.apple.com/ko-kr/guide/iphone/iphea86e5236/ios
- https://web.dev/learn/pwa/update

확인일: 2026-10-23
