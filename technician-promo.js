/* Edit the copy here; presentation and dismissal logic stay shared. */
(()=>{
const copy={eyebrow:'예스수리 기술자 등록',title:'우리 동네 고객에게\n기술자님의 실력을 알려주세요.',description:'집수리·인테리어부터 컴퓨터 수리까지.\n전문 분야와 출장 가능 지역, 작업 사진으로\n업체를 소개해 주세요.',button:'기술자 등록 신청하기',href:'register.html',image:'assets/images/register-hero.png'};
const storage='yessuri-technician-promo-v1',day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function read(store,key){try{return store.getItem(key)}catch{return null}}
function write(store,key,value){try{store.setItem(key,value)}catch{}}
const force=new URLSearchParams(location.search).get('promo')==='preview';
if(!force&&(read(localStorage,storage)===day()||read(sessionStorage,storage)==='closed'))return;
const dialog=document.createElement('dialog');dialog.className='technician-promo';dialog.setAttribute('aria-labelledby','promo-title');dialog.setAttribute('aria-describedby','promo-description');
const close=document.createElement('button');close.type='button';close.className='promo-close';close.setAttribute('aria-label','기술자 등록 안내 닫기');close.textContent='×';close.autofocus=true;
const image=document.createElement('img');image.className='promo-art';image.src=copy.image;image.alt='예스수리 기술자 소개 카드와 공구함';image.width=495;image.height=339;
const content=document.createElement('div');content.className='promo-content';const eyebrow=document.createElement('p');eyebrow.className='promo-eyebrow';eyebrow.textContent=copy.eyebrow;const title=document.createElement('h2');title.id='promo-title';title.textContent=copy.title;const text=document.createElement('p');text.id='promo-description';text.textContent=copy.description;const link=document.createElement('a');link.className='promo-register';link.href=copy.href;link.textContent=copy.button+' →';content.append(eyebrow,title,text,link);
const footer=document.createElement('div');footer.className='promo-footer';const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';label.append(checkbox,document.createTextNode('오늘 하루 보지 않기'));const later=document.createElement('button');later.type='button';later.textContent='닫기';footer.append(label,later);dialog.append(close,image,content,footer);document.body.append(dialog);
let previous;function dismiss(){if(checkbox.checked)write(localStorage,storage,day());write(sessionStorage,storage,'closed');dialog.close()}
close.onclick=later.onclick=dismiss;dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss()});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss()});link.addEventListener('click',()=>{write(sessionStorage,storage,'closed');dialog.close()});dialog.addEventListener('close',()=>{document.documentElement.classList.remove('promo-open');if(previous?.isConnected)previous.focus({preventScroll:true})});
setTimeout(()=>{if(document.querySelector('dialog[open]'))return;previous=document.activeElement;dialog.showModal();document.documentElement.classList.add('promo-open')},force?100:1800);
})();
