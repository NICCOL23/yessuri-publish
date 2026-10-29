/* Registration service-area picker. Keep the existing areas value as a comma-separated list. */
(() => {
  'use strict';
  function regions() { return window.YESSURI_REGIONS.filter(name => name !== '전체'); }
  function restore(value = '', note = '') {
    const list = regions(), raw = value.trim();
    if (!raw) return {selected: [], note};
    if (/^(부산(?:광역시)?\s*)?(전체|전\s*지역|전역)$/.test(raw)) return {selected: list.slice(), note};
    const names = raw.replace(/부산광역시\s*|부산\s+/g,'').split(/[,，·/\s]+/).filter(name => name && name !== '및');
    if (names.length && names.every(name => list.includes(name))) {
      return {selected: list.filter(name => names.includes(name)), note};
    }
    // Do not guess service areas from ambiguous legacy text (e.g. "해운대구 제외").
    return {selected: [], note: note ? note+'\n'+raw : raw, legacy: true};
  }
  function mount(form, {areaNotes = ''} = {}) {
    const input = form.querySelector('#t-areas');
    if (!input || input.dataset.areaPicker) return;
    input.dataset.areaPicker = 'true';
    const parent = input.closest('.field'), title = parent.querySelector('label');
    parent.classList.add('ys-service-areas');
    title.id = 'service-area-title';
    const previous = restore(input.value, areaNotes);
    const selected = new Set(previous.selected), list = regions();
    input.hidden = true;
    const make = (tag, text = '', className = '') => {
      const node = document.createElement(tag);
      node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const picker = make('div','','ys-area-picker');
    picker.setAttribute('role','group');
    picker.setAttribute('aria-labelledby',title.id);
    const help = make('p','출장 가능한 지역을 모두 선택해 주세요.','ys-area-help');
    help.id = 'service-area-help';
    picker.setAttribute('aria-describedby',help.id);
    picker.append(help);
    function option(text, name) {
      const label = make('label','','ys-area-option');
      const control = document.createElement('input');
      control.type = 'checkbox';
      control.id = 'service-area-'+name;
      control.dataset.areaPickerControl = 'true';
      label.append(control,make('span',text));
      return {label,control};
    }
    const all = option('부산 전 지역','all');
    all.label.classList.add('ys-area-all');
    all.label.append(make('span',list.length+'개 구·군 전체 선택','ys-area-count'));
    picker.append(all.label);
    const grid = make('div','','ys-area-grid'), choices = new Map();
    list.forEach((name,index) => {
      const choice = option(name,String(index));
      choices.set(name,choice);
      grid.append(choice.label);
      choice.control.addEventListener('change', () => {
        if (choice.control.checked) selected.add(name); else selected.delete(name);
        sync();
      });
    });
    picker.append(grid);
    const summary = make('div','','ys-area-summary');
    const count = make('span','','ys-area-selected-count');
    count.setAttribute('role','status');
    const chips = make('div','','ys-area-chips');
    summary.append(count,chips);
    picker.append(summary);
    const noteLabel = make('label','기타 출장 안내 (선택)','ys-area-note-label');
    noteLabel.htmlFor = 't-areaNotes';
    const note = document.createElement('textarea');
    note.id = 't-areaNotes'; note.name = 'areaNotes'; note.maxLength = 1000;
    note.value = previous.note;
    note.placeholder = '예: 평일은 해운대구·수영구, 토요일은 부산진구 출장 가능';
    picker.append(noteLabel,note,make('p','추가 출장비나 일정 조건이 있으면 적어주세요.','ys-area-help'));
    if (previous.legacy) picker.append(make('p','기존 출장 안내를 위에 보관했습니다. 출장 가능한 구·군을 선택해 주세요.','ys-area-help'));
    parent.append(picker);
    function sync(notify = true) {
      const names = list.filter(name => selected.has(name));
      input.value = names.join(', ');
      all.control.checked = names.length === list.length;
      all.control.indeterminate = names.length > 0 && names.length < list.length;
      all.label.classList.toggle('is-selected', all.control.checked);
      choices.forEach((choice,name) => {
        choice.control.checked = selected.has(name);
        choice.label.classList.toggle('is-selected',choice.control.checked);
      });
      count.textContent = '선택한 지역 '+names.length+'곳';
      chips.replaceChildren(...names.map(name => {
        const chip = make('button',name+' ×','ys-area-chip');
        chip.type = 'button';
        chip.setAttribute('aria-label',name+' 선택 해제');
        chip.addEventListener('click', () => {
          selected.delete(name); sync(); choices.get(name).control.focus();
        });
        return chip;
      }));
      if (notify) input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    all.control.addEventListener('change', () => {
      selected.clear();
      if (all.control.checked) list.forEach(name => selected.add(name));
      sync();
    });
    title.htmlFor = all.control.id;
    sync(false);
  }
  window.YESSURI_TECHNICIAN_AREAS = {mount,restore};
})();
