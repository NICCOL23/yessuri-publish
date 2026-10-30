/* Shared public/admin work-photo presentation; never reads private attachments. */
(()=>{
 const node=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
 function photo(parent,photo,label){
  parent.classList.add('ys-work-gallery');const figure=node('figure'),button=node('button'),image=node('img');
  button.type='button';button.className='ys-work-photo';button.setAttribute('aria-label',label+' 크게 보기');
  image.src=/^(https?:|\/|assets\/)/.test(photo.image)?photo.image:'assets/images/'+photo.image;image.alt=photo.caption||photo.imageAlt||label;image.loading='lazy';image.width=1200;image.height=900;
  button.append(image);figure.append(button,node('figcaption',photo.caption||label));parent.append(figure);
  button.onclick=()=>{const dialog=node('dialog'),close=node('button','닫기'),full=node('img');dialog.className='ys-work-dialog';dialog.setAttribute('aria-label','작업 사진 크게 보기');close.type='button';full.src=image.src;full.alt=image.alt;dialog.append(close,full,node('p',photo.caption||label));document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});dialog.showModal();close.focus();};
 }
 function render(parent,photos){parent.replaceChildren();parent.classList.add('ys-work-gallery');if(!photos.length){const empty=node('p','등록된 작업 사진이 없습니다. 공개 작업 사진을 등록하면 이곳에 표시됩니다.');empty.className='ys-work-empty';parent.append(empty);return;}photos.forEach((p,i)=>photo(parent,p,'작업 사진 '+(i+1)));}
 window.YESSURI_WORK_GALLERY={photo,render};
})();
