// 관심 목록에는 예시 프로필 ID만 저장합니다. 계정이나 서버와 동기화되지 않습니다.
(function () {
  const key = 'yessuri-favorite-experts-v1';
  const boundButtons = new Map();
  function readIds() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
  function canStore() {
    try {
      const probe = `${key}-probe`;
      sessionStorage.setItem(probe, '1');
      sessionStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
  function saved(id) { return readIds().includes(id); }
  function visibleExperts() {
    const ids = new Set(readIds());
    return window.YESSURI_PUBLIC_EXPERTS().filter(person => ids.has(person.id));
  }
  function toggle(id) {
    if (!window.YESSURI_PUBLIC_EXPERTS().some(person => person.id === id)) return false;
    const ids = new Set(readIds());
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    try {
      sessionStorage.setItem(key, JSON.stringify([...ids]));
      window.dispatchEvent(new Event('yessuri:favorites-changed'));
      return true;
    } catch {
      return false;
    }
  }
  function refreshButtons() {
    for (const [button, id] of boundButtons) {
      if (!button.isConnected) {
        boundButtons.delete(button);
        continue;
      }
      const isSaved = saved(id);
      button.textContent = isSaved ? '♥ 관심 해제' : '♡ 관심 저장';
      button.setAttribute('aria-pressed', String(isSaved));
      button.disabled = !canStore();
      if (button.disabled) button.title = '현재 창에서는 관심 목록을 저장할 수 없습니다.';
    }
  }
  function bindButton(button, id) {
    boundButtons.set(button, id);
    button.textContent = saved(id) ? '♥ 관심 해제' : '♡ 관심 저장';
    button.setAttribute('aria-pressed', String(saved(id)));
    button.disabled = !canStore();
    if (button.disabled) button.title = '현재 창에서는 관심 목록을 저장할 수 없습니다.';
    button.addEventListener('click', () => toggle(id));
  }
  window.addEventListener('yessuri:favorites-changed', refreshButtons);
  window.addEventListener('storage', refreshButtons);
  window.YESSURI_FAVORITES = { saved, visibleExperts, toggle, bindButton, canStore };
})();
