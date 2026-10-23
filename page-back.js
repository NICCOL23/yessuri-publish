/* Shared back navigation only. Keep existing page content and search state intact. */
(()=>{'use strict';
 const decorate=control=>{control.classList.add('ys-page-back');if(control.textContent!=='← 이전 페이지로')control.textContent='← 이전 페이지로';};
 const decorateLocal=root=>{if(root.matches?.('[data-page-back-local]'))decorate(root);root.querySelectorAll?.('[data-page-back-local]').forEach(decorate);};
 decorateLocal(document);
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)decorateLocal(node);}).observe(document.body,{childList:true,subtree:true});
 const file=location.pathname.split('/').pop()||'index.html';
 const defaults={'service-detail.html':'index.html','find.html':'index.html','guide.html':'index.html','boiler-guide.html':'guide.html?group=water&view=list#work-guide','computer-guide.html':'guide.html?group=computer#work-guide','expert.html':'find.html','favorites.html':'find.html','compare.html':'find.html','cases.html':'index.html','case.html':'cases.html','questions.html':'index.html','question.html':'questions.html','question-write.html':'questions.html','questions-example.html':'questions.html','board-notice.html':'questions.html','question-admin.html':'questions.html','technician-board.html':'index.html','technician-apply.html':'technician-board.html','technician-lookup.html':'technician-board.html','technician-detail.html':'technician-board.html','technician-recruit.html':'technician-board.html','technician-notice.html':'technician-board.html','technician-admin.html':'technician-board.html','register-form.html':'technician-board.html','request.html':'guide.html'};
 const safe=value=>{if(!value)return null;try{const u=new URL(value,location.href);return u.origin===location.origin&&(u.pathname.split('/').pop() in defaults||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'))?u:null;}catch{return null;}};
 const read=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
 const pending=read('yessuri:back-departure'),ref=safe(document.referrer),type=performance.getEntriesByType('navigation')[0]?.type;
 const explicit=file==='find.html'?safe(new URLSearchParams(location.search).get('returnTo')):null;
 const source=explicit||(ref&&ref.href!==location.href?ref:null),stored=history.state?.ysPageBack;
 const withoutHash=value=>{const u=safe(value);if(!u)return '';u.hash='';return u.href;};
 const confirmed=!!(source&&ref&&withoutHash(source.href)===withoutHash(ref.href)&&pending&&withoutHash(pending.url)===withoutHash(ref.href)&&Date.now()-pending.at<60000);
 const initial=safe(stored?.previous)?stored:source?{previous:source.href,canBack:confirmed}:{};
 const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
 history.replaceState=function(state,title,url){return replace({...state,ysPageBack:state?.ysPageBack||history.state?.ysPageBack||initial},title,url);};
 history.pushState=function(state,title,url){return push({...state,ysPageBack:{previous:location.href,canBack:true}},title,url);};
 history.replaceState(history.state,'');
 addEventListener('pagehide',()=>{try{sessionStorage.setItem('yessuri:back-departure',JSON.stringify({url:location.href,at:Date.now()}));}catch{}});
 if(file==='index.html'||!(file in defaults))return;
 const main=document.querySelector('main');if(!main)return;
 const bar=document.createElement('div');bar.className='ys-page-backbar';
 const link=document.createElement('a');decorate(link);bar.append(link);main.before(bar);
 bar.classList.add('ys-page-backbar-sticky');
 const header=document.querySelector('yessuri-site-header'),localNav=document.querySelector('#guide-local-nav');
 const align=()=>{const navHeight=localNav&&getComputedStyle(localNav).position==='sticky'?localNav.getBoundingClientRect().height:0;const top=(header?.getBoundingClientRect().height||82)+navHeight;bar.style.setProperty('--ys-page-back-top',top+'px');document.documentElement.style.setProperty('--ys-page-back-scroll-offset',(top+bar.getBoundingClientRect().height+16)+'px');};
 align();const measure=new ResizeObserver(align);if(header)measure.observe(header);if(localNav)measure.observe(localNav);measure.observe(bar);window.addEventListener('resize',align);
 let legacyTarget=null;
 function target(){return safe(history.state?.ysPageBack?.previous)||legacyTarget||safe(defaults[file]);}
 function sync(){
  const duplicates=document.querySelectorAll('#expert-back,a.b-back,a.case-back,a.request-back,a.recruit-back,.saved-return,#search-return-bar');
  for(const node of duplicates){if(node.id==='search-return-bar'&&node.hidden)continue;const a=node.matches('a')?node:node.querySelector('a');if(!legacyTarget&&a)legacyTarget=safe(a.href);node.setAttribute('data-page-back-duplicate','');}
  main.querySelectorAll('a').forEach(a=>{if(['← 분야 목록으로','분야 목록으로'].includes(a.textContent.trim())){if(!legacyTarget)legacyTarget=safe(a.href);a.setAttribute('data-page-back-duplicate','');}});
  if(file.startsWith('technician-'))main.querySelectorAll('a.btn').forEach(a=>{if(['목록으로','관리자 목록'].includes(a.textContent.trim())){if(!legacyTarget)legacyTarget=safe(a.href);a.setAttribute('data-page-back-duplicate','');}});
  if(file==='case.html')document.querySelector('.cases-home-link')?.setAttribute('data-page-back-duplicate','');
  if(file==='register-form.html')document.querySelector('.panel-footer a[href="register.html"]')?.setAttribute('data-page-back-duplicate','');
  const u=target();if(u)link.href=u.href;
 }
 link.addEventListener('click',event=>{
  if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const previous=safe(history.state?.ysPageBack?.previous);
  if(previous&&history.state?.ysPageBack?.canBack!==false&&history.length>1){event.preventDefault();history.back();return;}
  // Preserve the guide's existing search-restore hook on direct search-return links.
  const old=document.querySelector('#search-return-bar:not([hidden]) a');
  if(old&&safe(old.href)){event.preventDefault();old.click();}
 });
 sync();new MutationObserver(sync).observe(main,{childList:true,subtree:true});
 addEventListener('popstate',sync);addEventListener('pageshow',sync);
})();
