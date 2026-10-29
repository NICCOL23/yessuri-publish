/* Registration service-area drawer. "전체" remains the existing citywide storage value. */
(() => {
  'use strict';
  const citywide = '부산 전 지역';
  const regions = () => window.YESSURI_REGIONS.filter(name => name !== '전체');
  function restore(value = '', note = '') {
    const list = [citywide,...regions()], raw = value.trim();
    if (!raw) return {selected: [], note};
    const normalized = raw.replace(/부산(?:광역시)?\s*(전\s*지역|전체|전역)/g,'전체').replace(/부산광역시\s*|부산\s+/g,'');
    const names = normalized.split(/[,，·/\s]+/).filter(name => name && name !== '및').map(name => name === '전체' ? citywide : name);
    if (names.length && names.every(name => list.includes(name))) return {selected: list.filter(name => names.includes(name)), note};
    return {selected: [], note: note ? note+'\n'+raw : raw, legacy: true};
  }
  function mount(form, {areaNotes = ''} = {}) {
    const input = form.querySelector('#t-areas');
    if (!input || input.dataset.areaPicker) return;
    input.dataset.areaPicker = 'true';
    const parent = input.closest('.field'), title = parent.querySelector('label');
    parent.classList.add('ys-service-areas'); title.id = 'service-area-title';
    const previous = restore(input.value,areaNotes), selected = new Set(previous.selected), list = [citywide,...regions()];
    input.hidden = true;
    const make = (tag,text = '',className = '') => {
      const node = document.createElement(tag); node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const picker = make('div','','ys-area-picker');
    const trigger = make('button','지역 선택·변경 ›','ys-area-trigger');
    trigger.type = 'button'; trigger.id = 'service-area-trigger';
    trigger.setAttribute('aria-haspopup','dialog'); trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls','service-area-dialog'); title.htmlFor = trigger.id; picker.append(trigger);
    const dialog = make('dialog','','ys-area-dialog'); dialog.id = 'service-area-dialog';
    dialog.setAttribute('aria-labelledby','service-area-dialog-title'); dialog.setAttribute('aria-describedby','service-area-dialog-help');
    const head = make('div','','ys-area-dialog-head');
    const heading = make('h2','출장 지역 선택'); heading.id = 'service-area-dialog-title';
    const close = make('button','닫기','ys-area-close'); close.type = 'button'; close.setAttribute('aria-label','지역 선택 창 닫기');
    head.append(heading,close);
    const help = make('p','여러 지역을 선택할 수 있습니다. 부산 전 지역도 한 항목으로 함께 선택할 수 있습니다.','ys-area-help');
    help.id = 'service-area-dialog-help'; dialog.append(head,help);
    const grid = make('div','','ys-area-grid'), choices = new Map();
    list.forEach((name,index) => {
      const label = make('label','','ys-area-option'), control = document.createElement('input');
      control.type = 'checkbox'; control.id = index ? 'service-area-'+(index-1) : 'service-area-all'; control.dataset.areaPickerControl = 'true';
      label.append(control,make('span',name)); choices.set(name,{label,control});
      if (name === citywide) { label.classList.add('ys-area-all'); dialog.append(label); } else grid.append(label);
      control.addEventListener('change', () => { if (control.checked) selected.add(name); else selected.delete(name); sync(); });
    });
    dialog.append(grid);
    function summary() {
      const root = make('div','','ys-area-summary'), count = make('span','','ys-area-selected-count'), chips = make('div','','ys-area-chips');
      count.setAttribute('role','status'); root.append(count,chips); return {root,count,chips};
    }
    const outside = summary(), inside = summary();
    outside.root.id = 'service-area-selection'; trigger.setAttribute('aria-describedby',outside.root.id);
    picker.append(outside.root); dialog.append(inside.root);
    const done = make('button','선택 완료','ys-area-done'); done.type = 'button'; dialog.append(done); picker.append(dialog);
    const noteLabel = make('label','기타 출장 안내 (선택)','ys-area-note-label'); noteLabel.htmlFor = 't-areaNotes';
    const note = document.createElement('textarea'); note.id = 't-areaNotes'; note.name = 'areaNotes'; note.maxLength = 1000; note.value = previous.note;
    note.placeholder = '예: 평일은 해운대구·수영구, 토요일은 부산진구 출장 가능';
    picker.append(noteLabel,note,make('p','추가 출장비나 일정 조건이 있으면 적어주세요.','ys-area-help'));
    if (previous.legacy) picker.append(make('p','기존 출장 안내를 위에 보관했습니다. 출장 가능한 구·군을 선택해 주세요.','ys-area-help'));
    parent.append(picker);
    function sync(notify = true) {
      const names = list.filter(name => selected.has(name));
      input.value = names.map(name => name === citywide ? '전체' : name).join(', ');
      choices.forEach((choice,name) => { choice.control.checked = selected.has(name); choice.label.classList.toggle('is-selected',choice.control.checked); });
      for (const view of [outside,inside]) {
        view.count.textContent = '선택한 지역 '+names.length+'곳';
        view.chips.replaceChildren(...names.map(name => {
          const chip = make('span','','ys-area-chip'), mark = make('span','○','ys-area-selected-mark');
          mark.setAttribute('aria-hidden','true'); chip.append(make('span',name),mark); return chip;
        }));
        if (!names.length) view.chips.append(make('span','아직 선택한 지역이 없습니다.','ys-area-empty'));
      }
      if (notify) input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    trigger.addEventListener('click', () => { dialog.showModal(); trigger.setAttribute('aria-expanded','true'); choices.get(citywide).control.focus({preventScroll:true}); });
    close.addEventListener('click', () => dialog.close()); done.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { trigger.setAttribute('aria-expanded','false'); trigger.focus({preventScroll:true}); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); dialog.close(); } });
    sync(false);
  }
  window.YESSURI_TECHNICIAN_AREAS = {mount,restore};
})();
