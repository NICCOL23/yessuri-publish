/* Full-width hero uses the available page width, excluding the scrollbar. */
(() => {
  'use strict';
  if (document.body.dataset.technicianPage !== 'board') return;
  let previousWidth = 0;
  const measure = () => {
    const width = document.documentElement.clientWidth;
    if (width === previousWidth) return;
    previousWidth = width;
    document.body.style.setProperty('--entry-viewport-width', width + 'px');
  };
  measure();
  new ResizeObserver(measure).observe(document.documentElement);
  window.addEventListener('resize', measure);
})();
