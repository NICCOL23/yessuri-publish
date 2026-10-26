/* Keep reading and keyboard order aligned with the app's information-first layout. */
(() => {
 'use strict';
 const actions=document.querySelector('body[data-technician-page="board"] .entry-actions');
 if(!actions)return;
 const guide=actions.querySelector('.entry-recruit'),apply=actions.querySelector('.entry-primary');
 if(!guide||!apply)return;
 const label=guide.firstChild,original=label.textContent;
 const sync=()=>{
  const app=document.body.classList.contains('ys-installed-mobile');
  actions.replaceChildren(...(app?[guide,apply]:[apply,guide]));
  label.textContent=app?'사전 모집 안내 보기 ':original;
 };
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 sync();
})();
