const directoryExperts = window.YESSURI_PUBLIC_EXPERTS;
const validRegions = window.YESSURI_REGIONS;
const validCategories = ['전체','누수·수도','하수구·변기','타일','페인트','목공','에어컨','청소','철거','전기·조명','문·창호','컴퓨터·IT'];
const validTypes = ['전체','개인 기술자 유형','사업자·업체 유형'];
const queryInput = document.querySelector('#find-query');
const regionSelect = document.querySelector('#find-region');
const categorySelect = document.querySelector('#find-category');
const typeSelect = document.querySelector('#find-type');
const sortSelect = document.querySelector('#find-sort');
const regionChips = document.querySelector('#find-region-chips');
const resultGrid = document.querySelector('#find-grid');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#find-empty');
const emptyHeading = document.querySelector('#find-empty-heading');
const compareStatus = document.querySelector('#compare-status');
const compareCount = document.querySelector('#compare-count');
const currentConditions = document.querySelector('#find-current-conditions');
const resultsLive = document.querySelector('#find-results-live');
let announcementTimer;
function updateCompareCount() { compareCount.textContent = String(window.YESSURI_COMPARE.selectedExperts().length); }
function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  queryInput.value = (params.get('q') || '').slice(0, 80);
  regionSelect.value = validRegions.includes(params.get('region')) ? params.get('region') : '전체';
  categorySelect.value = validCategories.includes(params.get('category')) ? params.get('category') : '전체';
  typeSelect.value = validTypes.includes(params.get('type')) ? params.get('type') : '전체';
  sortSelect.value = ['default', 'name', 'areas'].includes(params.get('sort')) ? params.get('sort') : 'default';
}

function updateUrl() {
  const url = new URL(window.location.href);
  for (const key of ['q', 'region', 'category', 'type', 'sort']) url.searchParams.delete(key);
  const query = queryInput.value.trim().replace(/\s+/g, ' ');
  if (query) url.searchParams.set('q', query);
  if (regionSelect.value !== '전체') url.searchParams.set('region', regionSelect.value);
  if (categorySelect.value !== '전체') url.searchParams.set('category', categorySelect.value);
  if (typeSelect.value !== '전체') url.searchParams.set('type', typeSelect.value);
  if (sortSelect.value !== 'default') url.searchParams.set('sort', sortSelect.value);
  try { window.history.replaceState(null, '', url); } catch { /* 일부 로컬 파일 브라우저는 주소 변경을 제한합니다. */ }
}

loadFiltersFromUrl();

function renderChips(focusSelected = false) {
  regionChips.replaceChildren();
  let activeChip;
  validRegions.forEach(region => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = region === '전체' ? '부산 전체' : region;
    chip.setAttribute('aria-pressed', String(regionSelect.value === region));
    chip.addEventListener('click', () => {
      regionSelect.value = region;
      renderDirectory(true, true);
    });
    regionChips.append(chip);
    if (regionSelect.value === region) activeChip = chip;
  });
  if (regionSelect.value !== '전체' && activeChip) {
    regionChips.scrollLeft = activeChip.offsetLeft - regionChips.offsetLeft - (regionChips.clientWidth - activeChip.clientWidth) / 2;
  }
  if (focusSelected && activeChip) activeChip.focus();
}

function renderDirectory(syncUrl = true, focusRegion = false) {
  const query = queryInput.value.trim().replace(/\s+/g, ' ').normalize('NFKC').toLocaleLowerCase('ko-KR');
  const matches = directoryExperts().filter(expert =>
    window.YESSURI_SERVES_REGION(expert, regionSelect.value) &&
    (categorySelect.value === '전체' || expert.fields.includes(categorySelect.value)) &&
    (typeSelect.value === '전체' || expert.profileType === typeSelect.value) &&
    (!query || [expert.name, ...expert.fields].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR').includes(query))
  );
  if (sortSelect.value === 'name') {
    matches.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } else if (sortSelect.value === 'areas') {
    matches.sort((a, b) => (b.serviceAreas?.length || 0) - (a.serviceAreas?.length || 0));
  }
  resultGrid.replaceChildren();
  resultCount.textContent = String(matches.length);
  emptyState.hidden = matches.length !== 0;
  if (!matches.length) {
    const hasRegionExperts = directoryExperts().some(expert => window.YESSURI_SERVES_REGION(expert, regionSelect.value));
    emptyHeading.textContent = hasRegionExperts
      ? '조건에 맞는 예시 프로필이 없습니다'
      : '해당 지역의 예시 프로필이 없습니다';
  }
  const regionName = regionSelect.value === '전체' ? '부산 전체' : regionSelect.value;
  const sortName = sortSelect.selectedOptions[0].textContent;
  currentConditions.textContent = `현재 지역: ${regionName} · 정렬: ${sortName}`;
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
    kicker.textContent = `예시 출동 가능 지역: 부산 ${window.YESSURI_AREAS_LABEL(expert)} · ${expert.profileType} 예시`;
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
    meta.textContent = `${expert.career} · 평점·후기 등록 예정`;
    body.append(kicker, name, fields, meta);
    const action = document.createElement('span');
    action.className = 'find-card-action';
    action.innerHTML = '프로필 보기 <span aria-hidden="true">→</span>';
    profileLink.append(image, body, action);
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
  renderChips(focusRegion);
  if (syncUrl) updateUrl();
}

function resetFilters() {
  queryInput.value = '';
  regionSelect.value = '전체';
  categorySelect.value = '전체';
  typeSelect.value = '전체';
  sortSelect.value = 'default';
  renderDirectory();
}

document.querySelector('#find-filter-form').addEventListener('submit', event => {
  event.preventDefault();
  renderDirectory();
  document.querySelector('.find-results-heading').scrollIntoView({behavior:'smooth',block:'start'});
});
regionSelect.addEventListener('change', () => renderDirectory());
categorySelect.addEventListener('change', () => renderDirectory());
typeSelect.addEventListener('change', () => renderDirectory());
sortSelect.addEventListener('change', () => renderDirectory());
queryInput.addEventListener('input', event => { if (!event.isComposing) renderDirectory(); });
queryInput.addEventListener('compositionend', () => renderDirectory());
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
renderDirectory();
updateCompareCount();
