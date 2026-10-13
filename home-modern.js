/* Open the existing preparation disclosure when following the category help link. */
(() => {
  const openPreparation = () => {
    if (location.hash !== '#guide-symptoms') return;
    const details = document.getElementById('guide-symptoms');
    if (!details) return;
    details.open = true;
    details.querySelector('summary').focus({preventScroll:true});
  };
  document.querySelector('.category-help a')?.addEventListener('click', () => {
    document.getElementById('guide-symptoms').open = true;
  });
  window.addEventListener('hashchange', openPreparation);
  openPreparation();
})();
