// Isolated API tests. No credentials, network requests, or production writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
const base=path.join(__dirname,'../supabase/functions/technician-api');
const helper=stripTypeScriptTypes(fs.readFileSync(path.join(base,'public-profile.ts'),'utf8'),{mode:'transform'}).replace('export function','function');
const backend=stripTypeScriptTypes(fs.readFileSync(path.join(base,'index.ts'),'utf8'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'').replace("await import('https://deno.land/x/imagescript@1.3.0/mod.ts')",'({Image: TestImage})');
const id='12345678-1234-1234-1234-123456789abc',photoId='22222222-2222-4222-8222-222222222222';
const sourcePath=id+'/'+photoId+'.jpg';
function fixture({role='admin',profileMissing=false,updateFails=false,foreignPhoto=false}={}){
 let handler,updates=0,uploads=0;const operations=[];
 const stored=new Map([[sourcePath,new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'})]]);
 let profile=profileMissing?null:{id:'technician-'+id,name:'시험 업체',image:null,work_photos:[],publication_status:'approved',public_consent:true};
 const db={rpc:async(_,{op})=>(operations.push(op),{error:null,data:op==='session'?{role,application_id:id}:op==='admin-detail'?{application:{id,version:3},photos:[{id:photoId}]}:op==='photo'?{application_id:foreignPhoto?'another-application':id,storage_path:sourcePath}:{}}),
  from:()=>{
   let changes=null;const filters=[];
   const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},update(data){changes=data;return q},async maybeSingle(){
    if(updateFails&&changes)return{data:null,error:{message:'failure'}};
    if(!profile||filters.some(([k,v])=>k==='work_photos'?JSON.stringify(profile[k])!==v:profile[k]!==v))return{data:null,error:null};
    if(changes){updates++;profile={...profile,...changes};}
    return{data:{...profile},error:null};
   }};return q;
  },storage:{from:()=>({
   download:async key=>({data:stored.get(key)||null,error:stored.has(key)?null:{message:'missing'}}),
   upload:async(key,blob)=>{uploads++;stored.set(key,blob);return{error:null}},
   remove:async keys=>{keys.forEach(key=>stored.delete(key));return{error:null}}
  })}};
 vm.runInNewContext(helper+'\n'+backend,{createClient:()=>db,Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://test.invalid':'test-only'},serve:fn=>{handler=fn}},TextEncoder,TextDecoder,Uint8Array,URL,Response,Request,crypto:webcrypto,atob,TestImage:{decode:async()=>({encodeJPEG:async()=>new Uint8Array([255,216,255,217])})},console:{error(){}}});
 return{stored,operations,get profile(){return profile},get updates(){return updates},get uploads(){return uploads},async request({body={version:3,photoId,imageConsent:true},token=true,method='POST',url}={}){
  const headers={'content-type':'application/json',origin:'https://yessuri.com'};if(token)headers['x-admin-token']='a'.repeat(64);
  return handler(new Request(url||'https://test.invalid/?route='+encodeURIComponent('/api/admin/applications/'+id+'/representative-image'),{method,headers,...(method==='POST'?{body:JSON.stringify(body)}:{})}));
 }};
}
if(require.main===module)(async()=>{
 for(const options of [{role:'owner'},{role:'none'}]){const f=fixture(options);assert.equal((await f.request()).status,403);assert.equal(f.uploads,0);}
 const anonymous=fixture();assert.equal((await anonymous.request({token:false})).status,403);
 for(const [body,status] of [[{version:3,photoId,imageConsent:false},400],[{version:2,photoId,imageConsent:true},409],[{version:3,photoId:id,imageConsent:true},404]]){const f=fixture();assert.equal((await f.request({body})).status,status);assert.equal(f.uploads,0);}
 const foreign=fixture({foreignPhoto:true});assert.equal((await foreign.request()).status,404);assert.equal(foreign.uploads,0);
 const missing=fixture({profileMissing:true});assert.equal((await missing.request()).status,409);assert.equal(missing.uploads,0);
 const f=fixture();assert.equal((await f.request()).status,200);assert.equal(f.updates,1);assert.equal(f.stored.size,2,'only selected image gets a separate copy');
 const first=f.profile.image;assert.ok(first.includes('public-profile-images'));assert.equal(f.profile.image_alt,'시험 업체 대표 이미지');
 f.stored.delete(sourcePath);assert.equal((await f.request({url:first,method:'GET',token:false})).status,200,'public copy survives private attachment deletion');
 f.stored.set(sourcePath,new Blob(['replacement']));assert.equal((await f.request()).status,200);assert.notEqual(f.profile.image,first);
 assert.equal((await f.request({url:first,method:'GET',token:false})).status,200,'previous representative remains in the public gallery');
 const current=await f.request({url:f.profile.image,method:'GET',token:false});assert.equal(current.status,200);assert.equal(current.headers.get('content-type'),'image/jpeg');
 assert.equal((await f.request({url:first.replace(/route=.*/, 'route='+encodeURIComponent('/api/photos/'+photoId)),method:'GET',token:false})).status,403,'private attachment remains private');
 const failed=fixture({updateFails:true});assert.equal((await failed.request()).status,500);assert.equal(failed.stored.size,1,'failed profile write removes unpublished copy');
 console.log('PASS: admin-only image publication, consent, application version and photo ownership, existing public profile, selected copy only, anonymous public image, private source isolation, replacement and rollback');
})().catch(error=>{console.error(error);process.exitCode=1});

module.exports={fixture,id,photoId,sourcePath};
