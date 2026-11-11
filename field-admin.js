'use strict';
let locked=false;
let state,fields,dirty=false,busy=false,previewed=false,width=1440;
const $=id=>document.getElementById(id),make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
function notice(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);if(error)window.YESSURI_SAVE_RESULT?.uncertain(text);}
function headers(){let s;try{s=JSON.parse(sessionStorage.getItem('technician-admin')||'null');}catch{}return{apikey:window.YESSURI_TECHNICIAN.publishableKey,'x-admin-token':s?.token||''};}
const imageUrls=new Set();
async function imageSource(value){if(!value.startsWith('/api/hero-images/'))return value;const r=await fetch(window.YESSURI_TECHNICIAN.endpoint+'?route='+encodeURIComponent(value.replace('/api/hero-images/','/api/admin/hero/images/')),{headers:headers(),cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('사진을 읽지 못했습니다.');const url=URL.createObjectURL(await r.blob());if(locked){URL.revokeObjectURL(url);return '';}imageUrls.add(url);return url;}
async function thumbnail(img,value){try{const src=await imageSource(value);if(!locked&&img.isConnected)img.src=src;}catch{if(!locked)notice('사진을 불러오지 못했습니다.',true);}}
async function apiRequest(route,data){if(data&&['draft','publish','restore'].includes(route))window.YESSURI_SAVE_RESULT?.begin(route);if(locked)throw Error('관리자 화면이 잠겼습니다.');let path=route==='state'?'/api/admin/fields':'/api/admin/fields/'+route;
if(route==='upload'){path='/api/admin/hero/image';data={photo:{type:'image/jpeg',data:data.data.split(',')[1]}};}
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(window.YESSURI_TECHNICIAN.endpoint+'?route='+encodeURIComponent(path),{method:data?'POST':'GET',headers:{...headers(),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store',credentials:'omit',signal:controller.signal});let result;try{result=await response.json();}catch{throw Error('서버 응답을 읽지 못했습니다. 다시 불러오기를 눌러 주세요.');}if(locked)throw Error('관리자 화면이 잠겼습니다.');if(!response.ok){const error=Error(result.error||result.message||'처리하지 못했습니다.');error.status=response.status;throw error;}return result;}catch(error){if(error.name==='AbortError')throw Error('서버 응답이 지연되고 있습니다. 다시 불러오기를 눌러 주세요.');throw error;}finally{clearTimeout(timer);}}
function controls(){window.YESSURI_RESTORE_COMPARE?.status({dirty,busy});if(locked)return;window.YESSURI_SAVE_RESULT?.update({state,dirty,busy});window.YESSURI_PUBLISH_COMPARE?.update({kind:'fields',state,dirty,busy,imageSource});document.querySelectorAll('#fields input,#fields textarea,#fields button,#field-side-body input,#field-side-body textarea,#field-side-body button,#field-side-close,#save,#preview,#published,#history button,#add-field').forEach(e=>e.disabled=busy);$('dirty').hidden=!dirty;$('reviewed').disabled=busy||dirty||!previewed;$('publish').disabled=busy||dirty||!previewed||!$('reviewed').checked;document.querySelectorAll('[data-move]').forEach(e=>e.disabled=busy||Number(e.dataset.to)<0||Number(e.dataset.to)>=fields.length);}
function changed(){dirty=true;previewed=false;$('reviewed').checked=false;controls();}
function confirmAction(text){$('question').textContent=text;$('dialog').showModal();return new Promise(resolve=>{const end=v=>{$('dialog').close();resolve(v);};$('cancel').onclick=()=>end(false);$('ok').onclick=()=>end(true);$('dialog').oncancel=e=>{e.preventDefault();end(false);};});}
async function work(task){if(locked)return;busy=true;controls();try{await task();}catch(e){if(!locked)notice(e.message,true);}finally{busy=false;controls();}}
let draggedField=null;
let dropTarget=null;
let dragScrollFrame=0;
let dragScrollY=0;
let lastDragOver=0;

function scrollWhileDragging(now){
  dragScrollFrame=0;
  if(!draggedField||locked||busy||now-lastDragOver>800)return;
  const top=Math.max(0,document.querySelector('.field-work-toolbar').getBoundingClientRect().bottom);
  const bottom=window.innerHeight;
  const edge=Math.min(96,(bottom-top)/3);
  if(edge<=0)return;
  let speed=0;
  if(dragScrollY>bottom-edge) speed=Math.min(1,(dragScrollY-bottom+edge)/edge);
  else if(dragScrollY<top+edge) speed=-Math.min(1,(top+edge-dragScrollY)/edge);
  if(speed)window.scrollBy({top:Math.sign(speed)*Math.ceil(Math.abs(speed)*18),behavior:'instant'});
  dragScrollFrame=requestAnimationFrame(scrollWhileDragging);
}

function clearFieldDrag(){
  if(dragScrollFrame)cancelAnimationFrame(dragScrollFrame);
  dragScrollFrame=0;
  draggedField?.classList.remove('field-dragging');
  dropTarget?.removeAttribute('data-drop-side');
  draggedField=null;
  dropTarget=null;
}

function addFieldDrag(card,heading,label){
  const handle=make('span','↕ 드래그');
  handle.className='field-drag-handle';
  handle.draggable=true;
  handle.title=label+' 순서 이동';
  handle.setAttribute('aria-hidden','true');
  heading.prepend(handle);
  handle.addEventListener('dragstart',event=>{
    if(locked||busy){event.preventDefault();return;}
    clearFieldDrag();
    draggedField=card;
    card.classList.add('field-dragging');
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',card.dataset.id);
  });
  handle.addEventListener('dragend',clearFieldDrag);
  const side=event=>{
    const bounds=card.getBoundingClientRect();
    const before=matchMedia('(min-width: 1200px)').matches
      ? event.clientX<bounds.left+bounds.width/2
      : event.clientY<bounds.top+bounds.height/2;
    return before?'before':'after';
  };
  card.addEventListener('dragover',event=>{
    if(!draggedField||draggedField===card||locked||busy)return;
    event.preventDefault();
    event.dataTransfer.dropEffect='move';
    dropTarget?.removeAttribute('data-drop-side');
    dropTarget=card;
    card.dataset.dropSide=side(event);
  });
  card.addEventListener('drop',event=>{
    if(!draggedField||locked||busy)return;
    event.preventDefault();
    const source=draggedField.dataset.id;
    const target=card.dataset.id;
    const after=side(event)==='after';
    clearFieldDrag();
    if(source===target)return;
    const from=fields.findIndex(field=>field.id===source);
    const destination=fields.findIndex(field=>field.id===target);
    if(from<0||destination<0)return;
    const insertAt=destination+(after?1:0)-(from<destination?1:0);
    if(insertAt===from)return;
    const [moved]=fields.splice(from,1);
    fields.splice(insertAt,0,moved);
    changed();
    render();
  });
}

document.addEventListener('dragover',event=>{
  if(!draggedField||locked||busy)return;
  dragScrollY=event.clientY;
  lastDragOver=performance.now();
  if(!dragScrollFrame)dragScrollFrame=requestAnimationFrame(scrollWhileDragging);
});
document.addEventListener('drop',clearFieldDrag);

const desktopFieldEditor=matchMedia('(min-width: 1200px)');
let selectedFieldId=null;
let mountedEditor=null;

function syncFieldEditor({focus=false}={}){
  const panel=$('field-side-panel');
  const editorRow=$('field-editor-row');
  const card=desktopFieldEditor.matches&&selectedFieldId
    ? $('fields').querySelector('[data-id="'+selectedFieldId+'"]')
    : null;
  const editor=card?.querySelector('.field-editor');

  if(mountedEditor&&mountedEditor.editor!==editor){
    mountedEditor.editor.append(mountedEditor.body);
    mountedEditor.editor.open=!desktopFieldEditor.matches;
    mountedEditor.card.classList.remove('is-editing');
    mountedEditor=null;
  }
  if(editor&&!mountedEditor){
    const cards=[...$('fields').querySelectorAll(':scope > .field')];
    const cardIndex=cards.indexOf(card);
    const rowEnd=Math.min(cardIndex+3-cardIndex%4,cards.length-1);
    cards[rowEnd].after(editorRow);
    panel.style.setProperty('--editor-origin', (cardIndex%4+.5)*25+'%');
    const body=editor.querySelector('.field-editor-body');
    $('field-side-body').append(body);
    editor.open=true;
    card.classList.add('is-editing');
    mountedEditor={editor,card,body};
  }

  editorRow.hidden=!editor;
  panel.hidden=!editor;
  if(editor){
    $('field-side-title').textContent=card.querySelector('h3').textContent+' 편집';
    if(focus)$('field-side-title').focus();
  }else{
    fit();
  }
}

function closeFieldEditor(){
  const summary=mountedEditor?.editor.querySelector('summary');
  selectedFieldId=null;
  syncFieldEditor();
  return summary;
}
$('field-side-close').onclick=()=>closeFieldEditor()?.focus();
desktopFieldEditor.addEventListener('change',()=>{
  if(desktopFieldEditor.matches){
    const opened=$('fields').querySelectorAll('.field-editor[open]');
    const selected=[...opened].find(editor=>editor.parentElement.dataset.id===selectedFieldId)||opened[0];
    selectedFieldId=selected?.parentElement.dataset.id??null;
    for(const editor of opened)editor.open=false;
  }
  syncFieldEditor();
});

function render(){if(locked)return;const focus=document.activeElement?.dataset.focus;
const expandedCards=new Set([...$('fields').querySelectorAll('.field-editor[open]')].map(editor=>editor.parentElement.dataset.id));
mountedEditor=null;$('field-side-body').replaceChildren();
$('fields').replaceChildren($('field-editor-row'));fields.forEach((f,index)=>{const li=make('li');li.className='field';li.dataset.id=f.id;const heading=make('div');heading.className='field-card-heading';heading.append(make('h3',(index+1)+'. '+f.label));const inactiveLabel=make('label');
inactiveLabel.className='check field-inactive-check';
const inactive=make('input');
inactive.type='checkbox';
inactive.checked=f.active===false;
inactive.setAttribute('aria-label',f.label+' 사용 안 함');
inactive.onchange=()=>{
  f.active=!inactive.checked;
  changed();
  li.classList.toggle('is-inactive',inactive.checked);
};
inactiveLabel.append(inactive,make('span','사용 안 함'));
li.classList.toggle('is-inactive',f.active===false);addFieldDrag(li,heading,f.label);li.append(heading);const connection=Object.assign(make('p','연결 고정: '+f.id+' / '+f.value+' / '+f.href),{className:'fixed'});const row=make('div');row.className='field-media-row';const img=make('img');void thumbnail(img,f.image);img.alt='';img.className='icon';const inputs=make('div');inputs.className='field-edit-grid';const media=make('div');media.className='field-upload';
for(const [key,label,max]of [['label','표시 이름',40],['description','설명',100]]){const title=make('label',label),input=make(key==='description'?'textarea':'input');input.value=f[key];if(key==='description')input.rows=2;input.maxLength=max;input.dataset.focus=f.id+'-'+key;input.setAttribute('aria-label',f.label+' '+label);input.addEventListener('input',()=>{f[key]=input.value;changed();});title.append(input);inputs.append(title);}
const uploadLabel=make('label','아이콘 교체 · JPG·PNG·WebP / 5MB 이내'),file=make('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label',f.label+' 아이콘 교체');uploadLabel.append(file);media.append(uploadLabel);file.onchange=()=>work(async()=>{const photo=file.files[0];if(!photo)return;if(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5*1024*1024)throw Error('JPG·PNG·WebP 형식의 5MB 이하 사진을 선택하세요.');const bitmap=await createImageBitmap(photo);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('이미지 해상도가 너무 큽니다.');}const canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const result=await api('upload',{data:canvas.toDataURL('image/jpeg',.9)});f.image=result.path;void thumbnail(img,f.image);changed();notice('아이콘을 준비했습니다. 수정 내용을 저장하세요.');file.value='';});
const visibleLabel=make('label');visibleLabel.className='check';const visible=make('input');visible.type='checkbox';visible.checked=f.visible;visible.setAttribute('aria-label',f.label+' 메인에 표시');visible.onchange=()=>{f.visible=visible.checked;changed();};visibleLabel.append(visible,make('span','메인에 표시 · 검색·등록 목록은 유지'));row.append(img,media,visibleLabel);const editor=make('details');
editor.className='field-editor';
editor.open=expandedCards.has(f.id);
const editSummary=make('summary','편집');
editSummary.setAttribute('aria-label',f.label+' 편집');
const editorBody=make('div');
editorBody.className='field-editor-body';
editorBody.append(inputs,row);
editor.append(editSummary,editorBody);
editSummary.addEventListener('click',event=>{
  if(!desktopFieldEditor.matches)return;
  event.preventDefault();
  if(locked||busy)return;
  if(selectedFieldId===f.id){closeFieldEditor();return;}
  selectedFieldId=f.id;
  syncFieldEditor({focus:true});
});
li.append(editor);
window.YESSURI_PHOTO_USAGE?.field(li);const actions=make('div');actions.className='toolbar';for(const[d,text]of[[-1,'위로'],[1,'아래로']]){const b=make('button',text);b.dataset.move='true';b.dataset.to=index+d;b.setAttribute('aria-label',f.label+' '+text);b.onclick=()=>{[fields[index],fields[index+d]]=[fields[index+d],fields[index]];changed();render();(mountedEditor?.body.querySelector('button:not(:disabled)')||$('fields').querySelector('[data-id="'+f.id+'"] button:not(:disabled)'))?.focus();};actions.append(b);}const reset=make('button','원본 아이콘');reset.onclick=()=>{f.image=state.original.find(o=>o.id===f.id)?.image||'assets/images/service-icons.svg#icon5';void thumbnail(img,f.image);changed();};actions.append(reset);const remove=make('button','삭제');remove.type='button';remove.className='field-remove';remove.setAttribute('aria-label',f.label+' 분야 삭제');remove.onclick=async()=>{const count=state.usage?.find(u=>u.id===f.id)?.count||0;if(count){if(await confirmAction('이 분야는 '+count+'개 자료에 연결되어 있습니다. 기존 연결을 유지하고 비활성화할까요?')){f.active=false;changed();render();}}else if(fields.length===1){notice('최소 한 개의 분야를 남겨 주세요.',true);}else if(await confirmAction('이 분야를 목록에서 삭제할까요? 수정 내용 저장·미리보기·게시 후 반영됩니다.')){fields.splice(index,1);changed();render();}};actions.append(remove);const help=make('details');help.className='field-help';help.append(make('summary','연결·사용 안내'),connection);const usage=li.querySelector('.photo-use-note');if(usage)help.append(usage);const footer=make('div');footer.className='field-footer';footer.append(actions,help);const settings=make('div');settings.className='field-footer-settings';settings.append(inactiveLabel);footer.append(settings);editorBody.append(footer);$('fields').append(li);});$('list-title').textContent='수리 분야 '+fields.length+'개';
if(!fields.some(field=>field.id===selectedFieldId))selectedFieldId=null;
syncFieldEditor();controls();}
function fill(s){if(locked)return;if(!Array.isArray(s.draft)||s.draft.length<1||s.draft.length>200||!Array.isArray(s.revisions))throw Error('분야 자료를 정상적으로 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.');state=s;$('field-workspace').hidden=false;$('load-recovery').hidden=true;fields=structuredClone(s.draft);dirty=false;previewed=false;$('reviewed').checked=false;render();$('version').textContent='현재 버전 '+s.version;$('history').replaceChildren();for(const r of s.revisions){const li=make('li',({original:'원본 보존',publish:'게시',restore:'복원'}[r.action]||r.action)+' · '+new Date(r.date).toLocaleString('ko-KR'));const b=make('button','이 버전으로 복원');b.onclick=async()=>{if(dirty){notice('변경 내용을 먼저 저장하세요.',true);return;}if(await confirmAction('선택한 기록으로 게시본과 수정 내용을 복원할까요? 기록에 없는 사용 중 분야는 기존 연결을 유지하도록 비활성으로 남습니다.'))work(async()=>{fill(await api('restore',{id:r.id,version:state.version}));show('published');window.YESSURI_SAVE_RESULT?.success('restore',state.version);notice('이전 버전으로 공개 내용을 복원했습니다. 홈페이지와 수정 내용이 선택한 기록으로 바뀌었습니다.');});};li.append(b);window.YESSURI_RESTORE_COMPARE?.mount({host:li,kind:"fields",state,revision:r,imageSource});$('history').append(li);}controls();}
function fit(){if(locked||!$('frame'))return;const scale=Math.min(1,$('frame').parentElement.clientWidth/width);$('frame').style.width=width+'px';$('frame').style.transform='scale('+scale+')';$('frame').parentElement.style.height=(1000*scale)+'px';}
function show(mode){if(locked)return;$('frame').src='field-preview.html?mode='+mode+'&v='+state.version;$('open').href='field-preview.html?mode='+mode;const modeLabel=$('mode');
  modeLabel.hidden=mode!=='draft';
  modeLabel.textContent=mode==='draft'?'저장한 수정 내용 · 공개 전':'';
  previewed=mode==='draft'&&!dirty;$('reviewed').checked=false;fit();controls();}
$('save').onclick=()=>work(async()=>{fill(await api('draft',{fields,version:state.version}));window.YESSURI_SAVE_RESULT?.success('draft',state.version);notice('수정 내용을 저장했습니다. 미리보기·변경 비교 후 게시하세요.');});$('preview').onclick=()=>{show('draft');if(dirty)notice('마지막 저장한 수정 내용입니다. 입력한 변경은 저장 후 반영됩니다.');};$('published').onclick=()=>show('published');$('reviewed').onchange=controls;$('publish').onclick=async()=>{if(await confirmAction('확인한 수정 내용을 메인 화면에 게시할까요?'))work(async()=>{fill(await api('publish',{version:state.version}));show('published');window.YESSURI_SAVE_RESULT?.success('publish',state.version);notice('홈페이지 공개가 완료됐습니다. 저장한 분야 설정이 메인 화면에 반영됐습니다.');});};
for(const[id,w]of[['pc',1440],['mobile',390]])$(id).onclick=()=>{width=w;$('pc').setAttribute('aria-pressed',String(w===1440));$('mobile').setAttribute('aria-pressed',String(w===390));fit();};new ResizeObserver(fit).observe($('frame').parentElement);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function initialize(){await work(async()=>{try{notice('수리 분야와 복원 기록을 불러오는 중입니다.');const s=await api('state');fill(s);show('published');notice('');}catch(e){if(!locked){$('field-workspace').hidden=true;$('load-recovery').hidden=false;$('field-login').hidden=![401,403].includes(e.status);}throw e;}});}
$('load-retry').onclick=initialize;
// Keep the existing server authentication and tab-scoped session, without copying credentials between tabs.
$('field-login').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=$('field-login-submit');button.disabled=true;try{notice('관리자 로그인을 확인하고 있습니다.');const response=await fetch(window.YESSURI_TECHNICIAN.endpoint+'?route=%2Fapi%2Fadmin%2Flogin',{method:'POST',headers:{apikey:window.YESSURI_TECHNICIAN.publishableKey,'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:JSON.stringify({username:$('field-username').value,password:$('field-password').value})});const result=await response.json();if(!response.ok||!result.adminSession?.token)throw Error(result.error||'로그인 정보를 확인해 주세요.');if(locked)return;sessionStorage.setItem('technician-admin',JSON.stringify(result.adminSession));$('field-password').value='';const checked=await fetch(window.YESSURI_TECHNICIAN.endpoint+'?route=%2Fapi%2Fsession',{headers:headers(),cache:'no-store',credentials:'omit'});const session=await checked.json();if(!checked.ok||!session.admin)throw Error('관리자 권한을 확인하지 못했습니다. 다시 로그인하세요.');await initialize();}catch(error){if(!locked)notice(error.message||'로그인 서버에 연결하지 못했습니다.',true);}finally{if(!locked){$('field-password').value='';button.disabled=false;}}};
initialize();

window.addEventListener('yessuri:admin-locked',()=>{locked=true;dirty=false;for(const u of imageUrls)URL.revokeObjectURL(u);imageUrls.clear();$('frame').src='about:blank';fields=[];state=null;$('dialog').close();});

window.YESSURI_UNSAVED?.register('편집 중인 수정 내용',()=>dirty,()=>{dirty=false;},false);

// Preserve request/auth/command behavior; add typed display-only recovery help.
async function api(...args){try{const result=await apiRequest(...args);window.YESSURI_ERROR_HELP?.clear();return result;}catch(error){window.YESSURI_ERROR_HELP?.report(error,{route:args[0]});throw error;}}

// New entries are local until draft save; publication remains an explicit reviewed command.
$('add-field').onclick=()=>{if(locked||busy)return;if(fields.length>=200){notice('분야는 최대 200개까지 등록할 수 있습니다.',true);return;}$('new-field-form').reset();$('new-field-error').textContent='';$('new-field-dialog').showModal();$('new-field-label').focus();};
$('new-field-cancel').onclick=()=>$('new-field-dialog').close();
$('new-field-form').onsubmit=event=>{event.preventDefault();if(locked||busy)return;const label=$('new-field-label').value.trim(),description=$('new-field-description').value.trim();if(!label||!description){$('new-field-error').textContent='분야 이름과 설명을 입력하세요.';return;}if(fields.some(f=>f.label.toLowerCase()===label.toLowerCase())){$('new-field-error').textContent='사용 중인 분야 이름과 중복됩니다.';return;}const id='custom-'+crypto.randomUUID().replaceAll('-','').slice(0,12);const prior=state.aliases?.find(a=>a.value.toLowerCase()===label.toLowerCase()||a.labels.some(v=>v.toLowerCase()===label.toLowerCase()))||state.original?.find(f=>f.label.toLowerCase()===label.toLowerCase());if(prior&&fields.some(f=>f.id===prior.id)){$('new-field-error').textContent='기존 분야가 사용했던 이름입니다. 해당 분야의 이름이나 사용 상태를 변경하세요.';return;}const previous=prior&&[...state.draft,...state.published,...(state.retired||[]),...state.original].find(f=>f.id===prior.id);fields.push(previous?{...previous,label,description,active:true}:{id,value:id,label,description,image:'assets/images/service-icons.svg#icon5',href:'find.html?category='+id,visible:true});$('new-field-dialog').close();changed();render();$('fields').lastElementChild.scrollIntoView({block:'nearest'});notice('새 분야를 추가했습니다. 수정 내용 저장·미리보기·게시 후 다른 페이지에도 반영됩니다.');};
addEventListener('yessuri:admin-locked',()=>{$('new-field-dialog').close();$('new-field-form').reset();$('new-field-error').textContent='';});
