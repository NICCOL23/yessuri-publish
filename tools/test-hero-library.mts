import assert from 'node:assert/strict';
import {heroCmsRoute} from '../supabase/functions/technician-api/hero-cms.ts';
const id='11111111-1111-4111-8111-111111111111';
let calls=[],uploads=0,authenticated=true,stageReady=false;
const deps={
 bucket:'private',
 admin:async()=>{if(!authenticated)throw Object.assign(Error('admin required'),{status:403});return {hash:'mock-admin-hash'};},
 decode:async()=>new Uint8Array([1,2]),sha:async()=> 'a'.repeat(64),
 db:{
  rpc:async(name,{op,p})=>{
   calls.push({name,op,p});
   if(op==='stage-image')return {data:{path:'hero-content/'+id+'.jpg',status:stageReady?'ready':'staged'}};
   if(op==='list')return {data:{items:[],nextOffset:null}};
   return {data:{ok:true}};
  },
  storage:{from:()=>({upload:async()=>{uploads++;return {};}})}
 }
};
const request=(route,query='',method='GET')=>new Request('http://local.test/?route='+encodeURIComponent(route)+query,{method});
let result=await heroCmsRoute(request('/api/admin/hero/library','&slide=3&kind=desktop&q=%EB%AA%A8%EC%A7%91&offset=24'),'/api/admin/hero/library',null,deps);
assert.deepEqual(result,{items:[],nextOffset:null});assert.equal(calls.at(-1).name,'technician_hero_library_v1');assert.equal(calls.at(-1).p.offset,24);assert.equal(calls.at(-1).p.query,'모집');assert.equal(calls.at(-1).p.kind,'desktop');
for(const query of ['&offset=-1','&offset=1.2','&kind=unknown','&q='+'x'.repeat(101)])await assert.rejects(()=>heroCmsRoute(request('/api/admin/hero/library',query),'/api/admin/hero/library',null,deps));
authenticated=false;const count=calls.length;await assert.rejects(()=>heroCmsRoute(request('/api/admin/hero/library'),'/api/admin/hero/library',null,deps),e=>e.status===403);assert.equal(calls.length,count);authenticated=true;
const payload={operationId:id,photo:{},libraryName:'모집 원본.png',libraryKind:'desktop'};
result=await heroCmsRoute(request('/api/admin/hero/image','&slide=2','POST'),'/api/admin/hero/image',payload,deps);assert.equal(result.path,'/api/hero-images/'+id+'.jpg');assert.equal(uploads,1);assert.deepEqual(calls.slice(-3).map(c=>c.op),['stage-image','ready-image','register']);assert.equal(calls.at(-1).p.name,'모집 원본.png');
stageReady=true;await heroCmsRoute(request('/api/admin/hero/image','','POST'),'/api/admin/hero/image',payload,deps);assert.equal(uploads,1,'same staged operation retry does not re-upload');
const before=calls.length;await assert.rejects(()=>heroCmsRoute(request('/api/admin/hero/image','','POST'),'/api/admin/hero/image',{...payload,libraryName:'bad\nname'},deps));assert.equal(calls.length,before,'invalid names rejected before storage');
await assert.rejects(()=>heroCmsRoute(request('/api/admin/hero/image','','POST'),'/api/admin/hero/image',{...payload,libraryKind:'invalid'},deps));
calls=[];await heroCmsRoute(request('/api/admin/hero/image','','POST'),'/api/admin/hero/image',{operationId:id,photo:{}},deps);assert(!calls.some(c=>c.op==='register'),'legacy single upload remains compatible');assert(!calls.some(c=>['draft','publish','restore'].includes(c.op)),'library upload never changes CMS state');
console.log('PASS: library auth, filtering, pagination, validation, upload, retry, old upload compatibility, no publish');
