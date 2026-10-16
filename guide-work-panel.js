/* One native dialog; illustrated work and optional consultation share existing controls. */
(() => {
 const api=window.YESSURI_WORK_PANEL;if(!api)return;
 const dialog=document.createElement('dialog');dialog.id='wg-panel';dialog.className='work-guide wg-panel';dialog.setAttribute('aria-labelledby','wg-panel-title');
 dialog.innerHTML='<div class="wg-panel-shell"><header class="wg-panel-header"><div><button type="button" id="wg-panel-back">← 작업 선택으로</button><h2 id="wg-panel-title" tabindex="-1"></h2></div><button type="button" id="wg-panel-close" aria-label="상세 패널 닫기">×</button></header><div id="wg-panel-body" class="wg-panel-body"></div><footer class="wg-panel-footer"><div class="wg-panel-actions"><button type="button" id="wg-panel-find">이 작업 전문가 찾기</button><button type="button" id="wg-panel-next">상담 문구 준비하기</button><button type="button" id="wg-panel-copy">상담 문구 복사</button></div><p id="wg-panel-action-note">전문가 찾기는 상담 문구 작성 없이 이용할 수 있습니다.</p><a class="wg-panel-kakao" href="https://pf.kakao.com/_VdyFX/chat" target="_blank" rel="noopener">카카오톡 이용 문의 <span class="sr-only">(새 창)</span></a></footer></div>';
 const $=id=>document.getElementById(id),work=$('wg-work-detail'),aside=document.querySelector('#wg-flow-detail .wg-side'),products=document.querySelector('.wg-products'),body=dialog.querySelector('#wg-panel-body'),consult=document.createElement('div');consult.id='wg-panel-consult';body.append(work,consult);document.body.append(dialog);
 const regionLabel=aside.querySelector('label[for="wg-region"]'),region=$('wg-region'),memoWork=$('wg-memo-work'),prepare=$('wg-prepare'),memo=$('wg-memo'),copy=$('wg-copy'),status=$('wg-copy-status'),find=$('wg-find');
 const intro=document.createElement('p');intro.textContent='필요할 때만 작성하고, 문구를 복사해 업체에 전달하세요.';
 const preview=document.createElement('h3');preview.textContent='상담 문구 미리보기';
 const photos=document.createElement('section');photos.className='wg-panel-photos';const photoTitle=document.createElement('h3');photoTitle.textContent='사진 준비';const safe=document.createElement('p');safe.textContent='무리한 분해 없이 안전한 위치에서 촬영하세요.';photos.append(photoTitle,prepare,safe);
 const note=document.createElement('p');note.className='wg-small';note.textContent='선택 내용은 상담 준비용이며 서버에 저장·전송되지 않습니다.';
 consult.append(intro,memoWork,regionLabel,region,products,preview,memo,copy,status,photos,$('wg-search-note'),note);
 // The detached original elements retain their listeners and supported search mapping.
 aside.remove();
 work.querySelector('.wg-costs').hidden=true;work.querySelector('.wg-process').parentElement.hidden=true;
 const costs=document.createElement('section');costs.className='wg-panel-cost-strip';costs.innerHTML='<h3>비용 확인: 출장·진단비 + 작업비 + 제품·자재비 + 추가 작업비</h3><p>철거·복구·운반·폐기물·장비·부가세 포함 여부를 확인하세요. 최종 원인·작업 범위와 비용은 기술자 확인 후 결정됩니다.</p>';work.append(costs);
 // IDs used by the existing controller remain in the document without duplicating the visible form.
 aside.hidden=true;dialog.append(aside);
 let prior='',lastMode='',locked=false,bodyPadding='',savedScroll={},activeTitle='';
 function sync(){const state=api.getState(),open=!!state.mode;
  if(!open){if(dialog.open)dialog.close();if(locked){savedScroll[lastMode]=body.scrollTop;document.documentElement.classList.remove('wg-panel-open');document.body.style.paddingRight=bodyPadding;locked=false;document.querySelector('#wg-tasks [aria-pressed=true]')?.focus({preventScroll:true});}prior='';lastMode='';return;}
  if(activeTitle!==state.title){savedScroll={};activeTitle=state.title;}
  const key=state.mode+state.title;if(prior&&lastMode!==state.mode)savedScroll[lastMode]=body.scrollTop;
  $('wg-panel-title').textContent=state.mode==='consult'?'상담 문구 준비하기':state.title;
  $('wg-panel-back').textContent=state.mode==='consult'?'← 작업 안내로 돌아가기':'← 작업 선택으로';
  work.hidden=state.mode!=='work';consult.hidden=state.mode!=='consult';$('wg-panel-next').hidden=state.mode!=='work';$('wg-panel-copy').hidden=state.mode!=='consult';
  $('wg-panel-find').textContent=state.category==='전체'?'이 작업 문의하기':'이 작업 전문가 찾기';
  $('wg-panel-action-note').textContent=state.mode==='work'?'전문가 찾기는 상담 문구 작성 없이 이용할 수 있습니다.':'복사한 문구는 선택한 업체에 직접 전달해 주세요.';
  if(!locked){bodyPadding=document.body.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;if(gap)document.body.style.paddingRight=(parseFloat(getComputedStyle(document.body).paddingRight)+gap)+'px';}
  document.documentElement.classList.add('wg-panel-open');locked=true;if(!dialog.open)dialog.showModal();
  if(key!==prior){body.scrollTop=savedScroll[state.mode]||0;$('wg-panel-title').focus({preventScroll:true});}prior=key;lastMode=state.mode;
 }
 $('wg-panel-close').addEventListener('click',api.close);$('wg-panel-back').addEventListener('click',()=>api.getState().mode==='consult'?api.setMode('work'):api.close());
 $('wg-panel-next').addEventListener('click',()=>api.setMode('consult'));
 $('wg-panel-copy').addEventListener('click',()=>copy.click());
 $('wg-panel-find').addEventListener('click',()=>{const state=api.getState();if(state.category==='전체')window.open(find.href,'_blank','noopener');else location.assign(find.href);});
 dialog.addEventListener('cancel',e=>{e.preventDefault();api.close();});
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);if(!first)return;if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('wg-panel-title'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 let onBackdrop=false;dialog.addEventListener('pointerdown',e=>{onBackdrop=e.target===dialog;});dialog.addEventListener('click',e=>{if(onBackdrop&&e.target===dialog)api.close();onBackdrop=false;});
 window.addEventListener('guide:viewchange',sync);sync();
})();
