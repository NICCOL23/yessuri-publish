(() => {
  const hero = document.querySelector('.wg-hero');
  const photos = [...hero.querySelectorAll('.guide-motion img')];
  let current = 0;
  const paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  hero.classList.toggle('motion-paused', paused);
  setInterval(() => {
    if (paused) return;
    photos[current].classList.remove('active');
    current = (current + 1) % photos.length;
    photos[current].classList.add('active');
  }, 8000);
})();
