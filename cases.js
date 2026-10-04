const examples = window.YESSURI_CASES;
const filters = ['전체','타일','누수·수도','전기·조명'];
const params = new URLSearchParams(window.location.search);
let selected = filters.includes(params.get('category')) ? params.get('category') : '전체';
const filterContainer = document.querySelector('#case-filters');
const list = document.querySelector('#cases-list');
const count = document.querySelector('#case-count');

function renderCases() {
  filterContainer.replaceChildren();
  filters.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.setAttribute('aria-pressed', String(selected === category));
    button.addEventListener('click', () => { selected = category; renderCases(); });
    filterContainer.append(button);
  });
  const shown = examples.filter(item => selected === '전체' || item.category === selected);
  list.replaceChildren();
  count.textContent = String(shown.length);
  shown.forEach(item => {
    const card = document.createElement('a');
    card.className = 'cases-list-card';
    card.href = `case.html?id=${encodeURIComponent(item.id)}`;
    const image = document.createElement('img');
    image.src = `assets/images/${item.image}`;
    image.alt = item.imageAlt;
    image.loading = 'lazy';
    image.width = 1448;
    image.height = 1086;
    const content = document.createElement('span');
    content.className = 'cases-list-content';
    const category = document.createElement('span');
    category.className = 'cases-list-category';
    category.textContent = `${item.category} · 예시`;
    const title = document.createElement('strong');
    title.textContent = item.title;
    const problem = document.createElement('span');
    problem.className = 'cases-list-problem';
    problem.textContent = item.problem;
    const action = document.createElement('span');
    action.className = 'cases-list-action';
    action.textContent = '예시 자세히 보기 →';
    content.append(category,title,problem,action);
    card.append(image,content);
    list.append(card);
  });
}

document.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => {
  const toast = document.querySelector('#toast');
  toast.textContent = button.dataset.toast;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3500);
}));
renderCases();
