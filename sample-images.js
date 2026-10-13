// Change only this mapping when authentic expert photos become available.
const samplePhotos={
 'bada-repair':['ai-water-yessuri-v2.png','한국 아파트 싱크대 배관 점검 장면 — AI 생성 예시'],
 'tile-studio':['ai-tile-yessuri-v2.png','욕실 타일 시공 장면 — AI 생성 예시'],
 'bright-home':['ai-light-yessuri-v2.png','아파트 조명 설치 장면 — AI 생성 예시'],
 'busan-home-repair':['ai-wood.png','아파트 목공 작업 장면 — AI 생성 예시'],
 'clean-day':['ai-clean.png','아파트 청소 작업 장면 — AI 생성 예시'],
 'local-it':['ai-it.png','가정용 컴퓨터 점검 장면 — AI 생성 예시']};
window.YESSURI_EXPERTS.forEach(p=>{const photo=samplePhotos[p.id];if(photo){p.image=photo[0];p.imageAlt=photo[1]}});
