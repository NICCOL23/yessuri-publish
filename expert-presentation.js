/* One approved display mapping shared by search, saved and comparison. */
window.YESSURI_EXPERT_PRESENTATION={
  'bada-repair': {name:'누수·수도 업체명', image:'ai-water-yessuri-v2.png', keywords:'수도꼭지 배관 누수 점검 싱크대'},
  'tile-studio': {name:'타일·문창호 업체명', image:'ai-tile-yessuri-v2.png', keywords:'욕실 타일 부분 보수 문 창호'},
  'bright-home': {name:'전기·조명 업체명', image:'ai-light-yessuri-v2.png', keywords:'전등 스위치 콘센트 에어컨'},
  'busan-home-repair': {name:'목공·페인트 업체명', image:'ai-wood.png', keywords:'가구 선반 목공 페인트 도장'},
  'clean-day': {name:'청소 업체명', image:'ai-clean.png', keywords:'입주 생활 청소 철거'},
  'local-it': {name:'컴퓨터·IT 업체명', image:'ai-it.png', keywords:'부팅 속도 컴퓨터 점검'}
};
window.YESSURI_PRESENT_EXPERT=expert=>({...expert,...window.YESSURI_EXPERT_PRESENTATION[expert.id]});
