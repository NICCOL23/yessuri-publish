/* Shared back navigation only. Keep existing page content and search state intact. */
(()=>{'use strict';
 const file=location.pathname.split('/').pop()||'index.html';
 const defaults={'find.html':'index.html','guide.html':'index.html','boiler-guide.html':'guide.html?group=water&view=list#work-guide','computer-guide.html':'guide.html?group=computer#work-guide','expert.html':'find.html','favorites.html':'find.html','compare.html':'find.html','cases.html':'index.html','case.html':'cases.html','questions.html':'index.html','question.html':'questions.html','question-write.html':'questions.html','questions-example.html':'questions.html','board-notice.html':'questions.html','question-admin.html':'questions.html','technician-board.html':'index.html','technician-apply.html':'technician-board.html','technician-lookup.html':'technician-board.html','technician-detail.html':'technician-board.html','technician-recruit.html':'technician-board.html','technician-notice.html':'technician-board.html','technician-admin.html':'technician-board.html','register-form.html':'technician-board.html','request.html':'guide.html'};
 const safe=value=>{if(!value)return null;try{const u=new URL(value,location.href);return u.origin===location.origin&&(u.pathname.split('/').pop() in defaults||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))?u:null;}catch{return null;}};
 const read=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
 const pending=read('yessuri:back-departure'),ref=safe(document.referrer),type=performance.getEntriesByType('navigation')[0]?.type;
 const initial=history.state?.ysPageBack||(type==='navigate'&&ref&&pending&&pending.url===ref.href&&Date.now()-pending.at<60000?{previous:ref.href}:{});
 const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
 history.replaceState=function(state,title,url){return replace({...state,ysPageBack:state?.ysPageBack||history.state?.ysPageBack||initial},title,url);};
 history.pushState=function(state,title,url){return push({...state,ysPageBack:{previous:location.href}},title,url);};
 history.replaceState(history.state,'');
 addEventListener('pagehide',()=>{try{sessionStorage.setItem('yessuri:back-departure',JSON.stringify({url:location.href,at:Date.now()}));}catch{}});
 if(file==='index.html'||!(file in defaults))return;
 const main=document.querySelector('main');if(!main)return;
 const bar=document.createElement('div');bar.className='ys-page-backbar';
 const link=document.createElement('a');link.className='ys-page-back';link.textContent='← 이전 페이지로';bar.append(link);main.before(bar);
 let legacyTarget=null;
 function target(){return safe(history.state?.ysPageBack?.previous)||legacyTarget||safe(defaults[file]);}
 function sync(){
  const duplicates=document.querySelectorAll('#expert-back,a.b-back,a.case-back,a.request-back,a.recruit-back,.saved-return,#search-return-bar');
  for(const node of duplicates){if(node.id==='search-return-bar'&&node.hidden)continue;const a=node.matches('a')?node:node.querySelector('a');if(!legacyTarget&&a)legacyTarget=safe(a.href);node.setAttribute('data-page-back-duplicate','');}
  if(file==='boiler-guide.html')main.querySelectorAll('a').forEach(a=>{if(a.textContent.trim()==='← 분야 목록으로'||a.textContent.trim()==='분야 목록으로')a.setAttribute('data-page-back-duplicate','');});
  if(file.startsWith('technician-'))main.querySelectorAll('a.btn').forEach(a=>{if(['목록으로','관리자 목록'].includes(a.textContent.trim())){if(!legacyTarget)legacyTarget=safe(a.href);a.setAttribute('data-page-back-duplicate','');}});
  if(file==='case.html')document.querySelector('.cases-home-link')?.setAttribute('data-page-back-duplicate','');
  if(file==='register-form.html')document.querySelector('.panel-footer a[href="register.html"]')?.setAttribute('data-page-back-duplicate','');
  const u=target();if(u)link.href=u.href;
 }
 link.addEventListener('click',event=>{
  if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const previous=safe(history.state?.ysPageBack?.previous);
  if(previous&&history.length>1){event.preventDefault();history.back();return;}
  // Preserve the guide's existing search-restore hook on direct search-return links.
  const old=document.querySelector('#search-return-bar:not([hidden]) a');
  if(old&&safe(old.href)){event.preventDefault();old.click();}
 });
 sync();new MutationObserver(sync).observe(main,{childList:true,subtree:true});
 addEventListener('popstate',sync);addEventListener('pageshow',sync);
})();
