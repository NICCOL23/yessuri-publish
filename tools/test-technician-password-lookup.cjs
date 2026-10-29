// No production calls or records. Exercise the real verification handler and lookup UI.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module'),{webcrypto}=require('node:crypto');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const id='12345678-1234-1234-1234-123456789abc',otherId='12345678-1234-1234-1234-123456789def';
const password='Only-test-password!';
async function hashPassword(){const salt='00112233445566778899aabbccddeeff',encoder=new TextEncoder();const key=await webcrypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bytes=new Uint8Array(await webcrypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:600000,hash:'SHA-256'},key,256));return 'pbkdf2-600000:'+salt+':'+Buffer.from(bytes).toString('hex');}
function backend(hash,{expired=false,changed=false,limited=false}={}){
 let handler;const grants=[],targets=[];
 const db={rpc:async(name,args)=>{
  if(name==='technician_password_target'){targets.push(args.p_id);return {data:!expired&&[id,otherId].includes(args.p_id)?{id:args.p_id,password_hash:hash}:{},error:null};}
  const {op,p}=args;
  if(op==='rate')return {data:{allowed:!limited},error:null};
  if(op==='find-receipt')return {data:p.receipt==='YS-TEST'?{id,password_hash:hash}:{},error:null};
  if(op==='grant-owner'){if(changed)return {error:{message:'permission denied'}};grants.push(p);return {data:{id:p.id},error:null};}
  return {data:{},error:null};
 }};
 const helper=stripTypeScriptTypes(read('supabase/functions/technician-api/public-profile.ts'),{mode:'transform'}).replace('export function','function');
 const code=stripTypeScriptTypes(read('supabase/functions/technician-api/index.ts'),{mode:'transform'}).replace(/^import .*;\s*$/gm,'');
 vm.runInNewContext(helper+'\n'+code,{createClient:()=>db,Deno:{env:{get:()=> 'test'},serve:fn=>{handler=fn}},TextEncoder,TextDecoder,Uint8Array,URL,Response,Request,crypto:webcrypto,console});
 return {grants,targets,verify:async data=>{const r=await handler(new Request('https://test.invalid/?route=%2Fapi%2Fverify',{method:'POST',headers:{'content-type':'application/json',origin:'https://yessuri.com'},body:JSON.stringify(data)}));return {status:r.status,data:await r.json()}}};
}
async function ui({selected=id,action='',fail=false}={}){
 const script=read('technician.js'),start=script.indexOf(' async function lookup(){'),end=script.indexOf('\n const summary=',start);
 const nodes=new Map(),get=s=>{if(!nodes.has(s))nodes.set(s,{value:'',textContent:''});return nodes.get(s)};
 let html='';const calls=[],location={href:''},sandbox={id:selected,params:new URLSearchParams({action}),location,errorBox:'',heading:(_a,b)=>b,tabs:()=>'',render:s=>{html=s},$:get,busy:async(_form,fn)=>fn(),api:async(route,data)=>{calls.push({route,data});if(fail)throw Error('비밀번호 오류');return {id}},error:(node,text)=>{node.textContent=text},encodeURIComponent};
 vm.runInNewContext(script.slice(start,end)+'\nglobalThis.runLookup=lookup;',sandbox);await sandbox.runLookup();
 return {get,location,calls,html};
}
(async()=>{
 const hash=await hashPassword();
 const correct=backend(hash);assert.equal((await correct.verify({id,password})).status,200);assert.equal(correct.grants[0].id,id);assert.equal(correct.targets[0],id);
 const same=backend(hash);assert.equal((await same.verify({id:otherId,password})).data.id,otherId);assert.equal(same.grants[0].id,otherId,'only the selected application is granted');
 for(const options of [{},{expired:true}]){const b=backend(hash,options);assert.equal((await b.verify({id,password:'wrong'})).status,403);assert.equal(b.grants.length,0);}
 const expired=backend(hash,{expired:true});assert.equal((await expired.verify({id,password})).status,403);assert.equal(expired.grants.length,0);
 const invalid=backend(hash);assert.equal((await invalid.verify({id:'invalid',password})).status,400);assert.equal(invalid.targets.length,0);
 const missing=backend(hash);assert.equal((await missing.verify({id:'00000000-0000-0000-0000-000000000000',password})).status,403);assert.equal(missing.grants.length,0);
 const limited=backend(hash,{limited:true});assert.equal((await limited.verify({id,password})).status,429);assert.equal(limited.targets.length,0);
 const changed=backend(hash,{changed:true});assert.equal((await changed.verify({id,password})).status,403);assert.equal(changed.grants.length,0);
 const legacy=backend(hash);assert.equal((await legacy.verify({receipt:'YS-TEST',password})).status,200);
 const normal=await ui();assert.equal(normal.html.includes('id="receipt"'),false);normal.get('#lookup-password').value=password;await normal.get('#lookup-form').onsubmit({preventDefault(){}});assert.equal(normal.calls[0].data.id,id);assert.equal('receipt' in normal.calls[0].data,false);assert.equal(normal.location.href,'technician-detail.html?id='+id);assert.equal(normal.get('#lookup-password').value,'');
 const edit=await ui({action:'edit'});edit.get('#lookup-password').value=password;await edit.get('#lookup-form').onsubmit({preventDefault(){}});assert.equal(edit.location.href,'technician-apply.html?id='+id);
 const cancel=await ui();cancel.get('#lookup-password').value=password;cancel.get('#cancel-lookup').onclick();assert.equal(cancel.get('#lookup-password').value,'');assert.equal(cancel.location.href,'technician-board.html');assert.equal(cancel.calls.length,0);
 const failed=await ui({fail:true});failed.get('#lookup-password').value='wrong';await failed.get('#lookup-form').onsubmit({preventDefault(){}});assert.equal(failed.location.href,'');assert.equal(failed.get('#lookup-password').value,'');
 const unselected=await ui({selected:''});assert.equal(unselected.html.includes('신청 목록에서 내 글 찾기'),true);assert.equal(unselected.html.includes('id="lookup-password"'),false);assert.equal(unselected.calls.length,0);
 assert(read('technician.js').includes("location.replace('technician-board.html?submitted=1#entry-list')"));
 console.log('PASS: selected application + password without receipt, isolated access, incorrect/expired/missing targets, rate limit, password change race, legacy receipt, lookup UI, cancel without deletion, edit return');
})().catch(e=>{console.error(e);process.exitCode=1});
