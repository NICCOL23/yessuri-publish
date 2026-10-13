// Presentation-only examples retain original IDs, fields and profile destinations.
const directoryPresentation = {
  'bada-repair': {name:'누수·수도 업체명', image:'ai-water-yessuri-v2.png', keywords:'수도꼭지 배관 누수 점검 싱크대'},
  'tile-studio': {name:'타일·문창호 업체명', image:'ai-tile-yessuri-v2.png', keywords:'욕실 타일 부분 보수 문 창호'},
  'bright-home': {name:'전기·조명 업체명', image:'ai-light-yessuri-v2.png', keywords:'전등 스위치 콘센트 에어컨'},
  'busan-home-repair': {name:'목공·페인트 업체명', image:'ai-wood.png', keywords:'가구 선반 목공 페인트 도장'},
  'clean-day': {name:'청소 업체명', image:'ai-clean.png', keywords:'입주 생활 청소 철거'},
  'local-it': {name:'컴퓨터·IT 업체명', image:'ai-it.png', keywords:'부팅 속도 컴퓨터 점검'}
};
// A provider's confirmed coverage flag is separate from their primary service areas.
// Missing coverage data defaults to false; broad coverage is never inferred from an address.
const servesAllBusan = expert => expert.serviceAllBusan === true || expert.serviceAreas?.includes('전체') === true;
const servesRegion = (expert, region) => servesAllBusan(expert) || window.YESSURI_SERVES_REGION(expert, region);
const directoryExperts = () => window.YESSURI_PUBLIC_EXPERTS().map(expert => ({...expert, ...directoryPresentation[expert.id]}));
const validRegions = window.YESSURI_REGIONS;
const validCategories = ['전체','누수·수도','하수구·변기','타일','페인트','목공','에어컨','청소','철거','전기·조명','문·창호','컴퓨터·IT'];
const queryInput = document.querySelector('#find-query');
const regionSelect = document.querySelector('#find-region');
const categorySelect = document.querySelector('#find-category');
const citywideCheckbox = document.querySelector('#find-citywide');
const sortSelect = document.querySelector('#find-sort');
const resultGrid = document.querySelector('#find-grid');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#find-empty');
const emptyHeading = document.querySelector('#find-empty-heading');
const compareStatus = document.querySelector('#compare-status');
const compareCount = document.querySelector('#compare-count');
const currentConditions = document.querySelector('#find-current-conditions');
const resultsLive = document.querySelector('#find-results-live');
let announcementTimer;
let appliedFilters;
const readFilters = () => ({query:queryInput.value.trim().replace(/\s+/g," "),region:regionSelect.value,category:categorySelect.value,sort:sortSelect.value,citywide:citywideCheckbox.checked});
let requestedCategories = [];
let requestedService = '';
const serviceNotice = document.createElement('p');
serviceNotice.className = 'demo-note';
serviceNotice.setAttribute('role','status');
document.querySelector('#find-filter-form').after(serviceNotice);
function updateCompareCount() { compareCount.textContent = String(window.YESSURI_COMPARE.selectedExperts().length); }
function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  requestedCategories = (params.get('categories') || '').split(',').filter(field => validCategories.includes(field) && field !== '전체');
  requestedService = (params.get('service') || '').slice(0, 80);
  queryInput.value = (params.get('q') || '').slice(0, 80);
  regionSelect.value = validRegions.includes(params.get('region')) ? params.get('region') : '전체';
  categorySelect.value = validCategories.includes(params.get('category')) ? params.get('category') : '전체';
  citywideCheckbox.checked = params.get('citywide') === '1';
  sortSelect.value = ['default', 'name', 'areas'].includes(params.get('sort')) ? params.get('sort') : 'default';
  appliedFilters = readFilters();
}

function updateUrl(mode = "push") {
  const url = new URL(window.location.href);
  for (const key of ['q', 'region', 'category', 'type', 'sort', 'categories', 'service', 'citywide']) url.searchParams.delete(key);
  if (requestedCategories.length) url.searchParams.set('categories', requestedCategories.join(','));
  if (requestedService) url.searchParams.set('service', requestedService);
  const query = appliedFilters.query;
  if (query) url.searchParams.set('q', query);
  if (appliedFilters.region !== '전체') url.searchParams.set('region', appliedFilters.region);
  if (appliedFilters.category !== '전체') url.searchParams.set('category', appliedFilters.category);
  if (appliedFilters.sort !== 'default') url.searchParams.set('sort', appliedFilters.sort);
  if (appliedFilters.citywide) url.searchParams.set('citywide', '1');
  try { if (url.href !== location.href) window.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url); } catch { /* 일부 로컬 파일 브라우저는 주소 변경을 제한합니다. */ }
}

loadFiltersFromUrl();

function renderDirectory(syncUrl = true) {
  const query = appliedFilters.query.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const matches = directoryExperts().filter(expert =>
    servesRegion(expert, appliedFilters.region) &&
    (!appliedFilters.citywide || servesAllBusan(expert)) &&
    (requestedCategories.length ? requestedCategories.some(field => expert.fields.includes(field)) : (appliedFilters.category === '전체' || expert.fields.includes(appliedFilters.category))) &&
    (!query || query.split(' ').every(term => [expert.name, expert.keywords || '', ...expert.fields].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR').includes(term)))
  );
  if (appliedFilters.sort === 'name') {
    matches.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } else if (appliedFilters.sort === 'areas') {
    matches.sort((a, b) => (b.serviceAreas?.length || 0) - (a.serviceAreas?.length || 0));
  }
  serviceNotice.hidden = !requestedService;
  serviceNotice.textContent = requestedService ? `선택한 수리: ${requestedService}. 세부 작업 가능 여부는 전문가에게 확인해 주세요. 상위 분야 기준으로 검색합니다.` : '';
  resultGrid.replaceChildren();
  resultCount.textContent = String(matches.length);
  emptyState.hidden = matches.length !== 0;
  if (!matches.length) {
    const hasRegionExperts = directoryExperts().some(expert => servesRegion(expert, appliedFilters.region));
    emptyHeading.textContent = appliedFilters.citywide
      ? '조건에 맞는 부산 전 지역 출장 전문가가 없습니다'
      : hasRegionExperts
      ? '조건에 맞는 예시 프로필이 없습니다'
      : '해당 지역의 예시 프로필이 없습니다';
  }
  const regionName = appliedFilters.region === '전체' ? '부산 전체' : appliedFilters.region;
  const sortName = sortSelect.selectedOptions[0].textContent;
  const categoryName = requestedCategories.length ? requestedCategories.join(' · ') : (appliedFilters.category === '전체' ? '전체 분야' : appliedFilters.category);
  currentConditions.textContent = `선택 조건: ${regionName} · ${categoryName}${query ? ` · 검색: ${appliedFilters.query}` : ''}${appliedFilters.citywide ? ' · 부산 전 지역 출장 가능' : ''} · 정렬: ${sortName}`;
  clearTimeout(announcementTimer);
  announcementTimer = window.setTimeout(() => {
    resultsLive.textContent = matches.length
      ? `${regionName}, ${sortName}. 예시 프로필 ${matches.length}개 검색됨.`
      : `${regionName}, ${sortName}. ${emptyHeading.textContent}`;
  }, 250);
  matches.forEach(expert => {
    const card = document.createElement('article');
    card.className = 'find-card';
    const profileLink = document.createElement('a');
    profileLink.className = 'find-card-link';
    profileLink.href = `expert.html?id=${encodeURIComponent(expert.id)}`;
    const image = document.createElement('img');
    image.src = `assets/images/${expert.image}`;
    image.alt = expert.imageAlt;
    image.loading = 'lazy';
    image.width = 1448;
    image.height = 1086;
    const body = document.createElement('span');
    body.className = 'find-card-body';
    const kicker = document.createElement('span');
    kicker.className = 'find-card-kicker';
    kicker.textContent = `주요 출장 지역: ${window.YESSURI_AREAS_LABEL(expert)} (예시)`;
    const name = document.createElement('strong');
    name.className = 'find-card-name';
    name.textContent = expert.name;
    const fields = document.createElement('span');
    fields.className = 'find-card-fields';
    expert.fields.forEach(field => {
      const tag = document.createElement('span');
      tag.textContent = field;
      fields.append(tag);
    });
    const meta = document.createElement('span');
    meta.className = 'find-card-meta';
    meta.textContent = '출장·진단비: 상담 시 확인';
    body.append(kicker, name, fields, meta);
    if (servesAllBusan(expert)) {
      const coverage = document.createElement('span');
      coverage.className = 'find-card-coverage';
      coverage.textContent = '부산 전 지역 출장 가능';
      body.insertBefore(coverage, meta);
    }
    const action = document.createElement('span');
    action.className = 'find-card-action';
    action.innerHTML = '프로필 예시 보기 <span aria-hidden="true">→</span>';
    const photo = document.createElement('span');
    photo.className = 'directory-photo';
    const photoLabel = document.createElement('span');
    photoLabel.className = 'directory-photo-label';
    photoLabel.textContent = '예시 사진';
    photo.append(image, photoLabel);
    profileLink.append(photo, body, action);
    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'favorite-button find-favorite';
    window.YESSURI_FAVORITES.bindButton(favoriteButton, expert.id);
    const compareButton = document.createElement('button');
    compareButton.type = 'button';
    compareButton.className = 'compare-button';
    window.YESSURI_COMPARE.bindButton(compareButton, expert.id, compareStatus);
    const controls = document.createElement('div');
    controls.className = 'find-card-controls';
    controls.append(favoriteButton, compareButton);
    card.append(profileLink, controls);
    resultGrid.append(card);
  });
  if (syncUrl) updateUrl();
}

function resetFilters() {
  requestedCategories = []; requestedService = '';
  queryInput.value = '';
  regionSelect.value = '전체';
  categorySelect.value = '전체';
  citywideCheckbox.checked = false;
  sortSelect.value = 'default';
  appliedFilters = readFilters();
  renderDirectory();
}

document.querySelector('#find-filter-form').addEventListener('submit', event => {
  event.preventDefault();
  if (categorySelect.value !== appliedFilters.category) { requestedCategories = []; requestedService = ''; }
  appliedFilters = readFilters();
  renderDirectory();
  document.querySelector('.find-results-heading').scrollIntoView({behavior:'smooth',block:'start'});
});
sortSelect.addEventListener('change', () => { appliedFilters.sort = sortSelect.value; renderDirectory(); });
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#empty-reset').addEventListener('click', resetFilters);
window.addEventListener('popstate', () => { loadFiltersFromUrl(); renderDirectory(false); });
window.addEventListener('yessuri:compare-changed', updateCompareCount);
window.addEventListener('storage', updateCompareCount);
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => {
  const toast = document.querySelector('#toast');
  toast.textContent = button.dataset.toast;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3500);
}));
renderDirectory(false);
updateUrl("replace");
updateCompareCount();
