const categories = [
  ['누수·수도','◉'], ['하수구·변기','◌'], ['타일','▦'], ['페인트','▤'],
  ['목공','⌑'], ['에어컨','❄'], ['청소','✧'], ['철거','▧'],
  ['전기·조명','✳'], ['문·창호','▣'], ['컴퓨터·IT','⌘'], ['전체보기','＋']
];
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
  const visual = `<img src="assets/images/service-icons.svg#icon${categories.findIndex(([label])=>label===name)+1}" alt="" width="160" height="160" loading="lazy">`;
  button.innerHTML = `<span class="category-icon" aria-hidden="true">${visual}</span><span>${name}</span>`;
  button.addEventListener('click', () => {
    const query = new URLSearchParams({region:heroRegion.value, category:name === '전체보기' ? '전체' : name});
    window.location.href = `find.html?${query.toString()}`;
  });
  categoryGrid.append(button);
});


function renderRegions(){
 filterRow.replaceChildren();
 const addSelect=(labelText,values,value,change)=>{
  const label=document.createElement('label');label.textContent=labelText;
  const select=document.createElement('select');select.setAttribute('aria-label',labelText);
  values.forEach(([v,t])=>{const option=document.createElement('option');option.value=v;option.textContent=t;select.append(option)});
  select.value=value;select.addEventListener('change',()=>change(select.value));label.append(select);filterRow.append(label);
 };
 addSelect('활동 지역',regions.map(r=>[r,r==='전체'?'부산 전체':r]),selectedRegion,value=>{selectedRegion=value;heroRegion.value=value;renderExperts()});
 addSelect('수리 분야',[['전체','수리 분야 전체'],...categories.filter(([n])=>n!=='전체보기').map(([n])=>[n,n])],selectedCategory,value=>{selectedCategory=value;renderExperts()});
}
function renderExperts(){
 const sampleItems=[['누수·수도',0],['하수구·변기',0],['타일',1],['페인트',3],['목공',3],['에어컨',2],['청소',4],['철거',3],['전기·조명',2],['문·창호',3],['컴퓨터·IT',5],['종합 집수리',0]];
 const source=experts();
 const shown=sampleItems.map(([field,index])=>({...source[index],name:field,fields:[field],sampleCategory:field})).filter(p=>window.YESSURI_SERVES_REGION(p,selectedRegion)&&(selectedCategory==='전체'||p.fields.includes(selectedCategory)));
 expertGrid.replaceChildren();emptyState.hidden=shown.length>0;emptyState.textContent='선택한 조건에 맞는 가상 프로필이 없습니다. 다른 지역이나 수리 분야를 선택해주세요.';
 shown.forEach(person=>{
  const card=document.createElement('article');card.className='expert-card';
  card.innerHTML=`<div class="expert-photo"><img src="assets/images/${person.image}" alt="${person.imageAlt}" loading="lazy"><span class="ai-image-label">AI 예시 이미지</span></div><div class="expert-main"><h3 class="expert-name">${person.name}</h3><p class="fiction-label">가상 프로필</p><p class="compact-area">${window.YESSURI_AREAS_LABEL(person)}</p></div><div class="expert-actions"><a class="profile-button" href="expert.html?id=${encodeURIComponent(person.id)}">프로필 보기</a></div>`;
  const favorite=document.createElement('button');favorite.type='button';favorite.className='favorite-button';window.YESSURI_FAVORITES.bindButton(favorite,person.id);card.querySelector('.expert-photo').append(favorite);expertGrid.append(card);
 });
 refreshHearts();
}
function refreshHearts(){document.querySelectorAll('#expert-grid .favorite-button').forEach(b=>{const saved=b.getAttribute('aria-pressed')==='true';b.setAttribute('aria-label',saved?'관심 해제':'관심 저장');b.textContent=saved?'♥':'♡'})}
window.addEventListener('yessuri:favorites-changed',refreshHearts);window.addEventListener('storage',refreshHearts);
renderRegions(); renderExperts();

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
