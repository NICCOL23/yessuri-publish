import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {createFieldRules,groups,acceptsWork,fieldFilter} from '../supabase/functions/board-api/field-rules.mjs';
import fieldData from '../supabase/functions/board-api/fields.json' with {type:'json'};
import catalog from '../supabase/functions/board-api/catalog.json' with {type:'json'};

const custom='custom-123456abcdef',inactive='custom-abcdef123456',retired='custom-a1b2c3d4e5f6';
const content=[...fieldData.fields.map(f=>({value:f.id,label:f.name})),{value:custom,label:'새 분야'},{value:inactive,label:'비활성 분야',active:false}];
const archived=[{value:retired,label:'삭제한 분야',active:false}];
const rules=createFieldRules(content,archived);
for(const f of fieldData.fields){assert(rules.canSelect(f.id));for(const work of f.works)assert(rules.acceptsWork(f.id,work));assert.equal(rules.fieldFilter(f.id),fieldFilter(f.id));}
assert(groups.has('general'));assert(acceptsWork('general','bath-fixture'));
assert(rules.canSelect(custom));assert(rules.acceptsWork(custom,''));assert(!rules.acceptsWork(custom,'bath-fixture'));
assert.equal(rules.fieldFilter(custom),'group_id.eq.'+custom);assert.equal(rules.fieldFilter(retired),'group_id.eq.'+retired);
for(const value of [inactive,retired,'general']){assert(!rules.canSelect(value));assert(rules.canSelect(value,value));assert(rules.isKnown(value));}
assert(!rules.canSelect(retired,inactive));assert(!rules.canSelect('not-registered','not-registered'));
for(const value of ['custom-123456abcdef,group_id.eq.general','x).or(state.eq.hidden','unknown,work'])assert.equal(rules.fieldFilter(value),null);
assert.equal(createFieldRules(content.map(f=>f.value===custom?{...f,label:'변경된 새 이름'}:f),archived).canSelect(custom),true);
assert.throws(()=>createFieldRules([],[]));assert.throws(()=>createFieldRules([...content,content[0]],[]));assert.throws(()=>createFieldRules([{value:'untrusted,filter'}],[]));assert.throws(()=>createFieldRules([{value:custom,active:'false'}],[]));
// Rule instances are isolated: a later catalog must not change an in-flight request.
const before=createFieldRules(content,archived),after=createFieldRules(content.filter(f=>f.value!==custom),[...archived,{value:custom,active:false}]);assert(before.canSelect(custom));assert(!after.canSelect(custom));

// Run the actual Edge handler with isolated DB/auth/storage responses; no network or production records.
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/functions/board-api/index.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/^import[\s\S]*?;\r?\n/gm,'');
let handler,published={content,retired:archived},catalogError=false,ownerValid=true,questionGroup=inactive;
const questionId='22222222-2222-4222-8222-222222222222',events=[],writes=[],filters=[];
function query(table){const conditions=[];const q={select(){return q;},eq(key,value){conditions.push([key,value]);return q;},neq(){return q;},is(){return q;},or(value){filters.push(value);return q;},order(){return q;},range(){return Promise.resolve({data:[],error:null,count:0});},maybeSingle(){if(table==='board_questions'&&conditions.some(([k])=>k==='id')){events.push('question-read');return Promise.resolve({data:{id:questionId,state:'published',group_id:questionGroup},error:null});}return Promise.resolve({data:null,error:null});},then(resolve,reject){return Promise.resolve({data:[],error:null,count:0}).then(resolve,reject);}};return q;}
const client={from:query,storage:{from(){throw Error('Unexpected photo operation');}},rpc:async(name,args)=>{if(name==='technician_field_cms_v1'){events.push('catalog');assert.deepEqual(Object.keys(args),['op']);assert.equal(args.op,'published');return {data:published,error:catalogError?{message:'unavailable'}:null};}assert.equal(name,'board_server_private');const {operation,payload}=args;events.push(operation);if(operation==='rate')return {data:{allowed:true},error:null};if(operation==='session_check')return {data:{id:ownerValid?questionId:'33333333-3333-4333-8333-333333333333'},error:null};if(['create','edit'].includes(operation)){writes.push({operation,payload});return {data:{},error:null};}throw Error('Unexpected private operation '+operation);}};
const context=vm.createContext({createClient:()=>client,catalog,createFieldRules,Request,Response,FormData,File,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,crypto,console,Deno:{env:{get:()=> 'isolated-fixture'},serve:fn=>handler=fn}});vm.runInContext(source,context);
const base={nickname:'검토자',district:'부산진구',group_id:custom,work_id:'',title:'동적 분야 질문',body:'운영 자료가 아닌 격리된 검증용 질문 내용입니다.',password:'sample-password',password_confirm:'sample-password',request_id:'11111111-1111-4111-8111-111111111111',keep_photos:[]};
async function post(action,extra={},authorized=true){const data=new FormData();data.append('data',JSON.stringify({...base,...extra}));return handler(new Request('https://local.invalid/?action='+action,{method:'POST',body:data,headers:authorized?{'x-edit-token':'test-only-token'}:{}}));}
let response=await post('create');assert.equal(response.status,200);assert.equal(writes.at(-1).payload.group_id,custom);
for(const group of [inactive,retired,'general','custom-000000000000']){const n=writes.length;response=await post('create',{group_id:group});assert.equal(response.status,400);assert.equal(writes.length,n);}
response=await post('create',{group_id:custom,work_id:'bath-fixture'});assert.equal(response.status,400);
questionGroup=inactive;events.length=0;response=await post('edit',{id:questionId,group_id:inactive});assert.equal(response.status,200);assert(events.indexOf('session_check')<events.indexOf('question-read'));assert(events.indexOf('question-read')<events.indexOf('catalog'));assert.equal(writes.at(-1).payload.group_id,inactive);
questionGroup=retired;response=await post('edit',{id:questionId,group_id:retired});assert.equal(response.status,200);
questionGroup='general';response=await post('edit',{id:questionId,group_id:'general',work_id:'bath-fixture'});assert.equal(response.status,200);
questionGroup=inactive;response=await post('edit',{id:questionId,group_id:retired});assert.equal(response.status,400);
events.length=0;ownerValid=false;response=await post('edit',{id:questionId,group_id:inactive});assert.equal(response.status,401);assert(!events.includes('question-read'));assert(!events.includes('catalog'));ownerValid=true;
events.length=0;response=await post('edit',{id:questionId,group_id:inactive},false);assert.equal(response.status,401);assert(!events.includes('catalog'));
catalogError=true;const n=writes.length;response=await post('create');assert.equal(response.status,503);assert.equal(writes.length,n);catalogError=false;
published={content:[{value:'unknown-injected'}],retired:[]};response=await post('create');assert.equal(response.status,503);published={content,retired:archived};
for(const group of [custom,retired,'욕실·설비']){filters.length=0;response=await handler(new Request('https://local.invalid/?action=list&group='+encodeURIComponent(group)));assert.equal(response.status,200);assert.equal(filters[0],rules.fieldFilter(group));}
filters.length=0;response=await handler(new Request('https://local.invalid/?action=list&group='+encodeURIComponent('x,group_id.eq.general')));assert.equal(response.status,200);assert.equal(filters.length,0);
console.log('PASS 게시판 동적 분야: 기존 20개 작업 매핑, 신규/이름 변경/비활성/삭제, 소유자 인증 후 기존 글 유지, 요청별 격리, 필터 주입 차단, 카탈로그 장애 시 쓰기 차단, 실제 Edge 처리 흐름');
