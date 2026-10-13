const categories = [
  ['누수·수도','◉'], ['하수구·변기','◌'], ['타일','▦'], ['페인트','▤'],
  ['목공','⌑'], ['에어컨','❄'], ['청소','✧'], ['철거','▧'],
  ['전기·조명','✳'], ['문·창호','▣'], ['컴퓨터·IT','⌘']
];
const categoryDescriptions = ['수도꼭지·배관','변기·싱크대 막힘','깨짐·부분 보수','벽면·부분 도장','가구·선반 보수','수리·설치·청소','입주·생활 청소','부분 철거','전등·콘센트','문·방충망','부팅·속도 문제'];
const regions = window.YESSURI_REGIONS;
const experts = window.YESSURI_PUBLIC_EXPERTS;
const categoryGrid = document.querySelector('#category-grid');
const filterRow = document.querySelector('#region-filters');
const expertGrid = document.querySelector('#expert-grid');
const emptyState = document.querySelector('#expert-empty');
let selectedRegion = '전체';
let selectedCategory = '전체';

categories.forEach(([name, icon], index) => {
  const button = document.createElement('a');
  button.className = 'category-card';
  const visual = `<img src="assets/images/service-icons.svg#icon${categories.findIndex(([label])=>label===name)+1}" alt="" width="160" height="160" loading="lazy">`;
  button.innerHTML = `<span class="category-icon" aria-hidden="true">${visual}</span><span>${name}</span><small class="category-description">${categoryDescriptions[index]}</small>`;
  button.href = `find.html?${new URLSearchParams({category:name}).toString()}`;
  categoryGrid.append(button);
});


function renderExperts(){
 const source=experts();
 const featured=[
  {id:'bada-repair',name:'누수·수도 업체명',field:'수도꼭지·배관·누수 점검',image:'ai-water-yessuri-v2.png'},
  {id:'bright-home',name:'전기·조명 업체명',field:'전등·스위치·콘센트',image:'ai-light-yessuri-v2.png'},
  {id:'tile-studio',name:'타일·문창호 업체명',field:'타일·문·창호 보수',image:'ai-tile-yessuri-v2.png'}
 ];
 expertGrid.replaceChildren();
 featured.forEach(example=>{
  const person=source.find(p=>p.id===example.id);if(!person)return;
  const card=document.createElement('article');card.className='expert-card';
  card.innerHTML=`<div class="expert-photo"><img src="assets/images/${example.image}" alt="${example.field} 작업을 표현한 예시 사진" loading="lazy"><span class="ai-image-label">예시 사진</span></div><div class="expert-main"><h3 class="expert-name">${example.name}</h3><dl class="expert-facts"><div><dt>전문 분야</dt><dd>${example.field}</dd></div><div><dt>출장 지역</dt><dd>${window.YESSURI_AREAS_LABEL(person)} (예시)</dd></div></dl><p class="featured-cost">출장·진단비: 상담 시 확인</p></div><div class="expert-actions"><a class="profile-button" href="expert.html?id=${encodeURIComponent(person.id)}">프로필 예시 보기</a></div>`;
  const favorite=document.createElement('button');favorite.type='button';favorite.className='favorite-button';window.YESSURI_FAVORITES.bindButton(favorite,person.id);card.querySelector('.expert-photo').append(favorite);expertGrid.append(card);
 });
 refreshHearts();
}
function refreshHearts(){document.querySelectorAll('#expert-grid .favorite-button').forEach(b=>{const saved=b.getAttribute('aria-pressed')==='true';b.setAttribute('aria-label',saved?'관심 해제':'관심 저장');b.textContent=saved?'♥':'♡'})}
window.addEventListener('yessuri:favorites-changed',refreshHearts);window.addEventListener('storage',refreshHearts);
renderExperts();

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
