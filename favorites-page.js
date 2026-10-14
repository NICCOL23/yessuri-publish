const favoriteGrid = document.querySelector('#favorite-grid');
const favoriteEmpty = document.querySelector('#favorite-empty');
const favoriteCount = document.querySelector('#favorite-count');
const compareStatus = document.querySelector('#compare-status');
const compareCount = document.querySelector('#compare-count');
function updateCompareCount() { compareCount.textContent = String(window.YESSURI_COMPARE.selectedExperts().length); }

function renderFavorites() {
  const people = window.YESSURI_FAVORITES.visibleExperts().map(window.YESSURI_PRESENT_EXPERT);
  favoriteGrid.replaceChildren();
  favoriteCount.textContent = String(people.length);
  favoriteEmpty.hidden = people.length > 0;
  people.forEach(person => {
    const card = document.createElement('article');
    card.className = 'find-card';
    const link = document.createElement('a');
    link.className = 'find-card-link';
    link.href = `expert.html?id=${encodeURIComponent(person.id)}`;
    const image = document.createElement('img');
    image.src = `assets/images/${person.image}`;
    image.alt = person.imageAlt;
    image.loading = 'lazy';
    image.width = 1448;
    image.height = 1086;
    const body = document.createElement('span');
    body.className = 'find-card-body';
    const kicker = document.createElement('span');
    kicker.className = 'find-card-kicker';
    kicker.textContent = `주요 출장 지역: ${window.YESSURI_AREAS_LABEL(person)} (예시)`;
    const name = document.createElement('strong');
    name.className = 'find-card-name';
    name.textContent = person.name;
    const fields = document.createElement('span');
    fields.className = 'find-card-fields';
    person.fields.forEach(field => {
      const tag = document.createElement('span');
      tag.textContent = field;
      fields.append(tag);
    });
    const action = document.createElement('span');
    action.className = 'find-card-action';
    action.textContent = '프로필 예시 보기 →';
    body.append(kicker, name, fields);
    link.append(image, body, action);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'favorite-button find-favorite';
    button.textContent = '관심 해제';
    button.dataset.saved = 'true';
    button.setAttribute('aria-label', person.name+' 관심 해제');
    button.setAttribute('aria-pressed', 'true');
    button.disabled = !window.YESSURI_FAVORITES.canStore();
    if (button.disabled) button.title = '이 브라우저에서는 관심 목록을 저장할 수 없습니다.';
    button.addEventListener('click', () => window.YESSURI_FAVORITES.toggle(person.id));
    const compareButton = document.createElement('button');
    compareButton.type = 'button';
    compareButton.className = 'compare-button';
    window.YESSURI_COMPARE.bindButton(compareButton, person.id, compareStatus);
    const controls = document.createElement('div');
    controls.className = 'find-card-controls';
    controls.append(button, compareButton);
    const actionColumn = document.createElement('div');
    actionColumn.className = 'saved-card-actions';
    const profile = document.createElement('a');
    profile.className = 'find-card-action';profile.href = link.href;profile.textContent = action.textContent;
    action.remove();actionColumn.append(profile, controls);
    card.append(link, actionColumn);
    favoriteGrid.append(card);
    compareButton.dataset.expertId=person.id;compareButton.setAttribute('role','checkbox');compareButton.setAttribute('aria-label',person.name+' 비교 선택');
  });
}
window.addEventListener('yessuri:favorites-changed', ()=>{renderFavorites();refreshFavoriteCompare();});
window.addEventListener('storage', renderFavorites);
function refreshFavoriteCompare(){updateCompareCount();favoriteGrid.querySelectorAll('.compare-button').forEach(button=>{button.textContent='비교 선택';button.setAttribute('aria-checked',String(window.YESSURI_COMPARE.selected(button.dataset.expertId)));button.removeAttribute('aria-pressed');});}
window.addEventListener('yessuri:compare-changed', refreshFavoriteCompare);
window.addEventListener('storage', updateCompareCount);
renderFavorites();
refreshFavoriteCompare();
document.querySelector('.compare-toolbar a').addEventListener('click',event=>{
  if(window.YESSURI_COMPARE.selectedExperts().length<2){event.preventDefault();compareStatus.textContent='비교할 업체를 2곳 이상 선택하세요.';}
});
