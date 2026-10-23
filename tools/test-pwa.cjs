const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
 const handlers={},stores=new Map();let fail=false,network=[],waits=[];
 const caches={open:async n=>{if(!stores.has(n))stores.set(n,new Map());const m=stores.get(n);return {addAll:async urls=>urls.forEach(u=>m.set(u,{offline:true})),match:async u=>m.get(u)}},keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n)};
 const ctx={URL,caches,self:{location:{href:'https://yessuri.com/sw.js'},addEventListener:(n,f)=>handlers[n]=f},fetch:async r=>{network.push(r.url);if(fail)throw Error('offline');return {online:true}}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),ctx);
 handlers.install({waitUntil:p=>waits.push(p)});await Promise.all(waits);
 assert.equal(stores.get('yessuri-pwa-v2').size,3);
 for(const path of ['index.html','technician-apply.html','technician-admin.html','question-detail.html?id=private']){
  for(const offline of [false,true]){fail=offline;let response;handlers.fetch({request:{url:'https://yessuri.com/'+path,method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response)[offline?'offline':'online'],true);}
 }
 for(const request of [{url:'https://yessuri.com/api',method:'POST',mode:'cors'},{url:'https://example.com/api',method:'GET',mode:'cors'},{url:'https://yessuri.com/technician.js',method:'GET',mode:'cors'}]) handlers.fetch({request,respondWith:()=>assert.fail('must bypass worker')});
 stores.set('yessuri-pwa-v0',new Map());stores.set('other-app',new Map());waits=[];handlers.activate({waitUntil:p=>waits.push(p)});await Promise.all(waits);assert(!stores.has('yessuri-pwa-v0'));assert(stores.has('other-app'));assert.equal(stores.get('yessuri-pwa-v2').size,3);
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest'));for(const icon of manifest.icons)assert(fs.existsSync(icon.src));
 let pages=0;for(const p of fs.readdirSync('.').filter(p=>p.endsWith('.html'))){const s=fs.readFileSync(p,'utf8');if(!s.includes('site-header.js?v=5'))continue;assert.equal((s.match(/src="pwa.js\?v=1"/g)||[]).length,1,p);assert(s.includes('rel="manifest"'),p);assert(s.indexOf('src="pwa.js')<s.indexOf('src="site-header.js'),p);pages++;}
 console.log(JSON.stringify({passed:true,pages,cacheEntries:3,navigationCases:8,apiAndAssetBypass:true,updateCleanup:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
