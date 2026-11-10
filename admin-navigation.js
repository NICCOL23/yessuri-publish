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
    ['등록 신청 관리', 'technician-admin.html', '신청 확인·답변'],
    ['공개 업체 관리', 'technician-admin.html#independent-profile-list', '소개·동의·사진'],
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
  let locked = false;
  let anchorPending = location.hash === '#independent-profile-list';
  function update() {
    nav.hidden = locked || !main.querySelector('.admin-session-bar, #admin-logout');
    const page = location.pathname.split('/').pop();
    const active = page === 'guide-admin.html' ? 4 : page === 'hero-admin.html' ? 2 : page === 'field-admin.html' ? 3 : location.hash === '#independent-profile-list' ? 1 : 0;
    [...nav.children].forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    // This existing section is created after the authenticated application list loads.
    const target = anchorPending && !nav.hidden && root.querySelector('#independent-profile-list');
    if (target) {
      anchorPending = false;
      target.setAttribute('tabindex', '-1');
      target.scrollIntoView({block: 'start'});
      target.focus({preventScroll: true});
    }
  }
  new MutationObserver(update).observe(main, {childList: true, subtree: true});
  addEventListener('hashchange', () => {anchorPending = location.hash === '#independent-profile-list'; update();});
  addEventListener('yessuri:admin-locked', () => {locked = true; nav.hidden = true;});
  update();
})();
