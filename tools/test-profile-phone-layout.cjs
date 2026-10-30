// Local browser regression. All API results are fixtures; no production writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'not found':data)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});let consent=true,phone='01012345678';
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin)return r.continue();if(u.pathname.endsWith('/search_public_experts'))return r.fulfill({json:{page:1,total:1,totalPublic:1,items:[{id:'real-yescom',name:'yescom',fields:['컴퓨터·IT'],serviceAreas:['전체'],intro:'컴퓨터 수리',isExample:false,publicationStatus:'approved',phonePublic:consent,phone,image:null}]}});return r.abort();});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const open=async()=>{await p.goto(origin+'/expert.html?id=real-yescom');await p.locator('#profile-content').waitFor();};
 await open();assert.equal(await p.locator('#expert-phone-fact').innerText(),'01012345678');assert.equal(await p.locator('#expert-phone-row').isVisible(),true);assert.equal(await p.locator('.contact-card').isVisible(),false);
 assert.equal(await p.locator('.detail-primary').evaluate(n=>Math.round(n.getBoundingClientRect().width)),await p.locator('.detail-grid').evaluate(n=>Math.round(n.getBoundingClientRect().width)),'no empty desktop phone column');
 await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('.contact-card').isVisible(),true);assert.equal(await p.locator('#contact-button').innerText(),'전화 연결하기');
 const navigations=[];await p.route('tel:**',route=>route.abort());await p.locator('#contact-button').click();
 await p.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));await p.setViewportSize({width:1440,height:1000});await open();assert.equal(await p.locator('.contact-card').isVisible(),true,'installed app retains phone action even at wide width');
 consent=false;await open();assert.equal(await p.locator('#expert-phone-row').isVisible(),false);assert.equal(await p.locator('#contact-button').innerText(),'전화 연결 준비 중');assert.equal(await p.locator('#expert-phone-fact').textContent(),'');
 consent=true;phone='invalid';await open();assert.equal(await p.locator('#expert-phone-row').isVisible(),false,'invalid number must not be displayed');
 await p.goto(origin+'/expert.html?id=example-001');await p.locator('#profile-content').waitFor();assert.equal(await p.locator('#expert-phone-row').isVisible(),false,'examples never acquire a phone number');
 assert.deepEqual(errors,[]);console.log('PASS: consented phone in introduction, desktop box and empty column removed, mobile phone action retained, installed-app fallback, no private/invalid/example number disclosure');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
