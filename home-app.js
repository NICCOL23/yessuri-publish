/* Activate only on an installed mobile home; restore original browser content on exit. */
(() => {
  'use strict';
  const installed = matchMedia('(display-mode:standalone)');
  const mobile = matchMedia('(max-width:760px)');
  const body = document.body;
  if (!body.classList.contains('home-modern')) return;
  const pictures = [...document.querySelectorAll('.hero-showcase .full-bg-scene')];
  const originals = pictures.map(p => p.querySelector('img').getAttribute('src'));
  const images = ['home', 'interior', 'devices'].map(name => `assets/images/app-home-20261023/hero-${name}-portrait.jpg`);
  const labels = new Map();
  let active = false;
  function syncLabels() {
    for (const [selector, text] of [
      ['#categories a[href*="field=display"]', 'TV모니터수리'],
      ['#categories a[href*="group=computer"]', '컴퓨터 수리']
    ]) {
      const card = document.querySelector(selector);
      const label = card && card.querySelector('span:not(.category-icon)');
      if (!label) continue;
      if (active) {
        if (!labels.has(label)) labels.set(label, {html: label.innerHTML, card, aria: card.getAttribute('aria-label')});
        if (label.textContent !== text) label.textContent = text;
        if (card.hasAttribute('aria-label') && card.getAttribute('aria-label') !== text) card.setAttribute('aria-label', text);
      }
    }
  }
  function sync() {
    const next = mobile.matches && (installed.matches || navigator.standalone === true);
    if (active === next) return;
    active = next;
    body.classList.toggle('ys-home-installed', active);
    pictures.forEach((picture, i) => { picture.querySelector('img').setAttribute('src', active ? images[i] : originals[i]); });
    if (active) syncLabels();
    else {
      for (const [label, original] of labels) {
        label.innerHTML = original.html;
        if (original.aria === null) original.card.removeAttribute('aria-label');
        else original.card.setAttribute('aria-label', original.aria);
      }
      labels.clear();
    }
  }
  const grid = document.querySelector('#category-grid');
  if (grid) new MutationObserver(() => { if (active) syncLabels(); }).observe(grid, {childList: true, subtree: true});
  installed.addEventListener('change', sync);
  mobile.addEventListener('change', sync);
  sync();
})();
