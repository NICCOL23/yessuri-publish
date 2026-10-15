(() => {
 const groups=window.YESSURI_WORK_GUIDE,$=id=>document.getElementById(id);if(!groups)return;
 const records=groups.flatMap(g=>g.categories.flatMap(c=>c.tasks.map(t=>({g,c,t}))));
 const params=new URLSearchParams(location.search);let current=records.find(r=>r.t.id===params.get('work'))||records.find(r=>r.t.id==='glass-window');
 const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
 const button=(label,active,run)=>{const b=text('button',label);b.type='button';b.setAttribute('aria-pressed',String(active));b.addEventListener('click',run);return b;};
 const announce=text('p','','sr-only');announce.setAttribute('role','status');$('wg-detail-content').before(announce);
 function syncURL(){const u=new URL(location.href);u.searchParams.set('work',current.t.id);history.replaceState(null,'',u);}
 function select(record,{focus=false}={}){current=record;render();syncURL();announce.textContent=record.c.label+' · '+record.t.label+' 안내를 표시합니다.';if(focus)$('wg-detail-title').focus();}
 function render(){
  const {g,c,t}=current,isGlass=c.id==='glass';
  $('wg-groups').replaceChildren(...groups.map(group=>{const b=button(group.title,g===group,()=>select(records.find(r=>r.g===group)));b.append(text('small',group.help));return b;}));
  $('wg-categories').replaceChildren(...g.categories.map(cat=>button(cat.label,c===cat,()=>select(records.find(r=>r.c===cat)))));
  $('wg-tasks').replaceChildren(...c.tasks.map(task=>button(task.label,t===task,()=>select(records.find(r=>r.t===task)))));
  const content=$('wg-detail-content');content.replaceChildren();const title=text('h2',isGlass?'깨지거나 금이 간 유리, 교체 전 확인하세요.':t.label);title.id='wg-detail-title';title.tabIndex=-1;content.append(title,text('p',t.summary));
  if(isGlass)content.append(text('p','깨진 유리를 직접 만지거나 치수를 재지 말고, 접근을 피한 상태에서 상담하세요.','wg-callout'));
  const wrap=text('div','','wg-table-wrap'),table=document.createElement('table');table.append(text('caption',c.label+' 작업·제품 확인 사항','sr-only'));const thead=document.createElement('thead'),tr=document.createElement('tr');['작업','확인할 제품·규격','비용이 달라지는 조건'].forEach(s=>{const th=text('th',s);th.scope='col';tr.append(th);});thead.append(tr);table.append(thead);const tbody=document.createElement('tbody');t.rows.forEach(r=>{const tr=document.createElement('tr');const th=text('th',r.name);th.scope='row';tr.append(th,text('td',r.parts),text('td',r.conditions));tbody.append(tr);});table.append(tbody);wrap.append(table);content.append(wrap);
  if(t.id==='sliding'||t.id==='bath-fixture'){const a=text('a','유리 파손·교체는 유리·거울 안내 보기 →','wg-related');a.href='guide.html?work=glass-window#work-guide';a.addEventListener('click',e=>{e.preventDefault();select(records.find(r=>r.t.id==='glass-window'),{focus:true});});content.append(a);}
  content.append(text('p','점검·조정·보수로 가능한지 먼저 확인하고, 교체가 필요하면 제품·부품의 규격과 호환성을 기술자와 결정하세요.','wg-small'));
  $('wg-product-title').textContent=isGlass?'유리 종류를 알고 계신가요?':'제품은 어떻게 준비하시나요?';
  $('wg-product-options').replaceChildren(...(isGlass?['종류를 모르겠어요','기존 제품 정보가 있어요','기술자와 함께 선택할게요']:['기술자와 함께 선택','직접 구매한 제품 있음','기존 부품 재사용 상담']).map((s,i)=>{const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='product-preparation';radio.value=String(i);label.append(radio,document.createTextNode(s));return label;}));
  $('wg-prepare').replaceChildren(...(isGlass?['안전한 위치에서 보이는 설치 위치·전체 모습 사진','파손 부위 사진·기존 제품 정보','작업 수량·방문 지역·희망 일정']:['전체 모습과 문제 부위 사진','기존 제품 모델명·규격 정보','작업 수량·희망 일정']).map(s=>text('li',s)));
  $('wg-search-note').textContent=t.category==='전체'?'기존 검색에 독립 분야가 없어 작업 키워드로 찾습니다. 일치 업체가 없을 수 있습니다.':'기존 '+t.category+' 분야 기준으로 검색합니다. 세부 작업 가능 여부는 업체에 확인하세요.';
  updateFind();
 }
 function updateFind(){const {t,c} =current,u=new URL('find.html',location.href);if(t.category!=='전체')u.searchParams.set('category',t.category);else u.searchParams.set('q',t.query||c.label);u.searchParams.set('service',c.label+' · '+t.label);const region=$('wg-region').value;if(region)u.searchParams.set('region',region);$('wg-find').href=u.pathname+u.search;$('wg-find').textContent=c.label+' 전문가 찾기';}
 $('wg-region').addEventListener('change',updateFind);if(window.YESSURI_REGIONS.includes(params.get('region')))$('wg-region').value=params.get('region');
 $('wg-search').addEventListener('submit',e=>{e.preventDefault();const query=$('wg-query').value.trim().normalize('NFKC').toLowerCase();if(!query){$('wg-query').focus();return;}const terms=query.split(/\s+/);const found=records.filter(({g,c,t})=>{const hay=[g.title,c.label,t.label,t.summary,t.keywords,...t.rows.flatMap(r=>[r.name,r.parts,r.conditions])].join(' ').normalize('NFKC').toLowerCase();return terms.every(w=>hay.includes(w));});$('wg-results').hidden=false;$('wg-result-count').textContent=found.length?found.length+'개의 작업 안내를 찾았습니다.':'일치하는 안내가 없습니다. 짧은 작업명으로 검색하거나 카카오톡으로 문의해 주세요.';$('wg-result-items').replaceChildren(...found.map(r=>{const b=button(r.c.label+' · '+r.t.label,false,()=>{select(r,{focus:true});$('wg-results').hidden=true;});return b;}));});
 $('wg-clear').addEventListener('click',()=>{$('wg-results').hidden=true;$('wg-query').focus();});
 [['물이 새요','leak-work'],['막히거나 역류해요','drain-work'],['문이 끌리거나 안 닫혀요','door'],['유리가 깨졌거나 금이 갔어요','glass-window'],['조명이 깜빡여요','light-work'],['청소·곰팡이 관리가 필요해요','clean-work']].forEach(([s,id])=>$('wg-symptom-items').append(button(s,false,()=>{select(records.find(r=>r.t.id===id),{focus:true});})));
 render();
})();
