// 부산의 15개 구와 기장군. 모든 지역 선택 화면에서 이 목록을 함께 사용합니다.
window.YESSURI_REGIONS = Object.freeze([
  '전체', '강서구', '금정구', '남구', '동구', '동래구', '부산진구', '북구',
  '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구', '기장군'
]);

document.querySelectorAll('select[data-busan-regions]').forEach(select => {
  const placeholder = select.querySelector('option[value=""]');
  select.replaceChildren();
  if (placeholder) select.append(placeholder);
  window.YESSURI_REGIONS.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region === '전체' ? '부산 전체' : region;
    select.append(option);
  });
});
