/* Maintenance-only content and history. Existing work controller remains untouched. */
(() => {
 'use strict';
 const list=document.getElementById('rt-grid'),status=document.getElementById('rt-status');if(!list)return;
 const dataURL=new URL('data/repair-tips.json?v=1',document.currentScript.src);
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n;};
 const plainClick=e=>e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey;
 fetch(dataURL).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(init).catch(error=>{status.textContent='관리 팁을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.';console.error('Repair tips unavailable:',error);});
 function init(data){
  const catalog=window.YESSURI_WORK_CATALOG,byId=new Map(data.tips.map(t=>[t.id,t]));
  if(data.schemaVersion!==1||byId.size!==8)throw Error('Invalid tips catalog');
  function asset(t){if(t.image.kind==='work'){const a=catalog.images.find(a=>a.id===t.image.imageId);return a&&{...a,src:catalog.assetBase+a.file};}const a=data.newImages.find(a=>a.id===t.image.imageId);return a&&{...a,src:a.file};}
  function picture(t,lazy=false){const a=asset(t);if(!a)throw Error('Missing tip image '+t.id);const img=el('img');img.src=a.src;img.width=a.width;img.height=a.height;img.alt=t.imageAlt;img.decoding='async';if(lazy)img.loading='lazy';img.addEventListener('error',()=>{const note=el('span','이미지를 불러오지 못했습니다. 글로 된 안내를 확인해 주세요.','rt-image-error');img.replaceWith(note);console.error('Repair tip image failed: '+t.id);},{once:true});return img;}
  function tipURL(id){const u=new URL(location.href);u.searchParams.set('tip',id);return u;}
  function taskURL(id){const t=catalog.tasks.find(t=>t.id===id),f=catalog.fields.find(f=>f.id===t?.fieldId);if(!t||!f)throw Error('Invalid related task '+id);const u=new URL(location.href);u.searchParams.delete('tip');u.searchParams.delete('view');u.searchParams.set('group',f.groupId);u.searchParams.set('field',f.id);u.searchParams.set('work',id);u.hash='work-guide';return u;}
  // Keep the existing work snapshot valid when only the tip parameter changes.
  function routeState(u,repairTip){const s={...history.state,repairTip};if(s.wgFlow)s.wgFlow={...s.wgFlow,route:u.pathname+u.search};return s;}
  const dialog=el('dialog');dialog.id='rt-panel';dialog.setAttribute('aria-labelledby','rt-title');
  dialog.innerHTML='<div class="rt-shell"><header class="rt-header"><div class="rt-header-copy"><button class="rt-back" type="button" data-page-back-local>← 이전 페이지로</button><h2 id="rt-title" tabindex="-1"></h2></div><button class="rt-close" type="button" aria-label="관리 팁 상세 닫기">×</button></header><div class="rt-body"></div><footer class="rt-footer" aria-label="관련 작업 안내"></footer></div>';
  document.body.append(dialog);
  const title=dialog.querySelector('h2'),body=dialog.querySelector('.rt-body'),footer=dialog.querySelector('.rt-footer');
  let active=null,originScroll=0,opener=null,savedPadding='',locked=false,backdropDown=false,frame=0;
  function writeTipState(){if(!active)return;const s=history.state?.repairTip||{};history.replaceState({...history.state,repairTip:{...s,id:active.id,bodyScroll:body.scrollTop}},'',location.href);}
  function quietWork(){const work=document.getElementById('wg-panel');if(work?.open)work.close();}
  function closeVisual({restore=true}={}){if(!active)return;active=null;if(dialog.open)dialog.close();document.documentElement.classList.remove('rt-open');if(locked){document.body.style.paddingRight=savedPadding;locked=false;}if(restore){const y=originScroll,target=opener;requestAnimationFrame(()=>{window.scrollTo({top:y,behavior:'instant'});target?.focus({preventScroll:true});});}}
  function close(){if(!active)return;writeTipState();if(history.state?.repairTip?.entry){history.back();return;}const u=new URL(location.href);u.searchParams.delete('tip');history.replaceState(routeState(u,null),'',u);closeVisual();window.dispatchEvent(new Event('guide:viewchange'));}
  function section(heading,items,cls=''){const s=el('section','',('rt-block '+cls).trim());s.append(el('h3',heading));const ul=el('ul');ul.append(...items.map(x=>el('li',x)));s.append(ul);return s;}
  function render(t){title.textContent=t.title;body.replaceChildren();footer.replaceChildren();
   if(t.priority){const box=el('section','','rt-priority');box.append(el('h3',t.priority.title),el('p',t.priority.text));body.append(box);}
   const hero=el('div','','rt-hero'),fig=el('figure'),intro=el('div');fig.append(picture(t),el('figcaption',t.imageNote));intro.append(el('p',t.category,'rt-kicker'),el('h3',t.checksTitle));const ul=el('ul');ul.append(...t.checks.map(x=>el('li',x)));intro.append(ul);hero.append(fig,intro);body.append(hero,section(t.careTitle,t.care,'rt-care'),section(t.expertTitle,t.expert,'rt-expert'));
   const sources=el('section','','rt-sources');sources.append(el('h3','출처·자료 확인'));const refs=el('ul');for(const source of t.sources){const li=el('li'),a=el('a',source.label+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener';a.append(el('span',' (새 창)','sr-only'));li.append(a,document.createTextNode(' · 확인 '+source.checkedDate));refs.append(li);}sources.append(refs,el('p','공식 자료를 국내 주거 환경에 맞춰 정리했습니다. 실제 관리 방법은 해당 제품 설명서와 현장 조건을 우선하세요.'));body.append(sources);
   for(const r of t.related){const a=el('a',r.label+' →','rt-related');a.href=taskURL(r.workId);a.addEventListener('click',e=>{if(!plainClick(e))return;e.preventDefault();writeTipState();closeVisual({restore:false});const u=taskURL(r.workId);history.pushState({...history.state,wgFlow:null,repairTip:null},'',u);window.dispatchEvent(new PopStateEvent('popstate',{state:history.state}));});footer.append(a);}
  }
  function show(t){const s=history.state?.repairTip;originScroll=s?.listScroll??scrollY;opener=list.querySelector('[data-tip="'+t.id+'"]');const changed=active?.id!==t.id;if(changed)render(t);active=t;quietWork();
   if(!locked){savedPadding=document.body.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;if(gap&&!document.documentElement.classList.contains('wg-panel-open'))document.body.style.paddingRight=(parseFloat(getComputedStyle(document.body).paddingRight)+gap)+'px';locked=true;}
   document.documentElement.classList.add('rt-open');if(!dialog.open)dialog.showModal();if(changed){body.scrollTop=s?.bodyScroll||0;title.focus({preventScroll:true});}
  }
  function sync(){const t=byId.get(new URL(location.href).searchParams.get('tip'));if(t){show(t);}else if(active){closeVisual();window.dispatchEvent(new Event('guide:viewchange'));}syncLinks();}
  function syncLinks(){list.querySelectorAll('[data-tip]').forEach(a=>a.href=tipURL(a.dataset.tip));}
  function open(t){const u=tipURL(t.id);originScroll=scrollY;opener=list.querySelector('[data-tip="'+t.id+'"]');history.pushState(routeState(u,{id:t.id,entry:true,listScroll:originScroll,bodyScroll:0}),'',u);show(t);syncLinks();}
  list.replaceChildren(...data.tips.map(t=>{const a=el('a','','rt-card');a.dataset.tip=t.id;a.href=tipURL(t.id);a.setAttribute('aria-haspopup','dialog');const copy=el('div','','rt-card-copy');copy.append(el('span',t.category,'rt-category'));if(t.badge)copy.append(el('span',t.badge,'rt-badge'));copy.append(el('h3',t.title),el('p',t.description));const arrow=el('span','→','rt-arrow');arrow.setAttribute('aria-hidden','true');a.append(picture(t,true),copy,arrow,el('span',' 상세 보기','sr-only'));a.addEventListener('click',e=>{if(plainClick(e)){e.preventDefault();open(t);}});return a;}));status.remove();
  dialog.querySelector('.rt-back').addEventListener('click',close);dialog.querySelector('.rt-close').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('pointerdown',e=>{backdropDown=e.target===dialog;});dialog.addEventListener('click',e=>{if(backdropDown&&e.target===dialog)close();backdropDown=false;});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('button,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length),first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===title)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  body.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;writeTipState();});},{passive:true});
  window.addEventListener('popstate',sync);window.addEventListener('guide:viewchange',()=>{syncLinks();if(active)quietWork();});
  // A directly opened tip can have an existing work URL; keep that state behind the tip.
  const direct=byId.get(new URL(location.href).searchParams.get('tip'));if(direct&&!history.state?.repairTip){const y=Math.max(0,document.getElementById('repair-tips').getBoundingClientRect().top+scrollY-(window.YESSURI_GUIDE_OFFSET?.()||100));history.replaceState({...history.state,repairTip:{id:direct.id,entry:false,listScroll:y,bodyScroll:0}},'',location.href);}
  sync();
 }
})();
