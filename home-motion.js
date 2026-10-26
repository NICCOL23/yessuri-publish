/* Decorative background changes independently of the original service tabs. */
(() => {
  'use strict';
  const root = document.querySelector('#top.hero-carousel');
  const scenes = [...document.querySelectorAll('.hero-showcase .full-bg-scene')];
  if (!root || scenes.length < 2) return;
  let index = 0, timer;
  function show(next) {
    index = next;
    scenes.forEach((scene, i) => scene.classList.toggle('active', i === index));
  }
  function start() {
    clearInterval(timer);
    timer = setInterval(() => show((index + 1) % scenes.length), 8000);
  }
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  // Observe the existing slider so clicks, arrow keys and touch all stay in sync.
  const observer = new MutationObserver(() => {
    const selected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    if (selected >= 0) { show(selected); start(); }
  });
  tabs.forEach(tab => observer.observe(tab, { attributes: true, attributeFilter: ['aria-selected'] }));
  const labels = {
    '싱크대·붙박이장': ['싱크대·', '붙박이장'],
    'TV·LED모니터수리': ['TV·LED 모니터', '수리'],
    '컴퓨터수리·업그레이드': ['컴퓨터 수리·', '업그레이드']
  };
  document.querySelectorAll('#categories .category-card').forEach(card => {
    const title = card.querySelector('span:not(.category-icon)');
    if (!title) return;
    const lines = labels[title.textContent.replace(/\s/g, '')];
    if (lines) title.replaceChildren(document.createTextNode(lines[0]), document.createElement('br'), document.createTextNode(lines[1]));
    const description = card.querySelector('.category-description');
    if (description) card.title = description.textContent;
  });
  start();
})();
