/* Registration-only multiselect using the existing nineteen service-field definitions. */
(() => {
 'use strict';
 function mount(form) {
  const input=form.querySelector('#t-fields');
  if(!input||input.dataset.fieldPicker)return;
  input.dataset.fieldPicker='true';input.hidden=true;
  const items=window.YESSURI_SERVICE_FIELDS.items;
  const parent=input.closest('.field'),title=parent.querySelector('label');
  parent.classList.add('ys-service-fields');title.id='service-field-title';
  const selected=new Set(),other=[];
  for(const token of input.value.split(/[,，\n]+/).map(s=>s.trim()).filter(Boolean)){
   const item=items.find(item=>item.value===token||item.label===token);
   if(item)selected.add(item.value);else other.push(token);
  }
  const make=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
  const picker=make('div','','ys-area-picker');
  const trigger=make('button','전문 분야 선택·변경 ›','ys-area-trigger');
  trigger.type='button';trigger.id='service-field-trigger';title.htmlFor=trigger.id;
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','service-field-dialog');trigger.setAttribute('aria-expanded','false');
  const dialog=make('dialog','','ys-area-dialog');dialog.id='service-field-dialog';
  dialog.setAttribute('aria-labelledby','service-field-dialog-title');dialog.setAttribute('aria-describedby','service-field-dialog-help');
  const head=make('div','','ys-area-dialog-head'),heading=make('h2','전문 분야 선택');heading.id='service-field-dialog-title';
  const close=make('button','닫기','ys-area-close');close.type='button';close.setAttribute('aria-label','전문 분야 선택 창 닫기');head.append(heading,close);
  const help=make('p','19개 종목 중 작업 가능한 전문 분야를 모두 선택해 주세요.','ys-area-help');help.id='service-field-dialog-help';dialog.append(head,help);
  const grid=make('div','','ys-area-grid'),choices=new Map();
  items.forEach((item,index)=>{
   const label=make('label','','ys-area-option'),control=document.createElement('input');
   control.type='checkbox';control.id='service-field-'+index;control.dataset.choicePickerControl='true';
   label.append(control,make('span',item.label));grid.append(label);choices.set(item.value,{label,control});
   control.addEventListener('change',()=>{if(control.checked)selected.add(item.value);else selected.delete(item.value);sync();});
  });dialog.append(grid);
  const otherLabel=make('label','기타 전문 분야 (선택)','ys-area-note-label');otherLabel.htmlFor='service-field-other';
  const custom=document.createElement('textarea');custom.id='service-field-other';custom.className='ys-field-other';custom.maxLength=2000;
  custom.value=other.join(', ');custom.placeholder='목록에 없는 분야나 기존 작업 내용을 적어주세요.';
  custom.dataset.choicePickerControl='true';
  dialog.append(otherLabel,custom);
  function summary(){const root=make('div','','ys-area-summary'),count=make('span','','ys-area-selected-count'),chips=make('div','','ys-area-chips');count.setAttribute('role','status');root.append(count,chips);return{root,count,chips};}
  const outside=summary(),inside=summary();outside.root.id='service-field-selection';trigger.setAttribute('aria-describedby',outside.root.id);
  dialog.append(inside.root);
  const done=make('button','선택 완료','ys-area-done');done.type='button';dialog.append(done);
  const error=make('p','','field-error');error.setAttribute('role','alert');dialog.append(error);
  picker.append(trigger,outside.root,dialog);parent.append(picker);
  function sync(notify=true){
   const chosen=items.filter(item=>selected.has(item.value));
   const extras=[...new Set(custom.value.split(/[,，\n]+/).map(s=>s.trim()).filter(Boolean))];
   input.value=[...chosen.map(item=>item.value),...extras].join(', ');
   choices.forEach((choice,value)=>{choice.control.checked=selected.has(value);choice.label.classList.toggle('is-selected',choice.control.checked);});
   const names=[...chosen.map(item=>item.label),...extras];
   for(const view of[outside,inside]){
    view.count.textContent='선택한 분야 '+names.length+'개';
    view.chips.replaceChildren(...names.map(name=>{const chip=make('span','','ys-area-chip'),mark=make('span','○','ys-area-selected-mark');mark.setAttribute('aria-hidden','true');chip.append(make('span',name),mark);return chip;}));
    if(!names.length)view.chips.append(make('span','아직 선택한 분야가 없습니다.','ys-area-empty'));
   }
   const tooLong=input.value.length>2000;
   error.textContent=tooLong?'선택한 분야와 기타 내용을 합해 2,000자 이내로 적어주세요.':'';
   done.disabled=tooLong;
   if(notify)input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  custom.addEventListener('input',()=>sync());
  trigger.addEventListener('click',()=>{dialog.showModal();trigger.setAttribute('aria-expanded','true');choices.get(items[0].value).control.focus({preventScroll:true});});
  close.addEventListener('click',()=>dialog.close());done.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'){event.preventDefault();if(!done.disabled)dialog.close();}});
  sync(false);
 }
 window.YESSURI_TECHNICIAN_FIELDS={mount};
})();
