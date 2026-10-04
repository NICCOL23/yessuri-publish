const categories = [
  ['누수·수도','◉'], ['하수구·변기','◌'], ['타일','▦'], ['페인트','▤'],
  ['목공','⌑'], ['에어컨','❄'], ['청소','✧'], ['철거','▧'],
  ['전기·조명','✳'], ['문·창호','▣'], ['컴퓨터·IT','⌘'], ['전체보기','＋']
];
const categoryImages = {
  '누수·수도':'expert-water.webp',
  '하수구·변기':'case-water.webp',
  '타일':'expert-tile.webp',
  '페인트':'expert-paintwood.webp',
  '목공':'expert-paintwood.webp',
  '에어컨':'category-aircon.webp',
  '청소':'expert-clean.webp',
  '철거':'category-demolition.webp',
  '전기·조명':'expert-light.webp',
  '문·창호':'category-door.webp',
  '컴퓨터·IT':'expert-it.webp'
};
const regions = window.YESSURI_REGIONS;
const experts = window.YESSURI_PUBLIC_EXPERTS;
const categoryGrid = document.querySelector('#category-grid');
const filterRow = document.querySelector('#region-filters');
const expertGrid = document.querySelector('#expert-grid');
const emptyState = document.querySelector('#expert-empty');
const heroRegion = document.querySelector('#hero-region');
const heroCategory = document.querySelector('#hero-category');
let selectedRegion = '전체';
let selectedCategory = '전체';

categories.forEach(([name, icon]) => {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'category-card';
  const visual = categoryImages[name]
    ? `<img src="assets/images/${categoryImages[name]}" alt="" loading="lazy" width="1448" height="1086">`
    : icon;
  button.innerHTML = `<span class="category-icon" aria-hidden="true">${visual}</span><span>${name}</span>`;
  button.addEventListener('click', () => {
    const query = new URLSearchParams({region:heroRegion.value, category:name === '전체보기' ? '전체' : name});
    window.location.href = `find.html?${query.toString()}`;
  });
  categoryGrid.append(button);
});

function renderRegions() {
  filterRow.replaceChildren();
  let activeButton;
  regions.forEach(region => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `filter-chip${selectedRegion === region ? ' active' : ''}`;
    button.textContent = region === '전체' ? '부산 전체' : region;
    button.setAttribute('aria-pressed', String(selectedRegion === region));
    button.addEventListener('click', () => { selectedRegion = region; heroRegion.value = region; renderRegions(); renderExperts(); });
    filterRow.append(button);
    if (selectedRegion === region) activeButton = button;
  });
  if (selectedRegion !== '전체' && activeButton) {
    filterRow.scrollLeft = activeButton.offsetLeft - filterRow.offsetLeft - (filterRow.clientWidth - activeButton.clientWidth) / 2;
  }
}
function renderExperts() {
  const shown = experts().filter(person => window.YESSURI_SERVES_REGION(person, selectedRegion) && (selectedCategory === '전체' || person.fields.includes(selectedCategory)));
  expertGrid.replaceChildren(); emptyState.hidden = shown.length > 0;
  if (!shown.length) {
    const hasRegionExperts = experts().some(person => window.YESSURI_SERVES_REGION(person, selectedRegion));
    emptyState.textContent = hasRegionExperts
      ? '선택한 조건에 맞는 예시 프로필이 없습니다. 다른 지역이나 수리 종류를 선택해 주세요.'
      : '해당 지역의 예시 프로필이 없습니다. 다른 지역을 선택해 주세요.';
  }
  shown.forEach(person => {
    const phoneHref = window.YESSURI_PHONE_HREF(person);
    const card = document.createElement('article'); card.className = 'expert-card';
    card.innerHTML = `<div class="expert-main"><div class="expert-top"><div class="avatar" aria-hidden="true">${person.icon}</div><div><div class="expert-name">${person.name}</div><div class="expert-region">예시 출동 가능 지역: 부산 ${window.YESSURI_AREAS_LABEL(person)} · ${person.profileType} 예시</div></div></div><div class="expert-tags">${person.fields.map(field => `<span>${field}</span>`).join('')}</div><div class="expert-meta"><span>${person.career}</span><span>평점·후기 등록 예정</span></div></div><div class="expert-photo"><img src="assets/images/${person.image}" alt="${person.imageAlt}" loading="lazy" width="1448" height="1086"></div><div class="expert-actions"><a href="expert.html?id=${encodeURIComponent(person.id)}" class="outline-button profile-button">프로필 보기</a><button type="button" class="solid-button call-button">${phoneHref ? '전화 연결하기' : '전화 연결 준비 중'}</button></div>`;
    card.querySelector('.call-button').addEventListener('click', () => {
      if (phoneHref) window.location.href = phoneHref;
      else showToast('예시 프로필에는 실제 전화번호가 연결되지 않았습니다.');
    });
    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'favorite-button';
    window.YESSURI_FAVORITES.bindButton(favoriteButton, person.id);
    card.querySelector('.expert-main').append(favoriteButton);
    expertGrid.append(card);
  });
}
renderRegions(); renderExperts();

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
