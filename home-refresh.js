(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#home-menu');
  const closeMenu = (restoreFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
    menu.classList.remove('is-open');
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menu.classList.toggle('is-open', open);
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a, button')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.home-header')) closeMenu();
  });
  menu.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!document.activeElement.closest('.home-header')) closeMenu();
    });
  });
  matchMedia('(min-width: 901px)').addEventListener('change', () => closeMenu());
})();
