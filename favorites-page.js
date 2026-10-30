(async()=>{await window.YESSURI_PUBLIC_READY;
const favoriteGrid = document.querySelector('#favorite-grid');
const favoriteEmpty = document.querySelector('#favorite-empty');
const favoriteCount = document.querySelector('#favorite-count');
const compareStatus = document.querySelector('#compare-status');
const compareCount = document.querySelector('#compare-count');
function updateCompareCount() { compareCount.textContent = String(window.YESSURI_COMPARE.selectedExperts().length); }

function renderFavorites() {
  const people = window.YESSURI_FAVORITES.visibleExperts().map(window.YESSURI_EXPERT_CARD.present);
  favoriteGrid.replaceChildren();
  favoriteCount.textContent = String(people.length);
  favoriteEmpty.hidden = people.length > 0;
  people.forEach(person => {
    const card=window.YESSURI_EXPERT_CARD.create(person,{compare:true,compact:true});
    favoriteGrid.append(card);
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

})();