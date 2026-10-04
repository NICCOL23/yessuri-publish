// 비교 선택에는 이 브라우저의 공개 예시 프로필 ID만 저장합니다.
(function () {
  const key = 'yessuri-compare-experts-v1';
  const max = 3;
  const buttons = new Map();
  function readIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(stored) ? [...new Set(stored.filter(id => typeof id === 'string'))] : [];
    } catch {
      return [];
    }
  }
  function canStore() {
    try {
      const probe = `${key}-probe`;
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
  function selectedExperts() {
    const publicById = new Map(window.YESSURI_PUBLIC_EXPERTS().map(person => [person.id, person]));
    return readIds().map(id => publicById.get(id)).filter(Boolean).slice(0, max);
  }
  function selected(id) { return selectedExperts().some(person => person.id === id); }
  function toggle(id) {
    if (!window.YESSURI_PUBLIC_EXPERTS().some(person => person.id === id)) return { ok:false, reason:'unavailable' };
    const ids = selectedExperts().map(person => person.id);
    const index = ids.indexOf(id);
    if (index >= 0) ids.splice(index, 1);
    else if (ids.length >= max) return { ok:false, reason:'limit' };
    else ids.push(id);
    try {
      localStorage.setItem(key, JSON.stringify(ids));
      window.dispatchEvent(new Event('yessuri:compare-changed'));
      return { ok:true };
    } catch {
      return { ok:false, reason:'storage' };
    }
  }
  function addMany(idsToAdd) {
    const publicIds = new Set(window.YESSURI_PUBLIC_EXPERTS().map(person => person.id));
    const current = selectedExperts().map(person => person.id);
    const next = [...current];
    for (const id of idsToAdd) {
      if (!publicIds.has(id) || next.includes(id)) continue;
      if (next.length >= max) return { ok:false, reason:'limit' };
      next.push(id);
    }
    if (next.length === current.length) return { ok:true, unchanged:true };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('yessuri:compare-changed'));
      return { ok:true };
    } catch {
      return { ok:false, reason:'storage' };
    }
  }
  function refreshButtons() {
    for (const [button, id] of buttons) {
      if (!button.isConnected) { buttons.delete(button); continue; }
      const isSelected = selected(id);
      button.textContent = isSelected ? '비교 해제' : '비교 담기';
      button.setAttribute('aria-pressed', String(isSelected));
      button.disabled = !canStore();
      if (button.disabled) button.title = '이 브라우저에서는 비교 목록을 저장할 수 없습니다.';
    }
  }
  function bindButton(button, id, statusElement) {
    buttons.set(button, id);
    button.addEventListener('click', () => {
      const result = toggle(id);
      if (statusElement) {
        statusElement.textContent = result.reason === 'limit'
          ? '최대 3명까지 비교할 수 있습니다. 다른 기술자를 담으려면 한 명을 해제해 주세요.'
          : result.reason === 'storage' ? '이 브라우저에서는 비교 목록을 저장할 수 없습니다.' : '';
      }
    });
    const isSelected = selected(id);
    button.textContent = isSelected ? '비교 해제' : '비교 담기';
    button.setAttribute('aria-pressed', String(isSelected));
    button.disabled = !canStore();
    if (button.disabled) button.title = '이 브라우저에서는 비교 목록을 저장할 수 없습니다.';
  }
  window.addEventListener('yessuri:compare-changed', refreshButtons);
  window.addEventListener('storage', refreshButtons);
  window.YESSURI_COMPARE = { selectedExperts, selected, toggle, addMany, bindButton, canStore, max };
})();
