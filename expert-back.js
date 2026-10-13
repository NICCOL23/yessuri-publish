(() => {
  const link = document.getElementById('expert-back');
  if (!link) return;
  try {
    const previous = new URL(document.referrer);
    if (previous.origin === location.origin && previous.pathname.endsWith('/find.html')) {
      link.href = previous.pathname + previous.search + previous.hash;
    }
  } catch { /* Direct entry keeps the safe directory fallback. */ }
})();
