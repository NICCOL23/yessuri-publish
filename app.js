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


// Keep twelve stable slots; replace just one available card every twelve seconds.
let homeRotationTimer;
let homeRenderVersion=0;
async function renderExperts(requestedPage=1) {
  const version=++homeRenderVersion;
  clearInterval(homeRotationTimer);
  await window.YESSURI_PUBLIC_READY;
  let remote = null;
  try { remote = await window.YESSURI_PUBLIC_API.search({page:1,size:12}); } catch {}
  const actual = remote?.totalPublic ?? window.YESSURI_EXPERT_CARD.actualCount();
  const server = Boolean(remote && actual > 0);
  const examples = experts().filter(window.YESSURI_EXPERT_CARD.example);
  const ordered = window.YESSURI_EXPERT_CARD.selectFeatured(examples, examples.length);
  const actualItems = server ? remote.items : experts().filter(person => !window.YESSURI_EXPERT_CARD.example(person));
  const pool = new Map();
  for (const person of [...actualItems,...ordered]) if (!pool.has(person.id)) pool.set(person.id,person);
  const realTotal=server?remote.total:actualItems.length;
  const total=realTotal+ordered.length;
  const pageCount=Math.max(1,Math.ceil(total/12));
  const currentPage=Math.max(1,Math.min(requestedPage,pageCount));
  const start=(currentPage-1)*12;
  let pageActual=actualItems.slice(start,start+12);
  if(server&&start<realTotal){
    if(currentPage===1)pageActual=remote.items;
    else {
      try{pageActual=(await window.YESSURI_PUBLIC_API.search({page:currentPage,size:12})).items;}
      catch{if(version===homeRenderVersion)return;}
    }
    for(const person of pageActual)if(!pool.has(person.id))pool.set(person.id,person);
  }
  const source=[...pageActual,...ordered.slice(Math.max(0,start-realTotal),Math.max(0,start+12-realTotal))];
  if(version!==homeRenderVersion)return;
  expertGrid.replaceChildren(...source.map(person => window.YESSURI_EXPERT_CARD.create(person)));
  document.querySelector('#home-expert-pages')?.remove();
  document.querySelector('.home-rotation-controls')?.remove();
  const nav=document.createElement('nav');nav.id='home-expert-pages';nav.setAttribute('aria-label','메인 전문가 목록 페이지');
  nav.hidden=pageCount<=1;
  function add(label,target,current=false){
    const valid=target>=1&&target<=pageCount,button=document.createElement(valid?'button':'span');button.textContent=label;
    if(valid){button.type='button';if(current)button.setAttribute('aria-current','page');button.onclick=()=>{renderExperts(target).then(()=>{const title=document.querySelector('#experts h2');title.tabIndex=-1;title.focus({preventScroll:true});title.scrollIntoView({block:'start'});});};}
    else{button.className='page-disabled';button.setAttribute('aria-disabled','true');}
    nav.append(button);
  }
  add('← 이전',currentPage-1);
  let previous=0;
  for(const page of [...new Set([1,currentPage-1,currentPage,currentPage+1,pageCount])].filter(page=>page>=1&&page<=pageCount).sort((a,b)=>a-b)){
    if(previous&&page-previous>1){const gap=document.createElement('span');gap.className='page-gap';gap.textContent='…';nav.append(gap);}
    add(String(page),page,page===currentPage);previous=page;
  }
  add('다음 →',currentPage+1);expertGrid.after(nav);
  const link = document.querySelector('.featured-directory-link a');
  if (link) link.textContent = '전문가 전체 보기 · 공개 '+actual+'명 · 예시 '+examples.length+'명 →';
  if (!source.length || total <= source.length) return;

  const sourceIds=new Set(source.map(person=>person.id));
  let queue = Array.from(pool.values()).filter(person=>!sourceIds.has(person.id));
  let nextPage = 2, slot = 0, busy = false;
  let pages = server ? Math.ceil(remote.total/12) : 1;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  let paused = reduced.matches;
  const controls = document.createElement('div');
  controls.className = 'home-rotation-controls';
  const note = document.createElement('span');
  note.textContent = '12초마다 전문가 한 곳씩 순환 소개합니다.';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  const updateToggle = () => {
    toggle.textContent = paused ? '자동 교체 시작' : '자동 교체 일시정지';
    toggle.setAttribute('aria-pressed', String(paused));
  };
  toggle.addEventListener('click', () => { paused = !paused; updateToggle(); });
  reduced.addEventListener('change', event => { paused = event.matches; updateToggle(); });
  updateToggle();
  controls.append(note, toggle);
  nav.after(controls);

  function protectedCard(card) {
    const box = card.getBoundingClientRect();
    const visible = box.bottom > 0 && box.top < window.innerHeight;
    return card.contains(document.activeElement) || card.matches(':hover') || (mobile.matches && visible);
  }
  async function rotateOne() {
    if (paused || busy || document.hidden || version!==homeRenderVersion) return;
    const bounds = expertGrid.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    const cards = Array.from(expertGrid.children);
    let target = -1;
    for (let offset=0; offset<cards.length; offset++) {
      const index = (slot+offset)%cards.length;
      if (!protectedCard(cards[index])) { target=index; break; }
    }
    if (target < 0) return;
    busy = true;
    try {
      const visibleIds = new Set(cards.map(card => card.dataset.expertId));
      queue = queue.filter(person => !visibleIds.has(person.id));
      if (server && nextPage <= pages) {
        try {
          const result = await window.YESSURI_PUBLIC_API.search({page:nextPage,size:12});
          pages = Math.max(1, Math.ceil(result.total/12));
          nextPage++;
          for (const person of result.items) {
            if (pool.has(person.id)) continue;
            pool.set(person.id,person);
            if (!visibleIds.has(person.id)) queue.push(person);
          }
        } catch { /* Keep rotating already loaded real and example profiles. */ }
      }
      const old = cards[target];
      // Recheck after an asynchronous request: never replace a newly focused card.
      if (!queue.length || paused || document.hidden || version!==homeRenderVersion || protectedCard(old)) return;
      const person = queue.shift();
      const card = window.YESSURI_EXPERT_CARD.create(person);
      old.replaceWith(card);
      const outgoing = pool.get(old.dataset.expertId);
      if (outgoing) queue.push(outgoing);
      if (!reduced.matches && typeof card.animate === 'function') {
        card.animate([{opacity:0},{opacity:1}], {duration:300});
      }
      slot = (target+1)%cards.length;
    } catch {
      // Keep the current twelve cards intact and retry on the next tick.
    } finally { busy = false; }
  }
  clearInterval(homeRotationTimer);
  homeRotationTimer = setInterval(rotateOne, 12000);
  window.addEventListener('pagehide', () => clearInterval(homeRotationTimer), {once:true});
  window.addEventListener('pageshow', event => {
    if (event.persisted && version===homeRenderVersion) { clearInterval(homeRotationTimer); homeRotationTimer = setInterval(rotateOne,12000); }
  });
}
renderExperts();
let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
