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
async function renderExperts() {
  await window.YESSURI_PUBLIC_READY;
  let remote = null;
  try { remote = await window.YESSURI_PUBLIC_API.search({page:1,size:12}); } catch {}
  const actual = remote?.totalPublic ?? window.YESSURI_EXPERT_CARD.actualCount();
  const server = Boolean(remote && actual > 0);
  const examples = experts().filter(window.YESSURI_EXPERT_CARD.example);
  const ordered = window.YESSURI_EXPERT_CARD.selectFeatured(examples, examples.length);
  const source = server ? remote.items : ordered.slice(0,12);
  expertGrid.replaceChildren(...source.map(person => window.YESSURI_EXPERT_CARD.create(person)));
  const link = document.querySelector('.featured-directory-link a');
  if (link) link.textContent = '전문가 전체 보기 · 공개 '+actual+'명'+(!server?' · 예시 '+examples.length+'명':'')+' →';
  const total = server ? remote.total : ordered.length;
  if (source.length < 12 || total <= 12) return;

  let queue = server ? [] : ordered.slice(12);
  let nextPage = 2, slot = 0, busy = false;
  let pages = Math.ceil(total/12);
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
  expertGrid.after(controls);

  function protectedCard(card) {
    const box = card.getBoundingClientRect();
    const visible = box.bottom > 0 && box.top < window.innerHeight;
    return card.contains(document.activeElement) || card.matches(':hover') || (mobile.matches && visible);
  }
  async function rotateOne() {
    if (paused || busy || document.hidden) return;
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
      if (server && !queue.length) {
        const result = await window.YESSURI_PUBLIC_API.search({page:nextPage,size:12});
        pages = Math.max(1, Math.ceil(result.total/12));
        nextPage = nextPage >= pages ? 1 : nextPage+1;
        queue = result.items.filter(person => !visibleIds.has(person.id));
      }
      const old = cards[target];
      // Recheck after an asynchronous request: never replace a newly focused card.
      if (!queue.length || paused || document.hidden || protectedCard(old)) return;
      const person = queue.shift();
      const card = window.YESSURI_EXPERT_CARD.create(person);
      const height = old.getBoundingClientRect().height;
      if (height) card.style.minHeight = height+'px';
      old.replaceWith(card);
      if (!server) {
        const outgoing = ordered.find(person => person.id === old.dataset.expertId);
        if (outgoing) queue.push(outgoing);
      }
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
    if (event.persisted) { clearInterval(homeRotationTimer); homeRotationTimer = setInterval(rotateOne,12000); }
  });
}
renderExperts();
let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
