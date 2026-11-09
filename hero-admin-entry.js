(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  function connect() {
    const toolbar = root.querySelector('.admin-toolbar');
    if (!toolbar || !root.querySelector('#admin-logout') || root.querySelector('#hero-admin-link')) return;
    const link = document.createElement('a');
    link.id = 'hero-admin-link';
    link.className = 'btn';
    link.href = 'hero-admin.html';
    link.textContent = '메인 히어로 관리';
    toolbar.append(link);
  }
  new MutationObserver(connect).observe(root, {childList: true, subtree: true});
  connect();
})();
