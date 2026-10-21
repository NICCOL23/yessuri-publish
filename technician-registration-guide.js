/* Preserve registration preparation and process guidance at the existing footer destination. */
(() => {
 'use strict';
 const template=document.getElementById('registration-guide'),root=document.getElementById('root');
 if(!template||!root)return;
 root.append(template.content.cloneNode(true));
 const panel=root.querySelector('.entry-guide');
 if(panel)panel.open=true;
 if(['#process-title','#prepare-title','#faq-title'].includes(location.hash))document.querySelector(location.hash)?.scrollIntoView();
})();
