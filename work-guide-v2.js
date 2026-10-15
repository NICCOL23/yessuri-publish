(() => {
 'use strict';
 const groups=window.YESSURI_WORK_GUIDE,$=id=>document.getElementById(id);if(!groups)return;
 const records=groups.flatMap(g=>g.categories.flatMap(c=>c.tasks.map(t=>({g,c,t}))));
 const params=new URLSearchParams(location.search),findRecord=id=>records.find(r=>r.t.id===id);
 let current=findRecord(params.get('work'))||findRecord('door');
 const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
 const button=(label,active,run)=>{const b=text('button',label);b.type='button';b.setAttribute('aria-pressed',String(active));b.addEventListener('click',()=>{const scope=b.closest('[id]')?.id,focused=document.activeElement===b;run();if(focused&&!b.isConnected&&document.activeElement===document.body){const next=[...($(scope)?.querySelectorAll('button')||[])].find(el=>el.textContent===b.textContent);next?.focus({preventScroll:true});}});return b;};
 const announce=text('p','','sr-only');announce.setAttribute('role','status');$('wg-detail-content').before(announce);
 function select(record,{focus=false,historyEntry=true}={}){
  if(!record)return;const changed=current.t.id!==record.t.id;current=record;render();
  if(changed&&historyEntry){const u=new URL(location.href);u.searchParams.set('work',record.t.id);history.pushState(null,'',u);}
  announce.textContent=record.c.label+' · '+record.t.label+' 안내를 표시합니다.';
  if(focus)$('wg-detail-title').focus();
 }
 const sectionTitle=(n,label)=>{const h=text('h3',label,'wg-section-title');h.prepend(text('span',n));return h;};
 function render(){
  const {g,c,t}=current,isGlass=c.id==='glass';
  $('wg-groups').replaceChildren(...groups.map(group=>{const b=button(group.title,g===group,()=>select(records.find(r=>r.g===group)));b.append(text('small',group.help));return b;}));
  $('wg-categories').replaceChildren(...g.categories.map(category=>button(category.label,c===category,()=>select(records.find(r=>r.c===category)))));
  $('wg-selection').textContent=g.title+' › '+c.label+' › '+t.label;
  $('wg-field-title').textContent=c.label;
  $('wg-field-summary').textContent=c.id==='bath'?'기구 교체와 부속 보수를 나누어 확인하세요.':c.id==='doors'&&t.section==='방충망'?'망 교체와 틀·부속 보수를 나누어 확인하세요.':'필요한 작업을 선택하고 규격과 비용 조건을 확인하세요.';
  const art=t.section==='방충망'?20:c.art;
  $('wg-art').style.backgroundPosition=`${(art%7)*100/6}% ${Math.floor(art/7)*50}%`;
  $('wg-art').setAttribute('aria-label',t.section==='방충망'?'방충망 대표 이미지':c.label+' 대표 이미지');
  const sections=[...new Set(c.tasks.map(task=>task.section||'기존 작업 안내'))];
  $('wg-tasks').replaceChildren(...sections.map(label=>{const wrap=text('div','','wg-task-row');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);wrap.append(text('span',label,'wg-task-label'));const buttons=text('div','','wg-task-buttons');buttons.append(...c.tasks.filter(task=>(task.section||'기존 작업 안내')===label).map(task=>button(task.label,t===task,()=>select(findRecord(task.id)))));wrap.append(buttons);return wrap;}));
  const content=$('wg-detail-content');content.replaceChildren();
  const title=text('h2',t.label);title.id='wg-detail-title';title.tabIndex=-1;content.append(title,text('p',t.summary,'wg-summary'));
  if(isGlass||t.id==='bath-glass-parts')content.append(text('p','깨진 유리를 직접 만지거나 치수를 재지 말고, 안전한 위치에서 사진을 준비해 상담하세요.','wg-callout'));
  const before=text('section','','wg-before');before.append(sectionTitle('01','보수·교체, 먼저 확인하세요'));const pair=text('div','','wg-before-grid');
  [['점검할 부분',c.guidance[0]],['작업 범위 상담',c.guidance[1]]].forEach(([a,b])=>{const box=text('div');box.append(text('h4',a),text('p',b));pair.append(box);});before.append(pair,text('p','원인과 최종 작업 범위는 기술자 확인 후 결정합니다.','wg-small'));content.append(before);
  const cost=text('section');cost.append(sectionTitle('02','같은 조건으로 비용을 확인하세요'));
  const wrap=text('div','','wg-table-wrap'),table=document.createElement('table');table.append(text('caption',c.label+' 작업·제품 확인 사항','sr-only'));
  const head=document.createElement('thead'),hr=document.createElement('tr');['작업','확인할 제품·규격','비용이 달라지는 조건'].forEach(s=>{const th=text('th',s);th.scope='col';hr.append(th);});head.append(hr);table.append(head);
  const body=document.createElement('tbody');t.rows.forEach(row=>{const tr=document.createElement('tr'),th=text('th',row.name);th.scope='row';tr.append(th);[['확인할 제품·규격',row.parts],['비용이 달라지는 조건',row.conditions]].forEach(([label,value])=>{const td=text('td',value);td.dataset.label=label;tr.append(td);});body.append(tr);});table.append(body);wrap.append(table);cost.append(wrap);content.append(cost);
  const related=[];
  if(['sliding','glass-hinge','bath-glass-parts'].includes(t.id))related.push(['유리 파손·교체 안내',t.id==='bath-glass-parts'?'glass-bath':'glass-door']);
  if(c.id==='outdoor')related.push(['문지방 제거 안내','threshold']);
  if(['insulation','balcony-insulation','condensation'].includes(t.id))related.push(['곰팡이 청소는 생활서비스에서 확인','clean-work']);
  if(t.id==='clean-work')related.push(['단열·결로 원인 보수 안내','condensation']);
  if(c.id==='leak')related.push(['누수면 건조·마감 복구 안내','leak-restore']);
  if(t.id==='leak-restore')related.push(['누수 점검·탐지 안내','leak-work']);
  related.forEach(([label,id])=>{const a=text('a',label+' →','wg-related');a.href='guide.html?work='+id+'#work-guide';a.addEventListener('click',e=>{e.preventDefault();select(findRecord(id),{focus:true});});content.append(a);});
  const after=text('section','','wg-after');after.append(sectionTitle('03','작업 후 확인할 내용'));const checks=text('ul');[c.guidance[2],'사용한 제품·작업 내역','사후 점검·보증 범위·재방문 비용 조건'].forEach(s=>checks.append(text('li',s)));after.append(checks);content.append(after);
  $('wg-product-title').textContent=isGlass?'유리 종류를 알고 계신가요?':'제품은 어떻게 준비하시나요?';
  $('wg-product-options').replaceChildren(...(isGlass?['종류를 모르겠어요','기존 제품 정보가 있어요','기술자와 함께 선택할게요']:['기술자와 함께 선택','직접 구매한 제품 있음','기존 부품 재사용 상담']).map(s=>{const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='product-preparation';radio.value=s;radio.addEventListener('change',updateMemo);label.append(radio,document.createTextNode(s));return label;}));
  $('wg-prepare').replaceChildren(...(isGlass?['안전한 위치에서 보이는 설치 위치·전체 모습 사진','파손 부위 사진·기존 제품 정보','작업 수량·희망 일정']:['전체 모습과 문제 부위 사진',t.rows[0].parts+' 정보','작업 수량·희망 일정']).map(s=>text('li',s)));
  updateFind();updateMemo();
 }
 function updateFind(){const {t,c}=current,link=$('wg-find');
  if(t.category==='전체'){link.href='https://pf.kakao.com/_VdyFX/chat';link.target='_blank';link.rel='noopener';link.textContent=c.label+' 작업 문의 (새 창)';$('wg-search-note').textContent='현재 전문가 검색에 독립 분야가 없어 카카오톡 문의로 안내합니다. 작업 가능 여부를 확인해 주세요.';}
  else{const u=new URL('find.html',location.href);u.searchParams.set('category',t.category);u.searchParams.set('service',c.label+' · '+t.label);const region=$('wg-region').value;if(region)u.searchParams.set('region',region);link.href=u.pathname+u.search;link.removeAttribute('target');link.removeAttribute('rel');link.textContent=c.label+' 전문가 찾기';$('wg-search-note').textContent='기존 '+t.category+' 분야 기준으로 검색합니다. 세부 작업 가능 여부와 출장 지역은 업체에 확인하세요.';}
 }
 function updateMemo(){const region=$('wg-region').value||'○○구',choice=document.querySelector('input[name="product-preparation"]:checked');$('wg-memo-work').textContent=current.c.label+' · '+current.t.label;$('wg-memo').textContent=`부산 ${region}에서 ${current.c.label} · ${current.t.label} 상담을 원합니다. 증상은 ○○이며 사진을 전달드릴 수 있습니다. ${choice?'제품 준비: '+choice.value+'. ':''}방문 가능한 일정과 출장·진단비를 알려주세요. 작업비·제품 및 부속비·장비비와 철거·복구·폐기물·부가세 포함 여부, 사후 점검·재방문 조건도 확인 부탁드립니다.`;if($('guide-message'))$('guide-message').textContent=$('wg-memo').textContent;$('wg-copy-status').textContent='';if($('guide-copy-status'))$('guide-copy-status').textContent='';}
 $('wg-region').addEventListener('change',()=>{updateFind();updateMemo();const u=new URL(location.href);if($('wg-region').value)u.searchParams.set('region',$('wg-region').value);else u.searchParams.delete('region');history.replaceState(null,'',u);});
 if(window.YESSURI_REGIONS.includes(params.get('region')))$('wg-region').value=params.get('region');
 $('wg-copy').addEventListener('click',async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText($('wg-memo').textContent);$('wg-copy-status').textContent='상담 문구가 복사되었습니다.';}catch{const range=document.createRange();range.selectNodeContents($('wg-memo'));const s=getSelection();s.removeAllRanges();s.addRange(range);$('wg-memo').focus();$('wg-copy-status').textContent='문구를 선택했습니다. 길게 누르거나 Ctrl+C로 복사해 주세요.';}});
 window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search),next=findRecord(p.get('work'))||findRecord('door'),region=window.YESSURI_REGIONS.includes(p.get('region'))?p.get('region'):'';const regionChanged=$('wg-region').value!==region;$('wg-region').value=region;if(next.t.id!==current.t.id){select(next,{historyEntry:false});$('wg-results').hidden=true;}else if(regionChanged){updateFind();updateMemo();}});
 $('wg-search').addEventListener('submit',e=>{e.preventDefault();const query=$('wg-query').value.trim().normalize('NFKC').toLowerCase();if(!query){$('wg-query').focus();return;}const terms=query.split(/\s+/);const found=records.filter(({g,c,t})=>{const hay=[g.title,c.label,t.label,t.summary,t.keywords,...t.rows.flatMap(r=>[r.name,r.parts,r.conditions])].join(' ').normalize('NFKC').toLowerCase();return terms.every(w=>hay.includes(w));});$('wg-results').hidden=false;$('wg-result-count').textContent=found.length?found.length+'개의 작업 안내를 찾았습니다.':'일치하는 안내가 없습니다. 짧은 작업명으로 검색하거나 카카오톡으로 문의해 주세요.';$('wg-result-items').replaceChildren(...found.map(r=>button(r.c.label+' · '+r.t.label,false,()=>{select(r,{focus:true});$('wg-results').hidden=true;})));});
 $('wg-clear').addEventListener('click',()=>{$('wg-results').hidden=true;$('wg-query').focus();});
 [['물이 새요','leak-work'],['막히거나 역류해요','drain-work'],['문이 끌리거나 안 닫혀요','door'],['유리가 깨졌거나 금이 갔어요','glass-window'],['조명이 깜빡여요','light-work'],['청소·곰팡이 관리가 필요해요','clean-work']].forEach(([label,id])=>$('wg-symptom-items').append(button(label,false,()=>select(findRecord(id),{focus:true}))));
 render();
})();
