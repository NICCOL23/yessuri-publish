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
function updateCompareCount() {
  const count = window.YESSURI_COMPARE.selectedExperts().length;
  compareCount.textContent = String(count);
  document.querySelector('#compare-toolbar').hidden = count === 0;
  document.querySelector('#compare-link').hidden = count < 2;
  document.querySelector('#compare-guidance').textContent = count === 1 ? '비교할 업체를 한 곳 더 선택하세요' : count ? '최대 3곳까지 비교할 수 있습니다.' : '';
  refreshCardControls();
}
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
  document.querySelector('#results-refine').hidden = matches.length === 0;
  if (!matches.length) {
    emptyHeading.textContent = appliedFilters.citywide ? '조건에 맞는 부산 전 지역 출장 전문가가 없습니다' : '조건에 맞는 전문가가 없습니다';
  }
  const regionName = appliedFilters.region === '전체' ? '부산 전체' : appliedFilters.region;
  const sortName = sortSelect.selectedOptions[0].textContent;
  renderConditionChips();
  clearTimeout(announcementTimer);
  announcementTimer = window.setTimeout(() => {
    resultsLive.textContent = matches.length
      ? `${regionName}, ${sortName}. 검색 결과 ${matches.length}곳.`
      : `${regionName}, ${sortName}. ${emptyHeading.textContent}`;
  }, 250);
  matches.forEach(expert => resultGrid.append(createExpertCard(expert)));
  refreshCardControls();
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

function syncInputsToApplied() {
  queryInput.value = appliedFilters.query;
  regionSelect.value = appliedFilters.region;
  categorySelect.value = appliedFilters.category;
  citywideCheckbox.checked = appliedFilters.citywide;
  sortSelect.value = appliedFilters.sort;
}
function renderConditionChips() {
  currentConditions.replaceChildren();
  const chip = (text, clear, accessibleName) => {
    const element = document.createElement(clear ? 'button' : 'span');
    element.className = 'result-condition-chip';
    element.textContent = text + (clear ? ' ×' : '');
    if (clear) {
      element.type = 'button';
      element.setAttribute('aria-label', accessibleName);
      element.addEventListener('click', () => {clear(); syncInputsToApplied(); renderDirectory(); document.querySelector('#directory-results-title').focus({preventScroll:true});});
    }
    currentConditions.append(element);
  };
  chip(appliedFilters.region === '전체' ? '부산 전체' : appliedFilters.region, appliedFilters.region !== '전체' ? () => {appliedFilters.region='전체';} : null, '지역 조건 해제');
  if (requestedCategories.length) chip(requestedCategories.join(' · '), () => {requestedCategories=[];requestedService='';appliedFilters.category='전체';}, '선택한 수리 분야 조건 해제');
  else if (appliedFilters.category !== '전체') chip(appliedFilters.category, () => {appliedFilters.category='전체';requestedService='';}, '수리 분야 조건 해제');
  if (appliedFilters.query) chip('검색: '+appliedFilters.query, () => {appliedFilters.query='';}, '검색어 조건 해제');
  if (appliedFilters.citywide) chip('부산 전 지역 출장 가능', () => {appliedFilters.citywide=false;}, '부산 전 지역 출장 조건 해제');
}
function createExpertCard(expert) {
  const card = document.createElement('article');
  card.className='find-card result-list-card';
  const href='expert.html?id='+encodeURIComponent(expert.id);
  const photo=document.createElement('a');photo.className='directory-photo';photo.href=href;photo.setAttribute('aria-label',expert.name+' 프로필 예시 보기');
  const image=document.createElement('img');image.src='assets/images/'+expert.image;image.alt=expert.imageAlt;image.loading='lazy';image.width=1536;image.height=1024;
  const photoLabel=document.createElement('span');photoLabel.className='directory-photo-label';photoLabel.textContent='예시 사진';photo.append(image,photoLabel);
  const info=document.createElement('div');info.className='find-card-body';
  const title=document.createElement('h3');title.className='find-card-name';
  const titleLink=document.createElement('a');titleLink.href=href;titleLink.textContent=expert.name;title.append(titleLink);info.append(title);
  const facts=document.createElement('dl');facts.className='result-card-facts';
  const fact=(label,value)=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);facts.append(row);return dd;};
  const fieldValue= fact('전문 분야',expert.fields.join(' · '));
  if (expert.keywords) {const work=document.createElement('span');work.className='result-work-keywords';work.textContent=expert.keywords;fieldValue.append(work);}
  fact('주요 출장 지역',window.YESSURI_AREAS_LABEL(expert)+' (예시)');info.append(facts);
  if(servesAllBusan(expert)){const badge=document.createElement('span');badge.className='find-card-coverage';badge.textContent='부산 전 지역 출장 가능';info.append(badge);}
  const cost=document.createElement('p');cost.className='result-card-cost';cost.textContent='출장·진단비: 상담 시 확인';info.append(cost);
  const note=document.createElement('p');note.className='result-card-note';note.textContent='주요 지역 외 방문 가능 여부와 출장비는 상담 시 확인하세요.';info.append(note);
  const actions=document.createElement('div');actions.className='result-card-actions';
  const profile=document.createElement('a');profile.className='result-profile-link';profile.href=href;profile.textContent='프로필 예시 보기';profile.setAttribute('aria-label',expert.name+' 프로필 예시 보기');
  const controls=document.createElement('div');controls.className='result-card-controls';
  const favorite=document.createElement('button');favorite.type='button';favorite.className='favorite-button find-favorite';favorite.dataset.expertId=expert.id;favorite.dataset.expertName=expert.name;window.YESSURI_FAVORITES.bindButton(favorite,expert.id);
  const compare=document.createElement('button');compare.type='button';compare.className='compare-button';compare.dataset.expertId=expert.id;compare.dataset.expertName=expert.name;compare.setAttribute('role','checkbox');window.YESSURI_COMPARE.bindButton(compare,expert.id,compareStatus);
  controls.append(favorite,compare);actions.append(profile,controls);card.append(photo,info,actions);return card;
}
function refreshCardControls() {
  resultGrid.querySelectorAll('.find-favorite').forEach(button=>{const saved=window.YESSURI_FAVORITES.saved(button.dataset.expertId);button.textContent=saved?'♥':'♡';const label=button.dataset.expertName+(saved?' 관심 해제':' 관심 저장');button.setAttribute('aria-label',label);button.title=button.disabled?button.title:label;});
  resultGrid.querySelectorAll('.compare-button').forEach(button=>{const selected=window.YESSURI_COMPARE.selected(button.dataset.expertId);button.textContent='비교 선택';button.setAttribute('aria-checked',String(selected));button.removeAttribute('aria-pressed');button.setAttribute('aria-label',button.dataset.expertName+' 비교 선택');});
}
window.addEventListener('yessuri:favorites-changed',refreshCardControls);
document.querySelectorAll('[data-edit-search]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.querySelector('#find-filter-form').scrollIntoView({behavior:'smooth',block:'start'});regionSelect.focus({preventScroll:true});}));
