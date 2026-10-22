const regions = window.YESSURI_REGIONS;
const experts = window.YESSURI_PUBLIC_EXPERTS;
const categoryGrid = document.querySelector('#category-grid');
const filterRow = document.querySelector('#region-filters');
const expertGrid = document.querySelector('#expert-grid');
const emptyState = document.querySelector('#expert-empty');
let selectedRegion = '전체';
let selectedCategory = '전체';

const homeServices=window.YESSURI_SERVICE_FIELDS.items.map(({label,description,image,href})=>[label,description,image,href]);
homeServices.forEach(([name,description,image,href])=>{const a=document.createElement('a');a.className='category-card';if(name==='보일러')a.classList.add('boiler-card');if(name==='컴퓨터 수리·업그레이드')a.classList.add('computer-upgrade-card');if(name==='TV·LED 모니터 수리')a.classList.add('display-repair-card');const visual=document.createElement('span');visual.className='category-icon';visual.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src=image;img.alt='';img.width=160;img.height=160;img.loading='lazy';visual.append(img);const title=document.createElement('span');title.textContent=name;if(a.classList.contains('computer-upgrade-card')){title.replaceChildren(document.createTextNode('컴퓨터 수리·'),document.createElement('br'),document.createTextNode('업그레이드'));}const small=document.createElement('small');small.className='category-description';small.textContent=description;a.href=href;a.append(visual,title,small);categoryGrid.append(a);});


let homeExpertPage=1,homeExpertVersion=0;
async function renderExperts(){const version=++homeExpertVersion;await window.YESSURI_PUBLIC_READY;let remote=null;try{remote=await window.YESSURI_PUBLIC_API.search({page:homeExpertPage,size:12})}catch{}if(version!==homeExpertVersion)return;const actual=remote?.totalPublic??window.YESSURI_EXPERT_CARD.actualCount(),server=remote&&actual>0;const examples=experts().filter(window.YESSURI_EXPERT_CARD.example);const ordered=window.YESSURI_EXPERT_CARD.selectFeatured(examples,examples.length);const total=server?remote.total:ordered.length,pages=Math.max(1,Math.ceil(total/12));homeExpertPage=server?remote.page:Math.min(homeExpertPage,pages);const source=server?remote.items:ordered.slice((homeExpertPage-1)*12,homeExpertPage*12);expertGrid.replaceChildren(...source.map(person=>window.YESSURI_EXPERT_CARD.create(person)));
let nav=document.querySelector('#home-expert-pages');if(!nav){nav=document.createElement('nav');nav.id='home-expert-pages';nav.setAttribute('aria-label','메인 전문가 목록 페이지');expertGrid.after(nav)}nav.replaceChildren();nav.hidden=pages<=1;if(pages<=1)return;
function add(label,target,current=false){const valid=target>=1&&target<=pages,e=document.createElement(valid?'button':'span');e.textContent=label;if(valid){e.type='button';if(current)e.setAttribute('aria-current','page');e.onclick=()=>{homeExpertPage=target;renderExperts().then(()=>{const title=document.querySelector('#experts h2');title.tabIndex=-1;title.focus({preventScroll:true});title.scrollIntoView({block:'start'})})}}else{e.className='page-disabled';e.setAttribute('aria-disabled','true')}nav.append(e)}add('← 이전',homeExpertPage-1);let previous=0;for(const n of [...new Set([1,homeExpertPage-1,homeExpertPage,homeExpertPage+1,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b)){if(previous&&n-previous>1){const gap=document.createElement('span');gap.className='page-gap';gap.textContent='…';nav.append(gap)}add(String(n),n,n===homeExpertPage);previous=n}add('다음 →',homeExpertPage+1);}

renderExperts();
let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
