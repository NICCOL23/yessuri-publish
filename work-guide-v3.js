/* List -> field -> work detail. State lives only in this tab's history, never on a server. */
(() => {
 'use strict';
 const groups=window.YESSURI_WORK_GUIDE,$=id=>document.getElementById(id);
 const records=groups.flatMap(g=>g.categories.flatMap(c=>c.tasks.map(t=>({g,c,t}))));
 const findRecord=id=>records.find(r=>r.t.id===id);
 const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el;};
 const button=(label,active,run)=>{const b=text('button',label);b.type='button';b.setAttribute('aria-pressed',String(active));b.addEventListener('click',run);return b;};
 const sectionTitle=(n,label)=>text('h3',label,'wg-section-title');
 const announce=text('p','','sr-only');announce.setAttribute('role','status');$('wg-detail-content').before(announce);
 let current,view,products={},listScroll=0,restoring=false,pendingFrame=0,panelMode=null,overlayEntry=false,originScroll=0;
 const routeKey=()=>location.pathname+location.search;
 function readURL(){const p=new URLSearchParams(location.search),record=findRecord(p.get('work')),g=groups.find(g=>g.id===p.get('group'))||record?.g||groups[0],c=g.categories.find(c=>c.id===p.get('field'))||record?.c;
  current=record||{g,c,t:null};view=p.get('view')==='list'?'list':record||c?'detail':'list';
  if(view==='list')current.g=g;panelMode=view==='detail'&&record?'work':null;overlayEntry=false;
  $('wg-region').value=window.YESSURI_REGIONS.includes(p.get('region'))?p.get('region'):'';
 }
 function snapshot(){return {version:1,route:routeKey(),view,group:current.g.id,field:current.c?.id,work:current.t?.id,region:$('wg-region').value,products:{...products},query:$('wg-query').value,results:!$('wg-results').hidden,scroll:scrollY,listScroll,panelMode,overlayEntry,originScroll};}
 function persist(){if(!restoring)history.replaceState({...history.state,wgFlow:snapshot()},'',location.href);}
 function restore(saved){if(!saved||saved.version!==1||saved.route!==routeKey())return false;const record=findRecord(saved.work),g=groups.find(g=>g.id===saved.group)||groups[0];current={g,c:g.categories.find(c=>c.id===saved.field),t:record?.t||null};view=saved.view==='detail'&&current.c?'detail':'list';products={...saved.products};listScroll=saved.listScroll||0;panelMode=saved.panelMode===undefined?(view==='detail'&&current.t?'work':null):saved.panelMode;overlayEntry=!!saved.overlayEntry;originScroll=saved.originScroll||0;$('wg-region').value=window.YESSURI_REGIONS.includes(saved.region)?saved.region:'';$('wg-query').value=saved.query||'';return true;}
 function urlFor(nextView,g,c,t){const u=new URL(location.href);for(const key of ['view','group','field','work'])u.searchParams.delete(key);u.searchParams.set('group',g.id);if(nextView==='list')u.searchParams.set('view','list');if(c)u.searchParams.set('field',c.id);if(t)u.searchParams.set('work',t.id);u.hash='work-guide';return u;}
 const offset=()=>window.YESSURI_GUIDE_OFFSET?.()||document.querySelector('.directory-header').getBoundingClientRect().height+16;
 function scrollToElement(el){window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-offset()),behavior:'instant'});}
 function change(next,{toList=false,field=false,focus=false}={}){persist();if(view==='list')listScroll=scrollY;const switching=!!panelMode;if(!switching)originScroll=scrollY;overlayEntry=!!next.t&&!toList&&(switching?overlayEntry:true);panelMode=next.t&&!toList?'work':null;current=next;view=toList?'list':'detail';const u=urlFor(view,current.g,current.c,current.t);history[switching&&panelMode?'replaceState':'pushState']({...history.state,wgFlow:null},'',u);render();$('wg-results').hidden=true;
  restoring=true;requestAnimationFrame(()=>{if(panelMode){restoring=false;persist();return;}if(toList){window.scrollTo({top:listScroll,behavior:'instant'});const target=current.c?$('wg-list').querySelector('a[data-field="'+current.c.id+'"]'):$('wg-groups').querySelector('[aria-pressed=true]');target?.focus({preventScroll:true});}else if(field){$('wg-field-title').focus({preventScroll:true});scrollToElement($('wg-flow-detail'));}else if(focus){const h=$('wg-detail-title');h.focus({preventScroll:true});const rect=h.getBoundingClientRect();if(rect.top<offset()||rect.bottom>innerHeight)scrollToElement(h);}restoring=false;persist();});
  announce.textContent=toList?'분야 목록으로 돌아왔습니다.':current.c.label+' · '+(current.t?.label||'작업을 선택하세요.');
 }
 function select(record,{focus=true}={}){if(record)change(record,{focus});}
 function render(){
  const {g,c,t}=current;$('wg-list').hidden=view!=='list';$('wg-flow-detail').hidden=view!=='detail';$('work-guide').setAttribute('aria-labelledby',view==='list'?'wg-title':'wg-field-title');
  document.title=view==='list'?'비용·이용안내 | YESSURI':(t?.label||c.label)+' 안내 | YESSURI';
  $('wg-groups').replaceChildren(...groups.map(group=>{const b=button(group.title,g===group,()=>{const next=current.g===group?current:{g:group,c:null,t:null};change(next,{toList:true});});b.append(text('small',group.help));return b;}));
  $('wg-categories').replaceChildren(...g.categories.map(category=>{const a=text('a',category.label);a.dataset.field=category.id;a.href=urlFor('detail',g,category,null).pathname+urlFor('detail',g,category,null).search+'#work-guide';if(c===category)a.className='wg-last-field';a.append(text('span','→'));a.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();change({g,c:category,t:null},{field:true});});return a;}));
  if(view==='list'){window.dispatchEvent(new Event('guide:viewchange'));return;}
  $('wg-field-title').textContent=c.label;$('wg-field-title').tabIndex=-1;
  $('wg-field-summary').textContent=c.id==='bath'?'기구 교체와 부속 보수를 나누어 확인하세요.':c.id==='doors'&&t?.section==='방충망'?'망 교체와 틀·부속 보수를 나누어 확인하세요.':'필요한 작업을 선택하고 규격과 비용 조건을 확인하세요.';
  const art=t?.section==='방충망'?20:c.art;$('wg-art').style.backgroundPosition=`${(art%7)*100/6}% ${Math.floor(art/7)*50}%`;$('wg-art').setAttribute('aria-label',t?.section==='방충망'?'방충망 대표 이미지':c.label+' 대표 이미지');
  const sections=[...new Set(c.tasks.map(task=>task.section||'기존 작업 안내'))];
  $('wg-tasks').replaceChildren(...sections.map(label=>{const row=text('div','','wg-task-row');row.setAttribute('role','group');row.setAttribute('aria-label',label);row.append(text('span',label,'wg-task-label'));const buttons=text('div','','wg-task-buttons');buttons.append(...c.tasks.filter(task=>(task.section||'기존 작업 안내')===label).map(task=>button(task.label,t===task,()=>select(findRecord(task.id)))));row.append(buttons);return row;}));
  $('wg-back').href=urlFor('list',g,c,t);$('wg-empty').hidden=false;$('wg-empty').textContent='작업을 선택하면 상세 패널에서 제품·규격과 비용 조건을 확인할 수 있습니다.';$('wg-work-detail').hidden=!t;$('wg-pending').hidden=!!t;$('wg-memo-tools').hidden=!t;$('wg-prepare-title').textContent=t?'상담 준비 메모':'상담 전에 준비하세요.';
  if(t)renderWork();else{$('wg-detail-content').replaceChildren();$('wg-memo-work').textContent='';$('wg-prepare').replaceChildren(...['전체 모습과 문제 부위 사진','제품 모델·연결 규격','작업 수량·희망 일정'].map(s=>text('li',s)));}
  window.dispatchEvent(new Event('guide:viewchange'));
 }
 function restoreProduct(){const value=products[current.t.id];$('wg-product-options').querySelectorAll('input').forEach(radio=>{radio.checked=radio.value===value;radio.addEventListener('change',()=>{products[current.t.id]=radio.value;updateMemo();persist();});});}
 function renderWork(){const {g,c,t}=current,isGlass=c.id==='glass';
   const content=$('wg-detail-content');content.replaceChildren();
  const title=text('h2',t.label);title.id='wg-detail-title';title.tabIndex=-1;content.append(title,text('p',t.summary,'wg-summary'));
  if(isGlass||t.id==='bath-glass-parts')content.append(text('p','깨진 유리를 직접 만지거나 치수를 재지 말고, 안전한 위치에서 사진을 준비해 상담하세요.','wg-callout'));
  const visual=text('section','','wg-work-visual');
  const figure=document.createElement('figure'),img=document.createElement('img');
  const art=t.section==='방충망'?20:c.art;img.src='assets/images/guide-detail-'+art+'.webp';img.width=240;img.height=240;img.alt=c.label+' 분야 대표 3D 참고 이미지';
  figure.append(img,text('figcaption','분야 대표 참고 이미지 · 실제 제품과 구조가 다를 수 있습니다.'));
  const intro=text('div','','wg-visual-intro');intro.append(text('p',t.section||c.label,'wg-eyebrow'),text('h3',t.rows[0].name),text('p',c.guidance[0]+' · '+c.guidance[1]));
  visual.append(figure,intro);content.append(visual);
  const cost=text('section');cost.append(sectionTitle('','제품·규격과 비용 조건'));
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
  const after=text('section','','wg-after');after.append(sectionTitle('','작업 후 함께 확인하세요'));const checks=text('ul');[c.guidance[2],'사용한 제품·작업 내역','사후 점검·보증 범위·재방문 비용 조건'].forEach(s=>checks.append(text('li',s)));after.append(checks);content.append(after);
  $('wg-product-title').textContent=isGlass?'유리 종류를 알고 계신가요?':'제품 준비 방식 · 선택사항';
  $('wg-product-options').replaceChildren(...(isGlass?['종류를 모르겠어요','기존 제품 정보가 있어요','기술자와 함께 선택할게요']:['기술자와 함께 선택','직접 구매한 제품 있음','기존 부품 재사용 상담']).map(s=>{const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='product-preparation';radio.value=s;radio.addEventListener('change',updateMemo);label.append(radio,document.createTextNode(s));return label;}));
  $('wg-prepare').replaceChildren(...(isGlass?['안전한 위치에서 보이는 설치 위치·전체 모습 사진','파손 부위 사진·기존 제품 정보','작업 수량·희망 일정']:['전체 모습과 문제 부위 사진',t.rows[0].parts+' 정보','작업 수량·희망 일정']).map(s=>text('li',s)));
  restoreProduct();updateFind();updateMemo();
 }
 function updateFind(){const {t,c}=current,link=$('wg-find');if(!t)return;
  if(t.category==='전체'){link.href='https://pf.kakao.com/_VdyFX/chat';link.target='_blank';link.rel='noopener';link.textContent=c.label+' 작업 문의 (새 창)';$('wg-search-note').textContent='현재 전문가 검색에 독립 분야가 없어 카카오톡 문의로 안내합니다. 작업 가능 여부를 확인해 주세요.';}
  else{const u=new URL('find.html',location.href);u.searchParams.set('category',t.category);u.searchParams.set('service',c.label+' · '+t.label);if($('wg-region').value)u.searchParams.set('region',$('wg-region').value);link.href=u.pathname+u.search;link.removeAttribute('target');link.removeAttribute('rel');link.textContent=c.label+' 전문가 찾기';$('wg-search-note').textContent='기존 '+t.category+' 분야 기준으로 검색합니다. 세부 작업 가능 여부와 출장 지역은 업체에 확인하세요.';}}
 function updateMemo(){const {t,c}=current;if(!t)return;const region=$('wg-region').value||'○○구',choice=products[t.id];$('wg-memo-work').textContent=c.label+' · '+t.label;$('wg-memo').textContent=`부산 ${region}에서 ${c.label} · ${t.label} 상담을 원합니다. 증상은 ○○이며 사진을 전달드릴 수 있습니다. ${choice?'제품 준비: '+choice+'. ':''}방문 가능한 일정과 출장·진단비를 알려주세요. 작업비·제품 및 부속비·장비비와 철거·복구·폐기물·부가세 포함 여부, 사후 점검·재방문 조건도 확인 부탁드립니다.`;$('guide-message').textContent=$('wg-memo').textContent;$('wg-copy-status').textContent='';$('guide-copy-status').textContent='';}
 $('wg-region').addEventListener('change',()=>{updateFind();updateMemo();const u=new URL(location.href);if($('wg-region').value)u.searchParams.set('region',$('wg-region').value);else u.searchParams.delete('region');history.replaceState(history.state,'',u);persist();window.dispatchEvent(new Event('guide:viewchange'));});
 $('wg-copy').addEventListener('click',async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText($('wg-memo').textContent);$('wg-copy-status').textContent='상담 문구가 복사되었습니다.';}catch{const range=document.createRange();range.selectNodeContents($('wg-memo'));const s=getSelection();s.removeAllRanges();s.addRange(range);$('wg-memo').focus();$('wg-copy-status').textContent='문구를 선택했습니다. 길게 누르거나 Ctrl+C로 복사해 주세요.';}});
 $('wg-back').addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();change(current,{toList:true});});
 function search(){const query=$('wg-query').value.trim().normalize('NFKC').toLowerCase();if(!query)return;const terms=query.split(/\s+/),found=records.filter(({g,c,t})=>terms.every(w=>[g.title,c.label,t.label,t.summary,t.keywords,...t.rows.flatMap(r=>[r.name,r.parts,r.conditions])].join(' ').normalize('NFKC').toLowerCase().includes(w)));$('wg-results').hidden=false;$('wg-result-count').textContent=found.length?found.length+'개의 작업 안내를 찾았습니다.':'일치하는 안내가 없습니다. 짧은 작업명으로 검색하거나 카카오톡으로 문의해 주세요.';$('wg-result-items').replaceChildren(...found.map(r=>{const a=text('a',r.c.label+' · '+r.t.label);a.href=urlFor('detail',r.g,r.c,r.t);a.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();select(r);});return a;}));}
 $('wg-search').addEventListener('submit',e=>{e.preventDefault();search();persist();});$('wg-query').addEventListener('input',persist);$('wg-clear').addEventListener('click',()=>{$('wg-results').hidden=true;$('wg-query').focus();persist();});
 window.addEventListener('scroll',()=>{if(!pendingFrame&&!restoring)pendingFrame=requestAnimationFrame(()=>{pendingFrame=0;persist();});},{passive:true});
 window.addEventListener('popstate',()=>{const saved=history.state?.wgFlow;const same=saved?.route===routeKey()&&saved.view===view&&saved.group===current.g.id&&saved.field===current.c?.id&&saved.work===current.t?.id&&saved.region===$('wg-region').value&&saved.panelMode===panelMode;if(same)return;
  const wasPanel=!!panelMode,previous=current,choices={...products},region=$('wg-region').value,previousScroll=originScroll;
  restoring=true;if(!restore(saved))readURL();if(wasPanel&&!panelMode){products={...products,...choices};$('wg-region').value=region;if(view==='detail'&&current.c===previous.c)current.t=previous.t;window.YESSURI_GUIDE_SKIP_SCROLL=true;const u=new URL(location.href);if(region)u.searchParams.set('region',region);history.replaceState(history.state,'',u);}render();if(view==='list'&&saved?.results)search();requestAnimationFrame(()=>{if(!panelMode&&(!location.hash||location.hash==='#work-guide'))window.scrollTo({top:wasPanel?previousScroll:saved?.scroll||0,behavior:'instant'});restoring=false;persist();});
 });
 function closePanel(){if(!panelMode)return;if(overlayEntry){history.back();return;}panelMode=null;overlayEntry=false;const u=urlFor('detail',current.g,current.c,null);history.replaceState(history.state,'',u);persist();window.dispatchEvent(new Event('guide:viewchange'));}
 window.YESSURI_WORK_PANEL={getState:()=>({mode:panelMode,title:current.t?.label||'',category:current.t?.category||'',scroll:originScroll}),close:closePanel,setMode:mode=>{if(!current.t||!['work','consult'].includes(mode))return;panelMode=mode;persist();window.dispatchEvent(new Event('guide:viewchange'));}};
 readURL();const saved=history.state?.wgFlow;if(saved)restore(saved);render();if(view==='list'&&saved?.results)search();persist();
})();
