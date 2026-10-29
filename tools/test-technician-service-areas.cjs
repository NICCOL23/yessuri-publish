// Browser test with a local server and intercepted API requests. Never writes to production.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YESSURI_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),id='12345678-1234-1234-1234-123456789abc';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'not found':data);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:1100},serviceWorkers:'block'});
 await context.addInitScript(()=>{window.TECHNICIAN_CLOUD_TEST=true});
 const errors=[],writes=[];
 let areas='부산진구, 수영구',areaNotes='토요일 출장 가능';
 const application=()=>({id,version:4,receipt:'YS-TEST',company:'테스트 업체',contact:'테스트',phone:'010-1234-5678',fields:'누수·수도',areas,areaNotes,intro:'소개',links:'',notes:'',status:'접수',created_at:'2026-10-29T00:00:00Z',expires_at:'2027-04-29T00:00:00Z'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin)return route.continue();
  if(url.hostname==='buotlfllagjwxopnbeit.supabase.co'){
   const endpoint=url.searchParams.get('route');
   if(route.request().method()==='POST'){writes.push({endpoint,data:route.request().postDataJSON()});return route.fulfill({json:{id,receipt:'YS-TEST'},headers:{'Access-Control-Allow-Origin':origin}})}
   return route.fulfill({json:{application:application(),photos:[],messages:[]},headers:{'Access-Control-Allow-Origin':origin}});
  }
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/technician-apply.html');await page.locator('#service-area-all').waitFor();
 assert.equal(await page.locator('.ys-area-grid input').count(),16);
 assert.equal(await page.locator('#t-areas').inputValue(),'');
 await page.locator('#application-form .actions button').click();
 assert.match(await page.locator('#t-areas-error').innerText(),/한 곳 이상/);assert.equal(writes.length,0);
 assert.match(await page.locator('.apply-error-summary').innerText(),/실제 출장 가능한 구·군/);
 await page.locator('.apply-error-summary a[href="#t-areas"]').click();assert.equal(await page.locator('#service-area-all').evaluate(el=>document.activeElement===el),true);
 await page.locator('#t-company').fill('테스트 업체');await page.locator('#t-contact').fill('테스트');await page.locator('#t-phone').fill('010-1234-5678');await page.locator('#t-fields').fill('누수·수도');
 await page.locator('#t-password').fill('Only-test-password!');await page.locator('#t-passwordConfirm').fill('Only-test-password!');await page.locator('#consent').check();
 for(const name of ['부산진구','수영구','해운대구'])await page.getByRole('checkbox',{name,exact:true}).check();
 assert.equal(await page.locator('#t-areas').inputValue(),'부산진구, 수영구, 해운대구');
 assert.equal(await page.locator('#service-area-all').evaluate(el=>el.indeterminate),true);
 assert.equal(await page.locator('#t-areas-error').innerText(),'');
 await page.locator('#t-areaNotes').fill('평일은 해운대구·수영구, 토요일은 부산진구 출장 가능');
 const restore=await page.evaluate(()=>({normal:window.YESSURI_TECHNICIAN_AREAS.restore('부산광역시 부산진구 · 수영구'),all:window.YESSURI_TECHNICIAN_AREAS.restore('부산 전 지역'),legacy:window.YESSURI_TECHNICIAN_AREAS.restore('해운대구 제외')}));
 assert.deepEqual(restore.normal.selected,['부산진구','수영구']);assert.equal(restore.all.selected.length,16);assert.equal(restore.legacy.selected.length,0);assert.equal(restore.legacy.note,'해운대구 제외');
 if(process.env.YESSURI_SCREENSHOT_DIR){fs.mkdirSync(process.env.YESSURI_SCREENSHOT_DIR,{recursive:true});await page.locator('.ys-service-areas').screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-areas-desktop.png')});}
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.ys-area-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
 assert.equal(await page.locator('.ys-service-areas').evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.scrollWidth<=el.clientWidth+1),true);
 if(process.env.YESSURI_SCREENSHOT_DIR)await page.locator('.ys-service-areas').screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-areas-mobile.png')});
 await page.evaluate(()=>{
  document.documentElement.style.fontSize='32px';
  document.querySelectorAll('.ys-area-picker,.ys-area-picker *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';});
 });
 assert.equal(await page.locator('.ys-service-areas').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'200% text size and user spacing fit without horizontal overflow');
 await page.evaluate(()=>{document.documentElement.style.fontSize='';document.querySelectorAll('.ys-area-picker,.ys-area-picker *').forEach(el=>{el.style.lineHeight='';el.style.letterSpacing='';el.style.wordSpacing='';});});
 await page.locator('#application-form .actions button').click();await page.getByText('등록 신청이 접수되었습니다.',{exact:true}).waitFor();
 assert.equal(writes[0].data.areas,'부산진구, 수영구, 해운대구');assert.equal(writes[0].data.areaNotes,'평일은 해운대구·수영구, 토요일은 부산진구 출장 가능');
 await page.goto(origin+'/technician-apply.html?id='+id);await page.locator('#service-area-all').waitFor();
 assert.equal(await page.getByRole('checkbox',{name:'부산진구',exact:true}).isChecked(),true);assert.equal(await page.getByRole('checkbox',{name:'수영구',exact:true}).isChecked(),true);assert.equal(await page.locator('#t-areaNotes').inputValue(),areaNotes);
 // Bring the area control into view below the sticky site header.
 await page.locator('#service-area-all').evaluate(el=>el.scrollIntoView({block:'center'}));
 await page.locator('#service-area-all').check({timeout:5000});assert.equal((await page.locator('#t-areas').inputValue()).split(', ').length,16);
 await page.getByRole('button',{name:'기장군 선택 해제',exact:true}).click();assert.equal((await page.locator('#t-areas').inputValue()).split(', ').length,15);assert.equal(await page.getByRole('checkbox',{name:'기장군',exact:true}).isChecked(),false);
 await page.locator('#application-form .actions button').click();await page.waitForURL('**/technician-detail.html?id=*');
 assert.equal(writes[1].endpoint,'/api/applications/'+id+'/edit');assert.equal(writes[1].data.version,4);assert.equal(writes[1].data.areaNotes,areaNotes);assert.equal(writes[1].data.areas.includes('기장군'),false);
 areas='해운대구 제외, 평일 상담';areaNotes='';await page.goto(origin+'/technician-apply.html?id='+id);await page.locator('#service-area-all').waitFor();assert.equal(await page.locator('#t-areaNotes').inputValue(),areas);assert.equal(await page.locator('#t-areas').inputValue(),'');
 assert.deepEqual(errors,[]);
 console.log('PASS: 16 regions, required selection, all/partial selection, chips, legacy text preservation, edit prefill, separate notes, create/edit payloads, desktop/mobile layout, no browser errors; all API writes intercepted');
 await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
