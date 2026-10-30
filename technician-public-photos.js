/* Public photo management never edits or deletes the original application photos. */
(() => {
  const node=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
  function mount({application,api,transfer}) {
    const anchor=document.querySelector('#admin-public-profile');
    if(!anchor)return;
    const section=node('section','','card section');section.id='admin-public-photos';
    section.append(node('h2','공개 사진 관리'),node('p','사진을 추가한 뒤 대표 이미지로 선택할 수 있습니다. 공개 사진을 삭제해도 신청서 원본 사진은 유지됩니다.'));
    const form=node('form','','section'),label=node('label','추가할 사진 (JPG·PNG·WebP, 10MB 이내)');
    const file=node('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.id='public-photo-file';label.htmlFor=file.id;
    const consentLabel=node('label','','check section'),consent=node('input');consent.type='checkbox';consent.required=true;
    consentLabel.append(consent,document.createTextNode('이 사진을 프로필에 공개하는 데 동의했습니다.'));
    const upload=node('button','사진 추가','btn primary');upload.type='submit';
    const status=node('p');status.setAttribute('role','status');
    const list=node('div','','file-grid');form.append(label,file,consentLabel,upload);section.append(form,status,list);anchor.after(section);
    let busy=false;
    const lock=value=>{busy=value;section.querySelectorAll('button,input').forEach(n=>{n.disabled=value;});};
    function render(data){
      list.replaceChildren();
      const photos=(data.photos||[]).filter(p=>typeof p.image==='string');
      if(!photos.length){list.append(node('p','등록된 공개 사진이 없습니다.','hint'));return;}
      photos.forEach((photo,index)=>{
        const figure=node('figure','','photo file-card'),image=node('img');image.src=photo.image;image.alt=photo.imageAlt||'공개 사진 '+(index+1);
        figure.append(image,node('figcaption','공개 사진 '+(index+1)+(data.image===photo.image?' · 현재 대표 이미지':'')));
        const select=node('button',data.image===photo.image?'현재 대표 이미지':'대표 이미지로 변경','btn');select.type='button';select.disabled=data.image===photo.image;select.dataset.current=data.image===photo.image?'true':'false';
        select.onclick=()=>mutate({action:'select',image:photo.image,imageConsent:true},'이 사진을 대표 이미지로 변경할까요?','대표 이미지를 변경했습니다.');
        const remove=node('button','공개 사진 삭제','btn danger');remove.type='button';
        remove.onclick=()=>mutate({action:'delete',image:photo.image,confirm:true},'이 공개 사진을 삭제할까요? 신청서 원본 사진은 유지됩니다.'+(data.image===photo.image?' 대표 이미지도 해제됩니다.':''),'공개 사진을 삭제했습니다. 신청서 원본 사진은 유지됩니다.');
        figure.append(select,remove);list.append(figure);
      });
    }
    const route='admin/applications/'+application.id+'/public-photos';
    async function load(){try{render(await api(route));status.textContent='';}catch(e){status.textContent=e.message;}}
    async function mutate(data,question,message){
      if(busy||!window.confirm(question))return;lock(true);status.textContent='저장하고 있습니다.';
      try{render(await api(route,data));status.textContent=message;}catch(e){status.textContent=e.message;}
      finally{lock(false);section.querySelectorAll('[data-current="true"]').forEach(n=>{n.disabled=true;});}
    }
    form.onsubmit=async event=>{
      event.preventDefault();if(busy)return;const chosen=file.files[0];
      if(!chosen){status.textContent='추가할 사진을 선택해 주세요.';return;}
      if(!['image/jpeg','image/png','image/webp'].includes(chosen.type)||chosen.size>10485760){status.textContent='10MB 이내의 JPG·PNG·WebP 사진을 선택해 주세요.';return;}
      if(!consent.checked){status.textContent='사진 공개에 동의했는지 확인해 주세요.';return;}
      lock(true);status.textContent='사진을 추가하고 있습니다.';
      try{
        const blob=await transfer(chosen),bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
        for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        render(await api(route,{action:'upload',photo:{type:'image/jpeg',data:btoa(binary)},imageConsent:true}));
        file.value='';consent.checked=false;status.textContent='사진을 추가했습니다. 원하는 사진을 대표 이미지로 선택할 수 있습니다.';
      }catch(e){status.textContent=e.message;}
      finally{lock(false);section.querySelectorAll('[data-current="true"]').forEach(n=>{n.disabled=true;});}
    };
    window.addEventListener('yessuri:public-photo-changed',load);
    load();
  }
  window.YESSURI_TECHNICIAN_PUBLIC_PHOTOS={mount};
})();
