// Local browser regression. All API results are fixtures; no production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'not found':data)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});let realCount=1;
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();if(url.pathname.endsWith('/search_public_experts')){
  const real=Array.from({length:realCount},(_,i)=>({id:'real-'+i,name:i?'실제 업체 '+i:'yescom',isExample:false,publicationStatus:'approved',fields:['컴퓨터·IT'],serviceAreas:['전체'],image:null}));
  const query=url.searchParams.get('p_query')||'',category=url.searchParams.get('p_category')||'전체',page=Number(url.searchParams.get('p_page'))||1;
  const matches=real.filter(p=>(category==='전체'||p.fields.includes(category))&&(!query||p.name.includes(query)));
  return route.fulfill({json:{totalPublic:realCount,total:matches.length,page,items:matches.slice((page-1)*12,page*12)}});
 }return route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/find.html');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='58');
 const cards=page.locator('#find-grid .ys-expert-card');assert.equal(await cards.count(),12);const seen=new Set();
 for(let n=1;n<=5;n++){
  if(n>1){await page.goto(origin+'/find.html?page='+n);await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='58');}
  assert.equal(await cards.count(),n===5?10:12);for(const id of await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.expertId))){assert.equal(seen.has(id),false);seen.add(id);}
 }
 assert.equal(seen.size,58);assert.equal(seen.has('real-0'),true);
 await page.goto(origin+'/find.html?q=yescom');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='1');assert.equal(await cards.count(),1);assert.ok((await cards.innerText()).includes('yescom'));
 await page.goto(origin+'/find.html?category='+encodeURIComponent('보일러'));await page.waitForFunction(()=>Number(document.querySelector('#result-count').textContent)>0);assert.ok(await cards.count()>0);assert.equal(await cards.filter({hasText:'yescom'}).count(),0);
 await page.goto(origin+'/find.html?q=NO_MATCH_12345');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='0');assert.equal(await cards.count(),0);
 realCount=25;await page.goto(origin+'/find.html');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='82');assert.equal(await cards.count(),12);
 await page.goto(origin+'/find.html?page=7');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='82');assert.equal(await cards.count(),10);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#search-pagination').evaluate(n=>n.getBoundingClientRect().right<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS: real + 57 examples, all 58 across five pages without duplicates, query/category/empty results, 25 real profiles across server pages, mobile pagination');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
