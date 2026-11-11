(()=>{
const root=document.querySelector('#root');
const labels=['새 신청 확인','확인 중 이어서 보기','자료 보완 확인','사전등록 완료 확인'];
const states=['접수','확인 중','자료 보완 요청','검토 완료'];
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};

function guide(detail){
 const box=node('details',null,'admin-process card');box.id='admin-process-guide';box.setAttribute('aria-labelledby','process-title');const title=node('h2','신청 처리 순서');title.id='process-title';
  const summary = node('summary');
  summary.append(title);
  box.append(summary);
 box.append(node('p','한 단계씩 확인하세요. 사전등록 완료와 공개 등록은 서로 다른 작업입니다.'));
 const steps=[['신청 내용 확인','업체 정보·전문 분야·지역·사진 확인',detail?'#application-review':'#admin-applications'],['보완 요청·답변','필요한 자료를 요청하고 상태 저장',detail?'#admin-update':'#admin-applications'],['공개 동의 확인','소개·연락처·사진의 공개 범위를 별도로 확인',detail?'#admin-public-profile':'#admin-applications'],['공개 등록','동의한 정보만 공개 등록한 뒤 프로필 확인',detail?'#admin-public-profile':'#admin-applications']];
 const list=node('ol',null,'process-steps');steps.forEach(([name,help,href],i)=>{const li=node('li'),a=node('a');a.href=href;a.append(node('span',String(i+1).padStart(2,'0'),'step-number'),node('strong',name),node('span',help,'step-help'));li.append(a);list.append(li);});box.append(list);if(!detail)box.append(node('p','아래 신청 목록에서 ‘열기’를 누르면 해당 신청의 처리 화면으로 이동합니다.','hint'));return box;
}
let generation=0;
async function mount({api,application}){
 if(!root.querySelector('h1')||document.querySelector('#admin-process-guide'))return;
 const detail=document.body.dataset.technicianPage==='detail';if(detail&&!application)return;
 if(detail){const review=root.querySelector('.layout>div>section.card');if(!review)return;review.id='application-review';root.querySelector('.layout').before(guide(true));
 const status=review.querySelector('.status')?.textContent||'';const advice=node('div',null,'next-action');advice.append(node('strong','지금 할 일'),node('p',status==='사전등록 완료'?'공개할 정보와 사진의 동의를 별도로 확인한 뒤, 아래 ‘공개 프로필 등록’을 진행하세요.':status==='보완요청'?'보완 자료와 신청자 답변을 확인하고, 아래에서 답변·처리 상태를 저장하세요.':'신청 내용과 사진을 확인하고, 아래에서 답변과 처리 상태를 저장하세요.'));review.prepend(advice);return;}
 if(!root.querySelector('#state-filter'))return;const ticket=++generation;const heading=root.querySelector('.page-title');const list=root.querySelector('#state-filter').closest('section');list.id='admin-applications';heading.after(guide(false));
 try{const results=await Promise.all(states.map(state=>api('admin/applications?state='+encodeURIComponent(state)+'&page=1')));if(ticket!==generation||!heading.isConnected)return;const counts={};states.forEach((state,i)=>{const count=results[i].count;if(!Number.isSafeInteger(count)||count<0)throw Error('집계 결과를 확인할 수 없습니다.');counts[state]=count;});
 const dashboard=node('section',null,'today card');dashboard.setAttribute('aria-labelledby','today-title');const h=node('h2','오늘 할 일');h.id='today-title';dashboard.append(h,node('p','오늘 들어온 신청만이 아니라, 현재 상태별 전체 신청 건수입니다. 각 카드를 눌러 확인하세요.'));const cards=node('div',null,'today-cards');const current=new URLSearchParams(location.search).get('state')||'';
 states.forEach((state,i)=>{const a=node('a',null,'today-card');a.href='technician-admin.html?state='+encodeURIComponent(state);if(current===state)a.setAttribute('aria-current','page');a.append(node('span',labels[i]),node('strong',String(counts[state])+'건'),node('span',i===3?'공개 완료를 뜻하지 않습니다.':'신청 목록 보기 →','hint'));cards.append(a);});dashboard.append(cards);
 const all=node('a','전체 신청 보기 →','all-applications');all.href='technician-admin.html';dashboard.append(all);heading.after(dashboard);
 }catch{if(ticket!==generation||!heading.isConnected)return;const message=node('p','할 일 건수를 불러오지 못했습니다. 기존 신청 목록을 이용해 주세요.','error');root.querySelector('.page-title').after(message);}
}
window.YESSURI_ADMIN_GUIDE={mount};
})();
