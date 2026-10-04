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
  return sharedMode ? sharedExperts() : window.YESSURI_COMPARE.selectedExperts();
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
      shareStatus.textContent = '링크를 복사하지 못했습니다. 브라우저의 주소를 직접 복사해 주세요.';
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
  people.forEach(person => {
    const card = document.createElement('article');
    card.className = 'compare-card';
    const image = document.createElement('img');
    image.src = `assets/images/${person.image}`;
    image.alt = person.imageAlt;
    image.loading = 'lazy';
    image.width = 1448;
    image.height = 1086;
    const body = document.createElement('div');
    body.className = 'compare-card-body';
    const name = document.createElement('h3');
    name.textContent = person.name;
    const note = document.createElement('p');
    note.className = 'compare-card-note';
    note.textContent = '화면 구성용 가상 예시 프로필';
    const facts = document.createElement('dl');
    const rows = [
      ['기술자 유형', `${person.profileType} · 예시`],
      ['전문 분야', person.fields.join(' · ')],
      ['예시 출동 가능 지역', `부산 ${window.YESSURI_AREAS_LABEL(person)}`],
      ['경력', `${person.career} · 확인되지 않은 예시`]
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      row.append(term, description);
      facts.append(row);
    });
    body.append(name, note, facts);
    const actions = document.createElement('div');
    actions.className = 'compare-card-actions';
    const profileLink = document.createElement('a');
    profileLink.href = `expert.html?id=${encodeURIComponent(person.id)}`;
    profileLink.textContent = '프로필 보기';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'compare-button';
    if (!sharedMode) {
      removeButton.textContent = '비교 해제';
      removeButton.disabled = !window.YESSURI_COMPARE.canStore();
      removeButton.addEventListener('click', () => window.YESSURI_COMPARE.toggle(person.id));
    }
    actions.append(profileLink);
    if (!sharedMode) actions.append(removeButton);
    card.append(image, body, actions);
    compareGrid.append(card);
  });
}
shareButton.addEventListener('click', copyLink);
importButton.addEventListener('click', () => {
  const result = window.YESSURI_COMPARE.addMany(sharedExperts().map(person => person.id));
  shareStatus.textContent = result.reason === 'limit'
    ? '내 비교 목록은 최대 3명입니다. 기존 목록에서 일부를 해제한 뒤 다시 담아 주세요.'
    : result.reason === 'storage' ? '이 브라우저에서는 비교 목록을 저장할 수 없습니다.'
    : result.unchanged ? '이 프로필은 이미 내 비교 목록에 있습니다.'
    : '공유받은 프로필을 내 비교 목록에 담았습니다.';
});
window.addEventListener('yessuri:compare-changed', renderComparison);
window.addEventListener('storage', renderComparison);
renderComparison();
