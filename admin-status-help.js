/* Read-only explanations of existing, server-loaded administrator states. */
(() => {
 'use strict';
 const page=document.body.dataset.technicianPage;
 if(page!=='admin'&&!(page==='detail'&&new URLSearchParams(location.search).get('admin')==='1'))return;
 const root=document.getElementById('root');if(!root)return;
 const applications={
  '접수완료':{meaning:'신청서가 도착했습니다. 아직 내용 확인이 끝난 상태는 아닙니다.',next:'신청 내용과 사진을 확인하고, 검토를 시작하면 기존 처리 상태에서 ‘확인중’을 선택해 저장하세요.',note:'접수만으로 업체 소개가 공개되지는 않습니다.'},
  '확인중':{meaning:'신청 내용과 자료를 살펴보는 중입니다.',next:'업체 정보·분야·출장 지역·사진을 확인하세요. 자료가 부족하면 ‘보완요청’, 검토가 끝나면 ‘사전등록 완료’를 선택하고 답변과 함께 저장하세요.',note:'업체 소개·연락처·사진의 공개 동의는 별도로 확인합니다.'},
  '보완요청':{meaning:'신청자에게 추가 자료나 내용 수정을 요청한 상태입니다.',next:'필요한 자료를 답변에 구체적으로 적고, 신청자의 수정 내용·사진·답변을 다시 확인하세요.',note:'자동 문자·이메일 알림은 없습니다. 신청자는 게시판에서 답변을 확인합니다.'},
  '사전등록 완료':{meaning:'신청 검토가 끝났습니다. 업체 소개의 공개 여부는 별개입니다.',next:'업체 공개 상태를 따로 확인하세요. 공개 전이라면 소개·연락처·사진의 동의 범위와 근거를 확인한 뒤 기존 공개 등록 절차를 진행하세요.',note:'이미 ‘공개 중’이면 중복 등록할 필요가 없습니다.'}
 };
 const publications={
  '아직 공개하지 않음':{meaning:'공개 업체 소개가 아직 등록되지 않은 상태입니다.',next:'공개할 소개·연락처·사진과 신청자의 동의 범위·근거를 확인한 뒤 기존 공개 등록 절차를 진행하세요.',note:'명함 전송이나 신청 접수 자체를 공개 동의로 보지 않습니다.'},
  '공개 중':{meaning:'업체 소개가 고객에게 보이는 상태입니다.',next:'‘현재 공개 결과 보기’에서 소개·분야·지역과 동의한 공개 범위를 확인하세요. 공개 업체를 중복 등록할 필요는 없습니다.',note:'연락처·사진은 각각의 공개 동의와 설정을 따릅니다.'},
  '일시 비공개':{meaning:'업체 소개가 현재 고객에게 보이지 않도록 잠시 숨겨진 상태입니다.',next:'숨긴 이유와 수정할 내용을 확인하세요. 다시 공개하려면 정보와 동의 범위를 확인한 뒤 기존 재공개 절차를 진행하세요.',note:'일시 비공개는 신청서나 업체 자료를 삭제하는 작업이 아닙니다.'},
  '공개 철회됨':{meaning:'업체 소개의 공개가 철회된 상태입니다.',next:'철회 요청과 처리 기록을 확인하세요. 재공개가 필요하다면 최신 정보와 공개 동의를 다시 확인하세요.',note:'공개 철회와 비공개 신청서 삭제는 서로 다른 작업입니다.'}
 };
 const names={'접수':'접수완료','확인 중':'확인중','자료 보완 요청':'보완요청','검토 완료':'사전등록 완료'};
 const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function content(title,item,titleTag='h3'){const fragment=document.createDocumentFragment();fragment.append(node(titleTag,title),node('p',item.meaning));const next=node('p');next.append(node('strong','다음 할 일 '),document.createTextNode(item.next));const note=node('p',item.note);note.className='admin-status-note';fragment.append(next,note);return fragment;}
 function reference(){const grid=node('div');grid.className='admin-status-reference';for(const [title,items]of [['신청 검토 상태',applications],['업체 공개 상태',publications]]){const column=node('section');column.append(node('h3',title));for(const[label,item]of Object.entries(items)){const entry=node('div');entry.append(content(label,item));column.append(entry);}grid.append(column);}return grid;}
 let locked=false;const signatures=new WeakMap();
 function sync(host,label,items,id,heading){
  if(!host||locked)return;
  const signature=label;if(signatures.get(host)===signature&&host.querySelector('#'+id))return;
  signatures.set(host,signature);
  const isApplicationList=id==='admin-application-status-help';
  const isApplicationDetail=id==='admin-detail-status-help';
  const titleTag=isApplicationDetail?'summary':'h3';
  let box=host.querySelector('#'+id);if(!box){box=node(isApplicationList||isApplicationDetail?'details':'section');box.id=id;box.className='admin-status-live-guide';box.setAttribute('aria-label',heading);const anchor=host.querySelector('.publication-badge');if(anchor)anchor.after(box);else host.prepend(box);}
  const item=items[label];
  if(isApplicationList){
   box.replaceChildren(node('summary',heading));
   if(item)box.append(content(label,item));
   else box.append(node('p','전체 신청을 보고 있습니다. 각 신청의 상태를 확인하고 ‘열기’를 누르면 해당 신청의 뜻과 다음 할 일을 볼 수 있습니다.'));
   box.append(node('p','사전등록 완료는 신청 검토 완료이며, 업체 공개는 별도로 확인합니다.'),reference());
   return;
  }
  if(item)box.replaceChildren(content(heading+' · '+label,item,titleTag));
  else box.replaceChildren(node(titleTag,heading),node('p',label==='공개 상태 확인 중'?'공개 상태를 불러오고 있습니다. 확인되면 뜻과 다음 할 일을 표시합니다.':'상태를 확인하지 못했습니다. 기존 상태 표시와 조회 결과를 먼저 확인하세요.'));
 }
 function update(){
  if(locked)return;
  const list=document.getElementById('admin-applications');
  if(list){const filter=list.querySelector('#state-filter');const label=names[filter?.value];
   sync(list,label||'전체',applications,'admin-application-status-help','신청 상태 안내');
  }
  const review=document.getElementById('application-review');if(review){const label=review.querySelector('.status')?.textContent.trim()||'';review.classList.add('admin-status-explained');sync(review,label,applications,'admin-detail-status-help','현재 신청 상태');}
  const profile=document.getElementById('profile-safety-panel');if(profile){const label=profile.querySelector('.publication-badge')?.textContent.trim()||'';sync(profile,label,publications,'admin-publication-status-help','현재 업체 공개 상태');}
 }
 new MutationObserver(update).observe(root,{childList:true,subtree:true,characterData:true});
 addEventListener('yessuri:admin-locked',()=>{locked=true;root.querySelectorAll('.admin-status-live-guide').forEach(n=>n.remove());});
 update();
})();
