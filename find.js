// Presentation-only examples retain original IDs, fields and profile destinations.
const directoryPresentation = window.YESSURI_EXPERT_PRESENTATION;
// A provider's confirmed coverage flag is separate from their primary service areas.
// Missing coverage data defaults to false; broad coverage is never inferred from an address.
const servesAllBusan = expert => expert.serviceAllBusan === true || expert.serviceAreas?.includes('전체') === true;
const servesRegion = (expert, region) => servesAllBusan(expert) || window.YESSURI_SERVES_REGION(expert, region);
const directoryExperts = () => window.YESSURI_PUBLIC_EXPERTS().map(window.YESSURI_EXPERT_CARD.present);
const validRegions = window.YESSURI_REGIONS;
const validCategories = ['전체', ...window.YESSURI_SERVICE_FIELDS.values];
const queryInput = document.querySelector('#find-query');
const regionSelect = document.querySelector('#find-region');
const categorySelect = document.querySelector('#find-category');
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
const searchState=window.YESSURI_SEARCH_STATE;
let searchHour=searchState.hour(), searchIds=null, resultPage=1;
let pendingRestore=null;
const captureSearch=()=>({url:location.href,applied:{...appliedFilters},categories:requestedCategories.slice(),service:requestedService,ids:searchIds?.slice(),hour:searchHour,page:resultPage,draft:{query:queryInput.value,region:regionSelect.value,category:categorySelect.value,sort:sortSelect.value},scroll:window.scrollY});
function saveSearch(){const state=captureSearch();searchState.write('yessuri:last-search',state);searchState.write('yessuri:search:'+searchState.keyFor(location.href),state);try{history.replaceState({yessuriSearch:state},'',location.href);}catch{}return state;}
function restoreSearch(state){if(!state||!searchState.safeFind(state.url)||searchState.keyFor(state.url)!==searchState.keyFor(location.href)||!Array.isArray(state.ids)||!Number.isSafeInteger(state.hour))return false;searchIds=[...new Set(state.ids.filter(id=>typeof id==='string'))];searchHour=state.hour;pendingRestore=state;return true;}
function freshSearch(){searchIds=null;searchHour=searchState.hour();resultPage=1;}

const readFilters = () => ({query:queryInput.value.trim().replace(/\s+/g," "),region:regionSelect.value,category:categorySelect.value,sort:sortSelect.value});
let requestedCategories = [];
let requestedService = '';
const serviceNotice = document.createElement('p');
serviceNotice.className = 'demo-note';
serviceNotice.setAttribute('role','status');
document.querySelector('#find-filter-form').after(serviceNotice);
function updateCompareCount() {
  const count = window.YESSURI_COMPARE.selectedExperts().length;
  compareCount.textContent = String(count);
  document.querySelector('#compare-toolbar').hidden = true;
  document.querySelector('#selected-access-count').textContent=String(count);
  document.querySelector('#compare-link').hidden = count < 2;
  document.querySelector('#compare-guidance').textContent = count === 1 ? '비교할 업체를 한 곳 더 선택하세요' : count ? '최대 3곳까지 비교할 수 있습니다.' : '';
  refreshCardControls();
}
function loadFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  resultPage=Math.max(1,Math.floor(Number(params.get('page'))||1));
  requestedCategories = (params.get('categories') || '').split(',').filter(field => validCategories.includes(field) && field !== '전체');
  requestedService = (params.get('service') || '').slice(0, 80);
  queryInput.value = (params.get('q') || '').slice(0, 80);
  regionSelect.value = validRegions.includes(params.get('region')) ? params.get('region') : '전체';
  categorySelect.value = validCategories.includes(params.get('category')) ? params.get('category') : '전체';
  sortSelect.value = ['default', 'name', 'areas'].includes(params.get('sort')) ? params.get('sort') : 'default';
  appliedFilters = readFilters();
}

function updateUrl(mode = "push") {
  const url = new URL(window.location.href);
  for (const key of ['q', 'region', 'category', 'type', 'sort', 'categories', 'service', 'citywide', 'page']) url.searchParams.delete(key);
  if (requestedCategories.length) url.searchParams.set('categories', requestedCategories.join(','));
  if (requestedService) url.searchParams.set('service', requestedService);
  const query = appliedFilters.query;
  if (query) url.searchParams.set('q', query);
  if (appliedFilters.region !== '전체') url.searchParams.set('region', appliedFilters.region);
  if (appliedFilters.category !== '전체') url.searchParams.set('category', appliedFilters.category);
  if (appliedFilters.sort !== 'default') url.searchParams.set('sort', appliedFilters.sort);
  if(resultPage>1)url.searchParams.set('page',String(resultPage));
  try { if (url.href !== location.href) window.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url); } catch { /* 일부 로컬 파일 브라우저는 주소 변경을 제한합니다. */ }
}

loadFiltersFromUrl();
const returnState=searchState.read('yessuri:search-restore');
if(!restoreSearch(returnState))restoreSearch(searchState.read('yessuri:search:'+searchState.keyFor(location.href)));
searchState.write('yessuri:search-restore',null);

let renderVersion=0;
async function renderDirectory(syncUrl = true) {const version=++renderVersion;await window.YESSURI_PUBLIC_READY;let remote=null;try{remote=await window.YESSURI_PUBLIC_API.search({query:appliedFilters.query,region:appliedFilters.region,category:appliedFilters.category,page:resultPage,sort:appliedFilters.sort,categories:requestedCategories.join(',')});}catch{}if(version!==renderVersion)return;const server=remote&&remote.totalPublic>0;if(server)resultPage=remote.page;

  const query = appliedFilters.query.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const matches = server?remote.items:directoryExperts().filter(e=>e.isExample!==false).filter(expert =>
    servesRegion(expert, appliedFilters.region) &&
    (requestedCategories.length ? requestedCategories.some(field => expert.fields.includes(field)) : (appliedFilters.category === '전체' || expert.fields.includes(appliedFilters.category))) &&
    (!query || query.split(' ').every(term => [expert.name, expert.keywords || '', ...expert.fields].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR').includes(term)))
  );
  if(!server&&searchIds===null)searchIds=searchState.rotate(matches,searchHour).map(expert=>expert.id);
  const current=new Map(matches.map(expert=>[expert.id,expert]));
  if(!server)matches.splice(0,matches.length,...searchIds.filter(id=>current.has(id)).map(id=>current.get(id)));
  if (!server&&appliedFilters.sort === 'name') {
    matches.sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id));
  } else if (!server&&appliedFilters.sort === 'areas') {
    matches.sort((a, b) => (b.serviceAreas?.length || 0) - (a.serviceAreas?.length || 0) || a.id.localeCompare(b.id));
  }
  serviceNotice.hidden = !requestedService;
  serviceNotice.textContent = requestedService ? `선택한 수리: ${requestedService}. 세부 작업 가능 여부는 전문가에게 확인해 주세요. 상위 분야 기준으로 검색합니다.` : '';
  resultGrid.replaceChildren();
  const resultTotal=server?remote.total:matches.length;resultCount.textContent = String(resultTotal);
  emptyState.hidden = matches.length !== 0;
  document.querySelector('#results-refine').hidden = matches.length === 0;
  if (!matches.length) {
    emptyHeading.textContent = '조건에 맞는 전문가가 없습니다';
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
  const pages=Math.max(1,Math.ceil(resultTotal/12));resultPage=Math.min(resultPage,pages);
  const start=(resultPage-1)*12;
  (server?matches:matches.slice(start,start+12)).forEach(expert => resultGrid.append(createExpertCard(expert)));
  document.querySelector('#search-rotation-note').hidden=appliedFilters.sort!=='default';document.querySelector('#search-rotation-note').textContent=server?'기본순은 일 단위로 순환하며 페이지 내 순서를 유지합니다.':'예시 목록은 시간대별로 순환하며 검색 중에는 순서를 유지합니다.';
  const range=document.querySelector('#search-page-range');range.hidden=!matches.length;range.textContent=matches.length ? (start+1)+'–'+Math.min(start+12,resultTotal)+'곳 표시' : '';
  if (syncUrl) updateUrl();
  renderPagination(pages);

  refreshCardControls();
  saveSearch();
}

function resetFilters() {
  freshSearch();
  requestedCategories = []; requestedService = '';
  queryInput.value = '';
  regionSelect.value = '전체';
  categorySelect.value = '전체';
  sortSelect.value = 'default';
  appliedFilters = readFilters();
  renderDirectory();
}

document.querySelector('#find-filter-form').addEventListener('submit', event => {
  event.preventDefault();
  freshSearch();
  if (categorySelect.value !== appliedFilters.category) { requestedCategories = []; requestedService = ''; }
  appliedFilters = readFilters();
  renderDirectory();
  document.querySelector('.find-results-heading').scrollIntoView({behavior:'smooth',block:'start'});
});
for(const select of [regionSelect,categorySelect])select.addEventListener('change',()=>{freshSearch();requestedCategories=[];requestedService='';appliedFilters=readFilters();renderDirectory()});
sortSelect.addEventListener('change', () => { appliedFilters.sort = sortSelect.value; resultPage=1; renderDirectory(); });
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#empty-reset').addEventListener('click', resetFilters);
window.addEventListener('popstate', event => {loadFiltersFromUrl();searchIds=null;pendingRestore=null;restoreSearch(event.state?.yessuriSearch||searchState.read('yessuri:search:'+searchState.keyFor(location.href)));renderDirectory(false);applyRestoredDraft();});
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
applyRestoredDraft();
updateCompareCount();

function syncInputsToApplied() {
  queryInput.value = appliedFilters.query;
  regionSelect.value = appliedFilters.region;
  categorySelect.value = appliedFilters.category;
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
      element.addEventListener('click', () => {clear(); freshSearch(); syncInputsToApplied(); renderDirectory(); document.querySelector('#directory-results-title').focus({preventScroll:true});});
    }
    currentConditions.append(element);
  };
  chip(appliedFilters.region === '전체' ? '부산 전체' : appliedFilters.region, appliedFilters.region !== '전체' ? () => {appliedFilters.region='전체';} : null, '지역 조건 해제');
  if (requestedCategories.length) chip(requestedCategories.join(' · '), () => {requestedCategories=[];requestedService='';appliedFilters.category='전체';}, '선택한 수리 분야 조건 해제');
  else if (appliedFilters.category !== '전체') chip(appliedFilters.category, () => {appliedFilters.category='전체';requestedService='';}, '수리 분야 조건 해제');
  if (appliedFilters.query) chip('검색: '+appliedFilters.query, () => {appliedFilters.query='';}, '검색어 조건 해제');
}
function createExpertCard(expert){return window.YESSURI_EXPERT_CARD.create(expert,{compare:true});}
function refreshCardControls() {
  resultGrid.querySelectorAll('.find-favorite').forEach(button=>{const saved=window.YESSURI_FAVORITES.saved(button.dataset.expertId);button.textContent=saved?'관심 저장됨':'관심 저장';button.dataset.saved=String(saved);const label=button.dataset.expertName+(saved?' 관심 해제':' 관심 저장');button.setAttribute('aria-label',label);button.title=button.disabled?button.title:label;});
  resultGrid.querySelectorAll('.compare-button').forEach(button=>{const selected=window.YESSURI_COMPARE.selected(button.dataset.expertId);button.textContent='비교 선택';button.setAttribute('aria-checked',String(selected));button.removeAttribute('aria-pressed');button.setAttribute('aria-label',button.dataset.expertName+' 비교 선택');});
}
window.addEventListener('yessuri:favorites-changed',refreshCardControls);
document.querySelectorAll('[data-edit-search]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.querySelector('#find-filter-form').scrollIntoView({behavior:'smooth',block:'start'});regionSelect.focus({preventScroll:true});}));

// Help changes draft inputs only; applied results and URL wait for form submission.

function renderPagination(pages){const nav=document.querySelector('#search-pagination');nav.replaceChildren();nav.hidden=pages<=1;if(pages<=1)return;function link(label,target,cls=''){const valid=target>=1&&target<=pages,e=document.createElement(valid?'a':'span');e.className=valid?cls:'page-disabled';e.textContent=label;if(!valid)e.setAttribute('aria-disabled','true');else{const u=new URL(location.href);u.searchParams.set('page',target);e.href=u.href;if(target===resultPage&&cls==='page-number')e.setAttribute('aria-current','page');e.addEventListener('click',event=>{if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();resultPage=target;renderDirectory();document.querySelector('#directory-results-title').scrollIntoView({block:'start'});document.querySelector('#directory-results-title').focus({preventScroll:true})})}nav.append(e)}link('이전',resultPage-1);let previous=0;for(const n of [...new Set([1,resultPage-1,resultPage,resultPage+1,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b)){if(previous&&n-previous>1){const gap=document.createElement('span');gap.className='page-gap';gap.textContent='…';nav.append(gap)}link(String(n),n,'page-number');previous=n}const progress=document.createElement('span');progress.className='page-mobile';progress.textContent=resultPage+' / '+pages;nav.append(progress);link('다음',resultPage+1)}
function applyRestoredDraft(){if(!pendingRestore)return;const state=pendingRestore;pendingRestore=null;const d=state.draft||{};queryInput.value=typeof d.query==='string'?d.query.slice(0,80):appliedFilters.query;regionSelect.value=validRegions.includes(d.region)?d.region:appliedFilters.region;categorySelect.value=validCategories.includes(d.category)?d.category:appliedFilters.category;const restorePosition=()=>window.scrollTo({top:Math.max(0,Number(state.scroll)||0),behavior:'instant'});requestAnimationFrame(restorePosition);document.fonts.ready.then(restorePosition);saveSearch();}
window.addEventListener('pagehide',saveSearch);
window.addEventListener('pageshow',event=>{if(event.persisted){renderDirectory(false);}});

function updateSavedAccess(){document.querySelector('#saved-access-count').textContent=String(window.YESSURI_FAVORITES.visibleExperts().length);if(!window.YESSURI_FAVORITES.canStore()||!window.YESSURI_COMPARE.canStore())document.querySelector('#temporary-save-note').textContent='현재 창에서는 임시 저장을 사용할 수 없습니다.';}
window.addEventListener('yessuri:favorites-changed',updateSavedAccess);window.addEventListener('pageshow',()=>{updateSavedAccess();updateCompareCount();});updateSavedAccess();
document.querySelector('#compare-access').addEventListener('click',event=>{if(window.YESSURI_COMPARE.selectedExperts().length<2){event.preventDefault();compareStatus.textContent='비교할 업체를 2곳 이상 선택하세요.';}});

document.querySelectorAll('#favorites-access,#compare-access').forEach(link=>link.addEventListener('click',saveSearch));
