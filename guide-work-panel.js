/* Native modal semantics provide background inertness and keyboard focus containment. */
(() => {
 const api=window.YESSURI_WORK_PANEL;if(!api)return;
 const dialog=document.createElement('dialog');dialog.id='wg-panel';dialog.className='work-guide wg-panel';dialog.setAttribute('aria-labelledby','wg-panel-title');
 dialog.innerHTML='<div class="wg-panel-shell"><header class="wg-panel-header"><div><p id="wg-panel-label">작업 상세</p><h2 id="wg-panel-title" tabindex="-1"></h2></div><button type="button" id="wg-panel-close" aria-label="상세 패널 닫기">×</button></header><div id="wg-panel-body" class="wg-panel-body"></div><footer class="wg-panel-footer"><button type="button" id="wg-panel-next">이 작업으로 상담 준비</button><button type="button" id="wg-panel-prev">작업 안내로 돌아가기</button><button type="button" id="wg-panel-dismiss">닫고 작업 더 보기</button></footer></div>';
 const work=document.getElementById('wg-work-detail'),aside=document.querySelector('#wg-flow-detail .wg-side'),products=document.querySelector('.wg-products'),body=dialog.querySelector('#wg-panel-body'),consult=document.createElement('div');consult.id='wg-panel-consult';consult.append(products,aside);body.append(work,consult);document.body.append(dialog);
 const costs=work.querySelector('.wg-costs'),process=work.querySelector('.wg-process')?.parentElement;
 for(const [element,label] of [[costs,'출장·진단비와 추가 비용 확인'],[process,'상담·작업 진행 절차']]){if(!element)continue;const details=document.createElement('details'),summary=document.createElement('summary');details.className='wg-panel-extra';summary.textContent=label;element.before(details);details.append(summary,element);}
 const find=document.getElementById('wg-find');dialog.querySelector('#wg-panel-prev').before(find);
 let prior='',locked=false,bodyPadding='';
 function sync(){const state=api.getState(),open=!!state.mode;
  if(!open){if(dialog.open)dialog.close();if(locked){document.documentElement.classList.remove('wg-panel-open');document.body.style.paddingRight=bodyPadding;locked=false;document.querySelector('#wg-tasks [aria-pressed=true]')?.focus({preventScroll:true});}prior='';return;}
  const key=state.mode+state.title;dialog.querySelector('#wg-panel-title').textContent=state.title;dialog.querySelector('#wg-panel-label').textContent=state.mode==='consult'?'상담 준비':'작업 상세';work.hidden=state.mode!=='work';consult.hidden=state.mode!=='consult';dialog.querySelector('#wg-panel-next').hidden=state.mode!=='work';dialog.querySelector('#wg-panel-prev').hidden=state.mode!=='consult';dialog.querySelector('#wg-panel-dismiss').hidden=state.mode==='consult';find.hidden=state.mode!=='consult';
  if(!locked){bodyPadding=document.body.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;if(gap)document.body.style.paddingRight=(parseFloat(getComputedStyle(document.body).paddingRight)+gap)+'px';}
  document.documentElement.classList.add('wg-panel-open');locked=true;if(!dialog.open)dialog.showModal();if(key!==prior){body.scrollTop=0;dialog.querySelector('#wg-panel-title').focus({preventScroll:true});}prior=key;
 }
 dialog.querySelector('#wg-panel-close').addEventListener('click',api.close);dialog.querySelector('#wg-panel-dismiss').addEventListener('click',api.close);dialog.querySelector('#wg-panel-next').addEventListener('click',()=>api.setMode('consult'));dialog.querySelector('#wg-panel-prev').addEventListener('click',()=>api.setMode('work'));
 dialog.addEventListener('cancel',e=>{e.preventDefault();api.close();});
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);if(!first)return;if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.querySelector('#wg-panel-title'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 let onBackdrop=false;dialog.addEventListener('pointerdown',e=>{onBackdrop=e.target===dialog;});dialog.addEventListener('click',e=>{if(onBackdrop&&e.target===dialog)api.close();onBackdrop=false;});
 window.addEventListener('guide:viewchange',sync);sync();
})();
