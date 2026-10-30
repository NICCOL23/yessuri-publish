/* Admin-only case editor; application attachments remain unchanged. */
(()=>{
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
  const upload=el('button','사진 업로드');upload.type='button';upload.className='btn';
  const save=el('button','작업 사례 저장');save.type='submit';save.className='btn primary';const cancel=el('button','새 사례 작성');cancel.type='button';cancel.className='btn';
  const status=el('p');status.setAttribute('role','status');form.append(uploadLabel,file,agreement,upload,el('p','업로드한 사진은 공개 사진으로 보관됩니다. 사례에서 제외해도 사진 자체는 삭제되지 않습니다.'),save,cancel);section.append(list,form,status);anchor.after(section);
  const route='admin/applications/'+application.id+'/work-cases';let data={cases:[],photos:[],version:''},editing='',busy=false;
  const lock=value=>{busy=value;section.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=value);};
  function choices(selected=[]){photos.replaceChildren();for(const photo of data.photos){const label=el('label');label.className='file-card';const check=el('input');check.type='checkbox';check.value=photo.image;check.checked=selected.includes(photo.image);const image=el('img');image.src=photo.image;image.alt=photo.imageAlt||'공개 사진';image.style.maxWidth='120px';label.append(check,image);photos.append(label);}if(!data.photos.length)photos.append(el('p','사진을 업로드한 뒤 선택해 주세요.'));}
  function reset(){editing='';form.reset();choices();save.textContent='작업 사례 저장';}
  function render(){list.replaceChildren();for(const item of data.cases){const card=el('article');card.className='card section';card.append(el('h3',item.title),el('p',item.date),el('p',item.description));const gallery=el('div');window.YESSURI_WORK_GALLERY.render(gallery,(item.photos||[]).filter(p=>p.image!==data.image));card.append(gallery);const edit=el('button','수정'),remove=el('button','삭제');edit.type=remove.type='button';edit.className='btn';remove.className='btn danger';edit.onclick=()=>{editing=item.id;for(const key of Object.keys(controls))controls[key].value=item[key];choices((item.photos||[]).map(p=>p.image));save.textContent='작업 사례 수정 저장';form.scrollIntoView({block:'start'});};remove.onclick=()=>mutate({action:'delete',id:item.id,confirm:true},'이 작업 사례를 삭제할까요? 공개 사진과 신청서 원본은 유지됩니다.');card.append(edit,remove);list.append(card);}if(!data.cases.length)list.append(el('p','등록된 작업 사례가 없습니다.'));}
  async function load(){try{data=await api(route);render();reset();}catch(e){status.textContent=e.message;}}
  async function mutate(body,question){if(busy||(question&&!confirm(question)))return;lock(true);try{data=await api(route,{...body,version:data.version});render();reset();status.textContent='저장했습니다. 공개 프로필에서 확인할 수 있습니다.';}catch(e){status.textContent=e.message;}finally{lock(false);}}
  form.onsubmit=e=>{e.preventDefault();mutate({action:'save',id:editing||undefined,title:controls.title.value,date:controls.date.value,description:controls.description.value,photos:[...photos.querySelectorAll('input:checked')].map(n=>n.value)});};cancel.onclick=reset;
  upload.onclick=async()=>{if(busy)return;const f=file.files[0];if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10485760||!consent.checked){status.textContent='10MB 이내 사진을 선택하고 공개 동의를 확인해 주세요.';return;}lock(true);try{const selected=[...photos.querySelectorAll('input:checked')].map(n=>n.value),blob=await transfer(f),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));const result=await api('admin/applications/'+application.id+'/public-photos',{action:'upload',photo:{type:'image/jpeg',data:btoa(binary)},imageConsent:true});const old=new Set(data.photos.map(p=>p.image));data=await api(route);choices([...selected,...result.photos.filter(p=>!old.has(p.image)).map(p=>p.image)]);file.value='';consent.checked=false;window.dispatchEvent(new Event('yessuri:public-photo-changed'));status.textContent='사진을 추가했습니다. 작업 사례 저장을 눌러 주세요.';}catch(e){status.textContent=e.message;}finally{lock(false);}};
  window.addEventListener('yessuri:photo-library-updated',load);
  load();
 }
 window.YESSURI_TECHNICIAN_WORK_CASES={mount};
})();
