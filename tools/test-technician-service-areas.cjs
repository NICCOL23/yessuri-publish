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
 let areas='부산진구, 수영구',areaNotes='토요일 출장 가능',fields='누수·수도';
 const application=()=>({id,version:4,receipt:'YS-TEST',company:'테스트 업체',contact:'테스트',phone:'010-1234-5678',fields,areas,areaNotes,intro:'소개',links:'',notes:'',status:'접수',created_at:'2026-10-29T00:00:00Z',expires_at:'2027-04-29T00:00:00Z'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin)return route.continue();
  if(url.hostname==='buotlfllagjwxopnbeit.supabase.co'){
   const endpoint=url.searchParams.get('route');
   if(endpoint==='/api/verify'){
    const data=route.request().postDataJSON();
    return route.fulfill({status:data.password==='Only-test-password!'?200:403,json:data.password==='Only-test-password!'?{id}:{error:'신청 정보 또는 비밀번호를 확인해 주세요.'},headers:{'Access-Control-Allow-Origin':origin}});
   }
   if(endpoint&&endpoint.startsWith('/api/applications?'))return route.fulfill({json:{count:1,applications:[{id,companyMasked:'테***',created_at:'2026-10-29T00:00:00Z',status:'접수',replies:0}]},headers:{'Access-Control-Allow-Origin':origin}});
   if(route.request().method()==='POST'){writes.push({endpoint,data:route.request().postDataJSON()});return route.fulfill({json:{id,receipt:'YS-TEST'},headers:{'Access-Control-Allow-Origin':origin}})}
   return route.fulfill({json:{application:application(),photos:[],messages:[]},headers:{'Access-Control-Allow-Origin':origin}});
  }
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/technician-apply.html');await page.locator('#service-area-trigger').waitFor();
 const dialog=page.locator('#service-area-dialog'),trigger=page.locator('#service-area-trigger'),outside=page.locator('#service-area-selection');
 const openDrawer=async()=>{await trigger.click();await dialog.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));};
 const fieldDialog=page.locator('#service-field-dialog'),fieldTrigger=page.locator('#service-field-trigger');
 const openFields=async()=>{await fieldTrigger.click();await fieldDialog.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));};
 const layout=await page.evaluate(()=>({field:document.querySelector('#t-fields').closest('.field').getBoundingClientRect().toJSON(),area:document.querySelector('#t-areas').closest('.field').getBoundingClientRect().toJSON()}));
 assert.equal(Math.abs(layout.field.top-layout.area.top)<2,true,'PC fields must share a row');
 assert.equal(layout.area.left>layout.field.right,true,'PC area must be on the right');
 assert.equal(await dialog.isVisible(),false);assert.equal(await dialog.locator('.ys-area-grid input').count(),16);
 assert.equal(await fieldDialog.locator('input[type="checkbox"]').count(),19);
 assert.equal(await page.locator('#t-areas').inputValue(),'');
 await page.locator('#application-form .actions button').click();
 assert.match(await page.locator('#t-areas-error').innerText(),/한 곳 이상/);assert.equal(writes.length,0);
 await page.locator('.apply-error-summary a[href="#t-areas"]').click();assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
 await openDrawer();assert.equal(await dialog.evaluate(el=>el.matches(':modal')),true);
 for(const name of ['부산 전 지역','부산진구','수영구','해운대구'])await page.getByRole('checkbox',{name,exact:true}).check();
 assert.equal(await page.locator('#t-areas').inputValue(),'전체, 부산진구, 수영구, 해운대구');
 assert.equal(await dialog.locator('.ys-area-chip').count(),4);
 assert.equal(await page.getByRole('checkbox',{name:'강서구',exact:true}).isChecked(),false);
 assert.equal(await dialog.locator('.ys-area-selected-count').innerText(),'선택한 지역 4곳');
 assert.equal(await dialog.locator('.ys-area-selected-mark').allTextContents().then(m=>m.every(text=>text==='○')),true);
 assert.equal(/[×✕]/.test(await dialog.locator('.ys-area-summary').innerText()),false);
 await page.getByRole('button',{name:'선택 완료',exact:true}).click();assert.equal(await dialog.isVisible(),false);
 assert.equal(await outside.locator('.ys-area-chip').count(),4);assert.equal(await outside.locator('button').count(),0);
 assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
 await openDrawer();await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await outside.locator('.ys-area-chip').count(),4);
 await openDrawer();await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
 await page.getByRole('button',{name:'지역 선택 창 닫기',exact:true}).click();assert.equal(writes.length,0);
 await page.locator('#t-company').fill('테스트 업체');await page.locator('#t-contact').fill('테스트');await page.locator('#t-phone').fill('010-1234-5678');await openFields();
 for(const name of ['누수·수도','타일','페인트'])await fieldDialog.getByRole('checkbox',{name,exact:true}).check();
 assert.equal(await fieldDialog.locator('.ys-area-selected-count').innerText(),'선택한 분야 3개');
 await fieldDialog.getByRole('button',{name:'선택 완료',exact:true}).click();
 assert.equal(await page.locator('#t-fields').inputValue(),'누수·수도, 타일, 페인트');
 await openFields();assert.equal(await fieldDialog.getByRole('checkbox',{name:'타일',exact:true}).isChecked(),true);
 await page.keyboard.press('Escape');
 await page.locator('#t-password').fill('Only-test-password!');await page.locator('#t-passwordConfirm').fill('Only-test-password!');await page.locator('#consent').check();
 await page.locator('#t-areaNotes').fill('평일은 해운대구·수영구, 토요일은 부산진구 출장 가능');
 const restored=await page.evaluate(()=>({normal:window.YESSURI_TECHNICIAN_AREAS.restore('부산광역시 부산진구 · 수영구'),all:window.YESSURI_TECHNICIAN_AREAS.restore('부산 전 지역'),mixed:window.YESSURI_TECHNICIAN_AREAS.restore('전체, 부산진구, 수영구, 해운대구'),legacy:window.YESSURI_TECHNICIAN_AREAS.restore('해운대구 제외')}));
 assert.deepEqual(restored.normal.selected,['부산진구','수영구']);assert.deepEqual(restored.all.selected,['부산 전 지역']);assert.equal(restored.mixed.selected.length,4);assert.equal(restored.legacy.selected.length,0);assert.equal(restored.legacy.note,'해운대구 제외');
 if(process.env.YESSURI_SCREENSHOT_DIR){
  fs.mkdirSync(process.env.YESSURI_SCREENSHOT_DIR,{recursive:true});
  await page.locator('#t-fields').locator('xpath=ancestor::section[1]').screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'fields-and-areas-desktop.png')});await openFields();await page.screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-fields-desktop-open.png')});await fieldDialog.getByRole('button',{name:'선택 완료',exact:true}).click();
  await openDrawer();await page.screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-areas-desktop-open.png')});await page.getByRole('button',{name:'선택 완료',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:844});
 const mobileLayout=await page.evaluate(()=>({field:document.querySelector('#t-fields').closest('.field').getBoundingClientRect().toJSON(),area:document.querySelector('#t-areas').closest('.field').getBoundingClientRect().toJSON()}));
 assert.equal(mobileLayout.area.top>=mobileLayout.field.bottom,true,'Mobile areas must be below fields');
 await openFields();assert.equal(await fieldDialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);await fieldDialog.getByRole('button',{name:'선택 완료',exact:true}).click();
 await openDrawer();
 assert.equal(await dialog.locator('.ys-area-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
 assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().left===0&&el.getBoundingClientRect().right<=innerWidth&&el.scrollWidth<=el.clientWidth+1),true);
 if(process.env.YESSURI_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-areas-mobile-open.png')});
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px';document.querySelectorAll('.ys-area-picker,.ys-area-picker *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';});});
 assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
 await page.evaluate(()=>{document.documentElement.style.fontSize='';document.querySelectorAll('.ys-area-picker,.ys-area-picker *').forEach(el=>{el.style.lineHeight='';el.style.letterSpacing='';el.style.wordSpacing='';});});
 await page.getByRole('button',{name:'선택 완료',exact:true}).click();
 if(process.env.YESSURI_SCREENSHOT_DIR)await page.locator('.ys-service-areas').screenshot({path:path.join(process.env.YESSURI_SCREENSHOT_DIR,'service-areas-mobile-closed.png')});
 await page.locator('#application-form .actions button').click();await page.waitForURL('**/technician-board.html?submitted=1#entry-list');
 await page.getByText('신청이 접수되었습니다. 본인 글을 누르고 설정한 비밀번호로 확인해 주세요.',{exact:true}).waitFor();
 assert.equal(await page.locator('#copy-receipt').count(),0);assert.equal(await page.locator('#copy-url').count(),0);
 await page.locator('.title-link').click();
 const passwordDialog=page.locator('#board-password-dialog');
 assert.equal(await passwordDialog.isVisible(),true);assert.equal(await passwordDialog.locator('#receipt').count(),0);
 await page.locator('#board-password').fill('wrong');
 await passwordDialog.getByRole('button',{name:'내 신청 확인',exact:true}).click();
 await page.getByText('신청 정보 또는 비밀번호를 확인해 주세요.',{exact:true}).waitFor();
 assert.equal(await page.locator('#board-password').inputValue(),'');
 assert.equal(page.url().includes('technician-board.html'),true);
 await passwordDialog.getByRole('button',{name:'취소하기',exact:true}).click();await passwordDialog.waitFor({state:'detached'});
 await page.locator('.title-link').click();await page.locator('#board-password').fill('Only-test-password!');
 await page.locator('#board-password-dialog').getByRole('button',{name:'내 신청 확인',exact:true}).click();await page.waitForURL('**/technician-detail.html?id=*');
 assert.equal(writes[0].data.fields,'누수·수도, 타일, 페인트');assert.equal(writes[0].data.areas,'전체, 부산진구, 수영구, 해운대구');assert.equal(writes[0].data.areaNotes,'평일은 해운대구·수영구, 토요일은 부산진구 출장 가능');
 areas=writes[0].data.areas;fields=writes[0].data.fields;
 await page.goto(origin+'/technician-apply.html?id='+id);await page.locator('#service-area-trigger').waitFor();
 assert.equal(await outside.locator('.ys-area-chip').count(),4);assert.equal(await page.locator('#service-field-selection .ys-area-chip').count(),3);assert.equal(await page.locator('#t-areaNotes').inputValue(),areaNotes);
 await openDrawer();assert.equal(await page.getByRole('checkbox',{name:'부산 전 지역',exact:true}).isChecked(),true);
 await page.getByRole('checkbox',{name:'해운대구',exact:true}).uncheck();assert.equal(await dialog.locator('.ys-area-chip').count(),3);assert.equal(await page.locator('#service-area-all').isChecked(),true);
 await page.getByRole('checkbox',{name:'해운대구',exact:true}).check();await page.getByRole('button',{name:'선택 완료',exact:true}).click();
 await page.locator('#application-form .actions button').click();await page.waitForURL('**/technician-detail.html?id=*');
 assert.equal(writes[1].endpoint,'/api/applications/'+id+'/edit');assert.equal(writes[1].data.version,4);assert.equal(writes[1].data.areaNotes,areaNotes);assert.equal(writes[1].data.areas,areas);
 areas='해운대구 제외, 평일 상담';areaNotes='';fields='수전 교체 / 변기 수리';await page.goto(origin+'/technician-apply.html?id='+id);await page.locator('#service-area-trigger').waitFor();assert.equal(await page.locator('#t-areaNotes').inputValue(),areas);assert.equal(await page.locator('#t-areas').inputValue(),'');
 assert.equal(await page.locator('#t-fields').inputValue(),fields);await openFields();assert.equal(await page.locator('#service-field-other').inputValue(),fields);await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});await openDrawer();assert.equal(await dialog.evaluate(el=>getComputedStyle(el).animationName),'none');await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);
 console.log('PASS: left modal drawer, close/Escape/focus, citywide + 3 = 4, circle marks, preserved selections/notes, create/edit payloads, mobile/200% spacing/reduced motion; no production writes');
 await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
