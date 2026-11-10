/* 관리자 전용 화면 잠금. 서버의 세션·권한 검사를 대체하지 않습니다. */
(()=>{
 'use strict';
 const page=document.body.dataset.technicianPage,params=new URLSearchParams(location.search);
 if(page!=='admin'&&!(page==='detail'&&params.get('admin')==='1'))return;
 const root=document.getElementById('root');if(!root)return;
 const originalFetch=window.fetch.bind(window),config=window.YESSURI_TECHNICIAN;
 const cloud=!!config&&(!['127.0.0.1','localhost'].includes(location.hostname)||location.port==='8097'||window.TECHNICIAN_CLOUD_TEST===true);
 let endpoint=null;if(cloud){try{endpoint=new URL(config.endpoint);}catch{return;}}
 const ABSOLUTE_MS=Infinity;
 let authenticated=false,locked=false,expiresAt=0,checking=null,bar=null,lastServerTouch=0,touchPending=false;
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const millis=value=>Number.isFinite(value)?value:typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
 function storedSession(){try{return JSON.parse(sessionStorage.getItem('technician-admin')||'null');}catch{return null;}}
 function authHeaders(){const h={};if(cloud){h.apikey=config.publishableKey;const s=storedSession();if(s?.token)h['x-admin-token']=s.token;}return h;}
 function request(route,init={}){return originalFetch(cloud?endpoint.href+'?route='+encodeURIComponent('/api/'+route):'/api/'+route,{...init,credentials:cloud?'omit':'same-origin',cache:'no-store',headers:{...authHeaders(),...(init.headers||{})}});}
 function routeOf(input){let u;try{u=new URL(typeof input==='string'?input:input.url,location.href);}catch{return null;}
  if(cloud)return u.origin===endpoint.origin&&u.pathname===endpoint.pathname?(u.searchParams.get('route')||'/api/health'):null;
  return u.origin===location.origin&&u.pathname.startsWith('/api/')?u.pathname:null;
 }
 function clearPrivateScreen(){
  for(const e of root.querySelectorAll('img[src^="blob:"],a[href^="blob:"]')){const attr=e.tagName==='IMG'?'src':'href',url=e.getAttribute(attr);if(url)URL.revokeObjectURL(url);e.removeAttribute(attr);}
  for(const e of root.querySelectorAll('input[type="file"]'))e.value='';
  if(root.childNodes.length)root.replaceChildren();
 }
 function lock(message){
  if(locked)return;locked=true;authenticated=false;
  // 인증 정보를 제거하기 전에 이 세션의 서버 종료 요청을 구성합니다.
  const logout=request('logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'admin'})}).catch(()=>{});
  try{sessionStorage.removeItem('technician-admin');}catch{}
  window.dispatchEvent(new Event('yessuri:admin-locked'));clearPrivateScreen();bar?.remove();
  const dialog=node('dialog',null,'admin-session-lock');dialog.id='admin-session-lock';dialog.setAttribute('aria-labelledby','admin-lock-title');dialog.setAttribute('aria-describedby','admin-lock-message');
  const h=node('h2','관리자 화면을 잠갔습니다.');h.id='admin-lock-title';const p=node('p',message);p.id='admin-lock-message';const link=node('a','관리자 로그인으로','btn primary');link.href='technician-admin.html';
  dialog.append(h,p,node('p','신청 정보와 사진을 화면에서 지웠습니다. 저장하지 않은 내용은 저장되지 않았습니다.','hint'),link);document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());dialog.showModal();link.focus();void logout;
 }
 function showBar(){if(bar?.isConnected)return;bar=node('section',null,'admin-session-bar');bar.setAttribute('aria-label','관리자 세션 보안');const actions=node('div',null,'admin-session-actions');for(const[text,message]of [['관리자 로그아웃','관리자 조회를 종료했습니다. 다시 로그인해 주세요.']]){const b=node('button',text,'btn');b.type='button';b.addEventListener('click',()=>lock(message));actions.append(b);}bar.append(node('p','관리자 전용 · 시간에 따른 자동 종료 없음 · 사용을 마치면 로그아웃해 주세요. 연결 확인 실패로 잠기면 미저장 입력은 지워집니다.'),actions);document.getElementById('main').prepend(bar);}
 function activate(data){if(locked)return;if(data.admin){if(!authenticated){expiresAt=Date.now()+ABSOLUTE_MS;}authenticated=true;const serverExpiry=millis(data.expiresAt),s=cloud?storedSession():null,savedExpiry=millis(s?.expiresAt);if(savedExpiry!==null)expiresAt=Math.min(expiresAt,savedExpiry);if(serverExpiry!==null)expiresAt=Math.min(expiresAt,serverExpiry);if(Date.now()>=expiresAt){lock('관리자 로그인 시간이 만료되었습니다.');return;}showBar();}else if(authenticated)lock('로그인 시간이 만료되었거나 관리자 권한이 종료되었습니다.');}
 function expired(){if(!authenticated||locked)return;const now=Date.now(),deadline=expiresAt;if(now>=deadline){lock('관리자 로그인 시간이 만료되었습니다.');return;}let warning=bar?.querySelector('.admin-expiry-warning');if(deadline-now<=120000){if(!warning){warning=node('p',null,'admin-expiry-warning');warning.setAttribute('role','status');bar?.append(warning);}warning.textContent='약 '+Math.ceil((deadline-now)/60000)+'분 뒤 잠깁니다. 작성 중인 내용을 저장해 주세요.';}else warning?.remove();}
 async function checkSession(){if(locked)return false;if(checking)return checking;checking=(async()=>{try{const r=await request('session');if(!r.ok){if(authenticated&&(r.status===401||r.status===403))lock('관리자 권한을 다시 확인해야 합니다.');return false;}const d=await r.json();activate(d);return !!d.admin;}catch{if(authenticated)lock('연결 상태를 확인할 수 없어 화면을 잠갔습니다.');return false;}finally{checking=null;}})();return checking;}
 async function touchServer(){if(touchPending||Date.now()-lastServerTouch<15000)return;touchPending=true;try{const r=await request('admin/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok){await checkSession();return;}const d=await r.json();lastServerTouch=Date.now();const absolute=millis(d.expiresAt);if(absolute!==null)expiresAt=Math.min(expiresAt,absolute);}catch{lock('서버에 활동을 확인할 수 없어 화면을 잠갔습니다.');}finally{touchPending=false;}}
 const activity=event=>{expired();if(authenticated&&!locked&&event.isTrusted){void touchServer();}};for(const name of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(name,activity,{passive:true,capture:true});
 window.fetch=async function(input,init){const route=routeOf(input);if(route&&locked)throw Error('관리자 화면이 잠겼습니다. 다시 로그인해 주세요.');const response=await originalFetch(input,init);if(route){if(route==='/api/session'&&response.ok){try{activate(await response.clone().json());}catch{}}else if(authenticated&&(response.status===401||response.status===403)){// 업무상 거부를 세션 만료로 오인하지 않습니다.
    await checkSession();
   }}return response;};
 new MutationObserver(()=>{if(locked)clearPrivateScreen();}).observe(root,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{expired();if(!document.hidden)void checkSession();});window.addEventListener('focus',()=>{expired();void checkSession();});setInterval(expired,1000);setInterval(checkSession,30000);void checkSession();
})();
