const compareGrid = document.querySelector('#compare-grid');
const compareEmpty = document.querySelector('#compare-empty');
const compareCount = document.querySelector('#compare-count');
const compareTitle = document.querySelector('#compare-title');
const shareButton = document.querySelector('#compare-share');
const importButton = document.querySelector('#compare-import');
const shareStatus = document.querySelector('#compare-share-status');
const shareNote = document.querySelector('#compare-share-note');
const sharedMode = new URLSearchParams(window.location.search).has('ids');

function sharedExperts() {
  const raw = new URLSearchParams(window.location.search).get('ids') || '';
  const ids = [...new Set(raw.split(',').filter(Boolean))].slice(0, 20);
  const publicById = new Map(window.YESSURI_PUBLIC_EXPERTS().map(person => [person.id, person]));
  return ids.map(id => publicById.get(id)).filter(Boolean).slice(0, window.YESSURI_COMPARE.max);
}

function displayedExperts() {
  return (sharedMode ? sharedExperts() : window.YESSURI_COMPARE.selectedExperts()).map(window.YESSURI_PRESENT_EXPERT);
}

function shareUrl(people) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('ids', people.map(person => person.id).join(','));
  return url.href;
}

async function copyLink() {
  const people = displayedExperts();
  if (!people.length) return;
  const value = shareUrl(people);
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* 복사가 차단될 수 있습니다. */ }
    field.remove();
    if (!copied) {
      shareStatus.textContent = '자동 복사가 제한되어 있습니다. 아래 비교 링크를 직접 복사해 주세요.';
      let manual = document.getElementById('compare-manual-link');
      if (!manual) { manual = document.createElement('input');manual.id='compare-manual-link';manual.readOnly=true;manual.setAttribute('aria-label','직접 복사할 비교 링크');shareStatus.after(manual); }
      manual.value=value;manual.focus();manual.select();
      return;
    }
  }
  shareStatus.textContent = window.location.protocol === 'file:'
    ? '링크를 복사했습니다. 현재는 로컬 파일 주소라 다른 기기에서 열 수 없습니다. 사이트 공개 후 공유해 주세요.'
    : '비교 링크를 복사했습니다. 링크를 열어도 받는 사람의 비교 목록은 바뀌지 않습니다.';
}

function renderComparison() {
  const people = displayedExperts();
  compareGrid.replaceChildren();
  compareCount.textContent = String(people.length);
  compareEmpty.hidden = people.length > 0;
  shareButton.disabled = people.length === 0;
  if (sharedMode) {
    compareTitle.textContent = '공유받은 비교';
    shareNote.hidden = false;
    compareEmpty.querySelector('p').textContent = '공유 링크에 현재 공개된 예시 프로필이 없습니다. 잘못된 ID나 숨김·삭제된 프로필은 표시되지 않습니다.';
    importButton.hidden = people.length === 0;
    importButton.disabled = !window.YESSURI_COMPARE.canStore();
  }
  compareGrid.hidden = !people.length;
  let notice=document.getElementById('compare-minimum');
  if(!notice){notice=document.createElement('p');notice.id='compare-minimum';notice.setAttribute('role','status');compareGrid.before(notice);}
  notice.textContent=people.length===1?'비교할 업체를 1곳 더 선택하세요.':'';
  if(!people.length)return;
  const table=document.createElement('table');table.className='saved-comparison';
  const caption=document.createElement('caption');caption.textContent='선택한 업체의 전문 분야·주요 출장 지역·출장 진단비 비교';caption.className='sr-only';table.append(caption);
  const head=document.createElement('thead'),heading=document.createElement('tr');
  const corner=document.createElement('th');corner.textContent='비교 항목';corner.scope='col';heading.append(corner);
  people.forEach(person=>{const cell=document.createElement('th');cell.scope='col';
    const photo=document.createElement('img');photo.src='assets/images/'+person.image;photo.alt=person.imageAlt;photo.width=180;photo.height=120;
    const name=document.createElement('h3');name.textContent=person.name;cell.append(photo,name);heading.append(cell);});
  head.append(heading);table.append(head);
  const body=document.createElement('tbody');
  [['전문 분야',p=>p.fields.join(' · ')],['주요 출장 지역',p=>window.YESSURI_AREAS_LABEL(p)],['출장·진단비',()=> '상담 시 확인']].forEach(([label,value])=>{
    const row=document.createElement('tr'),term=document.createElement('th');term.scope='row';term.textContent=label;row.append(term);
    people.forEach(person=>{const cell=document.createElement('td');cell.textContent=value(person);row.append(cell);});body.append(row);});
  const row=document.createElement('tr'),term=document.createElement('th');term.scope='row';term.textContent='상세 확인';row.append(term);
  people.forEach(person=>{const cell=document.createElement('td'),link=document.createElement('a');link.className='find-card-action';link.href='expert.html?id='+encodeURIComponent(person.id);link.textContent='프로필 예시 보기';cell.append(link);
    if(!sharedMode){const remove=document.createElement('button');remove.type='button';remove.className='comparison-remove';remove.textContent='비교 해제';remove.setAttribute('aria-label',person.name+' 비교 해제');remove.disabled=!window.YESSURI_COMPARE.canStore();remove.addEventListener('click',()=>window.YESSURI_COMPARE.toggle(person.id));cell.append(remove);}row.append(cell);});
  body.append(row);table.append(body);compareGrid.append(table);

}
shareButton.addEventListener('click', copyLink);
importButton.addEventListener('click', () => {
  const result = window.YESSURI_COMPARE.addMany(sharedExperts().map(person => person.id));
  shareStatus.textContent = result.reason === 'limit'
    ? '내 비교 목록은 최대 3곳입니다. 기존 목록에서 일부를 해제한 뒤 다시 담아 주세요.'
    : result.reason === 'storage' ? '이 브라우저에서는 비교 목록을 저장할 수 없습니다.'
    : result.unchanged ? '이 프로필은 이미 내 비교 목록에 있습니다.'
    : '공유받은 프로필을 내 비교 목록에 담았습니다.';
});
window.addEventListener('yessuri:compare-changed', renderComparison);
window.addEventListener('storage', renderComparison);
renderComparison();
