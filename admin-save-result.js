/* Display-only save/publication feedback. Does not send requests or store data. */
(()=>{'use strict';let panel,summary,lastResult,lastDetail,action=null,locked=false,publicCheck,resultDisclosure;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={draft:'초안 저장',publish:'홈페이지 공개',restore:'공개 내용 복원'};
function stable(v){return JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);}
function mount(){const status=document.getElementById('status');if(!status)return;const slot=document.getElementById("field-save-panel");if(panel?.isConnected){if(!slot&&status.nextElementSibling!==panel)status.after(panel);return;}panel=el('section',undefined,'admin-save-result');panel.id='admin-save-result';panel.setAttribute('aria-labelledby','admin-save-result-title');const title=el('h2','저장과 홈페이지 공개는 달라요');title.id='admin-save-result-title';const steps=el('div',undefined,'admin-save-result-steps');steps.append(el('p','① 초안 저장: 관리자만 확인합니다.'),el('p','② 홈페이지 공개: 미리보기·비교 후 게시하면 방문자에게 반영됩니다.'));summary=el('p');summary.id='admin-save-summary';lastResult=el('strong','아직 이 화면에서 저장·게시한 결과가 없습니다.');lastDetail=el('p','아래 버튼으로 작업하면 처리 결과를 여기에 알려드립니다.');const feedback=el('div',undefined,'admin-save-feedback');feedback.id='admin-save-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.append(lastResult,lastDetail);publicCheck=el('div',undefined,'admin-public-check');publicCheck.hidden=true;const page=location.pathname.split('/').pop(),anchors={'hero-admin.html':'top','field-admin.html':'categories','guide-admin.html':'home-guide'};if(anchors[page]){const link=el('a','홈페이지에서 확인하기 ↗','admin-public-check-link');link.href='index.html#'+anchors[page];link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','홈페이지에서 확인하기 (새 탭)');const hint=el('p',page==='hero-admin.html'?'새 탭에서 메인 상단을 엽니다. 2·3번째 히어로는 홈페이지의 전환 순서에 따라 확인하세요.':'새 탭에서 홈페이지의 해당 영역을 엽니다. 관리자 화면은 그대로 유지됩니다.');publicCheck.append(link,hint);}let instructions=steps;
if(slot){
  instructions=el('details',undefined,'field-save-disclosure');
  instructions.append(el('summary','저장·게시 방법'),steps);
}
panel.append(title,instructions,summary);
if(slot){
  resultDisclosure=el('details',undefined,'field-save-disclosure');
  resultDisclosure.append(el('summary','처리 결과'),feedback,publicCheck);
  panel.append(resultDisclosure);
  slot.append(panel);
}else{
  panel.append(feedback,publicCheck);
  status.after(panel);
}}
function update({state,dirty,busy}){if(locked||!state?.draft||!state?.published)return;mount();const differs=stable(state.draft)!==stable(state.published);summary.textContent=(dirty?'입력 중 · 아직 저장하지 않은 변경이 있습니다. ':busy?'처리 중입니다. ':'저장된 자료를 보고 있습니다. ')+(differs?'저장된 초안과 현재 공개 내용이 다릅니다.':'저장된 초안과 현재 공개 내용이 같습니다.');}
function begin(kind){if(locked||!labels[kind])return;mount();if(!panel)return;if(resultDisclosure)resultDisclosure.open=true;publicCheck.hidden=true;action=kind;panel.dataset.result='pending';lastResult.textContent=labels[kind]+' 처리 중';lastDetail.textContent='서버 응답을 확인하고 있습니다. 완료 안내가 나올 때까지 기다려 주세요.';}
function success(kind,version){if(locked||!labels[kind])return;mount();if(!panel)return;if(resultDisclosure)resultDisclosure.open=true;publicCheck.hidden=kind!=='publish'||!publicCheck.children.length;action=null;panel.dataset.result=kind;lastResult.textContent='마지막 처리 결과: '+({draft:'초안만 저장 완료',publish:'홈페이지 공개 완료',restore:'이전 공개 내용으로 복원 완료'})[kind];lastDetail.textContent=({draft:'이번 저장으로 홈페이지는 바뀌지 않았습니다. 미리보기와 변경 비교를 확인한 뒤 게시하세요.',publish:'저장한 초안이 홈페이지에 반영됐습니다. 현재 게시본 미리보기에서 확인하세요.',restore:'홈페이지와 초안이 선택한 기록으로 바뀌었습니다. 현재 게시본을 확인하세요.'})[kind]+' (마지막 처리 버전 '+version+')';}
function uncertain(){if(locked||!action)return;if(resultDisclosure)resultDisclosure.open=true;publicCheck.hidden=true;panel.dataset.result='uncertain';lastResult.textContent=labels[action]+' 결과 확인 필요';lastDetail.textContent='완료 여부를 확인하지 못했습니다. 입력 내용은 기존 화면에서 확인하고, 다시 불러오기로 저장 상태를 먼저 확인하세요. 공개 여부를 확인하기 전에는 같은 게시 작업을 반복하지 마세요.';action=null;}
window.YESSURI_SAVE_RESULT=Object.freeze({update,begin,success,uncertain});addEventListener('yessuri:admin-locked',()=>{locked=true;action=null;panel?.remove();});
})();
