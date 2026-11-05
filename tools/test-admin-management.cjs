// Pure isolated contract tests. No network, credentials, or production data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');const {webcrypto}=require('node:crypto');
const base=path.join(__dirname,'../supabase/functions/technician-api');
const code=name=>stripTypeScriptTypes(fs.readFileSync(path.join(base,name),'utf8'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'').replace(/export /g,'');
const id='12345678-1234-1234-1234-123456789abc';
const body={action:'create',name:'가상 시험 업체',fields:['욕실·설비'],serviceAreas:['부산진구'],intro:'시험',career:'',phone:'',phonePublic:false,consent:{scope:['profile'],confirmedAt:'2026-01-01',evidence:'TEST-001',note:''}};
function fixture(role='admin',error=null){
 let handler;const calls=[];const db={rpc:async(name,{op,p})=>{calls.push({name,op,p});if(name==='technician_admin_management')return{data:error?null:{profile:op==='profile-get'?null:{id:'technician-'+id,version:'version-1'},consents:[],events:[]},error};return{data:op==='session'?{role,application_id:id,hash:'server-hash'}:{},error:null};}};
 const box={Deno:{env:{get:()=> 'test-only'},serve:fn=>handler=fn},createClient:()=>db,TextEncoder,TextDecoder,Uint8Array,URL,Request,Response,crypto:webcrypto,console};
 vm.runInNewContext(code('public-profile.ts')+'\n'+code('admin-management.ts')+'\n'+code('index.ts'),box);
 return{calls,request:async(route,p,token=true)=>{const response=await handler(new Request('https://test.invalid/?route='+encodeURIComponent(route),{method:p?'POST':'GET',headers:{origin:'https://yessuri.com','content-type':'application/json',...(token?{'x-admin-token':'a'.repeat(64)}:{})},...(p?{body:JSON.stringify(p)}:{})}));return{status:response.status,data:await response.json()};}};
}
(async()=>{
 const helperBox={};vm.createContext(helperBox);vm.runInContext(code('public-profile.ts')+'\n'+code('admin-management.ts'),helperBox);
 assert.equal(helperBox.koreanBusinessDate(Date.parse('2026-11-04T16:00:00Z')),'2026-11-05','Korean early morning is already the next business date');
 assert.equal(helperBox.koreanBusinessDate(Date.parse('2026-11-04T14:59:59Z')),'2026-11-04');
 const route='/api/admin/applications/'+id+'/profile-management';
 for(const role of ['owner','none'])assert.equal((await fixture(role).request(route)).status,403);
 assert.equal((await fixture().request(route,null,false)).status,403);
 const valid=fixture();assert.equal((await valid.request(route,body)).status,200);
 const mutation=valid.calls.find(c=>c.op==='profile-manage');assert.equal(mutation.p.hash.length,64);assert.equal(mutation.p.profile.publication_status,'approved');assert.equal(mutation.p.profile.phone,null);assert.equal(mutation.p.consent.evidence,'TEST-001');assert.equal('operatorId' in mutation.p,false,'operator identity comes from SQL session, not browser');
 for(const consent of [null,{...body.consent,scope:[]},{...body.consent,scope:['profile','admin']},{...body.consent,confirmedAt:'2026-02-30'},{...body.consent,evidence:''}]){const f=fixture();assert.equal((await f.request(route,{...body,consent})).status,400);assert.ok(!f.calls.some(c=>c.op==='profile-manage'));}
 const noPhoneConsent=fixture();assert.equal((await noPhoneConsent.request(route,{...body,phone:'010-1234-5678',phonePublic:true})).status,400);
 for(const action of ['hide','withdraw']){const f=fixture();assert.equal((await f.request(route,{action,version:'current'})).status,200);const p=f.calls.find(c=>c.op==='profile-manage').p;assert.equal(p.expectedVersion,'current');assert.equal(p.profile,undefined);}
 assert.equal((await fixture('admin',{message:'version conflict'}).request(route,{action:'hide',version:'old'})).status,409);
 assert.equal((await fixture('admin',{message:'permission denied'}).request(route)).status,403);
 const restorePhotoConsent=await fixture('admin',{message:'invalid photo consent'}).request(route,{...body,action:'restore',version:'current'});
 assert.equal(restorePhotoConsent.status,400);assert.match(restorePhotoConsent.data.error,/사진 공개 동의/);
 const log=fixture();assert.equal((await log.request('/api/admin/audit')).status,200);assert.ok(log.calls.some(c=>c.op==='audit'&&c.name==='technician_admin_management'));
 const ops=fixture();assert.equal((await ops.request('/api/admin/operations')).data.productionVerified,false);
 const logoutFailure=fixture('admin',{message:'audit unavailable'});await logoutFailure.request('/api/logout',{role:'admin'});assert.ok(logoutFailure.calls.some(c=>c.op==='logout'),'audit failure must not prevent server session revocation');
 const migration=fs.readFileSync(path.join(base,'../../migrations/202611050001_admin_hardening.sql'),'utf8');
 assert.match(migration,/timezone\('Asia\/Seoul',now\(\)\)::date/);
 assert.match(migration,/action_name='restore'[\s\S]*?invalid photo consent/,'restoring hidden photos requires explicit photo consent in the atomic DB operation');
 assert.match(migration,/jsonb_typeof\(c->'scope'\) is distinct from 'array'/);
 console.log('PASS: 관리자 권한, 증빙 필수, 연락처 별도 동의, 서버 운영자 결정, 공개 수정/철회 버전 계약, 감사 조회, 운영 백업 미검증 표시');
})().catch(e=>{console.error(e);process.exitCode=1;});
