/* Shared, private hero image library. Selection changes only the in-memory editor. */
(() => {
 'use strict';
 const dialog=document.getElementById('hero-library');if(!dialog)return;
 const grid=document.getElementById('library-grid'),status=document.getElementById('library-status');
 const files=document.getElementById('library-files'),filter=document.getElementById('library-filter'),query=document.getElementById('library-query');
 const more=document.getElementById('library-more'),close=document.getElementById('library-close');
 const urls=new Set(),seen=new Set();let target='desktopImage',next=null,generation=0,failedFiles=[];
 const names={any:'공용',desktop:'PC용',mobile:'휴대폰용'};
 function announce(text){status.textContent=text;}
 function clear(){generation++;for(const url of urls)URL.revokeObjectURL(url);urls.clear();grid.replaceChildren();seen.clear();next=null;more.hidden=true;}
 function sync(){dialog.querySelectorAll('input,select,button').forEach(e=>e.disabled=busy||locked||!state);document.querySelectorAll('[data-open-library]').forEach(e=>e.disabled=busy||locked||!state);}
 window.addEventListener('yessuri:hero-controls',sync);
 window.addEventListener('yessuri:admin-locked',()=>{clear();files.value='';failedFiles=[];if(dialog.open)dialog.close();});
 dialog.addEventListener('close',clear);
 close.onclick=()=>{if(!busy)dialog.close();};
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 async function thumbnail(item,img,run){
  let url;
  try{const response=await fetch(endpoint('/api/admin/hero/images/'+item.id+'.jpg'),{headers:headers(),credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('미리보기를 불러오지 못했습니다.');url=URL.createObjectURL(await response.blob());if(locked||run!==generation||!dialog.open){URL.revokeObjectURL(url);return;}urls.add(url);img.src=url;}
  catch{if(run===generation&&!locked)img.alt='미리보기를 불러오지 못했습니다. 검색·새로고침으로 다시 시도하세요.';}
 }
 async function list(append=false){
  if(busy||locked||!state)return;
  busy=true;controls();if(!append)clear();const run=generation;
  announce('보관한 이미지를 불러오는 중입니다.');
  try{
   const url=endpoint('/api/admin/hero/library')+'&offset='+(append?next||0:0)+'&kind='+encodeURIComponent(filter.value)+'&q='+encodeURIComponent(query.value.trim());
   const response=await fetch(url,{headers:headers(),credentials:'omit',cache:'no-store'});const data=await response.json();
   if(!response.ok)throw Object.assign(new Error(data.message||data.error||'보관함을 불러오지 못했습니다. 다시 시도해 주세요.'),{status:response.status});
   if(locked||run!==generation||!dialog.open)return;
   if(!Array.isArray(data.items))throw Error('보관함 응답을 확인하지 못했습니다.');
   for(const item of data.items){
    if(!/^[a-f0-9-]{36}$/.test(item.id)||item.path!=='/api/hero-images/'+item.id+'.jpg'||seen.has(item.id))continue;
    seen.add(item.id);const card=document.createElement('article');card.className='library-card';const img=document.createElement('img');img.alt=item.name+' 미리보기';const title=document.createElement('h3');title.textContent=item.name;const meta=document.createElement('p');const date=new Date(item.createdAt);meta.textContent=(names[item.kind]||'공용')+' · '+(Number.isNaN(date.getTime())?'날짜 미확인':date.toLocaleDateString('ko-KR'))+' · '+Math.ceil((Number(item.bytes)||0)/1024)+'KB';const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=images[target]===item.path?'현재 선택됨':(target==='desktopImage'?'PC 사진으로 선택':'휴대폰 사진으로 선택');button.onclick=()=>{
     if(busy||locked||!state)return;
     if (images[target] !== item.path) openPhotoDescription();
     images[target]=item.path;updateThumbnails();changed();dialog.close();message((target==='desktopImage'?'PC':'휴대폰')+' 사진을 보관함에서 선택했습니다. 초안 저장·미리보기 후 게시하세요. 홈페이지는 아직 바뀌지 않았습니다.');
    };card.append(img,title,meta,button);grid.append(card);void thumbnail(item,img,run);
   }
   next=Number.isSafeInteger(data.nextOffset)?data.nextOffset:null;more.hidden=next===null;
   announce(seen.size?'이미지 '+seen.size+'개 표시 · '+(target==='desktopImage'?'PC':'휴대폰')+' 사진을 선택하세요.':'조건에 맞는 이미지가 없습니다. 이미지를 올리거나 검색 조건을 바꿔 주세요.');
  }catch(error){if(locked)return;if([401,403].includes(error.status)){clear();dialog.close();message('관리자 로그인이 만료되었거나 권한이 없습니다. 다시 로그인하세요.',true);}else announce(error.message);}
  finally{busy=false;controls();sync();}
 }
 document.querySelectorAll('[data-open-library]').forEach(button=>button.onclick=()=>{if(busy||locked||!state)return;target=button.dataset.openLibrary;document.getElementById('library-target').textContent='히어로 '+selectedSlide+'번 · '+(target==='desktopImage'?'PC':'휴대폰')+' 사진 선택';filter.value=target==='desktopImage'?'desktop':'mobile';query.value='';dialog.showModal();void list();});
 document.getElementById('library-search').onsubmit=e=>{e.preventDefault();void list();};more.onclick=()=>void list(true);
 files.onchange=()=>{failedFiles=[];};
 document.getElementById('library-upload').onclick=async()=>{
  if(busy||locked||!state)return;
  const selected=failedFiles.length?failedFiles:[...files.files];if(!selected.length){announce('보관할 이미지 파일을 먼저 선택하세요.');return;}
  const kind=document.getElementById('library-kind').value;
  busy=true;controls();let saved=0;failedFiles=[];const failures=[];
  try{
   for(let i=0;i<selected.length;i++){
    if(locked)break;const file=selected[i];announce((i+1)+'/'+selected.length+' 저장 중: '+file.name);
    try{
     if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('JPG·PNG·WebP, 한 장당 5MB 이내로 선택하세요.');
     const photo=await prepareHeroPhoto(file);if(locked)break;
     await api('/api/image',{photo,libraryName:file.name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160)||'히어로 이미지',libraryKind:kind});saved++;
    }catch(error){failedFiles.push(file);failures.push(file.name+': '+error.message);if([401,403].includes(error.status)){failedFiles.push(...selected.slice(i+1));break;}}
   }
  }finally{busy=false;controls();sync();}
  if(locked)return;
  if(!failedFiles.length)files.value='';
  // Refresh the full library so newly stored files are visible regardless of the previous filter.
  filter.value='all';query.value='';await list();
  announce(saved+'개 저장 완료. 홈페이지와 편집 중인 사진은 바뀌지 않았습니다.'+(failures.length?'\n저장하지 못한 파일: '+failures.join('\n')+'\n다시 저장하면 실패한 파일만 재시도합니다.':''));
 };
 sync();
})();
