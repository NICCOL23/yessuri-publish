/* Color controls participate in existing draft/version/review workflows. No local storage. */
(()=>{'use strict';let current,colors={},entries=new Map(),locked=false;const rgb=v=>{const n=v?.match(/\d+/g);return n?.length>=3?'#'+n.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase():'#19334E';},canonical=v=>{v=v.trim();if(/^#[a-f0-9]{3}$/i.test(v))v='#'+[...v.slice(1)].map(x=>x+x).join('');return /^#[a-f0-9]{6}$/i.test(v)?v.toUpperCase():null;};let defaults={};
function read(){for(const e of entries.values())if(e.code?.getAttribute('aria-invalid')==='true'){e.box.closest('details')?.setAttribute('open','');e.code.focus();throw Error('글자색 코드를 확인한 뒤 저장하세요.');}return {...colors};}
function update(e){const v=colors[e.id]||defaults[e.id]||'#19334E';e.picker.value=v;if(current.kind==='hero'){if(colors[e.id]||defaults[e.id])e.input.style.setProperty('color',v);else e.input.style.removeProperty('color');}if(document.activeElement!==e.code)e.code.value=v;e.note.textContent=colors[e.id]?'사용자 지정 '+v:'원래 색상 · '+(defaults[e.id]||'기존 디자인 유지');e.code.removeAttribute('aria-invalid');e.note.classList.remove('error');}
function changed(){current.onChange({...colors});}
function fill(options){if(locked)return;current=options;colors=window.YESSURI_TEXT_COLOR.validate(options.content.textColors,options.kind==='hero'?window.YESSURI_TEXT_COLOR.heroKeys:options.fields.map(f=>f.id));entries=new Map();document.querySelectorAll('.admin-text-color').forEach(n=>n.remove());if(options.kind==='guide'){fillGuide(options.fields);return;}const fields=window.YESSURI_TEXT_COLOR.heroKeys.map(id=>({id,label:({title1:'제목 첫째 줄',title2:'제목 둘째 줄',description1:'설명 첫째 줄',description2:'설명 둘째 줄'}[id])}));for(const f of fields){const input=document.getElementById(f.id);if(!input)continue;const box=document.createElement('fieldset');box.className='admin-text-color local-color-control';box.dataset.colorField=f.id;box.innerHTML='<legend></legend><div class="local-color-row"><label>색상 선택 <input type="color"></label><label>색상 코드 <input type="text" maxlength="7" spellcheck="false" autocomplete="off" placeholder="#008C8C"></label><button type="button">원래 색상</button></div><output></output>';box.querySelector('legend').textContent=f.label+' 글자색';const e={id:f.id,input,box,picker:box.querySelector('[type=color]'),code:box.querySelector('[type=text]'),note:box.querySelector('output')};e.picker.setAttribute('aria-label',f.label+' 색상 선택');e.code.setAttribute('aria-label',f.label+' 색상 코드');e.note.id='text-color-note-'+f.id;e.code.setAttribute('aria-describedby',e.note.id);
box.querySelector('button').setAttribute('aria-label',f.label+' 원래 색상');e.picker.oninput=event=>{event.stopPropagation();colors[f.id]=e.picker.value.toUpperCase();update(e);changed();};e.code.oninput=event=>{event.stopPropagation();const v=canonical(e.code.value);if(v){colors[f.id]=v;update(e);}else{e.code.setAttribute('aria-invalid','true');e.note.classList.add('error');e.note.textContent='#과 3자리 또는 6자리 색상 코드를 입력하세요.';}changed();};e.code.onblur=()=>{const v=canonical(e.code.value);if(v)e.code.value=v;};box.querySelector('button').onclick=()=>{delete colors[f.id];update(e);changed();};box.addEventListener('change',event=>event.stopPropagation());box.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();e.code.blur();}});input.after(box);entries.set(f.id,e);update(e);}}
const recentGuideColors = [];
function updateSwatch(entry) {
  entry.swatch.style.backgroundColor = colors[entry.id] || defaults[entry.id] || '#19334E';
}
function fillGuide(fields) {
  const editor = document.getElementById('editor');
  const dialog = document.createElement('dialog');
  dialog.className = 'admin-text-color guide-color-dialog';
  dialog.setAttribute('aria-labelledby', 'guide-color-title');
  dialog.innerHTML = '<h2 id="guide-color-title"></h2><div class="local-color-row"><label>색상 선택 <input type="color"></label><label>색상 코드 <input type="text" maxlength="7" autocomplete="off" spellcheck="false" aria-describedby="guide-color-help"></label></div><small id="guide-color-help">색상 코드는 #008C8C처럼 입력하세요.</small><div class="guide-recent-colors" hidden><p>최근 사용한 색</p><div></div></div><p role="status" class="error"></p><div class="guide-color-actions"><button type="button">원래 색상</button><button type="button">취소</button><button type="button" class="primary">적용</button></div>';
  const title = dialog.querySelector('h2');
  const picker = dialog.querySelector('[type=color]');
  const code = dialog.querySelector('[type=text]');
  const error = dialog.querySelector('[role=status]');
  const recent = dialog.querySelector('.guide-recent-colors');
  const [reset, cancel, apply] = dialog.querySelectorAll('.guide-color-actions button');
  let active;
  function clearError() {
    error.textContent = '';
    code.removeAttribute('aria-invalid');
  }
  function selectColor(value) {
    picker.value = value;
    code.value = value;
    clearError();
  }
  function commit(value) {
    if (value) {
      colors[active.id] = value;
      const index = recentGuideColors.indexOf(value);
      if (index >= 0) recentGuideColors.splice(index, 1);
      recentGuideColors.unshift(value);
      recentGuideColors.length = Math.min(recentGuideColors.length, 6);
    } else {
      delete colors[active.id];
    }
    updateSwatch(active);
    dialog.close();
    changed();
  }
  function open(entry) {
    active = entry;
    title.textContent = entry.label + ' 글자색';
    selectColor(colors[entry.id] || defaults[entry.id] || '#19334E');
    const buttons = recent.querySelector('div');
    buttons.replaceChildren(...recentGuideColors.map(value => {
      const button = document.createElement('button');
      button.type = 'button';
      const swatch = document.createElement('span');
      swatch.style.backgroundColor = value;
      swatch.setAttribute('aria-hidden', 'true');
      button.className = 'guide-color-trigger';
      button.append(swatch, value);
      button.onclick = () => selectColor(value);
      return button;
    }));
    recent.hidden = !recentGuideColors.length;
    dialog.showModal();
  }
  picker.oninput = () => selectColor(picker.value.toUpperCase());
  code.oninput = () => {
    clearError();
    const value = canonical(code.value);
    if (value) picker.value = value;
  };
  apply.onclick = () => {
    const value = canonical(code.value);
    if (value) return commit(value);
    code.setAttribute('aria-invalid', 'true');
    error.textContent = '#과 3자리 또는 6자리 색상 코드를 입력하세요.';
    code.focus();
  };
  code.onkeydown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply.click();
    }
  };
  reset.onclick = () => commit(null);
  cancel.onclick = () => dialog.close();
  for (const field of fields) {
    const input = document.getElementById('edit-' + field.id);
    if (!input) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-color-trigger';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', field.group + ' · ' + field.label + ' 글자색');
    const swatch = document.createElement('span');
    swatch.setAttribute('aria-hidden', 'true');
    button.append(swatch, '글자색');
    const entry = {id: field.id, label: field.group + ' · ' + field.label, swatch};
    entries.set(field.id, entry);
    updateSwatch(entry);
    button.onclick = () => open(entry);
    input.closest('.guide-editor-row').append(button);
  }
  editor.after(dialog);
}
function refreshDefaults(){if(locked||!current)return;try{const frame=document.getElementById(current.kind==='hero'?'preview-frame':'frame');let doc=frame?.contentDocument;if(current.kind==='hero')doc=doc?.querySelector('#site-preview')?.contentDocument;if(!doc||doc.readyState!=='complete')return;const found=window.YESSURI_TEXT_COLOR.defaults(doc,current.kind,new URLSearchParams(location.search).get('slide')||1);for(const[id,v]of Object.entries(found)){const value=rgb(v);if(defaults[id]!==value){defaults[id]=value;const e=entries.get(id);if(e?.swatch){updateSwatch(e);}else if(e&&e.code.getAttribute('aria-invalid')!=='true')update(e);}}}catch{}}
const timer=setInterval(refreshDefaults,500);addEventListener('pagehide',()=>clearInterval(timer));addEventListener('yessuri:admin-locked',()=>{locked=true;document.querySelector('.guide-color-dialog')?.remove();colors={};entries.clear();clearInterval(timer);});window.YESSURI_TEXT_COLORS_ADMIN=Object.freeze({fill,read});})();
