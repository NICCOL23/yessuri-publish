/* Compact search is opt-in by installed display mode, never ordinary browser tabs. */
(() => {
  'use strict';
  const display = matchMedia('(display-mode: standalone)');
  const mobile = matchMedia('(max-width:760px)');
  const root = document.body;
  const fields = document.querySelector('.find-filter-fields');
  const query = document.querySelector('.find-query-field');
  const reset = document.querySelector('#reset-filters');
  const originalResetParent = reset.parentElement;
  const heading = document.querySelector('#directory-results-title');
  const originalHeadingParent = heading.parentElement;
  const conditions = document.querySelector('#find-current-conditions');
  const disclosure = document.createElement('details');
  disclosure.className = 'app-query-disclosure';
  const summary = document.createElement('summary');
  summary.textContent = '업체명·작업 내용으로 검색';
  disclosure.append(summary);
  const resultRow = document.createElement('div');
  resultRow.className = 'app-results-row';
  let enabled = false;
  const syncQuery = () => { if (query.querySelector('input').value.trim()) disclosure.open = true; };
  const cards = () => {
    if (!enabled) return;
    document.querySelectorAll('#find-grid .ys-expert-card').forEach(card => {
      const compare = card.querySelector('.ys-expert-compare');
      const actions = card.querySelector('.ys-expert-actions');
      if (compare && compare.textContent !== '비교') compare.textContent = '비교';
      if (compare && compare.parentElement !== actions) {
        actions.append(compare);
      }
    });
  };
  const sync = () => {
    const next = mobile.matches && (display.matches || navigator.standalone === true);
    if (next === enabled) return;
    enabled = next;
    root.classList.toggle('ys-find-installed', enabled);
    if (enabled) {
      reset.textContent = '조건 초기화';
      fields.append(reset);
      disclosure.append(query);
      fields.after(disclosure);
      conditions.before(resultRow);
      resultRow.append(conditions, heading);
      syncQuery(); cards();
    } else {
      fields.insertBefore(query, fields.querySelector('[type=submit]'));
      originalResetParent.append(reset);
      reset.textContent = '검색 조건 초기화';
      originalHeadingParent.prepend(conditions, heading);
      disclosure.remove(); resultRow.remove();
      document.querySelectorAll('#find-grid .ys-expert-compare').forEach(button => {
        button.textContent = '비교 선택'; button.closest('.ys-expert-card').append(button);
      });
    }
  };
  new MutationObserver(cards).observe(document.querySelector('#find-grid'), {childList:true,subtree:true});
  window.addEventListener('yessuri:compare-changed', cards);
  window.addEventListener('yessuri:favorites-changed', cards);
  window.addEventListener('storage', cards);
  window.addEventListener('popstate', () => setTimeout(syncQuery, 0));
  query.addEventListener('input', syncQuery);
  display.addEventListener('change', sync);
  mobile.addEventListener('change', sync);
  sync();
})();
