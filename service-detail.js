/* All home service cards share this view. Content stays in the existing catalogs. */
(()=>{'use strict';
const root=document.getElementById('main'),catalog=window.YESSURI_WORK_CATALOG;
const field=window.YESSURI_SERVICE_FIELDS.items.find(f=>f.id===new URLSearchParams(location.search).get('field'));
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,href,cls)=>{const a=el('a',text,cls);a.href=href;return a;};
root.replaceChildren();
if(!field){document.title='분야 안내 | YESSURI';root.append(el('h1','해당 분야 안내를 찾을 수 없습니다.'),link('수리 분야 선택하기','index.html#services'));return;}
document.title=field.label+' 안내 | YESSURI';
const head=el('header',null,'service-detail-head'),img=el('img');img.src=field.image;img.alt='';img.width=112;img.height=112;
const copy=el('div');copy.append(el('h1',field.label),el('p',field.description));head.append(img,copy);root.append(head);
const tasks=catalog.tasks.filter(t=>field.detail.fieldIds.includes(t.fieldId)||field.detail.taskIds.includes(t.id)||t.expertCategory===field.value);
const section=el('section',null,'service-detail-tasks');section.append(el('h2','작업·제품과 비용 안내'));
for(const task of tasks){const details=el('details'),summary=el('summary',task.name),body=el('div',null,'service-detail-body');body.append(el('p',task.summary));
 if(task.rows?.length){const wrap=el('div',null,'service-detail-table'),table=el('table'),caption=el('caption',task.name+' 확인 사항'),thead=el('thead'),tr=el('tr');['작업','확인할 제품·규격','비용이 달라지는 조건'].forEach(v=>tr.append(el('th',v)));thead.append(tr);const tbody=el('tbody');for(const r of task.rows){const row=el('tr'),th=el('th',r.name);th.scope='row';row.append(th,el('td',r.parts),el('td',r.conditions));tbody.append(row);}table.append(caption,thead,tbody);wrap.append(table);body.append(wrap);}
 for(const [title,values] of [['작업 전 확인 사항',task.before],['상담 전 준비',task.photoPreparation],['작업 후 함께 확인하세요',task.after]]){if(!values?.length)continue;const ul=el('ul');values.forEach(v=>ul.append(el('li',v)));body.append(el('h3',title),ul);}
 body.append(link('사진·상담 준비 등 작업 상세 안내 →','guide.html?work='+encodeURIComponent(task.id)+'#work-guide','service-detail-related'));details.append(summary,body);section.append(details);
}
for(const entry of field.detail.links){const s=entry.catalogService?catalog.computerServices.find(s=>s.id===entry.catalogService):null;section.append(link(s?s.title+' 상세 안내 →':entry.label+' →',s?'computer-guide.html?service='+encodeURIComponent(s.id):entry.href,'service-detail-related'));}
root.append(section);
const costs=el('section',null,'service-detail-costs');costs.append(el('h2','비용은 항목별로 확인하세요.'),el('p','출장·진단비 + 작업비 + 제품·자재비 + 추가 작업비'),el('p','철거·복구·운반·폐기물·장비·부가세 포함 여부를 확인하세요. 최종 원인·작업 범위와 비용은 기술자 확인 후 결정됩니다.'));root.append(costs);
const url=new URL('find.html',location.href);url.searchParams.set('category',field.value);url.searchParams.set('returnTo',location.pathname+location.search);
root.append(link('이 분야 전문가 찾기',url.pathname+url.search,'service-detail-find'));
})();
