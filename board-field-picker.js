/* Opt-in field picker. The native select remains the search/form source of truth. */
(()=>{'use strict';window.YESSURI_BOARD_PICKER=()=>{
document.querySelectorAll('#board-root select[data-service-field-picker]').forEach(select=>{if(select.dataset.boardPickerReady)return;select.dataset.boardPickerReady='true';document.getElementById(select.id+'-panel')?.remove();
 const isRegion=select.dataset.serviceFieldPicker==='region',name=isRegion?'수리받을 지역':'수리 분야',titleText=isRegion?'수리받을 지역 선택':'수리 분야 선택';
 const host=document.createElement('span');host.className='ys-field-picker';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='ys-field-trigger';trigger.id=select.id+'-trigger';
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
 const caption=document.createElement('span'),chevron=document.createElement('span');chevron.className='ys-field-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';trigger.append(caption,chevron);
 const panel=document.createElement('div');panel.className='ys-field-panel';panel.hidden=true;panel.id=select.id+'-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby',panel.id+'-title');
 const heading=document.createElement('div');heading.className='ys-field-heading';
 const title=document.createElement('strong');title.id=panel.id+'-title';title.textContent=titleText;
 const count=document.createElement('span');count.className='ys-field-count';
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ys-field-dismiss';dismiss.setAttribute('aria-label',titleText+' 닫기');dismiss.textContent='×';heading.append(title,count,dismiss);
 const grid=document.createElement('div');grid.className='ys-field-options';grid.setAttribute('role','group');grid.setAttribute('aria-label',name);panel.append(heading,grid);trigger.setAttribute('aria-controls',panel.id);
 const options=Array.from(select.options);const first=options.shift();
 // Picker order only: preserve the main-page cards and shared service registry order.
 if(!isRegion)options.sort((a,b)=>Number(b.value==='컴퓨터·IT')-Number(a.value==='컴퓨터·IT'));if(first)options.unshift(first);
 count.textContent=(options.length-1)+(isRegion?'개 구·군':'개 분야');
 const buttons=options.map(option=>{const button=document.createElement('button');button.type='button';button.className='ys-field-option';button.dataset.value=option.value;button.textContent=option.textContent;button.addEventListener('click',()=>{select.value=option.value;close(true);select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));});grid.append(button);return button;});
 function sync(){caption.textContent=select.selectedOptions[0]?.textContent||(isRegion?'부산 전체':'전체 분야');trigger.setAttribute('aria-label',name+': '+caption.textContent);buttons.forEach(button=>{const selected=button.dataset.value===select.value;button.setAttribute('aria-pressed',String(selected));button.tabIndex=selected?0:-1;});}
 function place(){if(panel.hidden)return;const rect=trigger.getBoundingClientRect(),vv=window.visualViewport;const w=vv?.width||document.documentElement.clientWidth,h=vv?.height||innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;const width=Math.min(560,w-24),below=oy+h-rect.bottom-12,above=rect.top-oy-12;const up=below<260&&above>below;const available=Math.max(120,up?above:below);panel.style.width=width+'px';panel.style.maxHeight=Math.min(560,available)+'px';panel.style.left=Math.max(ox+12,Math.min(rect.left,ox+w-width-12))+'px';panel.style.top=(up?Math.max(oy+12,rect.top-panel.offsetHeight-6):rect.bottom+6)+'px';}
 function close(focus=false){panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});}
 function open(){sync();panel.hidden=false;trigger.setAttribute('aria-expanded','true');place();const selected=buttons.find(b=>b.dataset.value===select.value)||buttons[0];selected.focus({preventScroll:true});selected.scrollIntoView({block:'nearest'});}
 trigger.addEventListener('click',event=>{event.preventDefault();panel.hidden?open():close();});
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open();if(event.key==='Home')buttons[0].focus();if(event.key==='End')buttons.at(-1).focus();}});
 dismiss.addEventListener('click',()=>close(true));
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}const index=buttons.indexOf(document.activeElement);if(index<0)return;let next=index;switch(event.key){case 'ArrowRight':next=Math.min(index+1,buttons.length-1);break;case 'ArrowLeft':next=Math.max(index-1,0);break;case 'ArrowDown':next=Math.min(index+2,buttons.length-1);break;case 'ArrowUp':next=Math.max(index-2,0);break;case 'Home':next=0;break;case 'End':next=buttons.length-1;break;default:return;}event.preventDefault();buttons.forEach(b=>b.tabIndex=-1);buttons[next].tabIndex=0;buttons[next].focus();});
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!host.contains(event.target))close();});
 document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!host.contains(event.target))close();});
 // Keep URL restoration, condition removal and reset in sync without changing search code.
 const valueDescriptor=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
 Object.defineProperty(select,'value',{configurable:true,get(){return valueDescriptor.get.call(this);},set(value){valueDescriptor.set.call(this,value);sync();}});
 select.addEventListener('change',sync);select.form?.addEventListener('reset',()=>queueMicrotask(sync));
 window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true,capture:true});window.visualViewport?.addEventListener('resize',place);
 select.after(host);host.append(trigger);document.body.append(panel);select.hidden=true;
 const label=document.querySelector('label[for="'+select.id+'"]');label?.addEventListener('click',event=>{if(event.target===label){event.preventDefault();trigger.focus();}});
 sync();
});};})();
