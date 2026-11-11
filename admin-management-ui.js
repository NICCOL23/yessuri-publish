/* 인증된 관리자 전용 공개 프로필·동의·이력 관리. */
(()=>{
 'use strict';
 const root=document.querySelector('#root'),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 let dirty=false,locked=false,transferPhoto=null;
 const notice=()=>{const n=document.querySelector('#manage-dirty');if(n)n.textContent=dirty?'저장하지 않은 변경이 있습니다. 아래 저장 버튼으로 저장하세요.':'저장된 내용을 보고 있습니다.';};
 const mark=()=>{dirty=true;notice();},mayLeave=()=>!dirty||confirm('저장하지 않은 공개 정보·동의 입력이 있습니다. 저장하지 않고 이동할까요?');
 window.addEventListener('beforeunload',e=>{if(dirty&&!locked){e.preventDefault();e.returnValue='';}});
 window.addEventListener('yessuri:admin-locked',()=>{locked=true;dirty=false;document.querySelectorAll('.manage-picker-dialog').forEach(e=>e.remove());});
 document.addEventListener('click',e=>{if(!dirty||locked||!(e.target instanceof Element))return;const a=e.target.closest('a[href],button[type="submit"]');if(a&&!a.closest('#profile-safety-panel')){if(!mayLeave()){e.preventDefault();e.stopImmediatePropagation();}else{dirty=false;notice();}}},{capture:true});
 function field(parent,key,label,type='text'){
  const wrap=el('div',undefined,'field manage-field'),title=el('label',label),input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.id='manage-'+key;input.name=key;title.htmlFor=input.id;wrap.append(title,input);parent.append(wrap);return input;
 }
 function picker(form,key,label,items){
  const group=el('div',undefined,'manage-field'),button=el('button',label+' 선택','btn manage-picker-trigger'),summary=el('p','','hint');button.type='button';button.setAttribute('aria-haspopup','dialog');group.append(el('span',label,'manage-label'),button,summary);form.append(group);let selected=[],legacy=[],other=[];
  const update=()=>summary.textContent=[...selected.map(v=>items.find(i=>i.value===v)?.label||v),...legacy.map(v=>(window.YESSURI_SERVICE_FIELDS?.label(v)||v)+' (기존값 유지)'),...other].join(' · ')||'선택한 항목이 없습니다.';
  button.onclick=()=>{
   const dialog=el('dialog',undefined,'manage-picker-dialog'),title=el('h2',label+' 선택');title.id='picker-'+key;dialog.setAttribute('aria-labelledby',title.id);const grid=el('div',undefined,'manage-picker-grid'),choices=new Set(selected);
   for(const item of items){const l=el('label',undefined,'check'),c=el('input');c.type='checkbox';c.checked=choices.has(item.value);c.onchange=()=>c.checked?choices.add(item.value):choices.delete(item.value);l.append(c,document.createTextNode(item.label));grid.append(l);}
   dialog.append(title,el('p','여러 항목을 선택하세요. 목록 밖의 기존 값은 삭제하지 않고 유지합니다.','hint'),grid,el('p',legacy.length?'기존 선택값 (유지): '+legacy.map(v=>window.YESSURI_SERVICE_FIELDS?.label(v)||v).join(' · '):'기존 선택값 없음','hint'));
   const extra=field(dialog,key+'-other','기타 '+label+' (선택 · 한 줄에 하나)','textarea');extra.value=other.map(v=>v.replace(/^기타:\s*/,'' )).join('\n');extra.maxLength=1000;const actions=el('div',undefined,'actions'),cancel=el('button','취소','btn'),done=el('button','선택 적용','btn primary');cancel.type=done.type='button';actions.append(cancel,done);dialog.append(actions);document.body.append(dialog);button.setAttribute('aria-expanded','true');
   const close=()=>{dialog.close();dialog.remove();button.setAttribute('aria-expanded','false');button.focus();};cancel.onclick=close;done.onclick=()=>{const values=extra.value.split(/\n/).map(v=>v.trim()).filter(Boolean);if(values.length>20||values.some(v=>v.length>95)){extra.setCustomValidity('기타는 20개 이내, 항목당 95자 이내로 작성하세요.');extra.reportValidity();return;}selected=items.filter(i=>choices.has(i.value)).map(i=>i.value);other=[...new Set(values.map(v=>'기타: '+v.replace(/^기타:\s*/,'')))];update();mark();close();};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();dialog.querySelector('input,textarea,button')?.focus();
  };
  return {set(values){const all=[...new Set((values||[]).filter(v=>typeof v==='string'&&v.trim()))];selected=all.filter(v=>items.some(i=>i.value===v));legacy=all.filter(v=>!items.some(i=>i.value===v));other=[];update();},get:()=>[...new Set([...selected,...legacy,...other])]};
 }
 function consentFields(form){
  const disclosure=el('details',undefined,'manage-consent-disclosure');
  const summary=el('summary','비공개 동의 확인 기록');
  summary.id='manage-consent-heading';
  const box=el('fieldset',undefined,'consent-record');
  box.setAttribute('aria-labelledby',summary.id);
  box.addEventListener('invalid',()=>{disclosure.open=true;},true);
  disclosure.append(summary,box);
  box.append(el('p','명함 수신 자체는 공개 동의가 아닙니다. 공개 범위와 근거 식별자만 기록하세요.','hint'));
  const date=field(box,'consentDate','동의 확인일','date'),evidence=field(box,'evidence','근거 식별자 (연락처·대화 원문 제외)'),note=field(box,'note','확인 메모 (개인정보 원문 제외)','textarea');note.maxLength=500;evidence.maxLength=200;const scopes={};
  for(const[key,text]of [['profile','업체 소개·분야·지역 공개 동의'],['phone','연락처 공개 동의'],['photos','사진 공개 동의']]){const l=el('label',undefined,'check'),c=el('input');c.type='checkbox';l.append(c,document.createTextNode(text));box.append(l);scopes[key]=c;}form.append(disclosure);return ()=>({confirmedAt:date.value,evidence:evidence.value,note:note.value,scope:Object.keys(scopes).filter(k=>scopes[k].checked)});
 }
 function addProfileManager(api,application,host){
  const old=document.querySelector('#profile-safety-panel');if(old){if(!mayLeave())return;if(!window.dispatchEvent(new Event('yessuri:admin-profile-switch-request',{cancelable:true})))return;window.dispatchEvent(new Event('yessuri:admin-profile-switch'));old.remove();if(host)for(const id of ['admin-public-profile','admin-public-photos','admin-work-cases'])document.getElementById(id)?.remove();}dirty=false;
  const panel=el('section',undefined,'card section manage-public');panel.id='profile-safety-panel';panel.append(el('h2','공개 상태와 공개 정보 관리'),el('p','신청서 만료·삭제와 관계없이 공개 업체를 별도로 관리합니다. 신청 원본을 복구하거나 보관 기간을 늘리지 않습니다.','hint'));
  const badge=el('strong','공개 상태 확인 중','publication-badge'),status=el('p','','hint');status.setAttribute('role','status');panel.append(badge,status);const anchor=document.querySelector('#admin-public-profile');if(host)host.append(panel);else if(anchor)anchor.before(panel);else root.append(panel);document.querySelectorAll('.process-steps a[href="#admin-public-profile"]').forEach(a=>a.href='#profile-safety-panel');
  const form=el('form');form.id='manage-profile-form';const profileFields=el('div',undefined,'manage-profile-fields');
  const inputs={name:field(profileFields,'name','공개 업체명')};
  inputs.phone=field(profileFields,'phone','공개 연락처','tel');
  const phoneField=inputs.phone.parentElement;
  const phonePublic=el('input'),phoneLabel=el('label',undefined,'check');
  phonePublic.type='checkbox';
  phoneLabel.append(phonePublic,document.createTextNode('연락처 공개 (별도 동의 필요)'));
  const phoneHeading=el('div',undefined,'manage-phone-heading');
  phoneHeading.append(phoneField.firstElementChild,phoneLabel);
  phoneField.prepend(phoneHeading);
  const fields=picker(profileFields,'fields','전문 분야',(window.YESSURI_SERVICE_FIELDS?.items||[]).map(i=>({value:i.value,label:i.label}))),areas=picker(profileFields,'serviceAreas','출장 지역',[...new Set(['전체',...(window.YESSURI_REGIONS||[])])].map(v=>({value:v,label:v==='전체'?'부산 전 지역':v})));
  const profileDescription=el('div',undefined,'manage-profile-description');
  inputs.intro=field(profileDescription,'intro','공개 소개','textarea');
  inputs.career=field(profileDescription,'career','공개 경력');
  profileFields.append(profileDescription);
  form.append(profileFields);
  const readConsent=consentFields(form),dirtyText=el('p','','manage-dirty');dirtyText.id='manage-dirty';dirtyText.setAttribute('role','status');form.append(dirtyText);
  const profileId=application.profileId||(application.id?.startsWith('technician-')?application.id:'technician-'+application.id),route='admin/profiles/'+encodeURIComponent(profileId)+'/profile-management';const actions=el('div',undefined,'actions'),save=el('button','공개 정보와 동의 기록 저장','btn primary'),preview=el('a','현재 공개 결과 보기','btn');save.type='submit';preview.href='expert.html?id='+encodeURIComponent(profileId);preview.target='_blank';preview.rel='noopener';const saveHint=el('span','저장하면 공개 프로필에 바로 반영됩니다','hint');
  saveHint.hidden=true;
  actions.append(saveHint,save,preview);form.append(actions);panel.append(form);
  const lifecycle=el('div',undefined,'actions lifecycle'),hide=el('button','일시 비공개','btn'),restore=el('button','동의 확인 후 다시 공개','btn'),withdraw=el('button','공개 철회','btn danger');for(const b of [hide,restore,withdraw])b.type='button';lifecycle.append(hide,restore,withdraw);panel.append(lifecycle);const records=el('details',undefined,'section'),history=el('div');records.append(el('summary','동의 확인 이력 · 비공개'),history);panel.append(records);let current=null,busy=false,loaded=false;
  const lock=v=>{busy=v;panel.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=v);};const data=()=>({version:current?.version,name:inputs.name.value,fields:fields.get(),serviceAreas:areas.get(),intro:inputs.intro.value,career:inputs.career.value,phone:inputs.phone.value,phonePublic:phonePublic.checked,consent:readConsent()});
  function render(result){if(locked||!panel.isConnected)return;loaded=true;current=result.profile;const state=current?.publication_status||'none';syncProfileRows(profileId,current);badge.textContent=({approved:'공개 중',published:'공개 중',hidden:'일시 비공개',withdrawn:'공개 철회됨',none:'아직 공개하지 않음'})[state]||state;lifecycle.hidden=!current;save.textContent=current?'공개 정보와 동의 기록 저장':'동의 확인하고 공개 등록';preview.hidden=!['approved','published'].includes(state);saveHint.hidden=preview.hidden;hide.hidden=!['approved','published'].includes(state);restore.hidden=['approved','published'].includes(state);withdraw.hidden=state==='withdrawn';
   const record=current||{name:application.company,fields:(application.fields||'').split(/[,，]+/),serviceAreas:(application.areas||'').split(/[,，]+/),intro:application.intro};inputs.name.value=record.name||'';fields.set(record.fields);areas.set(record.service_areas||record.serviceAreas);for(const key of ['intro','career','phone'])inputs[key].value=record[key]||'';phonePublic.checked=!!(record.phone_public??record.phonePublic);if(anchor)anchor.hidden=true;history.replaceChildren();for(const item of result.consents||[])history.append(el('p',[item.confirmedAt,(item.scope||[]).join(' · '),item.evidence].filter(Boolean).join(' / ')));if(!history.childNodes.length)history.append(el('p','동의 기록이 없습니다. 공개 여부와 근거 기록은 별개입니다.'));dirty=false;notice();const advice=document.querySelector('.next-action p');if(advice)advice.textContent=current?(state==='approved'?'이 업체는 이미 공개 중입니다. 신청 상태와 공개 상태는 다릅니다.':'현재 프로필은 공개되지 않습니다. 재공개는 동의 범위를 확인하세요.'):'공개할 정보와 사진 동의를 별도로 확인하세요.';
   if(host&&current&&transferPhoto){let marker=document.querySelector('#admin-public-profile');if(!marker){marker=el('section');marker.id='admin-public-profile';marker.hidden=true;(panel.closest('.admin-workspace')||panel).after(marker);const app={id:profileId.replace(/^technician-/,''),company:current.name};window.YESSURI_TECHNICIAN_PUBLIC_PHOTOS?.mount({application:app,api,transfer:transferPhoto});window.YESSURI_TECHNICIAN_WORK_CASES?.mount({application:app,api,transfer:transferPhoto});organizeDetail();}for(const id of ['admin-public-photos','admin-work-cases']){const section=document.getElementById(id);if(section)section.hidden=state!=='approved';}}
  }
  async function mutate(action){if(busy)return;if(!loaded){status.textContent='공개 상태를 먼저 확인해야 합니다. 화면을 다시 열어 주세요.';return;}if(['hide','withdraw'].includes(action)&&dirty&&!confirm('편집 중인 내용은 저장하지 않고 공개 상태만 변경할까요?'))return;const messages={create:'동의 근거를 확인하고 공개 등록할까요?',update:'공개 정보와 동의 기록을 저장할까요?',hide:'검색·공개 프로필에서 숨길까요? 신청 원본은 유지됩니다.',restore:'동의 범위를 확인하고 다시 공개할까요?',withdraw:'공개를 철회할까요? 비공개 신청은 삭제하지 않습니다.'};if(!confirm(messages[action]))return;lock(true);try{render(await api(route,{action,...data()}));status.textContent='저장했습니다. 공개 상태와 변경 이력을 확인하세요.';}catch(e){status.textContent='저장하지 못했습니다: '+e.message+' 입력 내용은 유지됩니다.';}finally{lock(false);}}
  form.addEventListener('input',mark);form.addEventListener('change',mark);form.onsubmit=e=>{e.preventDefault();mutate(current?'update':'create');};hide.onclick=()=>mutate('hide');restore.onclick=()=>mutate('restore');withdraw.onclick=()=>mutate('withdraw');lock(true);api(route).then(render).catch(e=>status.textContent='공개 상태 조회 실패: '+e.message).finally(()=>lock(false));notice();
 }
 function syncProfileRows(id,profile){if(!profile)return;for(const row of document.querySelectorAll('.manage-profile-row')){if(row.dataset.profileId!==id)continue;const name=row.querySelector('strong'),state=row.querySelector('.manage-list-state');if(name)name.textContent=profile.name||'업체명 없음';if(state)state.textContent=({approved:'공개 중',published:'공개 중',hidden:'일시 비공개',withdrawn:'공개 철회됨'})[profile.publication_status]||profile.publication_status||'확인 필요';}}
 function profileList(api){const panel=el('details',undefined,'card section admin-profile-disclosure');panel.id='independent-profile-list';const summary=el('summary');summary.append(el('h2','공개 업체 관리'));panel.append(summary,el('p','신청서 만료·삭제와 관계없이 공개 프로필을 조회합니다. 업체를 선택하면 아래에 관리 양식이 열립니다.','hint'));const list=el('div',undefined,'manage-profile-list'),status=el('p');status.setAttribute('role','status');panel.append(status,list);root.append(panel);(window.YESSURI_ADMIN_PROFILES?.readAll(api,{current:()=>!locked&&panel.isConnected})||api('admin/profiles')).then(result=>{if(locked||!panel.isConnected)return;const rows=Array.isArray(result)?result:result.profiles||[];status.textContent=rows.length+'개 공개 프로필 · 공개/비공개 상태 포함';for(const p of rows){const row=el('div',undefined,'manage-profile-row'),b=el('button','공개 정보 관리','btn');b.type='button';row.dataset.profileId=p.id;row.append(el('strong',p.name||'업체명 없음'),el('span',({approved:'공개 중',hidden:'일시 비공개',withdrawn:'공개 철회됨'})[p.publication_status]||p.publication_status||'확인 필요','manage-list-state hint'));if(p.applicationAvailable===false)row.append(el('span','신청서 없음 · 공개 관리 가능','manage-orphan'));row.append(b);b.onclick=()=>{addProfileManager(api,{id:p.id,profileId:p.id,company:p.name},panel);document.querySelector('#profile-safety-panel')?.scrollIntoView({behavior:'smooth',block:'start'});};list.append(row);}}).catch(e=>status.textContent='공개 업체 조회 실패: '+e.message);}
 const actionNames={login:'관리자 로그인',logout:'관리자 로그아웃','login-failure':'로그인 실패','access-denied':'접근 거부','request-failure':'요청 실패','profile-create':'공개 등록','profile-update':'공개 정보 수정','profile-hide':'일시 비공개','profile-restore':'다시 공개','profile-withdraw':'공개 철회','photo-upload':'사진 추가','photo-replace':'사진 교체','photo-delete':'사진 삭제','photo-edit':'사진 설명 수정','photo-reorder':'사진 순서 변경','work-case-save':'작업 사례 저장','work-case-delete':'작업 사례 삭제','application-update':'신청 상태·답변 저장','view-application':'신청 내용 확인'};
 Object.assign(actionNames,{'request-rejected':'요청 거부','public-photo-upload':'공개 사진 추가','public-photo-select':'대표 이미지 변경','public-photo-delete':'공개 사진 삭제','public-photo-edit':'공개 사진 설명 저장','public-photo-reorder':'공개 사진 순서 변경','public-photo-replace':'공개 사진 교체'});
 Object.assign(actionNames,window.YESSURI_AUDIT_TEXT?.actionNames||{});
 const kst=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' (한국시간)':'시각 확인 필요';},day=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?new Date(d.getTime()+32400000).toISOString().slice(0,10):'';};
 function addOperations(api){if(document.querySelector('#admin-change-log'))return;const panel=el('details',undefined,'card section admin-profile-disclosure');panel.id='admin-change-log';const summary=el('summary');summary.append(el('h2','관리자 변경 이력'));panel.append(summary,el('p','이력은 복구 기능이 아닙니다. 관리자 이름 정보가 없어 계정 번호 끝 8자리로 구분합니다. 신청·사진 원문이나 비밀번호는 표시하지 않습니다.','hint'));const filters=el('div',undefined,'manage-audit-filters'),date=field(filters,'audit-date','날짜 (한국시간)','date'),select=el('select');select.id='manage-audit-action';const all=el('option','전체 작업');all.value='';select.append(all);
  for(const[key,text]of Object.entries(actionNames)){const option=el('option',text);option.value=key;select.append(option);}
  const wrap=el('div',undefined,'field manage-field');
  const label=el('span','작업 종류','manage-label');
  label.id='manage-audit-action-label';
  const trigger=el('button','전체 작업','btn manage-picker-trigger');
  trigger.type='button';
  trigger.id='manage-audit-action-trigger';
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-labelledby',label.id+' '+trigger.id);
  const picker=el('dialog',undefined,'manage-picker-dialog');
  picker.setAttribute('aria-labelledby',label.id);
  select.size=8;
  select.setAttribute('aria-labelledby',label.id);
  const dismiss=el('button','선택 목록 닫기','btn');
  dismiss.type='button';
  dismiss.onclick=()=>picker.close();
  const actions=el('div',undefined,'actions');
  actions.append(dismiss);
  const choices=el('div',undefined,'manage-field');
  choices.append(select);
  picker.append(choices,actions);
  trigger.onclick=()=>{picker.showModal();select.focus();};
  picker.onclose=()=>trigger.focus();
  wrap.append(label,trigger,picker);filters.append(wrap);
  const refresh=el('button','변경 이력 불러오기','btn');refresh.type='button';const status=el('p'),box=el('div',undefined,'manage-table-wrap');status.setAttribute('role','status');function makeCloseButton(){
   const button=el('button','변경 이력 닫기','btn');
   button.type='button';
   button.onclick=()=>{panel.open=false;summary.focus();};
   return button;
  }
  const toolbar=el('div',undefined,'admin-toolbar');
  toolbar.append(refresh,makeCloseButton());
  const more=el('button','이전 기록 5건 더 보기','btn');
  const fewer=el('button','이전 기록 접기','btn');
  more.type=fewer.type='button';
  more.hidden=fewer.hidden=true;
  const paging=el('div',undefined,'admin-toolbar');
  paging.append(more,fewer);
  panel.append(filters,toolbar,status,box,paging,makeCloseButton());
  root.append(panel);
  const pageSize=5;
  let events=[],limit=pageSize;
  function resetResults(){limit=pageSize;render();}
  more.onclick=()=>{
   const previousLimit=limit;
   limit+=pageSize;
   render();
   box.querySelectorAll('.audit-event-summary')[previousLimit]?.focus();
  };
  fewer.onclick=()=>{resetResults();more.focus();};
  function render(){box.replaceChildren();const formatter=window.YESSURI_AUDIT_TEXT,list=el('ul',undefined,'audit-readable-list'),filtered=events.filter(e=>(!date.value||day(e.at||e.created_at)===date.value)&&(!select.value||(formatter?formatter.key(e):e.action)===select.value));list.setAttribute('aria-label','관리자 변경 이력 · 한국시간');for(const item of filtered.slice(0,limit)){const info=formatter?formatter.describe(item):{actor:'관리자 확인 필요',target:'대상 확인 필요',title:actionNames[item.action]||'작업 내용을 확인해야 합니다',detail:'현재 상태는 해당 관리 화면에서 확인하세요.',result:item.outcome==='success'?'처리 완료':item.outcome==='failure'?'처리 실패':'결과 확인 필요',resultClass:item.outcome==='success'?'success':item.outcome==='failure'?'failure':'unknown'},entry=el('li',undefined,'audit-readable-event'),top=el('div',undefined,'audit-readable-top');top.append(el('span',info.actor,'audit-readable-actor'));
   const disclosure=el('details',undefined,'audit-event-disclosure');
   const heading=el('summary',undefined,'audit-event-summary');
   const at=item.at||item.created_at;
   const time=el('time',kst(at));
   heading.append(el('strong',info.title),document.createTextNode(' · '),time,document.createTextNode(' · '),el('span',info.result,'audit-readable-result '+info.resultClass));if(at&&Number.isFinite(Date.parse(at)))time.dateTime=new Date(at).toISOString();const identifiers=el('details');identifiers.append(el('summary','식별자 보기'),el('p','대상: '+(item.target||'-')),el('p','운영자: '+(item.operatorId||item.admin_id||'-')));disclosure.append(heading,top,el('p','대상: '+info.target),el('p',info.detail),identifiers);entry.append(disclosure);list.append(entry);}if(filtered.length)box.append(list);else box.append(el('p','현재 조건에 맞는 이력이 없습니다. 날짜나 작업 종류를 확인하세요.','hint'));const visible=Math.min(limit,filtered.length);
   more.hidden=visible>=filtered.length;
   fewer.hidden=visible<=pageSize;
   status.textContent=filtered.length>visible
    ? filtered.length+'건 중 최신 '+visible+'건 표시'
    : visible+'건 표시';}
  date.onchange=resetResults;select.onchange=()=>{trigger.textContent=select.selectedOptions[0].textContent;resetResults();};refresh.onclick=async()=>{refresh.disabled=true;try{events=(await api('admin/audit')).events||[];if(!locked){events.sort((a,b)=>(Date.parse(b.at||b.created_at)||0)-(Date.parse(a.at||a.created_at)||0));resetResults();}}catch(e){status.textContent=e.message;}finally{refresh.disabled=false;}};
 }
 function organizeDetail(){for(const[selector,title]of [['#admin-public-photos','공개 사진 · 변경 즉시 반영'],['#admin-work-cases','공개 작업 사례 · 저장 후 반영']]){const node=document.querySelector(selector);if(node){node.classList.add('manage-public');node.prepend(el('p',title,'manage-eyebrow'));}}const form=document.querySelector('#admin-update');if(form){const section=form.closest('section');section?.classList.add('manage-private');if(section&&!section.querySelector('.manage-eyebrow'))section.prepend(el('p','비공개 신청 답변 · 공개 프로필을 변경하지 않습니다.','manage-eyebrow'));}}
 const original=window.YESSURI_ADMIN_GUIDE?.mount;if(original)window.YESSURI_ADMIN_GUIDE.mount=options=>{document.body.dataset.adminManagement='true';transferPhoto=options.transfer||transferPhoto;original(options);if(options.application){addProfileManager(options.api,options.application);organizeDetail();}else{profileList(options.api);addOperations(options.api);}};
})();
