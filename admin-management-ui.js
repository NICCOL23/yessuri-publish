/* Authenticated administrator profile management. Uses existing Supabase API wrapper. */
(()=>{
 'use strict';
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const root=document.querySelector('#root');

 function field(form,key,label,value='',type='text'){
  const wrap=el('div',undefined,'field section'),title=el('label',label),input=el(type==='textarea'?'textarea':'input');
  if(type!=='textarea')input.type=type;input.id='manage-'+key;input.name=key;input.value=value||'';title.htmlFor=input.id;wrap.append(title,input);form.append(wrap);return input;
 }
 function consentFields(form){
  const box=el('fieldset',undefined,'consent-record');box.append(el('legend','비공개 동의 확인 기록'));
  box.append(el('p','명함을 받았다는 사실만으로 공개 동의가 되지 않습니다. 공개할 정보와 사진의 동의를 확인한 근거만 기록하세요.','hint'));
  const date=field(box,'consentDate','동의 확인일','','date'),evidence=field(box,'evidence','근거 식별자 (연락처·대화 원문 제외)'),note=field(box,'note','확인 메모 (개인정보 원문 제외)','','textarea');note.maxLength=500;evidence.maxLength=200;
  const scopes={};for(const [key,text]of [['profile','업체 소개·전문 분야·지역 공개 동의 확인'],['phone','연락처 공개 동의 확인'],['photos','사진 공개 동의 확인']]){const l=el('label',undefined,'check'),c=el('input');c.type='checkbox';l.append(c,document.createTextNode(text));box.append(l);scopes[key]=c;}
  form.append(box);return ()=>({confirmedAt:date.value,evidence:evidence.value,note:note.value,scope:Object.keys(scopes).filter(k=>scopes[k].checked)});
 }
 function addProfileManager(api,application){
  if(document.querySelector('#profile-safety-panel'))return;
  const panel=el('section',undefined,'card section');panel.id='profile-safety-panel';
  panel.append(el('h2','공개 상태와 공개 정보 관리'),el('p','비공개 신청 원본은 유지됩니다. 공개 정보 수정·숨기기·철회는 아래에서 별도로 처리합니다.'));
  const badge=el('strong','공개 상태 확인 중','publication-badge'),status=el('p',undefined,'hint');status.setAttribute('role','status');panel.append(badge,status);
  const anchor=document.querySelector('#admin-public-profile');anchor.before(panel);
  document.querySelectorAll('.process-steps a[href="#admin-public-profile"]').forEach(a=>a.href='#profile-safety-panel');
  let current=null;
  const form=el('form');const inputs={};
  const definitions=[['name','공개 업체명'],['fields','전문 분야 (쉼표로 구분)'],['serviceAreas','출장 지역 (쉼표로 구분)'],['intro','공개 소개','textarea'],['career','공개 경력'],['phone','공개 연락처','tel']];
  for(const[key,label,type]of definitions)inputs[key]=field(form,key,label,'',type);
  const phoneLabel=el('label',undefined,'check'),phonePublic=el('input');phonePublic.type='checkbox';phoneLabel.append(phonePublic,document.createTextNode('연락처를 공개합니다 (별도 동의 필요)'));form.append(phoneLabel);
  const readConsent=consentFields(form);
  const actions=el('div',undefined,'actions');const save=el('button','공개 정보와 동의 기록 저장','btn primary');save.type='submit';
  const preview=el('a','현재 공개 결과 보기','btn');preview.target='_blank';preview.rel='noopener';preview.href='expert.html?id='+encodeURIComponent('technician-'+application.id);
  actions.append(save,preview);form.append(actions);panel.append(form);
  const lifecycle=el('div',undefined,'actions lifecycle'),hide=el('button','일시 비공개','btn'),restore=el('button','동의 확인 후 다시 공개','btn'),withdraw=el('button','공개 철회','btn danger');for(const b of [hide,restore,withdraw])b.type='button';lifecycle.append(hide,restore,withdraw);panel.append(lifecycle);
  const records=el('details',undefined,'section');records.append(el('summary','동의 확인 이력 · 비공개'));const history=el('div');records.append(history);panel.append(records);
  const route='admin/applications/'+application.id+'/profile-management';
  let busy=false;const lock=v=>{busy=v;panel.querySelectorAll('input,textarea,button').forEach(n=>n.disabled=v);};
  const split=s=>s.split(/[,，\n]+/).map(x=>x.trim()).filter(Boolean);
  function data(){return{version:current?.version,name:inputs.name.value,fields:split(inputs.fields.value),serviceAreas:split(inputs.serviceAreas.value),intro:inputs.intro.value,career:inputs.career.value,phone:inputs.phone.value,phonePublic:phonePublic.checked,consent:readConsent()};}
  function render(result){
   current=result.profile;
   const state=current?.publication_status||'none';const texts={approved:'공개 중',published:'공개 중',hidden:'일시 비공개',withdrawn:'공개 철회됨',none:'아직 공개하지 않음'};
   badge.textContent=texts[state]||state;form.hidden=false;lifecycle.hidden=!current;save.textContent=current?'공개 정보와 동의 기록 저장':'동의 확인하고 공개 등록';
   preview.hidden=!['approved','published'].includes(state);hide.hidden=!['approved','published'].includes(state);restore.hidden=['approved','published'].includes(state);withdraw.hidden=state==='withdrawn';
   {const record=current||{name:application.company,fields:(application.fields||'').split(/[,，]+/),serviceAreas:(application.areas||'').split(/[,，]+/),intro:application.intro};inputs.name.value=record.name||'';inputs.fields.value=(record.fields||[]).join(', ');inputs.serviceAreas.value=(record.service_areas||record.serviceAreas||[]).join(', ');for(const key of ['intro','career','phone'])inputs[key].value=record[key]||'';phonePublic.checked=!!(record.phone_public??record.phonePublic);}
   anchor.hidden=true;
   history.replaceChildren();for(const item of result.consents||[])history.append(el('p',[item.confirmedAt,item.operatorId,(item.scope||[]).join('・'),item.evidence].filter(Boolean).join(' / ')));if(!history.childNodes.length)history.append(el('p','동의 기록이 없습니다. 공개 체크 여부와 동의 근거 기록은 별개입니다.'));
   const advice=document.querySelector('.next-action p');if(advice)advice.textContent=current?(state==='approved'||state==='published'?'이 업체는 이미 공개 중입니다. 신청 검토 상태와 공개 상태를 따로 확인하세요.':'현재 프로필은 공개되지 않습니다. 다시 공개하려면 동의 범위를 확인하세요.'):'신청 내용을 확인한 뒤, 공개할 정보와 사진에 대한 동의를 별도로 확인하세요.';
  }
  async function load(){try{render(await api(route));}catch(e){status.textContent='공개 상태 조회 실패: '+e.message;}}
  async function mutate(action){if(busy)return;if(!confirm(({create:'동의 근거를 확인하고 이 업체 정보를 공개 등록할까요?',update:'이 공개 정보를 저장할까요?',hide:'이 업체를 검색·공개 프로필에서 숨길까요? 신청 원본은 유지됩니다.',restore:'기록한 동의 범위를 확인하고 다시 공개할까요?',withdraw:'이 업체의 공개를 철회할까요? 공개 화면에서 차단하며 비공개 신청은 삭제하지 않습니다.'})[action]))return;lock(true);try{render(await api(route,{action,...data()}));status.textContent='처리했습니다. 변경 이력에 운영자·대상·시간·결과를 기록했습니다.';}catch(e){status.textContent=e.message;}finally{lock(false);}}
  form.onsubmit=e=>{e.preventDefault();mutate(current?'update':'create');};hide.onclick=()=>mutate('hide');restore.onclick=()=>mutate('restore');withdraw.onclick=()=>mutate('withdraw');
  load();
 }
 function addOperations(api){
  if(document.querySelector('#admin-change-log'))return;
  const panel=el('section',undefined,'card section');panel.id='admin-change-log';panel.append(el('h2','관리자 변경 이력'),el('p','운영자·시간·대상·처리 결과를 확인합니다. 신청 내용과 사진 원문은 이 목록에 표시하지 않습니다.'));
  const status=el('p');status.setAttribute('role','status');const list=el('div'),refresh=el('button','변경 이력 불러오기','btn');refresh.type='button';panel.append(refresh,status,list);root.append(panel);
  refresh.onclick=async()=>{refresh.disabled=true;try{const result=await api('admin/audit');list.replaceChildren();for(const item of result.events||[])list.append(el('p',[item.at||item.created_at,item.operatorId||item.admin_id,item.action,item.target,item.outcome].filter(Boolean).join(' / ')));status.textContent=list.childNodes.length?'최근 변경 이력을 불러왔습니다.':'표시할 기록이 없습니다.';}catch(e){status.textContent=e.message;}finally{refresh.disabled=false;}};
 } const original=window.YESSURI_ADMIN_GUIDE?.mount;
 if(original)window.YESSURI_ADMIN_GUIDE.mount=options=>{original(options);if(options.application)addProfileManager(options.api,options.application);else addOperations(options.api);};
})();
