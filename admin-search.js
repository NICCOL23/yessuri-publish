/* Authenticated, read-only search using the existing administrator API. */
(() => {
  'use strict';
  let locked = false;
  const cleanups = new Set();
  const el = (tag, value, cls) => {const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n;};
  const norm = s => String(s || '').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '');
  const digits = s => String(s || '').replace(/\D/g, '');
  const values = v => Array.isArray(v) ? v : String(v || '').split(/,\s*|\n/).filter(Boolean);
  const matches = (row, q) => (!q.company || norm(row.company).includes(norm(q.company))) && (!q.phone || digits(row.phone).includes(digits(q.phone))) && (!q.field || window.YESSURI_SERVICE_FIELDS?.matches(row.fields,q.field)) && (!q.area || values(row.areas).some(a => a === q.area || a === '전체'));

  function panel(kind) {
    const form = el('form', undefined, 'admin-search');
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', kind === 'applications' ? '등록 신청 검색' : '공개 업체 검색');
    form.append(el('h3', kind === 'applications' ? '등록 신청 검색' : '공개 업체 검색'));
    const grid = el('div', undefined, 'admin-search-grid'), inputs = {};
    for (const [key, label] of [['company', '업체명·활동명'], ['phone', '연락처'], ['field', '전문 분야'], ['area', '출장 지역']]) {
      const wrap = el('div'), title = el('label', label), input = el(['field', 'area'].includes(key) ? 'select' : 'input');
      input.id = 'admin-search-' + kind + '-' + key;
      title.htmlFor = input.id;
      if (input.tagName === 'INPUT') {input.type = 'search'; input.maxLength = key === 'phone' ? 40 : 100; input.autocomplete = 'off'; input.placeholder = key === 'phone' ? '하이픈 없이도 검색 가능' : '업체명 일부 입력'; if (key === 'phone') input.inputMode = 'tel';}
      else {
        const all = el('option', key === 'field' ? '전체 분야' : '전체 지역'); all.value = ''; input.append(all);
        const items = key === 'field' ? window.YESSURI_SERVICE_FIELDS?.allItems || [] : (window.YESSURI_REGIONS || []).filter(v => v !== '전체').map(v => ({value:v,label:v}));
        for (const item of items) {const option = el('option', item.label); option.value = item.value; input.append(option);}
      }
      wrap.append(title, input); grid.append(wrap); inputs[key] = input;
    }
    const actions = el('div', undefined, 'admin-search-actions'), submit = el('button', '검색', 'btn primary'), reset = el('button', '검색 초기화', 'btn');
    submit.type = 'submit'; reset.type = 'button'; actions.append(submit, reset);
    const hint = el('p', '여러 조건은 모두 일치해야 합니다. 연락처는 일부 번호로도 검색할 수 있습니다.', 'hint');
    const status = el('p', '', 'admin-search-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    form.append(grid, actions, hint, status);
    return {form, inputs, submit, reset, status};
  }

  function attach({kind, host, api, state}) {
    if (!host || host.querySelector('.admin-search') || locked) return;
    const ui = panel(kind), original = kind === 'applications' ? [...host.children].filter(n => !n.classList.contains('admin-toolbar')) : [...host.querySelectorAll('.manage-profile-row')];
    const restored = new Map(original.map(n => [n, n.hidden]));
    const output = el('div', undefined, 'admin-search-results'); output.hidden = true;
    if (kind === 'applications') host.querySelector('.admin-toolbar').after(ui.form); else host.querySelector('.manage-profile-list').before(ui.form);
    host.append(output);
    let generation = 0, busy = false, found = [], currentPage = 1;
    const current = ticket => !locked && host.isConnected && ticket === generation;
    function restore() {for (const [n, hidden] of restored) n.hidden = hidden; output.replaceChildren(); output.hidden = true; found = [];}
    function reset() {generation++; busy = false; ui.submit.disabled = false; HTMLFormElement.prototype.reset.call(ui.form); restore(); ui.status.textContent = ''; ui.inputs.company.focus();}
    ui.reset.onclick = reset;
    const clear = () => {generation++; found = []; output.replaceChildren();}; cleanups.add(clear);
    function render() {
      if (locked || !host.isConnected) return;
      output.replaceChildren();
      if (!found.length) output.append(el('p', '검색 결과가 없습니다. 조건을 줄여 다시 검색하세요.'));
      const pages = Math.max(1, Math.ceil(found.length / 10));
      if (kind === 'applications') {
        for (const row of found.slice((currentPage - 1) * 10, currentPage * 10)) {
          const article = el('article', undefined, 'admin-search-row'), body = el('div');
          body.append(el('strong', row.company || '업체명 없음'), el('p', row.phone || '', 'hint'), el('p', values(row.fields).map(v=>window.YESSURI_SERVICE_FIELDS?.label(v)||v).join(' · ') + ' / ' + values(row.areas).join(' · '), 'hint'));
          const link = el('a', '열기', 'btn'); link.href = 'technician-detail.html?id=' + encodeURIComponent(row.id) + '&admin=1'; link.setAttribute('aria-label', (row.company || '업체') + ' 신청 열기'); article.append(body, link); output.append(article);
        }
        if (pages > 1) {
          const pagination = el('div', undefined, 'admin-search-actions'), previous = el('button', '이전', 'btn'), next = el('button', '다음', 'btn'); previous.type = next.type = 'button'; previous.disabled = currentPage === 1; next.disabled = currentPage === pages;
          previous.onclick = () => {currentPage--; render();}; next.onclick = () => {currentPage++; render();}; pagination.append(previous, el('span', currentPage + ' / ' + pages), next); output.append(pagination);
        }
      }
    }
    ui.form.onsubmit = async event => {
      event.preventDefault(); if (locked || busy) return;
      const q = Object.fromEntries(Object.entries(ui.inputs).map(([key,input]) => [key,input.value.trim()]));
      if (q.phone && !digits(q.phone)) {ui.status.textContent = '연락처에는 검색할 숫자를 입력하세요.'; ui.inputs.phone.focus(); return;}
      const ticket = ++generation; busy = true; ui.submit.disabled = true; restore(); ui.status.textContent = '관리자 자료를 검색하고 있습니다…';
      try {
        let rows = [], total;
        if (kind === 'applications') {
          let page = 1, expected;
          do {
            const result = await api('admin/applications?state=' + encodeURIComponent(state) + '&page=' + page);
            if (!current(ticket)) return;
            if (!Array.isArray(result.applications) || !Number.isSafeInteger(result.count) || result.count < 0) throw Error('신청 목록 응답을 확인하지 못했습니다. 다시 검색하세요.');
            if (expected !== undefined && expected !== result.count) throw Error('검색 중 신청 건수가 바뀌었습니다. 다시 검색하세요.');
            expected = result.count; rows.push(...result.applications); total = expected;
            if (rows.length < total && (!result.applications.length || page >= 10000)) throw Error('전체 신청을 확인하지 못했습니다. 다시 검색하세요.');
            page++;
          } while (rows.length < total);
          if (new Set(rows.map(r => r.id)).size !== total) throw Error('검색 중 신청 목록이 바뀌었습니다. 다시 검색하세요.');
        } else {
          // Search precisely the same existing management list. Never silently claim a truncated list is complete.
          const result = await (window.YESSURI_ADMIN_PROFILES?.readAll(api,{current:()=>current(ticket)}) || api('admin/profiles')); if (!current(ticket)) return;
          const profiles = Array.isArray(result) ? result : result.profiles;
          if (!Array.isArray(profiles)) throw Error('업체 목록을 확인하지 못했습니다. 다시 검색하세요.');
          if (!window.YESSURI_ADMIN_PROFILES && profiles.length >= 100) throw Error('업체가 100개 이상이라 전체 검색을 완료하지 못했습니다. 기존 업체 목록을 이용해 주세요. 검색 범위 점검이 필요합니다.');
          if (profiles.length !== original.length || profiles.some(p => !original.some(n => n.dataset.profileId === p.id))) throw Error('업체 목록이 변경되었습니다. 새로고침 후 다시 검색하세요.');
          total = profiles.length;
          let index = 0;
          const worker = async () => {while (index < profiles.length) {
            if (!current(ticket)) return; const entry = profiles[index++];
            if (q.phone || q.field || q.area) {
              const detail = await api('admin/profiles/' + encodeURIComponent(entry.id) + '/profile-management'); if (!current(ticket)) return;
              if (!detail.profile) throw Error('업체 정보를 확인하지 못했습니다. 다시 검색하세요.');
              const p = detail.profile; rows.push({id:entry.id,company:p.name,phone:p.phone,fields:p.fields,areas:p.service_areas});
            } else rows.push({id:entry.id,company:entry.name});
          }};
          await Promise.all(Array.from({length:Math.min(3,profiles.length)}, worker));
        }
        if (!current(ticket)) return;
        found = rows.filter(row => matches(row, q)); currentPage = 1;
        if (kind === 'applications') {for (const n of original) n.hidden = true; output.hidden = false; render();}
        else {const ids = new Set(found.map(r => r.id)); for (const row of original) row.hidden = !ids.has(row.dataset.profileId); output.hidden = false; render(); found = [];}
        ui.status.textContent = '전체 ' + total + '건 중 ' + rows.filter(row => matches(row,q)).length + '건' + (kind === 'applications' && state ? ' · 현재 처리 상태 기준' : '');
      } catch (error) {if (current(ticket)) {restore(); ui.status.textContent = error.status === 401 || error.status === 403 ? '관리자 로그인 상태를 확인해 주세요.' : error.message || '검색하지 못했습니다. 다시 시도하세요.';}}
      finally {if (current(ticket)) {busy = false; ui.submit.disabled = false;}}
    };
  }
  window.YESSURI_ADMIN_SEARCH = {mount({api}) {
    for (const clear of cleanups) clear(); cleanups.clear();
    const state = new URLSearchParams(location.search).get('state') || '';
    attach({kind:'applications',host:document.getElementById('admin-applications'),api,state});
    const profiles = document.getElementById('independent-profile-list');
    if (profiles) {
      // Existing profile list resolves asynchronously; install only after its status shows completion.
      const ready = () => {const status = profiles.querySelector('[role=status]'); if (!locked && profiles.isConnected && /개 공개 프로필/.test(status?.textContent || '')) {observer.disconnect(); attach({kind:'vendors',host:profiles,api,state});}};
      const observer = new MutationObserver(ready); observer.observe(profiles,{childList:true,subtree:true}); ready();
    }
  }};
  addEventListener('yessuri:admin-locked', () => {locked = true; for (const clear of cleanups) clear(); cleanups.clear();});
})();
