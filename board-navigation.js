(() => {
  const nav = document.getElementById('home-menu');
  if (!nav || nav.querySelector('[data-board-link]')) return;
  const guide = [...nav.querySelectorAll('a')].find(a => a.getAttribute('href') === 'guide.html');
  if (!guide) return;
  const link = document.createElement('a');
  link.href = 'questions.html'; link.textContent = '수리 질문'; link.dataset.boardLink = '';
  const current = /\/(questions|question|question-write|question-manage|questions-example|board-notice)\.html$/.test(location.pathname);
  if (current) { link.className = 'board-current'; link.setAttribute('aria-current', location.pathname.endsWith('/questions.html') ? 'page' : 'location'); }
  const anchor = guide.closest('.ys-guide-nav') || guide;
  anchor.after(link);
})();
