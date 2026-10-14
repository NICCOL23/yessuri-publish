/* Run before the hero is parsed, so visible text never flashes to hidden. */
(() => {
  const key = 'yessuri:hero-seen:v1';
  try {
    const seen = sessionStorage.getItem(key);
    sessionStorage.setItem(key, '1');
    const navigation = performance.getEntriesByType('navigation')[0];
    const restored = navigation && ['reload', 'back_forward'].includes(navigation.type);
    const deepLink = location.hash && location.hash !== '#top';
    if (seen || restored || deepLink || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('hero-motion-first');
  } catch {
    // Storage or script capability is unavailable: keep the default visible title.
  }
})();
