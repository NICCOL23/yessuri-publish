/* 인증된 관리자 한정 작업 구획·메모리 초안. */
(()=>{
 'use strict';
 const root=document.getElementById('root');if(!root)return;
 if(document.body.dataset.technicianPage!=='admin'&&new URLSearchParams(location.search).get('admin')!=='1')return;
 const drafts=new Map();let locked=false;
 const create=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function group(nodes,title,note,open){
  const first=nodes.find(Boolean);if(!first||first.closest('.admin-workspace'))return;
  const d=create('details',null,'admin-workspace');d.open=!!open;d.append(create('summary',title));const content=create('div',null,'workspace-content');if(note)content.append(create('p',note,'workspace-note'));d.append(content);first.before(d);for(const n of nodes)if(n)content.append(n);
 }
 function controls(){return [...root.querySelectorAll('#admin-update textarea,#admin-update select,#admin-public-photos input[type="text"]')];}
 function key(n){if(n.id)return n.id;return 'caption:'+n.closest('figure')?.querySelector('img')?.getAttribute('src');}
 function decorate(){
  if(locked)return;
  for(const details of root.querySelectorAll('.admin-workspace')){const content=details.querySelector('.workspace-content');if(content&&!content.querySelector(':scope > :not(.workspace-note)'))details.remove();}
  const reply=root.querySelector('#admin-update')?.closest('section');group([reply],'신청 확인·비공개 답변','신청자와 관리자만 확인하는 답변입니다. 이 저장으로 공개 프로필은 바뀌지 않습니다.',true);
  group([root.querySelector('#admin-public-photos'),root.querySelector('#admin-work-cases')],'공개 사진·작업 사례','이 구획에서 저장한 정보는 공개 프로필에 반영됩니다. 신청서 원본 사진은 유지됩니다.',false);
  const profile=root.querySelector('#profile-safety-panel');
  if(profile){
   const action=profile.dataset.profileAction;
   const title=action ? action+' · 공개 정보 및 동의 확인' : '공개 정보 및 동의 확인';
   group([profile],title,null,true);
   const summary=profile.closest('.admin-workspace')?.querySelector(':scope > summary');
   if(summary && summary.textContent!==title)summary.textContent=title;
  }
  for(const details of root.querySelectorAll('.admin-workspace')){const children=[...details.querySelector('.workspace-content').children].filter(n=>!n.classList.contains('workspace-note'));details.hidden=children.length>0&&children.every(n=>n.hidden);}
  for(const input of controls()){
   if(input.dataset.draftBound)continue;input.dataset.draftBound='true';
   const id=key(input);if(drafts.has(id))input.value=drafts.get(id).value;
   const baseline=drafts.get(id)?.baseline??input.value;
   const remember=()=>{if(input.value===baseline)drafts.delete(id);else drafts.set(id,{value:input.value,baseline});showHint();};input.addEventListener('input',remember);input.addEventListener('change',remember);
  }showHint();
 }
 function showHint(){let hint=root.querySelector('#admin-memory-hint');if(drafts.size&&!hint){hint=create('p','아직 저장하지 않은 답변·사진 설명이 있습니다. 페이지를 이동하기 전에 저장해 주세요.','admin-dirty-hint');hint.id='admin-memory-hint';root.prepend(hint);}if(hint)hint.hidden=!drafts.size;}
 window.addEventListener('beforeunload',e=>{if(!locked&&drafts.size){e.preventDefault();e.returnValue='';}});
 window.addEventListener('yessuri:admin-profile-switch-request',e=>{if(locked||!drafts.size)return;if(!confirm('저장하지 않은 답변·사진 설명이 있습니다. 저장하지 않고 다른 업체를 열까요?'))e.preventDefault();else drafts.clear();});
 document.addEventListener('click',e=>{if(locked||!drafts.size)return;const a=e.target.closest('a');if(a&&a.getAttribute('href')&&!a.getAttribute('href').startsWith('#')&&a.target!=='_blank'){if(!confirm('저장하지 않은 답변·사진 설명이 있습니다. 저장하지 않고 이동할까요?')){e.preventDefault();e.stopImmediatePropagation();}else drafts.clear();}},true);
 const baseFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{
  const response=await baseFetch(input,init);const url=new URL(typeof input==='string'?input:input.url,location.href),route=url.searchParams.get('route')||url.pathname;
  if(response.ok&&init?.method==='POST'){
   if(/\/api\/admin\/applications\/[^/]+\/update$/.test(route)){drafts.delete('admin-body');drafts.delete('status');}
   if(/\/public-photos$/.test(route)){let payload;try{payload=JSON.parse(init.body);}catch{}if(payload?.action==='edit')drafts.delete('caption:'+payload.image);}
  }return response;
 };
 window.addEventListener('yessuri:admin-locked',()=>{locked=true;drafts.clear();});
 new MutationObserver(decorate).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-profile-action']});decorate();
})();
