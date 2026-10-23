/* Activate only on an installed mobile home; restore browser content on exit. */
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
  const expertHeading = document.querySelector('#experts .section-head h2');
  const expertDescription = document.querySelector('#experts .section-head p');
  const headingText = expertHeading?.textContent;
  const descriptionText = expertDescription?.textContent;
  let titleRow;
  let active = false;
  function syncLabels() {
    for (const [selector, text] of [
      ['#categories a[href*="field=display"]', 'TV모니터수리'],
      ['#categories a[href*="group=computer"]', '컴퓨터 수리']
    ]) {
      const card = document.querySelector(selector);
      const label = card && card.querySelector('span:not(.category-icon)');
      if (!label || !active) continue;
      if (!labels.has(label)) labels.set(label, {html: label.innerHTML, card, aria: card.getAttribute('aria-label')});
      if (label.textContent !== text) label.textContent = text;
      if (card.hasAttribute('aria-label') && card.getAttribute('aria-label') !== text) card.setAttribute('aria-label', text);
    }
  }
  function syncExpertHeading() {
    if (!expertHeading) return;
    if (active) {
      expertHeading.textContent = '부산 지역 전문가';
      if (expertDescription) expertDescription.textContent = '전문 분야와 출장 지역을 확인하세요.';
      titleRow = document.createElement('div');
      titleRow.className = 'expert-section-title-row';
      const all = document.createElement('a');
      all.className = 'expert-section-all';
      all.href = 'find.html';
      all.textContent = '전체 보기 →';
      expertHeading.before(titleRow);
      titleRow.append(expertHeading, all);
    } else {
      if (titleRow) titleRow.replaceWith(expertHeading);
      titleRow = null;
      expertHeading.textContent = headingText;
      if (expertDescription) expertDescription.textContent = descriptionText;
    }
  }
  function sync() {
    const next = mobile.matches && (installed.matches || navigator.standalone === true);
    if (active === next) return;
    active = next;
    body.classList.toggle('ys-home-installed', active);
    pictures.forEach((picture, i) => { picture.querySelector('img').setAttribute('src', active ? images[i] : originals[i]); });
    syncExpertHeading();
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
