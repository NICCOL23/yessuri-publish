/* Navigation only: existing pages retain authentication, data and editing behavior. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  const root = document.getElementById('root');
  if (!main || !root || document.body.dataset.technicianPage !== 'admin') return;
  const nav = document.createElement('nav');
  nav.className = 'admin-unified-navigation';
  nav.setAttribute('aria-label', '관리자 통합 메뉴');
  nav.hidden = true;
  const links = [
    ['신규 업체 등록 관리', 'technician-admin.html', '신청 확인·공개 등록'],
    ['공개 업체 정보 수정', 'technician-admin.html#independent-profile-list', '소개·동의·사진'],
    ['히어로 관리', 'hero-admin.html', '메인 사진·문구'],
    ['수리 분야 관리', 'field-admin.html', '추가·수정·표시 순서'],
    ['준비 안내 관리', 'guide-admin.html', '이용 순서·비용·준비물']
  ];
  for (const [title, href, description] of links) {
    const link = document.createElement('a');
    link.href = href;
    const label = document.createElement('strong');
    label.textContent = title;
    const hint = document.createElement('span');
    hint.textContent = description;
    link.append(label, hint);
    nav.append(link);
  }
  root.before(nav);
  function updateMenuHeight() {
    const height = Math.ceil(nav.getBoundingClientRect().height);
    main.style.setProperty('--admin-menu-height', height + 'px');
  }
  new ResizeObserver(updateMenuHeight).observe(nav);
  let locked = false;
  const profileHash = '#independent-profile-list';
  let anchorPending = location.hash === profileHash;
  function update() {
    nav.hidden = locked || !main.querySelector('.admin-session-bar, #admin-logout');
    updateMenuHeight();
    const showingProfiles = location.hash === profileHash;
    if (showingProfiles) root.dataset.adminWorkspace = 'profiles';
    else delete root.dataset.adminWorkspace;
    const active = showingProfiles ? 1 : 0;
    [...nav.children].forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    // This existing section is created after the authenticated application list loads.
    const target = anchorPending && !nav.hidden && root.querySelector('#independent-profile-list');
    if (target) {
      anchorPending = false;
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.setAttribute('tabindex', '-1');
      target.scrollIntoView({block: 'start'});
      target.focus({preventScroll: true});
    }
  }
  new MutationObserver(update).observe(main, {childList: true, subtree: true});
  addEventListener('hashchange', () => {anchorPending = location.hash === profileHash; update();});
  addEventListener('yessuri:admin-locked', () => {locked = true; nav.hidden = true;});
  update();
})();
