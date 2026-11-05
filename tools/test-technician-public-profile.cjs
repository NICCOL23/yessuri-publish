// Isolated tests: no production requests, credentials, or applicant data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const {webcrypto}=require('node:crypto');
const base=path.join(__dirname,'../supabase/functions/technician-api');
const helper=stripTypeScriptTypes(fs.readFileSync(path.join(base,'public-profile.ts'),'utf8'),{mode:'transform'}).replace('export function','function');
const backend=stripTypeScriptTypes(fs.readFileSync(path.join(base,'index.ts'),'utf8'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'');
const management=stripTypeScriptTypes(fs.readFileSync(path.join(base,'admin-management.ts'),'utf8'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'').replace(/export /g,'');
const v2=stripTypeScriptTypes(fs.readFileSync(path.join(base,'admin-v2.ts'),'utf8'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'').replace(/export /g,'');
const id='12345678-1234-1234-1234-123456789abc';
const reviewed={version:3,name:'테스트 업체',fields:['누수·수도','누수·수도'],serviceAreas:['해운대구'],intro:'공개 소개',career:'10년',phone:'010-1234-5678',phonePublic:false,publicConsent:true,consent:{scope:['profile'],confirmedAt:'2026-01-01',evidence:'TEST-CONSENT-001',note:''}};
function fixture({role='admin',existing=null,duplicate=false,version=3}={}){
 let handler,writes=[],reads=0;
 const db={rpc:async(_name,{op,p})=>{if(_name==='technician_admin_management_v2'&&op==='profile-manage'){if(duplicate)return{data:null,error:{message:'version conflict'}};writes.push(p.profile);return{data:{profile:{id:p.profile.id,name:p.profile.name,publication_status:'approved'}},error:null};}return{data:op==='session'?{role,application_id:id,hash:'hash'}:op==='admin-detail'?{application:{id,version}}:{},error:null};},from:table=>{
   assert.equal(table,'expert_profiles');
   return {select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return{data:existing,error:null}}})}),insert:profile=>{
     writes.push(profile);
     return {select:()=>({single:async()=>({data:duplicate?null:{id:profile.id,name:profile.name,publication_status:'approved'},error:duplicate?{code:'23505'}:null})})};
   }};
 }};
 const sandbox={createClient:()=>db,Deno:{env:{get:()=> 'test-only'},serve:fn=>{handler=fn}},TextEncoder,TextDecoder,Uint8Array,URL,Response,Request,crypto:webcrypto,console};
 vm.runInNewContext(helper+'\n'+management+'\n'+v2+'\n'+backend,sandbox);
 return {writes,get reads(){return reads},request:async(data,{token=true,method='POST',origin='https://yessuri.com'}={})=>{
   const headers={'content-type':'application/json',origin};if(token)headers['x-admin-token']='a'.repeat(64);
   const response=await handler(new Request('https://test.invalid/?route='+encodeURIComponent('/api/admin/applications/'+id+'/public-profile'),{method,headers,...(method==='POST'?{body:JSON.stringify(data)}:{})}));
   return {status:response.status,data:await response.json()};
 }};
}
(async()=>{
 for(const role of ['owner',undefined]){
   const f=fixture({role:role||'none'});assert.equal((await f.request(reviewed)).status,403);assert.equal(f.writes.length,0);
 }
 const anonymous=fixture();assert.equal((await anonymous.request(reviewed,{token:false})).status,403);assert.equal(anonymous.writes.length,0);
 const consent=fixture();assert.equal((await consent.request({...reviewed,publicConsent:false})).status,400);assert.equal(consent.writes.length,0);
 const stale=fixture({version:4});assert.equal((await stale.request(reviewed)).status,409);assert.equal(stale.writes.length,0);
 const foreign=fixture();assert.equal((await foreign.request(reviewed,{origin:'https://untrusted.invalid'})).status,403);assert.equal(foreign.writes.length,0);
 const success=fixture();const result=await success.request({...reviewed,contact:'PRIVATE',notes:'PRIVATE',receipt:'PRIVATE',photos:[{url:'private.jpg'}]});
 assert.equal(result.status,201);assert.equal(success.writes.length,1);const profile=success.writes[0];
 assert.equal(profile.id,'technician-'+id);assert.equal(profile.phone,null);assert.equal(profile.phone_public,false);
 assert.equal(profile.public_consent,true);assert.equal(profile.publication_status,'approved');assert.equal(profile.fields.length,1);
 for(const key of ['contact','notes','receipt','photos','work_photos','business_card','password','application_id'])assert.equal(key in profile,false);
 const phone=fixture();assert.equal((await phone.request({...reviewed,phonePublic:true,consent:{...reviewed.consent,scope:['profile','phone']}})).status,201);assert.equal(phone.writes[0].phone,reviewed.phone);
 const invalid=fixture();assert.equal((await invalid.request({...reviewed,phonePublic:true,phone:'javascript:alert(1)'})).status,400);assert.equal(invalid.writes.length,0);
 const empty=fixture();assert.equal((await empty.request({...reviewed,fields:[]})).status,400);assert.equal(empty.writes.length,0);
 const duplicate=fixture({duplicate:true});assert.equal((await duplicate.request(reviewed)).status,409);
 const status=fixture({existing:{id:'technician-'+id,name:'등록 업체',publication_status:'approved'}});assert.equal((await status.request(null,{method:'GET'})).data.profile.id,'technician-'+id);assert.equal(status.writes.length,0);
 const ownerRead=fixture({role:'owner'});assert.equal((await ownerRead.request(null,{method:'GET'})).status,403);assert.equal(ownerRead.reads,0);
 console.log('PASS: admin-only GET/POST, consent, stale review, origin checks, reviewed-only fields, private photo exclusion, separate phone consent, duplicate conflict and existing-profile lookup');
})().catch(e=>{console.error(e);process.exitCode=1});
