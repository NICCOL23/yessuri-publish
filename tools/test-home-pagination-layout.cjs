// Local browser regression. All API results are fixtures; no production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'not found':data)});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.addInitScript(()=>{const interval=window.setInterval;window.setInterval=(fn,ms,...args)=>{if(ms===12000)window.__homeTick=fn;return interval(fn,ms,...args)};});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===origin)return route.continue();
   if(url.pathname.endsWith('/search_public_experts'))return route.fulfill({json:{page:1,total:1,totalPublic:1,items:[{id:'real-yescom',name:'yescom',fields:['에어컨','CCTV 설치','TV·LED 모니터 수리','컴퓨터·IT'],serviceAreas:['전체','부산진구','연제구','동래구'],intro:'테스트',isExample:false,publicationStatus:'approved',phonePublic:false,image:null}]}});
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/index.html');await page.locator('#home-expert-pages').waitFor();
  const cards=page.locator('#expert-grid .ys-expert-card'),nav=page.locator('#home-expert-pages');
  assert.equal(await cards.count(),12);assert.equal(await cards.locator('.ys-example-label').count(),11);assert.equal(await nav.locator('[aria-current="page"]').innerText(),'1');
  const yescom=cards.filter({hasText:'yescom'});
  assert.equal(await yescom.locator('.ys-expert-fields').innerText(),'에어컨 외 3개 분야');
  assert.equal(await yescom.locator('.ys-expert-summary p').last().innerText(),'부산 전 지역 외 3곳');
  const initialHeight=await yescom.evaluate(node=>Math.round(node.getBoundingClientRect().height));
  assert.ok(initialHeight<210,'summary must not inflate the original compact cards');
  const fullFields=await page.evaluate(()=>window.YESSURI_EXPERT_CARD.create({id:'verify',name:'yescom',isExample:false,fields:['에어컨','CCTV 설치','TV·LED 모니터 수리','컴퓨터·IT'],serviceAreas:['전체','부산진구','연제구','동래구']}).querySelector('.ys-expert-fields').textContent);
  assert.equal(fullFields,'에어컨 · CCTV 설치 · TV·LED 모니터 수리 · 컴퓨터·IT','shared default presentation remains unchanged');
  await page.locator('#experts h2').scrollIntoViewIfNeeded();await page.mouse.move(1400,900);
  for(let i=0;i<20;i++){
   const before=await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.expertId));await page.evaluate(()=>window.__homeTick());
   const after=await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.expertId));assert.equal(after.filter((id,n)=>id!==before[n]).length,2);assert.deepEqual([...after].sort(),[...before].sort());assert.equal(new Set(after).size,12);
   const heights=await cards.evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().height)));assert.equal(new Set(heights).size,1,'all three rows must have equal card heights');
   assert.equal(await cards.evaluateAll(nodes=>nodes.every(node=>!node.style.minHeight)),true,'rotation must not copy old inline heights');
  }
  const allIds=new Set(await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.expertId)));
  for(let n=2;n<=5;n++) {
   await nav.getByRole('button',{name:String(n),exact:true}).click();
   await page.waitForFunction(n=>document.querySelector('#home-expert-pages [aria-current=page]')?.textContent===String(n),n);
   const ids=await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.expertId));assert.equal(ids.length,n===5?10:12);
   for(const id of ids){assert.equal(allIds.has(id),false,'no duplicate across pages');allIds.add(id);}
  }
  assert.equal(allIds.size,58);assert.equal(allIds.has('real-yescom'),true);
  await nav.getByRole('button',{name:'1',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#home-expert-pages [aria-current=page]')?.textContent==='1');
  await nav.getByRole('button',{name:'2',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#home-expert-pages [aria-current=page]')?.textContent==='2');assert.equal(await nav.locator('[aria-current="page"]').innerText(),'2');assert.equal(await cards.count(),12);
  await nav.getByRole('button',{name:'5',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#home-expert-pages [aria-current=page]')?.textContent==='5');assert.equal(await nav.locator('[aria-current="page"]').innerText(),'5');assert.equal(await cards.count(),10);assert.equal(await nav.locator('.page-disabled').last().innerText(),'다음 →');
  await nav.getByRole('button',{name:'← 이전',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#home-expert-pages [aria-current=page]')?.textContent==='4');assert.equal(await nav.locator('[aria-current="page"]').innerText(),'4');assert.equal(await cards.count(),12);
  await page.setViewportSize({width:390,height:844});assert.equal(await nav.evaluate(node=>getComputedStyle(node).position),'static');assert.equal(await nav.evaluate(node=>node.getBoundingClientRect().right<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: original previous/numbers/next pagination, 5 pages including final 10 cards, auto rotation retained, equal card heights after 20 replacements, no inline height accumulation, mobile pager in flow');
  await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
