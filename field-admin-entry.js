(() => {
  'use strict';
  const root = document.getElementById('root');
  if (!root) return;
  function connect() {
    const toolbar = root.querySelector('.admin-toolbar');
    if (!toolbar || !root.querySelector('#admin-logout') || root.querySelector('#field-admin-link')) return;
    const link = document.createElement('a');
    link.id = 'field-admin-link';
    link.className = 'btn';
    link.href = 'field-admin.html';
    link.textContent = '수리 분야 관리';
    toolbar.append(link);
  }
  new MutationObserver(connect).observe(root, {childList: true, subtree: true});
  connect();
})();
