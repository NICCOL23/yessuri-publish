# CCTV·이사 분야 추가

카드는 app.js의 homeServices에서 생성. 이사는 청소 다음, CCTV는 에어컨 다음. 9열2행(1101px 이상),6열3행(901~1100px), 이하 기존3열/320px2열. 원본 16카드 데이터 유지.

원본 카탈로그 data/work-catalog.json에 life 그룹의 cctv/moving 필드와 각4작업 추가. tools/build-work-catalog.cjs로110작업 생성. 기존102개 작업/모든원본 필드·이미지 레코드 유지. service-expansion.js는 신규2분야에만 준비/확인·포장범위·장비정보·상담문구 적용. 기존 가이드/패널 파일 변경 없음.

이미지: 내장 이미지 생성 도구로 CCTV장비와 이사차량·상자를 별도 제작. 각분야의4개작업에서 같은분야 참고이미지를 사용하며 실제 시공·제품사진이 아님을 표기. 프롬프트: white-background realistic3D miniature service illustration, camera/NVR/cable or moving truck/boxes/trolley, navy/teal neutral palette, no text/logos/UI.

자료 참고: https://www.miso.kr/moving https://www.s1.co.kr/cctv https://frontend-next.soomgo.com/prices/CCTV-%EC%84%A4%EC%B9%98
가격·보장·평점·업체정책은 전재하지 않음. 자체견적/예약폼 없음. 예시프로필·문의준비중 안내 유지. 에어컨 이전설치는 기존 aircon-work 안내에서 가능여부와 별도비용 협의하도록 연결.
