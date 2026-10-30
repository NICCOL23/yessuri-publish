// Local browser regression. All API results are fixtures; no production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'not found':data)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1920,height:1080},serviceWorkers:'block'});
 await context.addInitScript(()=>{sessionStorage.setItem('yessuri-favorite-experts-v1',JSON.stringify(['real-yescom','example-001','example-052']));});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();if(u.pathname.endsWith('/search_public_experts'))return r.fulfill({json:{page:1,total:1,totalPublic:1,items:[{id:'real-yescom',name:'yescom',fields:['에어컨','CCTV 설치','TV·LED 모니터 수리','컴퓨터·IT'],serviceAreas:['전체','부산진구','연제구','동래구'],isExample:false,publicationStatus:'approved',image:'assets/images/ai-water-yessuri-v2.png'}]}});return r.abort();});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const heights={};
 for(const [file,grid] of [['index.html','#expert-grid'],['find.html','#find-grid'],['favorites.html','#favorite-grid']]){
  await p.setViewportSize({width:1920,height:1080});await p.goto(origin+'/'+file);const cards=p.locator(grid+' .ys-expert-card');await cards.first().waitFor();
  const yescom=cards.filter({hasText:'yescom'});assert.equal(await yescom.locator('.ys-expert-fields').innerText(),'에어컨 외 3개 분야');
  heights[file]=await yescom.evaluate(n=>Math.round(n.getBoundingClientRect().height));
  if(file!=='index.html'){
   assert.equal(await yescom.locator('.ys-expert-actions .ys-expert-compare').count(),1,'comparison control shares action row');
   const check=yescom.getByRole('checkbox');await check.click();assert.equal(await check.getAttribute('aria-checked'),'true');await check.click();assert.equal(await check.getAttribute('aria-checked'),'false');
  }
  if(process.env.YESSURI_CARD_SCREENSHOT&&file==='find.html')await p.locator('#find-grid').screenshot({path:process.env.YESSURI_CARD_SCREENSHOT});
  for(const width of [1920,1440,1024,768,390,320]){
   await p.setViewportSize({width,height:1000});
   assert.equal(await cards.evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().right<=innerWidth+1)),true,file+' horizontal overflow at '+width);
   assert.equal(await cards.evaluateAll(nodes=>nodes.every(n=>{const a=n.querySelector('.ys-expert-actions').getBoundingClientRect(),s=n.querySelector('.ys-expert-summary').getBoundingClientRect();return a.top>=s.bottom-1})),true,file+' summary/action overlap at '+width);
  }
  await p.addStyleTag({content:'html{font-size:200%!important}'});
  assert.equal(await cards.evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().right<=innerWidth+1)),true,'200% text must not overflow horizontally');
 }
 assert.ok(Math.abs(heights['index.html']-heights['find.html'])<=1,'home and search share card height');assert.ok(Math.abs(heights['find.html']-heights['favorites.html'])<=1,'favorites share card height');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',heights,checks:'shared summary and action row, comparison toggle, 320–1920px, 200% text'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
