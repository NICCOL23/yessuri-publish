/* 관리자 변경 요청의 응답 유실 재시도에 같은 명령 ID를 사용한다. 메모리에만 보존한다. */
(()=>{
 'use strict';
 const page=document.body.dataset.technicianPage,params=new URLSearchParams(location.search);
 if(page!=='admin'&&!(page==='detail'&&params.get('admin')==='1'))return;
 const config=window.YESSURI_TECHNICIAN;if(!config)return;
 let endpoint;try{endpoint=new URL(config.endpoint);}catch{return;}
 const original=window.fetch.bind(window),pending=new Map();
 window.addEventListener('yessuri:admin-locked',()=>pending.clear());
 window.addEventListener('pagehide',()=>pending.clear());
 window.fetch=async(input,init)=>{
  let url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return original(input,init);}
  const route=url.origin===endpoint.origin&&url.pathname===endpoint.pathname?url.searchParams.get('route'):null;
  if(!route?.startsWith('/api/admin/')||init?.method!=='POST'||['/api/admin/login','/api/admin/activity','/api/admin/retry-files'].includes(route)||typeof init.body!=='string')return original(input,init);
  let body;try{body=JSON.parse(init.body);}catch{return original(input,init);}
  if(!body||typeof body!=='object'||Array.isArray(body))return original(input,init);
  const key=route+'\n'+init.body,operationId=body.operationId||pending.get(key)||crypto.randomUUID();pending.set(key,operationId);
  const response=await original(input,{...init,body:JSON.stringify({...body,operationId})});
  // 성공/명확한 입력거부 뒤에는 새 작업이다. 네트워크 오류·서버 오류는 같은 ID로 재시도한다.
  if(response.ok||(response.status>=400&&response.status<500&&![408,429].includes(response.status)))pending.delete(key);
  return response;
 };
})();
