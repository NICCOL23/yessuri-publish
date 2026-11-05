/* Admin-only case editor. Drafts stay in memory and never enter browser storage. */
(()=>{
 const drafts=new Map();
 const el=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
 function mount({application,api,transfer}){
  const anchor=document.querySelector('#admin-public-photos');if(!anchor)return;
  const section=el('section');section.className='card section';section.id='admin-work-cases';
  section.append(el('h2','작업 사례 관리'),el('p','제목·사진·설명·작업일을 저장하면 이 업체의 공개 프로필에 반영됩니다. 신청서 원본 사진은 유지됩니다.'));
  const list=el('div'),form=el('form');form.className='section';const controls={};
  for(const [key,label,type,max] of [['title','작업 사례 제목','text',120],['date','작업일','date',10],['description','작업 설명','textarea',6000]]){
   const input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.required=true;input.maxLength=max;input.id='case-'+key;const caption=el('label',label);caption.htmlFor=input.id;controls[key]=input;form.append(caption,input);
  }
  const picker=el('fieldset');picker.append(el('legend','공개 사진 선택 (선택 사항)'));const photos=el('div');photos.className='file-grid';picker.append(photos);form.append(picker);
  const uploadLabel=el('label','새 사진 추가 (JPG·PNG·WebP, 10MB 이내)'),file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.id='case-upload';uploadLabel.htmlFor=file.id;
  const consent=el('input');consent.type='checkbox';const agreement=el('label');agreement.className='check';agreement.append(consent,document.createTextNode('새 사진을 이 업체 프로필에 공개하는 데 동의했습니다.'));
  const upload=el('button','공개 사진 업로드');upload.type='button';upload.className='btn';
  const save=el('button','작업 사례 저장');save.type='submit';save.className='btn primary';const cancel=el('button','새 사례 작성');cancel.type='button';cancel.className='btn';
  const status=el('p');status.setAttribute('role','status');const draftStatus=el('p');draftStatus.className='hint';draftStatus.setAttribute('role','status');
  form.append(uploadLabel,file,agreement,upload,el('p','사진 업로드 즉시 공개 사진에 반영됩니다. 작업 사례를 저장하지 않거나 취소해도 업로드한 사진은 공개 사진으로 남습니다.'),save,cancel,draftStatus);section.append(list,form,status);anchor.after(section);
  const route='admin/profiles/'+encodeURIComponent('technician-'+application.id)+'/work-cases';let data={cases:[],photos:[],version:''},editing='',busy=false,loaded=false,refreshAfterBusy=false,loadSequence=0;
  const selected=()=>[...photos.querySelectorAll('input:checked')].map(n=>n.value);
  const state=()=>({editing,...Object.fromEntries(Object.entries(controls).map(([key,input])=>[key,input.value])),photos:selected()});
  const serialize=value=>JSON.stringify({...value,photos:[...value.photos].sort()});
  let baseline=serialize({editing:'',title:'',date:'',description:'',photos:[]});
  const dirty=()=>serialize(state())!==baseline||!!file.files?.length;
  const remember=()=>{if(dirty())drafts.set(application.id,{...state(),baseline});else drafts.delete(application.id);draftStatus.textContent=dirty()?'아직 저장하지 않은 변경이 있습니다. 이 화면을 떠나기 전에 저장해 주세요.':'';};
  const confirmDiscard=()=>!dirty()||window.confirm('아직 저장하지 않은 작업 사례 내용이 있습니다. 저장하지 않고 계속할까요?');
  const lock=value=>{busy=value;section.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=value);};
  function choices(chosen=[]){
   photos.replaceChildren();for(const photo of data.photos){const label=el('label');label.className='file-card';const check=el('input');check.type='checkbox';check.value=photo.image;check.checked=chosen.includes(photo.image);const image=el('img');image.src=photo.image;image.alt=photo.imageAlt||'공개 사진';image.style.maxWidth='120px';label.append(check,image);photos.append(label);}
   if(!data.photos.length)photos.append(el('p','사진을 업로드한 뒤 선택해 주세요.'));
   return chosen.filter(image=>!data.photos.some(photo=>photo.image===image));
  }
  function applyDraft(draft){editing=draft.editing||'';for(const key of Object.keys(controls))controls[key].value=draft[key]||'';const missing=choices(draft.photos||[]);save.textContent=editing?'작업 사례 수정 저장':'작업 사례 저장';if(draft.baseline)baseline=draft.baseline;return missing;}
  function reset(){editing='';form.reset();choices();save.textContent='작업 사례 저장';baseline=serialize(state());drafts.delete(application.id);remember();}
  function render(){
   list.replaceChildren();for(const item of data.cases){
    const card=el('article');card.className='card section';card.append(el('h3',item.title),el('p',item.date),el('p',item.description));const gallery=el('div');window.YESSURI_WORK_GALLERY.render(gallery,(item.photos||[]).filter(p=>p.image!==data.image));card.append(gallery);
    const edit=el('button','수정'),remove=el('button','삭제');edit.type=remove.type='button';edit.className='btn';remove.className='btn danger';
    edit.onclick=()=>{if(busy||!confirmDiscard())return;editing=item.id;for(const key of Object.keys(controls))controls[key].value=item[key]||'';choices((item.photos||[]).map(p=>p.image));file.value='';consent.checked=false;save.textContent='작업 사례 수정 저장';baseline=serialize(state());drafts.delete(application.id);remember();form.scrollIntoView({block:'start'});};
    remove.onclick=()=>{if(!confirmDiscard())return;mutate({action:'delete',id:item.id,confirm:true},'이 작업 사례를 삭제할까요? 공개 사진과 신청서 원본은 유지됩니다.');};card.append(edit,remove);list.append(card);
   }if(!data.cases.length)list.append(el('p','등록된 작업 사례가 없습니다.'));
  }
  function vanishedWarning(missing){if(missing.length)status.textContent='선택했던 사진 '+missing.length+'장이 삭제되거나 교체되어 선택에서 제외되었습니다. 제목·날짜·설명은 유지했습니다. 사진을 확인한 뒤 저장해 주세요.';}
  async function load(){
   if(busy){refreshAfterBusy=true;return;}const sequence=++loadSequence;
   try{
    const result=await api(route);if(sequence!==loadSequence||!section.isConnected)return;
    const draft=loaded?{...state(),baseline}:drafts.get(application.id);data=result;render();
    if(draft){vanishedWarning(applyDraft(draft));remember();}else reset();loaded=true;
   }catch(e){status.textContent=e.message;}
  }
  async function unlock(){lock(false);if(refreshAfterBusy){refreshAfterBusy=false;await load();}}
  async function mutate(body,question){
   if(busy||(question&&!window.confirm(question)))return;const retained={...state(),baseline};lock(true);
   try{data=await api(route,{...body,version:data.version});render();
    if(body.action==='save'||body.id===editing)reset();else{applyDraft(retained);remember();}
    status.textContent=body.action==='delete'?'작업 사례를 삭제했습니다. 공개 사진과 신청서 원본은 유지됩니다.':'저장했습니다. 공개 프로필에서 확인할 수 있습니다.';
   }catch(e){status.textContent=e.message;}finally{await unlock();}
  }
  form.addEventListener('input',remember);form.addEventListener('change',remember);
  form.onsubmit=e=>{e.preventDefault();mutate({action:'save',id:editing||undefined,title:controls.title.value,date:controls.date.value,description:controls.description.value,photos:selected()});};
  cancel.onclick=()=>{if(!busy&&confirmDiscard())reset();};
  upload.onclick=async()=>{
   if(busy)return;const f=file.files[0];if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10485760||!consent.checked){status.textContent='10MB 이내 사진을 선택하고 공개 동의를 확인해 주세요.';return;}
   if(!window.confirm('이 사진은 업로드 즉시 공개 사진에 추가됩니다. 작업 사례를 저장하지 않아도 공개됩니다. 계속할까요?'))return;
   lock(true);try{
    const chosen=selected(),blob=await transfer(f),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    const result=await api('admin/profiles/'+encodeURIComponent('technician-'+application.id)+'/public-photos',{action:'upload',photo:{type:'image/jpeg',data:btoa(binary)},imageConsent:true});const old=new Set(data.photos.map(p=>p.image));data=await api(route);choices([...chosen,...result.photos.filter(p=>!old.has(p.image)).map(p=>p.image)]);file.value='';consent.checked=false;remember();window.dispatchEvent(new Event('yessuri:public-photo-changed'));status.textContent=result.pending?'사진 파일 반영 대기 중입니다. 공개 사진 관리에서 재시도 후 확인하세요. 제목·설명은 유지했습니다.':'공개 사진을 추가했습니다. 제목·설명은 유지했습니다. 작업 사례 저장을 눌러 주세요.';
   }catch(e){status.textContent=e.message;}finally{await unlock();}
  };
  const beforeUnload=e=>{if(!section.isConnected||!dirty())return;e.preventDefault();e.returnValue='';};
  const onNavigate=e=>{if(!section.isConnected)return;const link=e.target.closest?.('a[href]');if(!link||e.defaultPrevented||link.target==='_blank')return;const next=new URL(link.href,location.href),current=new URL(location.href);if(next.origin===current.origin&&next.pathname===current.pathname&&next.search===current.search)return;if(!confirmDiscard()){e.preventDefault();e.stopImmediatePropagation();}};
  const onRefresh=()=>{if(!section.isConnected){window.removeEventListener('yessuri:photo-library-updated',onRefresh);return;}load();};
  const onSwitch=e=>{if(section.isConnected&&!confirmDiscard())e.preventDefault();};
  const onLocked=()=>{drafts.delete(application.id);baseline=serialize(state());file.value='';window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',onNavigate,true);window.removeEventListener('yessuri:photo-library-updated',onRefresh);window.removeEventListener('yessuri:admin-profile-switch-request',onSwitch);window.removeEventListener('yessuri:admin-locked',onLocked);};
  window.addEventListener('beforeunload',beforeUnload);document.addEventListener('click',onNavigate,true);window.addEventListener('yessuri:photo-library-updated',onRefresh);window.addEventListener('yessuri:admin-profile-switch-request',onSwitch);window.addEventListener('yessuri:admin-locked',onLocked);
  load();
 }
 window.YESSURI_TECHNICIAN_WORK_CASES={mount};
})();
