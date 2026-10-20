/* Computer service content comes from the existing catalog source. Legacy work routes stay intact. */
(()=>{'use strict';
const catalog=window.YESSURI_WORK_CATALOG,services=catalog?.computerServices;if(!services)return;
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n;};
const listURL='guide.html?group=computer&view=list#work-guide';
const url=id=>'computer-guide.html?service='+encodeURIComponent(id);
function link(label,href,cls){const a=el('a',label,cls);a.href=href;return a;}
function picture(s){const figure=el('figure',null,'computer-image'),img=el('img');img.src=s.image.src;img.alt=s.image.alt;img.width=768;img.height=768;img.decoding='async';figure.append(img,el('figcaption',s.image.caption));return figure;}
function cards(host){host.replaceChildren();host.classList.add('computer-service-list');for(const [group,title]of [['repair','수리·성능 개선'],['purchase','제품 구매 상담']]){const section=el('section',null,'computer-card-section');section.append(el('h3',title));const grid=el('div',null,'computer-cards '+group);for(const s of services.filter(s=>s.group===group)){const a=link('',url(s.id),'computer-card');a.append(el('strong',s.title),el('span',s.description,'computer-muted'),picture(s));const arrow=el('span','→','computer-arrow');arrow.setAttribute('aria-hidden','true');a.append(arrow);grid.append(a);}section.append(grid);host.append(section);}const legacy=el('details',null,'computer-legacy');legacy.append(el('summary','기존 컴퓨터 작업 안내'));const links=el('div');for(const [label,id]of [['고장·수리 기존 안내','it-work'],['업그레이드 기존 안내','computer-upgrade'],['구매 상담 기존 안내','computer-purchase']])links.append(link(label,'guide.html?work='+id+'#work-guide'));legacy.append(links);host.append(legacy,el('p','전문가 프로필은 예시이며, 실제 문의·접수는 준비 중입니다.','computer-public-note'));}
window.YESSURI_COMPUTER_GUIDE={renderList:cards};
const root=document.getElementById('computer-guide');if(!root)return;
const nav=document.getElementById('computer-groups');for(const g of catalog.groups){const a=link('',`guide.html?group=${g.id}&view=list#work-guide`);a.append(el('strong',g.name),el('small',g.description));if(g.id==='computer')a.setAttribute('aria-current','location');nav.append(a);}
const id=new URLSearchParams(location.search).get('service'),s=services.find(s=>s.id===id);root.replaceChildren();
if(!s){document.title='컴퓨터 분야 선택 | YESSURI';root.append(el('h1',id?'해당 안내를 찾을 수 없습니다.':'컴퓨터 수리·판매'));const host=el('div');cards(host);root.append(link('← 분야 목록으로',listURL),host);return;}
document.title=s.title+' 안내 | YESSURI';
const crumbs=el('nav',null,'computer-breadcrumb');crumbs.setAttribute('aria-label','현재 위치');crumbs.append(link('비용·이용안내','guide.html'),el('span','›'),link('컴퓨터 수리·판매',listURL),el('span','›'),el('span',s.title));
const top=el('div',null,'computer-detail-head'),copy=el('div');const h=el('h1',s.title);h.id='computer-title';copy.append(link('← 분야 목록으로',listURL,'computer-back'),h,el('p',s.summary,'computer-summary'));top.append(copy,picture(s));
const panels=el('div',null,'computer-detail-panels');for(const [title,items]of [['상담 전 준비',s.prepare],['작업·제품 확인',s.checks],['비용·포함 범위·A/S 확인',s.costs]]){const section=el('section'),ul=el('ul');section.append(el('h2',title));items.forEach(v=>ul.append(el('li',v)));section.append(ul);panels.append(section);}
const notice=el('aside',null,'computer-notice');notice.append(el('h2',s.noticeTitle),el('p',s.notice));
const related=el('nav',null,'computer-related');related.setAttribute('aria-label','관련 안내');related.append(el('h2','관련 안내'));for(const id of s.related){const r=services.find(x=>x.id===id);related.append(link(r.title+' →',url(r.id)));}if(s.id==='monitor')related.append(link('기존 TV·LED 수리 안내 →','guide.html?group=life&field=display#work-guide'));related.append(link('기존 '+(s.group==='purchase'?'구매 상담':'작업')+' 안내 →','guide.html?work='+s.legacy+'#work-guide'));
const actions=el('div',null,'computer-actions');actions.append(link('분야 목록으로',listURL,'computer-secondary'),link('컴퓨터·IT 전문가 찾기','find.html?category='+encodeURIComponent('컴퓨터·IT')+'&service='+encodeURIComponent(s.title),'computer-primary'));
root.append(crumbs,top,panels,notice,related,actions,el('p',s.publicNotice+' 세부 작업·판매 가능 여부와 출장 지역은 업체에 확인하세요.','computer-public-note'));
})();
