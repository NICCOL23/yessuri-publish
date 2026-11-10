/* Five recent entries by default; hidden metadata is shared by administrators. */
(() => {
 'use strict';let showHidden=false,limit=5;const list=document.getElementById('history');if(!list)return;
 const toolbar=document.createElement('div');toolbar.id='hero-history-toolbar';const summary=document.createElement('p');summary.setAttribute('role','status');const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toolbar.append(summary,toggle);list.before(toolbar);
 const more=document.createElement('button');more.type='button';more.id='hero-history-more';more.className='secondary';list.after(more);
 toggle.onclick=()=>{showHidden=!showHidden;limit=5;history();controls();};more.onclick=()=>{limit+=5;history();controls();};
 function info(){return new Map((state?.historyInfo?.items||[]).map(r=>[r.id,r]));}
 function select(records){const map=info(),ordered=records.slice().sort((a,b)=>Number(b.version)-Number(a.version));const hiddenCount=ordered.filter(r=>map.get(r.id)?.hidden).length;const chosen=ordered.filter(r=>Boolean(map.get(r.id)?.hidden)===showHidden);summary.textContent=(showHidden?'숨긴 기록':'게시 기록')+' '+chosen.length+'개 중 '+Math.min(limit,chosen.length)+'개 표시';toggle.textContent=showHidden?'일반 기록 보기':'숨긴 기록 보기 ('+hiddenCount+')';toggle.setAttribute('aria-pressed',String(showHidden));more.hidden=chosen.length<=limit;more.textContent=showHidden?'숨긴 기록 더 보기':'이전 기록 더 보기';return chosen.slice(0,limit);}
 async function change(revision,action){
  if(busy||locked||dirty||conflict)return;
  const meta=info().get(revision.id);if(!meta)return;
  if(action==='delete'){
   if(meta.protected)return;
   const label=revision.content.title1+' '+revision.content.title2;
   if(!await confirmAction('“'+label+'” 게시 기록(버전 '+revision.version+')을 영구 삭제할까요? 삭제하면 이 기록으로 다시 복원할 수 없습니다. 현재 공개 히어로와 사진 파일은 변경되지 않습니다.'))return;
  }
  busy=true;controls();
  try{const next=await api(action==='delete'?'/api/history-delete':'/api/history-hide',{revisionId:revision.id,version:state.version,...(action==='delete'?{confirmed:true}:{hidden:!meta.hidden})});if(locked)return;state=next;history();message(action==='delete'?'선택한 게시 기록을 영구 삭제했습니다. 공개 히어로와 사진 파일은 유지됩니다.':meta.hidden?'숨긴 기록을 다시 표시했습니다.': '게시 기록을 숨겼습니다. 숨긴 기록 보기에서 다시 표시하거나 복원할 수 있습니다.');}
  catch(error){message(error.message,true);}finally{busy=false;controls();}
 }
 function decorate(actions,revision){const meta=info().get(revision.id);const hide=document.createElement('button');hide.type='button';hide.className='secondary';hide.dataset.historyAction='hide';hide.textContent=meta?.hidden?'다시 표시':'숨기기';hide.onclick=()=>void change(revision,'hide');const remove=document.createElement('button');remove.type='button';remove.className='hero-history-delete';remove.dataset.historyAction='delete';remove.dataset.protected=String(!meta||meta.protected);remove.textContent='영구 삭제';if(meta?.protected)remove.title='최초 원본과 현재 게시 기록은 보호됩니다.';remove.onclick=()=>void change(revision,'delete');actions.append(hide,remove);}
 function sync(){const disabled=busy||locked||dirty||conflict;document.querySelectorAll('[data-history-action]').forEach(b=>b.disabled=disabled||!state?.historyInfo||(b.dataset.historyAction==='delete'&&b.dataset.protected==='true'));toggle.disabled=busy||locked;more.disabled=busy||locked;}
 window.YESSURI_HERO_HISTORY=Object.freeze({select,decorate,controls:sync});
 window.addEventListener('yessuri:admin-locked',()=>{toolbar.remove();more.remove();list.replaceChildren();});
 if(state&&!locked){history();controls();}
})();
