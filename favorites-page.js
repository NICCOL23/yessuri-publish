const favoriteGrid = document.querySelector('#favorite-grid');
const favoriteEmpty = document.querySelector('#favorite-empty');
const favoriteCount = document.querySelector('#favorite-count');
const compareStatus = document.querySelector('#compare-status');
const compareCount = document.querySelector('#compare-count');
function updateCompareCount() { compareCount.textContent = String(window.YESSURI_COMPARE.selectedExperts().length); }

function renderFavorites() {
  const people = window.YESSURI_FAVORITES.visibleExperts();
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
    kicker.textContent = `예시 출동 가능 지역: 부산 ${window.YESSURI_AREAS_LABEL(person)} · ${person.profileType} 예시`;
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
    action.textContent = '프로필 보기 →';
    body.append(kicker, name, fields);
    link.append(image, body, action);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'favorite-button find-favorite';
    button.textContent = '♥ 관심 해제';
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
    card.append(link, controls);
    favoriteGrid.append(card);
  });
}
window.addEventListener('yessuri:favorites-changed', renderFavorites);
window.addEventListener('storage', renderFavorites);
window.addEventListener('yessuri:compare-changed', updateCompareCount);
window.addEventListener('storage', updateCompareCount);
renderFavorites();
updateCompareCount();
